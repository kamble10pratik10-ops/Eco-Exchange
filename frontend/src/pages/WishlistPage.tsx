import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

type WishlistItem = {
    id: number
    listing_id: number
    listing: Listing
}

export default function WishlistPage({ token }: { token?: string | null }) {
    const [items, setItems] = useState<WishlistItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [checkoutLoading, setCheckoutLoading] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) return
        loadWishlist()
    }, [token])

    const loadWishlist = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/wishlist`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to load wishlist')
            const data = await res.json()
            setItems(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const removeFromWishlist = async (listingId: number) => {
        try {
            const res = await fetch(`${API_URL}/wishlist/${listingId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to remove item')
            setItems(items.filter((item) => item.listing_id !== listingId))
        } catch (err: any) {
            alert(err.message)
        }
    }

    const handleCheckout = async () => {
        if (!window.confirm('Are you sure you want to place an order for all items in your wishlist?')) return
        setCheckoutLoading(true)
        try {
            const res = await fetch(`${API_URL}/wishlist/checkout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || 'Checkout failed')
            }
            alert('Order placed successfully!')
            setItems([])
            // Maybe navigate to an orders page? For now back home
            navigate('/')
        } catch (err: any) {
            alert(err.message)
        } finally {
            setCheckoutLoading(false)
        }
    }

    if (loading) return <p className="loading-text">Loading wishlist…</p>

    return (
        <div className="wishlist-page">
            <header className="page-header">
                <h1>My Wishlist</h1>
                <p className="subtitle">Items you've saved to buy later</p>
            </header>

            {error && <p className="error">{error}</p>}

            {items.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">❤️</div>
                    <h3>Your wishlist is empty</h3>
                    <p>Browse listings and add items you're interested in.</p>
                    <Link to="/" className="browse-btn">Browse Listings</Link>
                </div>
            ) : (
                <>
                    <div className="wishlist-grid">
                        {items.map((item) => (
                            <div key={item.id} className="wishlist-card">
                                <Link to={`/listings/${item.listing_id}`} className="card-link">
                                    <div className="card-image">
                                        {item.listing.images.length > 0 ? (
                                            <img src={item.listing.images[0].url} alt={item.listing.title} />
                                        ) : (
                                            <div className="no-image">No Image</div>
                                        )}
                                    </div>
                                    <div className="card-content">
                                        <h3 className="card-title">{item.listing.title}</h3>
                                        <div className="card-price">₹{item.listing.price.toLocaleString()}</div>
                                        <div className="card-location">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                            {item.listing.city || 'Unknown'}
                                        </div>
                                    </div>
                                </Link>
                                <div className="card-actions">
                                    <button
                                        className="remove-btn"
                                        onClick={() => removeFromWishlist(item.listing_id)}
                                        title="Remove from wishlist"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="wishlist-footer">
                        <div className="total-summary">
                            <span className="total-label">Total Amount:</span>
                            <span className="total-value">₹{items.reduce((sum, item) => sum + item.listing.price, 0).toLocaleString()}</span>
                        </div>
                        <button
                            className="checkout-btn"
                            onClick={handleCheckout}
                            disabled={checkoutLoading}
                        >
                            {checkoutLoading ? 'Processing…' : 'Place Order Now'}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
