import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    MessageSquare,
    Heart,
    Share2,
    Shield,
    TreePine,
    Zap,
    ArrowLeft,
    Calendar,
    MapPin,
    Edit3,
    Trash2
} from 'lucide-react'
import './ListingDetailPage.css'

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:8000`
    : 'http://127.0.0.1:8000'

type ProductImage = { id: number; url: string }

type Listing = {
    id: number
    title: string
    description: string
    price: number
    category?: string | null
    city?: string | null
    created_at?: string
    owner_id: number
    owner?: {
        id: number
        name: string
        profile_image_url?: string
    }
    images: ProductImage[]
}

export default function ListingDetailPage({ token }: { token: string | null }) {
    const { id } = useParams()
    const [listing, setListing] = useState<Listing | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [wishlisted, setWishlisted] = useState(false)
    const [activeImage, setActiveImage] = useState(0)
    const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null)
    const [deleting, setDeleting] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await fetch(`${API_URL}/listings/${id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                if (!res.ok) throw new Error('Listing not found')
                const data = await res.json()
                setListing(data)

                if (token) {
                    const wRes = await fetch(`${API_URL}/wishlist`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                    if (wRes.ok) {
                        const wData = await wRes.json()
                        setWishlisted(wData.some((item: any) => item.listing_id === Number(id)))
                    }

                    const uRes = await fetch(`${API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                    if (uRes.ok) {
                        const uData = await uRes.json()
                        setCurrentUser(uData)
                    }
                }
            } catch (e: any) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        fetchDetail()
    }, [id, token])

    const handleWishlist = async () => {
        if (!token) return navigate('/login')
        try {
            const method = wishlisted ? 'DELETE' : 'POST'
            await fetch(`${API_URL}/wishlist/${id}`, {
                method,
                headers: { Authorization: `Bearer ${token}` },
            })
            setWishlisted(!wishlisted)
        } catch (err) { console.error(err) }
    }

    const handleDelete = async () => {
        if (!isOwner) return
        if (!window.confirm('Are you sure you want to delete this listing?')) return
        setDeleting(true)
        try {
            const res = await fetch(`${API_URL}/listings/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                navigate('/')
            } else {
                alert('Failed to delete listing')
            }
        } catch (err) {
            console.error(err)
            alert('Error deleting listing')
        } finally {
            setDeleting(false)
        }
    }

    const isOwner = currentUser && listing && currentUser.id === listing.owner_id

    if (loading) return <div className="loading-container-elite"><span>Curating details...</span></div>
    if (error || !listing) return <div className="error-card glass">{error || 'Listing not found'}</div>

    // Mock impact data based on price/category
    const co2Saved = Math.round(listing.price / 100) + 5
    const waterSaved = Math.round(listing.price / 10) + 50

    return (
        <motion.div
            className="detail-page-elite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="cinematic-gallery">
                <button className="btn-back-elite" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    <span>Gallery</span>
                </button>

                <motion.div
                    className="main-image-elite"
                    key={activeImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    <img
                        src={listing.images[activeImage]?.url || 'https://placehold.co/800x1000/1e293b/10b981?text=Eco+Exchange'}
                        alt={listing.title}
                    />
                </motion.div>

                {listing.images && listing.images.length > 1 && (
                    <div className="thumbnail-strip-elite">
                        {listing.images.map((img, idx) => (
                            <div
                                key={img.id}
                                className={`thumbnail-elite ${activeImage === idx ? 'active' : ''}`}
                                onClick={() => setActiveImage(idx)}
                            >
                                <img src={img.url} alt={`View ${idx + 1}`} />
                            </div>
                        ))}
                    </div>
                )}

                <div className="impact-grid">
                    <div className="impact-card-neumorphic">
                        <TreePine size={24} className="emerald-glow" style={{ marginBottom: '12px' }} />
                        <span className="impact-value">{co2Saved}kg</span>
                        <span className="impact-label">CO2 Saved</span>
                    </div>
                    <div className="impact-card-neumorphic">
                        <Zap size={24} style={{ color: '#3b82f6', marginBottom: '12px' }} />
                        <span className="impact-value">{waterSaved}L</span>
                        <span className="impact-label">Water Impact</span>
                    </div>
                </div>
            </div>

            <div className="detail-info-pane">
                <div className="detail-header-elite">
                    <div className="detail-meta-row">
                        <span className="emerald-badge">{listing.category || 'General'}</span>
                        <div className="meta-actions">
                            {isOwner ? (
                                <>
                                    <Link to={`/listings/edit/${id}`} className="action-circle edit">
                                        <Edit3 size={18} />
                                    </Link>
                                    <button
                                        className="action-circle delete"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className={`action-circle ${wishlisted ? 'active' : ''}`} onClick={handleWishlist}>
                                        <Heart size={20} fill={wishlisted ? "currentColor" : "none"} />
                                    </button>
                                    <button className="action-circle"><Share2 size={20} /></button>
                                </>
                            )}
                        </div>
                    </div>
                    <h1 className="text-gradient">{listing.title}</h1>
                    <div className="detail-price-elite">₹{listing.price.toLocaleString()}</div>
                </div>

                <div className="detail-specs glass">
                    <div className="spec-item">
                        <MapPin size={18} />
                        <span>{listing.city || 'Global'}</span>
                    </div>
                    <div className="spec-item">
                        <Calendar size={18} />
                        <span>Listed {new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="spec-item">
                        <Shield size={18} />
                        <span>Verified Exchange</span>
                    </div>
                </div>

                <div className="description-section">
                    <h3>The Narrative</h3>
                    <p className="description-elite">{listing.description}</p>
                </div>

                <div className="owner-section">
                    <h3>Guardian of this Item</h3>
                    <div className="owner-card-elite">
                        <div className="owner-avatar">
                            {listing.owner?.profile_image_url ? (
                                <img src={listing.owner.profile_image_url} alt={listing.owner.name} />
                            ) : (
                                <span>{listing.owner?.name?.[0] || 'U'}</span>
                            )}
                        </div>
                        <div className="owner-meta">
                            <span className="owner-name">{listing.owner?.name || 'Ecosystem Member'}</span>
                            <span className="owner-rating">★★★★★ · 4.9 Trust Score</span>
                        </div>
                        <Link to={`/users/${listing.owner_id}`} className="btn-link-elite">View Profile</Link>
                    </div>
                </div>

                {!isOwner && (
                    <div className="purchase-actions">
                        <Link to={`/chat/${listing.id}?seller=${listing.owner_id}`} className="btn-chat-premium">
                            <MessageSquare size={20} />
                            <span>Secure Negotiation</span>
                        </Link>
                        <p className="trust-footer">
                            <Shield size={12} />
                            Your payment is protected by Eco-Exchange Vault.
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
