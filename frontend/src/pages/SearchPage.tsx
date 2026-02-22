import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

type ProductImage = {
    id: number
    url: string
}

type Listing = {
    id: number
    title: string
    description: string
    price: number
    category?: string | null
    city?: string | null
    images: ProductImage[]
    is_active: boolean
    owner_id: number
}

type SearchResult = {
    listing: Listing
    score: number
    dense?: number
    bm25?: number
    prefix?: number
    match_type?: 'exact' | 'hybrid' | 'semantic'
}

type SearchResponse = {
    query: string
    total: number
    results: SearchResult[]
}

function ScoreBadge({ score }: { score: number }) {
    const pct = Math.round(score * 100)
    let label = 'Weak'
    let cls = 'score-badge score-weak'

    if (pct >= 80) { label = 'Excellent'; cls = 'score-badge score-excellent' }
    else if (pct >= 60) { label = 'Great'; cls = 'score-badge score-great' }
    else if (pct >= 40) { label = 'Good'; cls = 'score-badge score-good' }
    else if (pct >= 25) { label = 'Fair'; cls = 'score-badge score-fair' }

    return (
        <span className={cls} title={`Semantic similarity: ${pct}%`}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ marginRight: '3px' }}>
                <circle cx="5" cy="5" r="5" />
            </svg>
            {label} · {pct}%
        </span>
    )
}

function MatchBar({ score }: { score: number }) {
    const pct = Math.min(100, Math.round(score * 100))
    return (
        <div className="match-bar-track">
            <div className="match-bar-fill" style={{ width: `${pct}%` }} />
        </div>
    )
}

function MatchTypePill({ type }: { type?: string }) {
    if (!type) return null
    const config: Record<string, { label: string; cls: string }> = {
        exact: { label: '⚡ Exact Match', cls: 'pill-exact' },
        hybrid: { label: '🔀 Keyword + AI', cls: 'pill-hybrid' },
        semantic: { label: '🧠 AI Semantic', cls: 'pill-semantic' },
    }
    const c = config[type] ?? config.semantic
    return <span className={`match-type-pill ${c.cls}`}>{c.label}</span>
}

