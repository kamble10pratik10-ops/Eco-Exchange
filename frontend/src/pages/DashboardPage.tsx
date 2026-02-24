import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

type DashStats = {
    active_listings_count: number
    sold_listings_count: number
    total_followers: number
    total_following: number
    wishlist_count: number
    unread_messages_count: number
    total_listings_value: number
    recent_activity: {
        type: string
        title: string
        timestamp: string
        id?: number
    }[]
}

export default function DashboardPage({ token }: { token: string | null }) {
    const [stats, setStats] = useState<DashStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/auth/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to load dashboard')
                return res.json()
            })
            .then(data => setStats(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [token])

    if (loading) return <div className="loading-state">Generating your insights...</div>
    if (error) return <div className="error-card">{error}</div>
    if (!stats) return null

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Insights Dashboard</h1>
                <p>Your marketplace performance at a glance</p>
            </header>

            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-glass-effect"></div>
                    <div className="stat-icon">💰</div>
                    <div className="stat-data">
                        <span className="stat-label">Inventory Worth</span>
                        <h3 className="stat-value">₹{stats.total_listings_value.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="stat-card vibrant">
                    <div className="stat-glass-effect"></div>
                    <div className="stat-icon">📦</div>
                    <div className="stat-data">
                        <span className="stat-label">Active Listing</span>
                        <h3 className="stat-value">{stats.active_listings_count}</h3>
                    </div>
                </div>

                <div className="stat-card info">
                    <div className="stat-glass-effect"></div>
                    <div className="stat-icon">💬</div>
                    <div className="stat-data">
                        <span className="stat-label">Messages</span>
                        <h3 className="stat-value">{stats.unread_messages_count}</h3>
                    </div>
                </div>

                <div className="stat-card success">
                    <div className="stat-glass-effect"></div>
                    <div className="stat-icon">🤝</div>
                    <div className="stat-data">
                        <span className="stat-label">Sold Items</span>
                        <h3 className="stat-value">{stats.sold_listings_count}</h3>
                    </div>
                </div>
            </div>

            <div className="dashboard-main">
                <div className="activity-card">
                    <div className="card-header">
                        <h3>Recent Updates</h3>
                    </div>
                    <div className="activity-list">
                        {stats.recent_activity.length === 0 ? (
                            <p className="empty-text">No recent activity recorded.</p>
                        ) : (
                            stats.recent_activity.map((act, i) => (
                                <div key={i} className="activity-item">
                                    <div className="activity-marker"></div>
                                    <div className="activity-body">
                                        <p className="act-title">{act.title}</p>
                                        <span className="act-time">{act.timestamp}</span>
                                    </div>
                                    {act.id && (
                                        <Link to={`/listings/${act.id}`} className="act-link">Details</Link>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="dashboard-side">
                    <div className="social-summary">
                        <div className="social-box">
                            <strong>{stats.total_followers}</strong>
                            <span>Followers</span>
                        </div>
                        <div className="social-divider"></div>
                        <div className="social-box">
                            <strong>{stats.total_following}</strong>
                            <span>Following</span>
                        </div>
                    </div>

                    <div className="wishlist-summary">
                        <div className="wish-content">
                            <h4>Saved Items</h4>
                            <p>You have <strong>{stats.wishlist_count}</strong> items in your wishlist.</p>
                        </div>
                        <Link to="/wishlist" className="wish-btn">Go to Wishlist</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
