import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Package, MapPin, ArrowRight } from 'lucide-react'
import './HomePage.css'

const API_URL = 'http://127.0.0.1:8000'

export default function SearchPage({ token }: { token: string | null }) {
    const [searchParams] = useSearchParams()
    const q = searchParams.get('q') || ''
    const [listings, setListings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!q) {
            setLoading(false)
            setListings([])
            return
        }
        setLoading(true)
        fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
            .then(r => r.json())
            .then(data => {
                // data is SearchResponse: { results: SearchResult[], ... }
                if (data.results) {
                    setListings(data.results.map((r: any) => r.listing))
                } else {
                    setListings([])
                }
            })
            .catch(err => {
                console.error("Discovery error:", err)
                setListings([])
            })
            .finally(() => setLoading(false))
    }, [q, token])

    if (loading) return <div className="loading-container-elite"><span>Scanning the ecosystem for "{q}"...</span></div>

    return (
        <div className="search-page-elite">
            <header className="page-header-elite" style={{ marginBottom: '60px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    <Search size={20} />
                    <span>Search Results</span>
                </div>
                <h1 className="text-gradient">Found {listings.length} matches for "{q}"</h1>
            </header>

            {listings.length === 0 ? (
                <div className="empty-state-elite">
                    <Search size={64} />
                    <h3>No matches found</h3>
                    <p>Try adjusting your search terms or exploring different categories.</p>
                    <Link to="/" className="btn-premium">Back to Home</Link>
                </div>
            ) : (
                <div className="listing-grid-elite">
                    {listings.map((item) => (
                        <motion.div key={item.id} className="elite-card-wrap" layout>
                            <article className="elite-card">
                                <div className="card-image-wrap">
                                    <img src={item.images?.[0]?.url || 'https://placehold.co/400x400/1e293b/10b981?text=Listing'} alt="" className="elite-card-image" />
                                </div>
                                <div className="card-content-elite">
                                    <div className="card-meta-elite">
                                        <MapPin size={12} />
                                        <span>{item.city || 'Global'}</span>
                                    </div>
                                    <h3 className="card-title-elite">{item.title}</h3>
                                    <div className="card-footer-elite">
                                        <span className="price-elite">₹{item.price.toLocaleString()}</span>
                                        <Link to={`/listings/${item.id}`} className="btn-view-elite">
                                            <span>View</span>
                                            <ArrowRight size={18} />
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