export default function SearchPage({ token }: { token: string | null }) {
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const initialQuery = searchParams.get('q') ?? ''

    const [query, setQuery] = useState(initialQuery)
    const [inputValue, setInputValue] = useState(initialQuery)
    const [results, setResults] = useState<SearchResult[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searched, setSearched] = useState(false)
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const abortRef = useRef<AbortController | null>(null)

    const EXAMPLE_QUERIES = [
        'gaming laptop under 50000',
        'used iPhone good condition',
        'vintage furniture',
        'electric scooter',
        'study table for students',
        'sports equipment cricket',
        'Sony headphones',
        'second hand bicycle',
    ]

    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) return
        if (abortRef.current) abortRef.current.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl

        setLoading(true)
        setError(null)
        setSearched(true)
        setShowSuggestions(false)

        try {
            const url = `${API_URL}/search?q=${encodeURIComponent(q.trim())}&top_k=30`
            const res = await fetch(url, {
                signal: ctrl.signal,
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.detail ?? 'Search failed')
            }
            const data: SearchResponse = await res.json()
            setResults(data.results)
            setTotal(data.total)
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                setError(e.message ?? 'Something went wrong')
                setResults([])
                setTotal(0)
            }
        } finally {
            setLoading(false)
        }
    }, [])

    // Run search when `query` changes (synced from URL)
    useEffect(() => {
        if (query) doSearch(query)
    }, [query, doSearch])

    // Sync URL → state on mount
    useEffect(() => {
        const q = searchParams.get('q')
        if (q) {
            setQuery(q)
            setInputValue(q)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const q = inputValue.trim()
        if (!q) return
        setQuery(q)
        setSearchParams({ q })
    }

    const handleSuggestionClick = (s: string) => {
        setInputValue(s)
        setQuery(s)
        setSearchParams({ q: s })
        setShowSuggestions(false)
    }

    const handleInputChange = (v: string) => {
        setInputValue(v)
        // Simple client-side suggestion filter
        if (v.length > 1) {
            const filtered = EXAMPLE_QUERIES.filter((s) =>
                s.toLowerCase().includes(v.toLowerCase()),
            )
            setSuggestions(filtered)
            setShowSuggestions(filtered.length > 0)
        } else {
            setSuggestions(EXAMPLE_QUERIES)
            setShowSuggestions(true)
        }
    }

    return (
        <div className="search-page">
            {/* ── Search bar ── */}
            <div className="search-hero">
                <div className="search-hero-inner">
                    <h1 className="search-hero-title">
                        <span className="search-gradient-text">Semantic Search</span>
                        <span className="search-hero-sub"> — find anything</span>
                    </h1>
                    <p className="search-hero-desc">
                        Describe what you're looking for in plain words. Our AI understands context and meaning — not just keywords.
                    </p>

                    <form className="search-form" onSubmit={handleSubmit} role="search">
                        <div className="search-input-wrap" style={{ position: 'relative' }}>
                            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                ref={inputRef}
                                id="search-input"
                                type="text"
                                className="search-input-field"
                                placeholder='e.g. "affordable gaming laptop" or "used electric bike"…'
                                value={inputValue}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onFocus={() => {
                                    if (!inputValue) {
                                        setSuggestions(EXAMPLE_QUERIES)
                                        setShowSuggestions(true)
                                    }
                                }}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                autoComplete="off"
                                aria-label="Search listings"
                            />
                            {inputValue && (
                                <button
                                    type="button"
                                    className="search-clear-btn"
                                    onClick={() => { setInputValue(''); inputRef.current?.focus() }}
                                    aria-label="Clear search"
                                >
                                    ✕
                                </button>
                            )}

                            {/* Suggestions dropdown */}
                            {showSuggestions && (
                                <ul className="search-suggestions" role="listbox">
                                    {suggestions.map((s) => (
                                        <li
                                            key={s}
                                            role="option"
                                            className="search-suggestion-item"
                                            onMouseDown={() => handleSuggestionClick(s)}
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', opacity: 0.5 }}>
                                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                            </svg>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <button type="submit" className="search-submit-btn" disabled={loading}>
                            {loading ? (
                                <span className="search-spinner" />
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    Search
                                </>
                            )}
                        </button>
                    </form>

                    {/* Example queries */}
                    <div className="example-queries">
                        {EXAMPLE_QUERIES.slice(0, 5).map((eq) => (
                            <button
                                key={eq}
                                className="example-query-chip"
                                onClick={() => handleSuggestionClick(eq)}
                            >
                                {eq}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Results ── */}
            <div className="search-results-section">
                {error && (
                    <div className="search-error-banner">
                        <span>⚠️ {error}</span>
                    </div>
                )}

                {loading && (
                    <div className="search-loading-state">
                        <div className="search-pulse-ring" />
                        <div className="search-pulse-ring delay-1" />
                        <div className="search-pulse-ring delay-2" />
                        <p>Analysing with AI…</p>
                    </div>
                )}

                {!loading && searched && !error && (
                    <>
                        {total > 0 && (
                            <div className="results-meta">
                                <span className="results-count">
                                    <strong>{total}</strong> result{total !== 1 ? 's' : ''} for
                                </span>
                                <span className="results-query">"{query}"</span>
                                <span className="results-ai-label">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                    AI-ranked
                                </span>
                            </div>
                        )}

                        {total === 0 ? (
                            <div className="search-empty-state">
                                <div className="search-empty-icon">🔍</div>
                                <h3>No matches found</h3>
                                <p>Try describing what you want differently — our AI understands synonyms and context.</p>
                                <div className="search-empty-tips">
                                    <strong>Tips:</strong>
                                    <ul>
                                        <li>Use natural language: <em>"affordable iPhone for student"</em></li>
                                        <li>Mention type + condition: <em>"second hand bicycle good condition"</em></li>
                                        <li>Include city or budget: <em>"laptop under 40000 Mumbai"</em></li>
                                    </ul>
                                </div>
                                <button className="search-submit-btn" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/')}>
                                    Browse All Listings
                                </button>
                            </div>
                        ) : (
                            <div className="search-grid">
                                {results.map(({ listing: item, score, match_type }) => (
                                    <div key={item.id} className="search-result-card">
                                        <div className="src-top">
                                            <ScoreBadge score={score} />
                                            <MatchBar score={score} />
                                        </div>
                                        <Link to={`/listings/${item.id}`} className="src-link">
                                            <article className="src-body">
                                                {item.images && item.images.length > 0 ? (
                                                    <img
                                                        src={item.images[0].url}
                                                        alt={item.title}
                                                        className="listing-card-image"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image'
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="listing-card-no-image">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                                    </div>
                                                )}
                                                <div className="src-title-row">
                                                    <h3 className="src-title">{item.title}</h3>
                                                    <MatchTypePill type={match_type} />
                                                </div>
                                                <p className="src-meta">
                                                    {item.category || 'General'} · {item.city || 'Unknown city'}
                                                </p>
                                                <p className="src-desc">
                                                    {(item.description || '').length > 140
                                                        ? (item.description || '').slice(0, 140) + '…'
                                                        : (item.description || 'No description provided.')}
                                                </p>
                                                <div className="src-footer">
                                                    <span className="src-price">₹{(item.price || 0).toLocaleString()}</span>
                                                    <span className="src-cta">View →</span>
                                                </div>
                                            </article>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {!loading && !searched && (
                    <div className="search-intro-state">
                        <div className="search-intro-grid">
                            {[
                                { icon: '🧠', title: 'Understands Context', desc: 'Find "used Apple phone" even if sellers wrote "second-hand iPhone".' },
                                { icon: '⚡', title: 'Instant Results', desc: 'Embeddings are cached — searches return in milliseconds after the first warm-up.' },
                                { icon: '🎯', title: 'Ranked by Relevance', desc: 'Results are scored by AI similarity, not just keyword match.' },
                                { icon: '🌍', title: 'Natural Language', desc: 'Ask in plain English. Describe colour, budget, condition — anything.' },
                            ].map((card) => (
                                <div key={card.title} className="search-intro-card">
                                    <span className="intro-icon">{card.icon}</span>
                                    <h4>{card.title}</h4>
                                    <p>{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
