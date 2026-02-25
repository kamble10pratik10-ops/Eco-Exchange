import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    TreePine,
    TrendingUp,
    ShoppingBag,
    Users,
    PlusCircle,
    MessageSquare,
    ArrowUpRight,
    Shield,
    Zap
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
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token) return
        // Mocking elaborate stats for the "Elite" version
        setTimeout(() => {
            setStats({
                total_listings: 12,
                total_messages: 45,
                total_views: 1204,
                co2_saved: 156
            })
            setLoading(false)
        }, 1000)
    }, [token])

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
                    <h3>Recent Ecosystem Activity</h3>
                    <div className="activity-list" style={{ marginTop: '24px' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="activity-item" style={{ padding: '16px 0', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'var(--surface-glass-bright)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Zap size={16} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>Engagement on "Vintage Camera"</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2 hours ago</div>
                                    </div>
                                </div>
                                <ArrowUpRight size={16} color="var(--text-secondary)" />
                            </div>
                        ))}
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
        </div>
    )
}
