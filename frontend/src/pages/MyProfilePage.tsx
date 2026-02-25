import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Package, ArrowRight, ShieldCheck, Globe, Settings } from 'lucide-react'
import './HomePage.css'

const API_URL = 'http://127.0.0.1:8000'

type UserProfile = {
  id: number
  name: string
  email: string
  phone: string
  profile_image_url?: string
  followers_count?: number
  following_count?: number
  listings: any[]
}

export default function MyProfilePage({ token }: { token: string | null }) {
  const { id } = useParams()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If no ID is provided, we're viewing our own profile
    const target = id ? `/users/${id}` : '/auth/me'
    fetch(`${API_URL}${target}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setLoading(false)
      })
  }, [id, token])

  if (loading) return <div className="loading-container-elite"><span>Retrieving community record...</span></div>
  if (!profile) return <div className="error-card glass">Profile not found</div>

  return (
    <div className="community-profile-elite" style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
      <motion.section
        className="profile-header-premium"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '60px',
          background: 'var(--surface-glass)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          gap: '40px',
          alignItems: 'center'
        }}
      >
        <div className="profile-avatar-large" style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'var(--surface-glass-bright)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid var(--accent-emerald)',
          fontSize: '3.5rem',
          fontWeight: '700',
          color: 'var(--accent-emerald)',
          boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)',
          overflow: 'hidden'
        }}>
          {profile.profile_image_url ? (
            <img src={profile.profile_image_url} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            profile.name?.[0] || 'U'
          )}
        </div>

        <div className="profile-info-main" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h1 style={{ margin: 0, fontSize: '3rem' }} className="text-gradient">{profile.name}</h1>
              <ShieldCheck size={28} className="emerald-glow" />
            </div>

            {!id && (
              <Link to="/profile" className="btn-studio-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                <Settings size={16} />
                <span>Manage Identity</span>
              </Link>
            )}
          </div>

          <div className="profile-stats-row" style={{ display: 'flex', gap: '32px', marginBottom: '24px' }}>
            <div className="stat-item-elite">
              <span className="stat-value">{profile.followers_count || 0}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-item-elite">
              <span className="stat-value">{profile.following_count || 0}</span>
              <span className="stat-label">Following</span>
            </div>
            <div className="stat-item-elite">
              <span className="stat-value">{profile.listings?.length || 0}</span>
              <span className="stat-label">Assets</span>
            </div>
          </div>

          <div className="profile-meta-row" style={{ display: 'flex', gap: '24px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={16} />
              <span>Global Citizen</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} />
              <span>Joined Feb 2026</span>
            </div>
          </div>
        </div>
      </motion.section >

      <section className="profile-assets">
        <h2 className="text-gradient" style={{ marginBottom: '32px' }}>Active Inventory</h2>
        {(!profile.listings || profile.listings.length === 0) ? (
          <div className="empty-state-elite">
            <Package size={48} />
            <p>No active catalog assets found.</p>
          </div>
        ) : (
          <div className="listing-grid-elite">
            {profile.listings.map((item: any) => (
              <motion.div key={item.id} className="elite-card-wrap">
                <article className="elite-card">
                  {/* Reuse simplified card content */}
                  <div className="card-image-wrap">
                    <img src={item.images?.[0]?.url || 'https://placehold.co/400x400/1e293b/10b981?text=Listing'} alt="" className="elite-card-image" />
                  </div>
                  <div className="card-content-elite">
                    <h3 className="card-title-elite">{item.title}</h3>
                    <div className="card-footer-elite">
                      <span className="price-elite">₹{item.price.toLocaleString()}</span>
                      <Link to={`/listings/${item.id}`} className="btn-view-elite">
                        <ArrowRight size={18} />
                      </Link>
                    </div>
                  </div>
                </article>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div >
  )
}
