import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

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
    is_active: boolean
    owner_id: number
    images: ProductImage[]
}

export default function MyProfilePage({ token }: { token: string | null }) {
    const [listings, setListings] = useState<Listing[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [user, setUser] = useState<{ name: string; email: string } | null>(null)

    useEffect(() => {
        if (!token) return

        const fetchData = async () => {
            try {
                const [meRes, listingsRes] = await Promise.all([
                    fetch(`${API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${API_URL}/listings/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                ])

                if (!meRes.ok || !listingsRes.ok) throw new Error('Failed to load profile data')

                const meData = await meRes.json()
                const listingsData = await listingsRes.json()

                setUser(meData)
                setListings(listingsData)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [token])

    if (loading) return <p className="loading-text">Loading profile...</p>

    return (
        <div className="my-profile-page">
            <header className="profile-hero">
                <div className="profile-avatar-large">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="profile-info-header">
                    <h1>{user?.name}</h1>
                    <p className="profile-email">{user?.email}</p>
                    <div className="profile-stats">
                        <span className="stat-item"><strong>{listings.length}</strong> Listings</span>
                    </div>
                </div>
            </header>

            <section className="my-listings-section">
                <div className="section-header">
                    <h2>My Posted Products</h2>
                    <Link to="/listings/new" className="add-listing-btn-small">+ Post New</Link>
                </div>

                {error && <p className="error">{error}</p>}

                {listings.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <p>You haven't posted any products yet.</p>
                        <Link to="/listings/new" className="browse-btn">Create your first listing</Link>
                    </div>
                ) : (
                    <div className="listings-grid">
                        {listings.map((item) => (
                            <Link key={item.id} to={`/listings/${item.id}`} className="listing-card-link">
                                <article className="listing-card">
                                    {item.images && item.images.length > 0 ? (
                                        <img src={item.images[0].url} alt={item.title} className="listing-card-image" />
                                    ) : (
                                        <div className="listing-card-no-image">No Image</div>
                                    )}
                                    <header>
                                        <h3>{item.title}</h3>
                                    </header>
                                    <p className="meta">{item.city || 'Unknown city'}</p>
                                    <div className="card-footer">
                                        <span className="price">₹{item.price.toLocaleString()}</span>
                                        <span className={`status-badge ${item.is_active ? 'active' : 'sold'}`}>
                                            {item.is_active ? 'Active' : 'Sold'}
                                        </span>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
