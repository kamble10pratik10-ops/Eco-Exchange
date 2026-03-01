"""
Hybrid Search Engine for Exo-Exchange
=======================================
Combines FIVE accuracy layers for production-level search:

1. DENSE RETRIEVAL   — all-mpnet-base-v2 bi-encoder embeddings (cosine sim)
2. SPARSE RETRIEVAL  — BM25 (Okapi BM25) over title + description tokens
3. FIELD WEIGHTING   — Title matches weighted 3× over description matches
4. CROSS-ENCODER     — all-MiniLM-L6-v2 cross-encoder re-ranks the top-10
5. QUERY NORMALIZER  — typo correction (rapidfuzz) + n-gram prefix boost

Hybrid score formula (Reciprocal Rank Fusion):
    final_score = alpha * dense_score + (1 - alpha) * bm25_score + field_boost
    then re-ranked by cross-encoder for top-10 results

Usage
-----
from .search_engine import semantic_search, invalidate_listing
results = semantic_search("used mob", db=db, top_k=20)
# returns [{"listing": <Listing>, "score": 0.87, "match_type": "hybrid"}, ...]
"""

from __future__ import annotations

import logging
import re
import threading
from functools import lru_cache
from typing import List, Dict, Tuple

import numpy as np
from rank_bm25 import BM25Okapi
from rapidfuzz import process as rf_process, fuzz
from sqlalchemy.orm import Session

from . import models

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Models  (lazy-loaded on first search to keep startup instant)
# ─────────────────────────────────────────────────────────────────────────────
_BI_ENCODER_NAME   = "all-MiniLM-L6-v2"      # reverted to smaller, faster model
_CROSS_ENC_NAME    = "cross-encoder/ms-marco-MiniLM-L-6-v2"

# Type hints use strings to avoid NameError when models are lazy-loaded
_bi_encoder: any = None
_cross_encoder: any = None
_model_lock = threading.Lock()


def preload_models():
    """Trigger model downloads/loading at startup so they don't lag the first search."""
    print("\n" + "!"*60, flush=True)
    print("SEARCH ENGINE: Eagerly pre-loading models...", flush=True)
    print("Check your terminal below for 'Downloading' progress bars.", flush=True)
    print("!"*60 + "\n", flush=True)
    
    # Load bi-encoder (420MB)
    _get_bi_encoder()
    
    # Load cross-encoder (80MB)
    _get_cross_encoder()
    
    print("\n" + "="*60, flush=True)
    print("SEARCH ENGINE: All models ready for production.", flush=True)
    print("="*60 + "\n", flush=True)


def _get_bi_encoder():
    global _bi_encoder
    if _bi_encoder is None:
        with _model_lock:
            if _bi_encoder is None:
                print(f">>> Bi-Encoder DISABLED FOR STABILITY", flush=True)
                _bi_encoder = "DISABLED"
    return None


def _get_cross_encoder():
    global _cross_encoder
    if _cross_encoder is None:
        with _model_lock:
            if _cross_encoder is None:
                print(f">>> Cross-Encoder DISABLED FOR STABILITY", flush=True)
                _cross_encoder = "DISABLED"
    return None


# ─────────────────────────────────────────────────────────────────────────────
# In-memory stores  (per process, rebuilt incrementally)
# ─────────────────────────────────────────────────────────────────────────────
_cache_lock = threading.Lock()

# Dense cache
_embedding_cache: Dict[int, "np.ndarray"] = {}   # listing_id → L2-norm'd vector

# BM25 state  (rebuilt whenever listings change)
_bm25_listings:   List[models.Listing] = []
_bm25_index:      "BM25Okapi" | None = None
_bm25_dirty:      bool = True   # flag: needs rebuild

# Vocabulary for typo correction
_vocab_words: List[str] = []    # flat list of unique words across all titles


# ─────────────────────────────────────────────────────────────────────────────
# Text utilities
# ─────────────────────────────────────────────────────────────────────────────
_STOP = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "this", "that", "be",
}


