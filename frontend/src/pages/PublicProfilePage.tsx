import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

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

type UserProfile = {
    id: number
    name: string
    email: string
    profile_image_url?: string | null
    followers_count: number
    following_count: number
}

export default function PublicProfilePage({ token }: { token: string | null }) {
    const { id: userId } = useParams<{ id: string }>()
    const [listings, setListings] = useState<Listing[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [user, setUser] = useState<UserProfile | null>(null)
    const [isFollowing, setIsFollowing] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<number | null>(null)

    // Get current user for comparison (don't show follow button on own profile)
    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => setCurrentUserId(data.id))
            .catch(() => { })
    }, [token])

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return
            try {
                const [profileRes, listingsRes, statusRes] = await Promise.all([
                    fetch(`${API_URL}/users/${userId}/profile`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                    }),
                    fetch(`${API_URL}/users/${userId}/listings`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                    }),
                    token ? fetch(`${API_URL}/users/${userId}/follow-status`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }) : Promise.resolve(null)
                ])

                if (!profileRes.ok || !listingsRes.ok) throw new Error('User not found')

                setUser(await profileRes.json())
                setListings(await listingsRes.json())

                if (statusRes && statusRes.ok) {
                    const statusData = await statusRes.json()
                    setIsFollowing(statusData.is_following)
                }
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [userId, token])

    const handleFollowToggle = async () => {
        if (!token || !user) return
        setFollowLoading(true)
        try {
            const endpoint = isFollowing ? 'unfollow' : 'follow'
            const res = await fetch(`${API_URL}/users/${user.id}/${endpoint}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                setIsFollowing(!isFollowing)
                // Refresh counts
                const sRes = await fetch(`${API_URL}/users/${user.id}/profile`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                if (sRes.ok) {
                    setUser(await sRes.json())
                }
            }
        } catch (err) {
            console.error('Follow error:', err)
        } finally {
            setFollowLoading(false)
        }
    }

    if (loading) return <p className="loading-text">Loading profile...</p>
    if (error) return <div className="app-main"><p className="error">{error}</p></div>

    const isMe = currentUserId === Number(userId)

    return (
        <div className="my-profile-page">
            <header className="profile-hero">
                <div className="profile-avatar-large">
                    {user?.profile_image_url ? (
                        <img src={user.profile_image_url} alt={user.name} />
                    ) : (
                        user?.name?.charAt(0).toUpperCase() || 'U'
                    )}
                </div>
                <div className="profile-info-header">
                    <div className="profile-title-row">
                        <h1>{user?.name}</h1>
                        {token && !isMe && (
                            <button
                                className={`follow-btn ${isFollowing ? 'following' : ''}`}
                                onClick={handleFollowToggle}
                                disabled={followLoading}
                            >
                                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>
                    <p className="profile-email">{user?.email}</p>
                    <div className="profile-stats">
                        <span className="stat-item"><strong>{listings.length}</strong> Listings</span>
                        <span className="stat-item"><strong>{user?.followers_count}</strong> Followers</span>
                        <span className="stat-item"><strong>{user?.following_count}</strong> Following</span>
                    </div>
                </div>
            </header>

            <section className="my-listings-section">
                <div className="section-header">
                    <h2>{isMe ? 'My Posts' : `Posts by ${user?.name}`}</h2>
                </div>

                {listings.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <p>No listings found for this user.</p>
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
