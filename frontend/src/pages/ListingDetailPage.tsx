import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

type Listing = {
    id: number
    title: string
    description: string
    price: number
    category?: string | null
    city?: string | null
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

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/listings/${id}`)
                if (!res.ok) {
                    if (res.status === 404) throw new Error('Listing not found')
                    throw new Error('Failed to load listing')
                }
                const data = (await res.json()) as Listing
                setListing(data)
            } catch (e: any) {
                setError(e.message ?? 'Error loading listing')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

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

                <div className="detail-section">
                    <h3>Seller info</h3>
                    <p className="meta">Seller ID: #{listing.owner_id}</p>
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
                    )}
                </div>
            </div>
        </div>
    )
}