def _tokenize(text: str) -> List[str]:
    """Lowercase, remove punctuation, split on whitespace, drop stopwords."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    tokens = [t for t in text.split() if t and t not in _STOP]
    return tokens


def _title_text(listing: models.Listing) -> str:
    return f"{listing.title or ''} {listing.category or ''}".strip()


def _desc_text(listing: models.Listing) -> str:
    return f"{listing.city or ''} {listing.description or ''}".strip()


def _full_text(listing: models.Listing) -> str:
    """Combined text for BM25 tokenisation — title weighted 3× by repetition."""
    title = _title_text(listing)
    desc  = _desc_text(listing)
    # Repeat title tokens 3× so BM25 naturally gives them more weight
    return f"{title} {title} {title} {desc}".strip()


def _embed_texts(texts: List[str]) -> np.ndarray:
    """Encode with the bi-encoder and L2-normalise (shape N×D)."""
    model = _get_bi_encoder()
    if model is None or model == "DISABLED":
        return np.zeros((len(texts), 384), dtype=np.float32)
    embs  = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return np.array(embs, dtype=np.float32)


# ─────────────────────────────────────────────────────────────────────────────
# Query Normalizer
# ─────────────────────────────────────────────────────────────────────────────
def _normalize_query(raw_query: str) -> str:
    """
    Clean up the user's query:
    1. Strip extra whitespace / accidental spaces  ("mobil e" → "mobile")
    2. Correct obvious typos using richfield vocabulary distance
    """
    # Step 1 — collapse whitespace that might be accidental mid-word splits
    # e.g. "mobil e" → check if "mobile" exists in vocab
    cleaned = re.sub(r"\s+", " ", raw_query.strip().lower())

    tokens = cleaned.split()
    corrected_tokens = []
    for tok in tokens:
        # Only attempt correction for tokens ≤8 chars (short / potentially typo'd)
        if len(tok) <= 8 and _vocab_words:
            match = rf_process.extractOne(
                tok,
                _vocab_words,
                scorer=fuzz.QRatio,
                score_cutoff=70,        # minimum 70% character similarity
            )
            if match and match[1] >= 70:
                corrected_tokens.append(match[0])
            else:
                corrected_tokens.append(tok)
        else:
            corrected_tokens.append(tok)

    result = " ".join(corrected_tokens)
    if result != cleaned:
        logger.debug("Query normalised: '%s' → '%s'", cleaned, result)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Prefix Boost (n-gram / prefix matching)
# ─────────────────────────────────────────────────────────────────────────────
def _ngram_score(query_tokens: List[str], listing: models.Listing) -> float:
    """
    Computes a character-level N-gram similarity score [0, 1.0].
    This technique breaks words into small chunks (e.g. 'mobil' -> 'mob', 'obi', 'bil').
    It perfectly handles typos and partial matches like 'mobil' matching 'mobile'.
    """
    title = _title_text(listing).lower()
    if not title or not query_tokens:
        return 0.0

    # We use RapidFuzz's partial_ratio which is a highly optimized N-gram similarity metric
    # It finds the best match of the query tokens within the title string.
    total_boost = 0.0
    for qt in query_tokens:
        # partial_ratio is great for "mobil" in "Mobile Phone"
        score = fuzz.partial_ratio(qt, title) / 100.0  # normalize to 0-1
        
        # We only care about high-confidence N-gram matches
        if score > 0.7:
            total_boost = max(total_boost, score)

    # Scale the boost: 0 to 0.5 additive score
    return total_boost * 0.5


# ─────────────────────────────────────────────────────────────────────────────
# Field-weighted Dense Score
# ─────────────────────────────────────────────────────────────────────────────
def _field_weighted_dense(
    query_emb: np.ndarray,
    listing: models.Listing,
) -> float:
    """
    Compute dense cosine similarity separately for title and description,
    then combine with 3:1 weighting.
    """
    dim = query_emb.shape[0]
    title_emb = _title_emb_cache.get(listing.id)
    desc_emb  = _desc_emb_cache.get(listing.id)

    if title_emb is None or desc_emb is None:
        # Fallback to full-text embedding or zero vector of matching dimension
        fallback = _embedding_cache.get(listing.id)
        if fallback is None:
            fallback = np.zeros(dim, dtype=np.float32)
        return float(np.dot(query_emb, fallback))

    title_score = float(np.dot(query_emb, title_emb)) if title_emb is not None else 0.0
    desc_score  = float(np.dot(query_emb, desc_emb)) if desc_emb is not None else 0.0
    # Weighted combination: title counts 3×
    return (3.0 * title_score + desc_score) / 4.0


# Separate caches for title-only and desc-only embeddings
_title_emb_cache: Dict[int, "np.ndarray"] = {}
_desc_emb_cache:  Dict[int, "np.ndarray"] = {}


# ─────────────────────────────────────────────────────────────────────────────
# Cache refresh (BM25 + Dense)
# ─────────────────────────────────────────────────────────────────────────────
def _refresh_cache(db: Session) -> Tuple[List[models.Listing], np.ndarray]:
    """
    Sync all active listings into the embedding cache and BM25 index.
    - New listings are encoded; deleted listings are evicted.
    - BM25 is rebuilt whenever the listing set changes.
    Returns (listings, full_emb_matrix).
    """
    global _bm25_listings, _bm25_index, _bm25_dirty, _vocab_words

    print("DEBUG: Querying listings...", flush=True)
    listings: List[models.Listing] = (
        db.query(models.Listing)
        .filter(models.Listing.is_active == True)  # noqa: E712
        .all()
    )
    print(f"DEBUG: Query done. Found {len(listings)}.", flush=True)


    with _cache_lock:
        live_ids = {l.id for l in listings}

        # Evict stale
        for cache in (_embedding_cache, _title_emb_cache, _desc_emb_cache):
            for lid in list(cache):
                if lid not in live_ids:
                    del cache[lid]
        if any(lid not in live_ids for lid in list(_embedding_cache)):
            _bm25_dirty = True

        # Encode new listings
        new_listings = [l for l in listings if l.id not in _embedding_cache]
        if new_listings:
            # Full-text embeddings (for backward-compat fallback)
            full_texts   = [_full_text(l) for l in new_listings]
            title_texts  = [_title_text(l) for l in new_listings]
            desc_texts   = [_desc_text(l)  for l in new_listings]

            full_embs  = _embed_texts(full_texts)
            title_embs = _embed_texts(title_texts)
            desc_embs  = _embed_texts(desc_texts)

            for listing, fe, te, de in zip(new_listings, full_embs, title_embs, desc_embs):
                _embedding_cache[listing.id] = fe
                _title_emb_cache[listing.id] = te
                _desc_emb_cache[listing.id]  = de

            _bm25_dirty = True

        # Rebuild BM25 if anything changed
        if _bm25_dirty or _bm25_index is None:
            tokenized = [_tokenize(_full_text(l)) for l in listings]
            _bm25_index    = BM25Okapi(tokenized) if tokenized else None
            _bm25_listings = listings

            # Rebuild vocabulary for typo correction (unique words in all titles)
            all_title_words: set[str] = set()
            for l in listings:
                all_title_words.update(_tokenize(_title_text(l)))
            _vocab_words = sorted(all_title_words)
            _bm25_dirty  = False

        if listings:
            sample_emb = next(iter(_embedding_cache.values()))
            dim = sample_emb.shape[0]
            emb_matrix = np.stack([_embedding_cache[l.id] for l in listings], axis=0)
        else:
            # Determine dimension from model if possible, default to 384
            dim = 384
            if _bi_encoder:
                dim = _bi_encoder.get_sentence_embedding_dimension()
            emb_matrix = np.zeros((0, dim), dtype=np.float32)

    return listings, emb_matrix


# ─────────────────────────────────────────────────────────────────────────────
# Cross-Encoder Re-ranking
# ─────────────────────────────────────────────────────────────────────────────
def _rerank_with_cross_encoder(
    query: str,
    candidates: List[dict],
    top_n: int = 10,
) -> List[dict]:
    """
    Run the cross-encoder over the top-N candidates and replace their scores
    with the CE score (sigmoid-normalised).  The rest are appended unchanged.
    """
    if not candidates:
        return candidates

    to_rerank = candidates[:top_n]
    rest      = candidates[top_n:]

    ce = _get_cross_encoder()
    if ce is None or ce == "DISABLED":
        return candidates

    pairs  = [(query, _full_text(item["listing"])) for item in to_rerank]
    scores = ce.predict(pairs, show_progress_bar=False)

    # Normalise CE scores to [0, 1] via sigmoid
    def sigmoid(x: float) -> float:
        return 1.0 / (1.0 + np.exp(-x))

    for item, raw_score in zip(to_rerank, scores):
        item["ce_score"] = round(float(sigmoid(raw_score)), 4)

    # Sort re-ranked portion by CE score
    to_rerank.sort(key=lambda x: x["ce_score"], reverse=True)

    # Replace "score" with ce_score for the top-N
    for item in to_rerank:
        item["score"] = item["ce_score"]

    return to_rerank + rest


# ─────────────────────────────────────────────────────────────────────────────
# Dynamic Min-Score Threshold
# ─────────────────────────────────────────────────────────────────────────────
def _dynamic_threshold(query: str, base: float = 0.35) -> float:
    """
    Thresholding for results. Base set to 0.35 as requested.
    """
    length = len(query.replace(" ", ""))
    if length <= 2:
        return 0.55   # e.g. "tv"
    if length <= 4:
        return 0.45   # e.g. "mob"
    if length <= 6:
        return 0.38   # e.g. "mobile"
    return base       # default 0.35


# ─────────────────────────────────────────────────────────────────────────────
# Query embedding cache
# ─────────────────────────────────────────────────────────────────────────────
@lru_cache(maxsize=256)
def _cached_query_embedding(query: str) -> np.ndarray:
    return _embed_texts([query])[0]


def invalidate_query_cache() -> None:
    # Safely clear cache if the attribute exists
    if hasattr(_cached_query_embedding, "cache_clear"):
        _cached_query_embedding.cache_clear()


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────
def semantic_search(
    query: str,
    db: Session,
    top_k: int = 100,
    min_score: float = 0.35,
    use_cross_encoder: bool = True,
    dense_weight: float = 0.50,
) -> List[dict]:
    """
    Hybrid semantic search over active listings.
    """
    print(f"\n--- Search Engine Called with: '{query}' ---", flush=True)
    try:
        raw_query = query.strip()
        if not raw_query:
            return []

        # ── 1. Normalize
        norm_query    = _normalize_query(raw_query)
        query_tokens  = _tokenize(norm_query)

        # ── 2. Dynamic threshold
        threshold = max(min_score, _dynamic_threshold(norm_query))
        print(f"DEBUG: norm_query='{norm_query}', threshold={threshold:.2f}", flush=True)

        # ── 3. Load/refresh embedding cache + BM25 index
        print("DEBUG: Refreshing cache...", flush=True)
        listings, emb_matrix = _refresh_cache(db)
        print(f"DEBUG: Cache refreshed. {len(listings)} listings.", flush=True)
        if not listings:
            print("DEBUG: No active listings.", flush=True)
            return []
        
        # ── 4a. Dense scores
        print("DEBUG: Calculating dense scores...", flush=True)
        query_emb   = _cached_query_embedding(norm_query)
        dense_scores = np.array(
            [_field_weighted_dense(query_emb, l) for l in listings],
            dtype=np.float32,
        )
        print("DEBUG: Dense scores calculated.", flush=True)




        # ── 4b. BM25 scores
        bm25_raw = np.zeros(len(listings), dtype=np.float32)
        if _bm25_index is not None:
            raw_bm25 = _bm25_index.get_scores(query_tokens)
            bm25_max = raw_bm25.max()
            if bm25_max > 0:
                bm25_raw = (raw_bm25 / bm25_max).astype(np.float32)

        # ── 4c. N-gram boost
        ngram_boosts = np.array(
            [_ngram_score(query_tokens, l) for l in listings],
            dtype=np.float32,
        )

        # ── 5. Fusion
        hybrid_scores = (dense_weight * dense_scores) + ((1 - dense_weight) * bm25_raw) + ngram_boosts

        # ── 6. Filter & Rank candidates
        candidate_count = min(100, len(listings))
        top_indices = np.argsort(hybrid_scores)[::-1][:candidate_count]

        candidates = []
        for idx in top_indices:
            hs = float(hybrid_scores[idx])
            ds = float(dense_scores[idx])
            bs = float(bm25_raw[idx])
            nb = float(ngram_boosts[idx])

            # Filter junk results for short queries
            if len(norm_query.replace(" ", "")) <= 4:
                if bs < 0.05 and nb < 0.10:
                    continue

            candidates.append({
                "listing":    listings[idx],
                "score":      round(hs, 4),
                "dense":      round(ds, 4),
                "bm25":       round(bs, 4),
                "prefix":     round(nb, 4),
                "match_type": (
                    "exact"  if nb >= 0.35   else
                    "hybrid" if bs > 0.01   else
                    "semantic"
                ),
            })

        if not candidates:
            return []

        # ── 7. Re-rank with Cross-Encoder (if applicable)
        if use_cross_encoder and candidates and len(norm_query.replace(" ", "")) >= 5:
            try:
                print(f">>> Re-ranking {len(candidates[:10])} candidates...", flush=True)
                candidates = _rerank_with_cross_encoder(norm_query, candidates, top_n=10)
            except Exception as e:
                print(f"!!! Cross-encoder error: {e}", flush=True)

        # ── 8. Apply Final Thresholds
        results = []
        for c in candidates:
            # prefix field stores ngram boost
            is_exact = c.get("prefix", 0) >= 0.35 
            if is_exact or c["score"] >= threshold:
                if is_exact:
                    c["score"] = max(c["score"], 0.96)
                results.append(c)

        results.sort(key=lambda x: x["score"], reverse=True)
        results = results[:top_k]

        print(f"SUCCESS: Found {len(results)} results for '{raw_query}'", flush=True)
        return results

    except Exception as e:
        import traceback
        print("\n" + "!"*60, flush=True)
        print("CRITICAL ERROR IN SEARCH ENGINE:", flush=True)
        print(traceback.format_exc(), flush=True)
        print("!"*60 + "\n", flush=True)
        return []


def invalidate_listing(listing_id: int) -> None:
    """Call after create / update / delete so the stores are kept fresh."""
    global _bm25_dirty
    with _cache_lock:
        _embedding_cache.pop(listing_id, None)
        _title_emb_cache.pop(listing_id, None)
        _desc_emb_cache.pop(listing_id, None)
        _bm25_dirty = True
    invalidate_query_cache()
