import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, ArrowRight, MapPin } from 'lucide-react'
import './HomePage.css' // Reuse listing card styles

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:8000`
    : 'http://127.0.0.1:8000'

type Listing = {
    id: number
    title: string
    price: number
    city?: string | null
    images: { url: string }[]
}

export default function WishlistPage({ token }: { token: string | null }) {
    const [items, setItems] = useState<Listing[]>([])
    const [loading, setLoading] = useState(true)

    const fetchWishlist = async () => {
        if (!token) {
            setLoading(false)
            return
        }
        try {
            console.log("[Wishlist] Synchronizing with ecosystem...")
            const res = await fetch(`${API_URL}/wishlist`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) {
                    // Filter for robust data structure
                    const processed = data
                        .filter(w => w && w.listing)
                        .map(w => w.listing)
                        .filter(l => l && typeof l === 'object' && l.title);

                    setItems(processed)
                }
            }
        } catch (err) {
            console.error("[Wishlist] Synchronization fault:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchWishlist()
    }, [token])

    const removeFromWishlist = async (id: number) => {
        if (!token) return
        try {
            const res = await fetch(`${API_URL}/wishlist/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                setItems(prev => prev.filter(i => i.id !== id))
            }
        } catch (err) {
            console.error("[Wishlist] Removal fault:", err)
        }
    }

    if (loading) return (
        <div className="loading-container-elite">
            <span>Synchronizing Curated Vault...</span>
        </div>
    )

    return (
        <div className="wishlist-page-elite">
            <header className="page-header-elite">
                <h1 className="text-gradient">Curated Collection</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Your earmarked assets for an elite exchange experience.</p>
            </header>

            {items.length === 0 ? (
                <div className="empty-state-elite">
                    <Heart size={64} strokeWidth={1} style={{ color: 'var(--accent-emerald)', opacity: 0.5 }} />
                    <h3>Your Vault is Empty</h3>
                    <p>Discover rare assets and heart them to preserve them in your collection.</p>
                    <Link to="/" className="btn-premium" style={{ marginTop: '12px' }}>Explore Marketplace</Link>
                </div>
            ) : (
                <div className="listing-grid-elite">
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            className="elite-card-wrap"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                        >
                            <article className="elite-card">
                                <div className="card-image-wrap">
                                    <img
                                        src={item.images?.[0]?.url || 'https://images.unsplash.com/photo-1581417478175-a9ef18f210c1?auto=format&fit=crop&q=80&w=800'}
                                        alt={item.title}
                                        className="elite-card-image"
                                    />
                                    <div className="card-overlay">
                                        <button
                                            className="btn-wishlist-elite active"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                removeFromWishlist(item.id);
                                            }}
                                            title="Remove from Wishlist"
                                        >
                                            <Heart size={20} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                                <div className="card-content-elite">
                                    <div className="card-meta-elite">
                                        <MapPin size={12} />
                                        <span>{item.city || 'Global Origin'}</span>
                                    </div>
                                    <h3 className="card-title-elite" style={{ fontSize: '1.25rem' }}>{item.title}</h3>
                                    <div className="card-footer-elite">
                                        <span className="price-elite">₹{item.price.toLocaleString()}</span>
                                        <Link to={`/listings/${item.id}`} className="btn-view-elite">
                                            <span>Inspect</span>
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
