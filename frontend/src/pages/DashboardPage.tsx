import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    TreePine,
    TrendingUp,
    ShoppingBag,
    PlusCircle,
    MessageSquare,
    Shield,
    Zap,
    CheckCircle2,
    Star,
    Camera,
    AlertCircle,
    Package
} from 'lucide-react'
import './DashboardPage.css'

const API_URL = 'http://127.0.0.1:8000'

export default function DashboardPage({ token }: { token: string | null }) {
    const [stats, setStats] = useState({
        total_listings: 0,
        total_messages: 0,
        total_views: 0,
        co2_saved: 0
    })
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [reviewOrder, setReviewOrder] = useState<any | null>(null)
    const [reviewData, setReviewData] = useState({ rating: 10, comment: '', media_url: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!token) return

        const fetchData = async () => {
            try {
                const ordRes = await fetch(`${API_URL}/orders`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (ordRes.ok) {
                    const data = await ordRes.json()
                    setOrders(data)
                }

                setStats({
                    total_listings: 12,
                    total_messages: 45,
                    total_views: 1204,
                    co2_saved: 156
                })
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [token])

    const handleCompleteOrder = async (orderId: number) => {
        try {
            const res = await fetch(`${API_URL}/orders/${orderId}/complete`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'completed' } : o))
            }
        } catch (err) { console.error(err) }
    }

    const handleSubmitReview = async () => {
        if (!reviewOrder) return
        setIsSubmitting(true)
        try {
            const res = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    order_id: reviewOrder.id,
                    rating: reviewData.rating,
                    comment: reviewData.comment,
                    media_url: reviewData.media_url
                })
            })
            if (res.ok) {
                setReviewOrder(null)
                setReviewData({ rating: 10, comment: '', media_url: '' })
            } else {
                const err = await res.json()
                alert(err.detail || "Verification failed")
            }
        } catch (err) { console.error(err) }
        finally { setIsSubmitting(false) }
    }

    if (loading) return <div className="loading-container-elite"><span>Compiling your impact...</span></div>

    return (
        <div className="dashboard-elite">
            <motion.section
                className="dashboard-hero"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="hero-text">
                    <div className="emerald-badge" style={{ marginBottom: '16px', display: 'inline-flex' }}>
                        Prestige Account
                    </div>
                    <h1 className="text-gradient">Your Sustainable<br />Command Center</h1>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', fontSize: '1.1rem' }}>
                        Tracking your contribution to the circular economy. Every trade you make reduces waste and empowers the community.
                    </p>
                </div>
                <div className="impact-visualization">
                    <TreePine className="glass-tree-icon" />
                </div>
            </motion.section>

            <div className="stats-overview-elite">
                <motion.div className="stat-card-premium" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <TrendingUp size={24} className="emerald-glow" />
                    <span className="stat-value">{stats.total_views}</span>
                    <span className="stat-label">Total Gaze</span>
                </motion.div>

                <motion.div className="stat-card-premium" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <ShoppingBag size={24} style={{ color: 'var(--accent-gold)' }} />
                    <span className="stat-value">{stats.total_listings}</span>
                    <span className="stat-label">Inventory Assets</span>
                </motion.div>

                <motion.div className="stat-card-premium" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <TreePine size={24} className="emerald-glow" />
                    <span className="stat-value">{stats.co2_saved}kg</span>
                    <span className="stat-label">CO2 Mitigated</span>
                </motion.div>
            </div>

            <div className="dashboard-grid">
                <section className="activity-pane">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3>Ecosystem Trade Records</h3>
                    </div>

                    <div className="activity-list">
                        {(!orders || orders.length === 0) ? (
                            <div className="empty-state-small glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <Package size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                <p>No active trade transmissions found.</p>
                            </div>
                        ) : (
                            orders.map(order => (
                                <div key={order.id} className="activity-item-premium glass" style={{ padding: '20px', borderRadius: '16px', marginBottom: '16px', border: '1px solid var(--border-glass)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div className="order-icon-wrap" style={{
                                                width: '48px', height: '48px',
                                                background: order.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {order.status === 'completed' ? <CheckCircle2 size={24} color="#10b981" /> : <Zap size={24} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                                    Order #{order.id} • {order.items?.[0]?.listing?.title || 'Asset Exchange'}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    Transmission Date: {new Date(order.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`status-pill ${order.status}`} style={{
                                            padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                            background: order.status === 'completed' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                                            color: order.status === 'completed' ? '#10b981' : 'var(--text-primary)'
                                        }}>
                                            {order.status.toUpperCase()}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                                        {order.status === 'pending' && (
                                            <button
                                                onClick={() => handleCompleteOrder(order.id)}
                                                className="btn-complete-elite"
                                                style={{ padding: '8px 16px', borderRadius: '8px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                            >
                                                <CheckCircle2 size={16} />
                                                <span>Finalize Trade</span>
                                            </button>
                                        )}
                                        {order.status === 'completed' && (
                                            <button
                                                onClick={() => setReviewOrder(order)}
                                                className="btn-review-elite"
                                                style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--surface-glass-bright)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                            >
                                                <Star size={16} className="gold-glow" />
                                                <span>Anchor Review</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="quick-actions-pane">
                    <h3>Quick Commands</h3>
                    <div className="action-grid-elite">
                        <Link to="/listings/new" className="btn-dashboard-action">
                            <PlusCircle size={20} />
                            <span>Deploy Asset</span>
                        </Link>
                        <Link to="/messages" className="btn-dashboard-action">
                            <MessageSquare size={20} />
                            <span>Open Comms</span>
                        </Link>
                        <Link to="/profile" className="btn-dashboard-action">
                            <Shield size={20} />
                            <span>Identity Vault</span>
                        </Link>
                    </div>
                </section>
            </div>

            {/* Review Modal with Media Verification (Timestamp Rule) */}
            {reviewOrder && (
                <div className="modal-overlay glass-heavy" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="modal-card glass-bright"
                        style={{ width: '100%', maxWidth: '600px', padding: '40px', borderRadius: '24px', border: '1px solid var(--accent-emerald-dim)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                            <div>
                                <h2 className="text-gradient">Trade Verification</h2>
                                <p style={{ color: 'var(--text-secondary)' }}>Anchor your experience for the community</p>
                            </div>
                            <button onClick={() => setReviewOrder(null)} className="btn-close-elite">×</button>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Trust Rating (Confidence)</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => setReviewData({ ...reviewData, rating: star })}
                                        style={{
                                            width: '40px', height: '40px', borderRadius: '8px',
                                            background: star <= reviewData.rating ? 'var(--accent-gold)' : 'var(--surface-glass-bright)',
                                            border: 'none', cursor: 'pointer', color: star <= reviewData.rating ? '#000' : '#fff',
                                            fontWeight: 700
                                        }}
                                    >
                                        {star}
                                    </button>
                                ))}
                            </div>
                            {reviewData.rating < 4 && (
                                <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <AlertCircle size={14} />
                                    <span>WARNING: Ratings below 4 trigger an automatic dispute freeze.</span>
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Debrief / Comment</label>
                            <textarea
                                value={reviewData.comment}
                                onChange={e => setReviewData({ ...reviewData, comment: e.target.value })}
                                style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#fff', minHeight: '100px' }}
                                placeholder="Describe the item condition and trade experience..."
                            />
                        </div>

                        <div className="media-verification-section" style={{
                            padding: '24px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.05)',
                            border: '1px dashed var(--accent-emerald)', marginBottom: '32px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <Camera size={20} color="var(--accent-emerald)" />
                                <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>Media Verification Rule</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                You MUST upload a photo of the item featuring a handwritten note with your **Username** and **Today's Date**.
                            </p>
                            <input
                                type="text"
                                placeholder="Paste Media/Image URL (Cloudinary Link)"
                                value={reviewData.media_url}
                                onChange={e => setReviewData({ ...reviewData, media_url: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', color: '#fff' }}
                            />
                        </div>

                        <button
                            onClick={handleSubmitReview}
                            disabled={isSubmitting || !reviewData.media_url}
                            className="btn-studio-primary"
                            style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
                        >
                            {isSubmitting ? 'Verifying Integrity...' : 'Verify & Submit Anchor'}
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
