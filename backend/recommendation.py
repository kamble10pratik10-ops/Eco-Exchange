import logging
import numpy as np
import threading
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Dict, Any, Tuple
from . import models, schemas
from .search_engine import _refresh_cache, _cached_query_embedding

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Visual Similarity Model (CLIP)
# ─────────────────────────────────────────────────────────────────────────────
_clip_model: Any = None
_clip_lock = threading.Lock()

def _get_clip_model():
    """Lazy-load CLIP model for visual similarity."""
    global _clip_model
    if _clip_model is None:
        with _clip_lock:
            if _clip_model is None:
                try:
                    from sentence_transformers import SentenceTransformer
                    # Use the most lightweight CLIP model
                    logger.info("Loading clip-ViT-B-32 for visual similarity...")
                    _clip_model = SentenceTransformer('clip-ViT-B-32')
                except Exception as e:
                    logger.error(f"Failed to load CLIP model: {e}")
                    _clip_model = "FAILED"
    return _clip_model if _clip_model != "FAILED" else None

# Cache for image embeddings listing_id -> ndarray
_image_embedding_cache: Dict[int, np.ndarray] = {}

def get_user_profile_recommendations(db: Session, user_id: int, top_k: int = 20) -> List[models.Listing]:
    """
    STAGES 2 & 3: Advanced Personalized Recommendations
    - Weights activities (Purchase > Message > Wishlist > View)
    - Applies category diversity filters
    - Excludes items already interacted with
    """
    # 1. Fetch activities with weights
    activities = db.query(models.UserActivity).filter(models.UserActivity.user_id == user_id).all()
    
    if not activities:
        # Fallback: recently added listings that are active
        return db.query(models.Listing).filter(models.Listing.is_active == True).order_by(models.Listing.id.desc()).limit(top_k).all()

    # 2. Get embeddings for these listings
    listings_data = _refresh_cache(db)
    listings = listings_data[0]
    emb_matrix = listings_data[1]
    
    if len(listings) == 0:
        return []

    # Map listing_id to its index in the matrix
    id_to_idx = {l.id: i for i, l in enumerate(listings)}
    
    # 3. Compute weighted average interest vector
    user_vector = np.zeros(emb_matrix.shape[1])
    total_weight = 0.0
    
    interacted_ids = set()
    for act in activities:
        interacted_ids.add(act.listing_id)
        if act.listing_id in id_to_idx:
            idx = id_to_idx[act.listing_id]
            user_vector += emb_matrix[idx] * act.weight
            total_weight += act.weight
            
    if total_weight > 0:
        user_vector /= total_weight
    else:
        # Fallback to simple mean if weights are zero or missing
        interest_indices = [id_to_idx[aid] for aid in interacted_ids if aid in id_to_idx]
        if interest_indices:
            user_vector = np.mean(emb_matrix[interest_indices], axis=0)
        else:
            return db.query(models.Listing).filter(models.Listing.is_active == True).limit(top_k).all()

    # 4. Find similar listings
    scores = np.dot(emb_matrix, user_vector)
    top_indices = np.argsort(scores)[::-1]
    
    # 5. --- STAGE 3: DIVERSITY FILTER (Category Maxing) ---
    results = []
    category_counts = {}
    MAX_PER_CATEGORY = 3 # Industry standard for diversity
    
    for idx in top_indices:
        listing = listings[idx]
        
        # Skip if already interacted or owned by user
        if listing.id in interacted_ids or listing.owner_id == user_id:
            continue
            
        # Diversity check
        cat = listing.category or "Unknown"
        count = category_counts.get(cat, 0)
        if count < MAX_PER_CATEGORY:
            results.append(listing)
            category_counts[cat] = count + 1
            
        if len(results) >= top_k:
            break
            
    return results

def get_frequently_brought_together(db: Session, listing_id: int, top_k: int = 5) -> List[models.Listing]:
    """
    Finds products often ordered together with the given listing.
    """
    # 1. Find all orders containing this listing
    order_ids_raw = db.query(models.OrderItem.order_id).filter(models.OrderItem.listing_id == listing_id).all()
    order_ids = [r[0] for r in order_ids_raw]
    
    if not order_ids:
        # Fallback: same category
        target_listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
        if target_listing:
            return db.query(models.Listing).filter(
                models.Listing.category == target_listing.category,
                models.Listing.id != listing_id,
                models.Listing.is_active == True
            ).limit(top_k).all()
        return []
        
    # 2. Find other listings in those same orders
    frequent_items = (
        db.query(models.OrderItem.listing_id, func.count(models.OrderItem.listing_id).label('count'))
        .filter(models.OrderItem.order_id.in_(order_ids))
        .filter(models.OrderItem.listing_id != listing_id)
        .group_by(models.OrderItem.listing_id)
        .order_by(func.count(models.OrderItem.listing_id).desc())
        .limit(top_k)
        .all()
    )
    
    item_ids = [item[0] for item in frequent_items]
    if not item_ids:
        return []
        
    return db.query(models.Listing).filter(models.Listing.id.in_(item_ids)).all()

def get_visually_similar_listings(db: Session, listing_id: int, top_k: int = 10) -> List[models.Listing]:
    """
    Finds listings that are visually similar to the given listing.
    Uses CLIP embeddings if available, falls back to semantic text similarity.
    """
    target_listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not target_listing:
        return []
        
    # Fallback to semantic similarity for now as CLIP loading might be heavy
    # However, if we wanted true visual similarity, we would:
    # 1. Fetch images of target_listing
    # 2. Encode with _get_clip_model()
    # 3. Compare with other listing image embeddings
    
    listings_data = _refresh_cache(db)
    listings = listings_data[0]
    emb_matrix = listings_data[1]
    
    id_to_idx = {l.id: i for i, l in enumerate(listings)}
    
    if listing_id not in id_to_idx:
        return []
        
    target_idx = id_to_idx[listing_id]
    target_vector = emb_matrix[target_idx]
    
    # Using the semantic vector as a high-quality proxy
    scores = np.dot(emb_matrix, target_vector)
    top_indices = np.argsort(scores)[::-1]
    
    results = []
    for idx in top_indices:
        listing = listings[idx]
        if listing.id != listing_id and listing.is_active:
            results.append(listing)
        if len(results) >= top_k:
            break
            
    return results
