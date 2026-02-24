import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'

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

export default function ListingDetailPage({ token }: { token?: string | null }) {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [listing, setListing] = useState<Listing | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [chatLoading, setChatLoading] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<number | null>(null)
    const [mainImage, setMainImage] = useState<string | null>(null)
    const [sellerProfile, setSellerProfile] = useState<any>(null)
    const [isFollowing, setIsFollowing] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/listings/${id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                if (!res.ok) {
                    if (res.status === 404) throw new Error('Listing not found')
                    throw new Error('Failed to load listing')
                }
                const data = (await res.json()) as Listing
                setListing(data)
                setMainImage(data.images?.[0]?.url || null)

                // Fetch seller profile
                const sRes = await fetch(`${API_URL}/users/${data.owner_id}/profile`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                if (sRes.ok) {
                    setSellerProfile(await sRes.json())
                }

                // Fetch following status
                if (token) {
                    const fRes = await fetch(`${API_URL}/users/${data.owner_id}/follow-status`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                    if (fRes.ok) {
                        const fData = await fRes.json()
                        setIsFollowing(fData.is_following)
                    }
                }
            } catch (e: any) {
                setError(e.message ?? 'Error loading listing')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id, token])

    const handleFollowToggle = async () => {
        if (!token || !listing) return
        setFollowLoading(true)
        try {
            const endpoint = isFollowing ? 'unfollow' : 'follow'
            const res = await fetch(`${API_URL}/users/${listing.owner_id}/${endpoint}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                setIsFollowing(!isFollowing)
                // Refresh seller profile for new counts
                const sRes = await fetch(`${API_URL}/users/${listing.owner_id}/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (sRes.ok) {
                    setSellerProfile(await sRes.json())
                }
            }
        } catch (err) {
            console.error('Follow error:', err)
        } finally {
            setFollowLoading(false)
        }
    }

    // Get current user
    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => setCurrentUserId(data.id))
            .catch(() => { })
    }, [token])

    const [wishlistLoading, setWishlistLoading] = useState(false)
    const [isInWishlist, setIsInWishlist] = useState(false)

    useEffect(() => {
        if (!token || !id) return
        // Check if item is in wishlist
        fetch(`${API_URL}/wishlist`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setIsInWishlist(data.some((item: any) => item.listing_id === Number(id)))
                }
            })
            .catch(() => { })
    }, [id, token])

    const handleWishlistToggle = async () => {
        if (!token || !listing) return
        setWishlistLoading(true)
        try {
            if (isInWishlist) {
                const res = await fetch(`${API_URL}/wishlist/${listing.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (res.ok) setIsInWishlist(false)
            } else {
                const res = await fetch(`${API_URL}/wishlist/${listing.id}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (res.ok) setIsInWishlist(true)
            }
        } catch (err) {
            console.error('Wishlist error:', err)
        } finally {
            setWishlistLoading(false)
        }
    }

    const handleChatWithSeller = async () => {
        if (!token || !listing) return
        setChatLoading(true)
        try {
            const res = await fetch(`${API_URL}/chat/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ listing_id: listing.id }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || 'Failed to start chat')
            }
            const conv = await res.json()
            navigate(`/chat/${conv.id}`)
        } catch (err: any) {
            alert(err.message || 'Could not start chat')
        } finally {
            setChatLoading(false)
        }
    }

    if (loading) return <p className="loading-text">Loading listing…</p>
    if (error)
        return (
            <div className="listing-detail">
                <p className="error">{error}</p>
                <Link to="/" className="back-link">
                    ← Back to listings
                </Link>
            </div>
        )
    if (!listing) return null

    const isOwner = currentUserId === listing.owner_id

    return (
        <div className="listing-detail">
            <Link to="/" className="back-link">
                ← Back to listings
            </Link>

            <div className="detail-card">
                {mainImage && (
                    <div className="detail-image-wrapper">
                        <div className="detail-image-container">
                            <img src={mainImage} alt={listing.title} className="detail-image" />
                        </div>
                        {listing.images.length > 1 && (
                            <div className="detail-thumbnails">
                                {listing.images.map((img) => (
                                    <div
                                        key={img.id}
                                        className={`thumbnail-item ${mainImage === img.url ? 'active' : ''}`}
                                        onClick={() => setMainImage(img.url)}
                                    >
                                        <img src={img.url} alt="Thumbnail" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <div className="detail-header">
                    <h2>{listing.title}</h2>
                    <span className="detail-price">₹{listing.price.toLocaleString()}</span>
                </div>

                <div className="detail-tags">
                    {listing.category && (
                        <span className="detail-tag">{listing.category}</span>
                    )}
                    {listing.city && (
                        <span className="detail-tag">{listing.city}</span>
                    )}
                    <span className={`detail-tag ${listing.is_active ? 'tag-active' : 'tag-inactive'}`}>
                        {listing.is_active ? 'Active' : 'Sold'}
                    </span>
                </div>

                <div className="detail-section">
                    <h3>Description</h3>
                    <p>{listing.description}</p>
                </div>

                <div className="detail-section seller-info-detail">
                    <div className="seller-header">
                        <h3>Seller Information</h3>
                        {token && !isOwner && (
                            <button
                                className={`follow-btn ${isFollowing ? 'following' : ''}`}
                                onClick={handleFollowToggle}
                                disabled={followLoading}
                            >
                                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>
                    <div className="seller-meta">
                        <Link to={`/users/${listing.owner_id}`} className="seller-link">
                            <div className="seller-avatar-small">
                                {sellerProfile?.profile_image_url ? (
                                    <img src={sellerProfile.profile_image_url} alt={sellerProfile.name} />
                                ) : (
                                    sellerProfile?.name?.[0].toUpperCase() || 'S'
                                )}
                            </div>
                        </Link>
                        <div className="seller-details">
                            <Link to={`/users/${listing.owner_id}`} className="seller-link">
                                <span className="seller-name">{sellerProfile?.name || `Seller #${listing.owner_id}`}</span>
                            </Link>
                            <span className="seller-stats">
                                {sellerProfile?.followers_count || 0} Followers • {sellerProfile?.following_count || 0} Following
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions section */}
                <div className="detail-section detail-chat-section">
                    {!token ? (
                        <Link to="/login" className="chat-seller-btn chat-seller-login">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            Login to Chat with Seller
                        </Link>
                    ) : isOwner ? (
                        <div className="owner-section">
                            <div className="owner-badge">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></svg>
                                You are the seller of this listing
                            </div>
                            <div className="owner-actions">
                                <button
                                    className="chat-seller-btn edit-btn"
                                    onClick={() => navigate(`/listings/edit/${listing.id}`)}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    Edit Listing
                                </button>
                                <button
                                    className="chat-seller-btn delete-listing-btn"
                                    onClick={async () => {
                                        if (window.confirm('Are you sure you want to delete this listing?')) {
                                            try {
                                                const res = await fetch(`${API_URL}/listings/${id}`, {
                                                    method: 'DELETE',
                                                    headers: { Authorization: `Bearer ${token}` },
                                                })
                                                if (!res.ok) throw new Error('Failed to delete listing')
                                                navigate('/')
                                            } catch (e: any) {
                                                alert(e.message)
                                            }
                                        }
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                    Delete Listing
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="buyer-actions">
                            <button
                                className={`chat-seller-btn wishlist-btn ${isInWishlist ? 'active' : ''}`}
                                onClick={handleWishlistToggle}
                                disabled={wishlistLoading}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill={isInWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                            </button>
                            <button
                                className="chat-seller-btn"
                                onClick={handleChatWithSeller}
                                disabled={chatLoading}
                            >
                                {chatLoading ? (
                                    <div className="chat-send-spinner"></div>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                )}
                                {chatLoading ? 'Starting chat…' : 'Chat with Seller'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
