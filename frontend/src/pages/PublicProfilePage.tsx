import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Package, ArrowRight, UserPlus, UserMinus, ThumbsUp, TrendingUp, Handshake, AlertCircle } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import './HomePage.css'

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:8000`
  : 'http://127.0.0.1:8000'

export default function PublicProfilePage({ token }: { token: string | null }) {
  const { id } = useParams()
  const [profile, setProfile] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'inventory' | 'reviews'>('inventory')

  useEffect(() => {
    if (!id) return

    const fetchProfile = async () => {
      try {
        const fetchers = [
          fetch(`${API_URL}/users/${id}/profile`)
        ]

        if (token) {
          fetchers.push(fetch(`${API_URL}/users/${id}/follow-status`, {
            headers: { Authorization: `Bearer ${token}` }
          }))
        }

        const [pRes, fRes] = await Promise.all(fetchers)

        if (pRes.ok) {
          const pData = await pRes.json()
          setProfile(pData)
        }
        if (fRes && fRes.ok) {
          const fData = await fRes.json()
          setIsFollowing(fData.is_following)
        }
      } catch (err) {
        console.error("Failed to load community profile", err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [id, token])

  const handleVouch = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/users/${id}/vouch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        // Refresh profile
        const pRes = await fetch(`${API_URL}/users/${id}/profile`)
        if (pRes.ok) setProfile(await pRes.json())
      }
    } catch (err) { console.error(err) }
  }

  const handleFollow = async () => {
    if (!token || followLoading) return
    setFollowLoading(true)
    try {
      const endpoint = isFollowing ? 'unfollow' : 'follow'
      const res = await fetch(`${API_URL}/users/${id}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setIsFollowing(!isFollowing)
        // Refresh counts
        const pRes = await fetch(`${API_URL}/users/${id}/profile`)
        if (pRes.ok) setProfile(await pRes.json())
      }
    } catch (err) {
      console.error("Follow action failed", err)
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) return <div className="loading-container-elite"><span>Retrieving community record...</span></div>
  if (!profile) return <div className="error-card glass">Profile not found</div>

  return (
    <div className="community-profile-elite" style={{ display: 'flex', flexDirection: 'column', gap: '60px', paddingBottom: '100px' }}>
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
          alignItems: 'center',
          position: 'relative'
        }}
      >
        <div className="profile-avatar-large" style={{
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'var(--surface-glass-bright)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid var(--accent-emerald)',
          fontSize: '4rem',
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

            <button
              className={`btn-studio-primary ${isFollowing ? 'outline' : ''}`}
              onClick={handleFollow}
              disabled={followLoading}
              style={{
                background: isFollowing ? 'transparent' : 'var(--accent-emerald)',
                border: isFollowing ? '1px solid var(--border-glass)' : 'none',
                color: isFollowing ? 'var(--text-primary)' : '#000'
              }}
            >
              {isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
              <span>{isFollowing ? 'Unfollow' : 'Follow Member'}</span>
            </button>
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

          <div className="profile-meta-row" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div className="trust-badge-elite" style={{
              background: profile.has_active_disputes ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: profile.has_active_disputes ? '#ef4444' : '#10b981',
              padding: '8px 16px',
              borderRadius: '12px',
              border: `1px solid ${profile.has_active_disputes ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700
            }}>
              <TrendingUp size={18} />
              <span>Trust Score: {profile.trust_score}/10</span>
              {profile.has_active_disputes && (
                <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.75rem' }}>
                  <AlertCircle size={14} />
                  <span>Frozen Score (Active Dispute)</span>
                </div>
              )}
            </div>

            <button
              onClick={handleVouch}
              className="btn-vouch-elite"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)',
                padding: '8px 16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <ThumbsUp size={16} />
              <span>Vouch Member</span>
            </button>
          </div>

          <div className="trust-bars-elite" style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div className="trust-metric">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Handshake size={14} color="var(--accent-emerald)" />
                  <span>Successful Trades</span>
                </div>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{profile.successful_trades_count} Completed</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (profile.successful_trades_count / 20) * 100)}%` }}
                  style={{ height: '100%', background: 'var(--accent-emerald)', boxShadow: '0 0 10px var(--accent-emerald)' }}
                />
              </div>
            </div>

            <div className="trust-metric">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ThumbsUp size={14} color="#3b82f6" />
                  <span>Community Vouches</span>
                </div>
                <span style={{ color: '#3b82f6', fontWeight: 700 }}>{profile.community_vouches_count} Social Credit</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (profile.community_vouches_count / 50) * 100)}%` }}
                  style={{ height: '100%', background: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.section >

      <div className="profile-tabs-elite" style={{ display: 'flex', gap: '40px', borderBottom: '1px solid var(--border-glass)', marginBottom: '40px' }}>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '16px 8px',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'inventory' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'inventory' ? '2px solid var(--accent-emerald)' : 'none',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Active Inventory
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          style={{
            padding: '16px 8px',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'reviews' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'reviews' ? '2px solid var(--accent-emerald)' : 'none',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Ecosystem Proof ({profile.received_reviews?.length || 0})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'inventory' ? (
          <motion.section
            key="inventory"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="profile-assets"
          >
            {(!profile.listings || profile.listings.length === 0) ? (
              <div className="empty-state-elite">
                <Package size={48} />
                <p>No active catalog assets found from this member.</p>
              </div>
            ) : (
              <div className="listing-grid-elite">
                {profile.listings.map((item: any) => (
                  <motion.div key={item.id} className="elite-card-wrap">
                    <article className="elite-card">
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
          </motion.section>
        ) : (
          <motion.section
            key="reviews"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="profile-reviews"
          >
            {(!profile.received_reviews || profile.received_reviews.length === 0) ? (
              <div className="empty-state-elite">
                <ShieldCheck size={48} />
                <p>This member has yet to anchor their legacy with verified trades.</p>
              </div>
            ) : (
              <div className="reviews-list-elite" style={{ display: 'grid', gap: '24px' }}>
                {profile.received_reviews.map((rev: any) => (
                  <div key={rev.id} className="review-card-elite glass" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="stars-elite" style={{ color: 'var(--accent-gold)', display: 'flex', gap: '2px' }}>
                          {[...Array(10)].map((_, i) => (
                            <span key={i} style={{ opacity: i < rev.rating ? 1 : 0.2 }}>★</span>
                          ))}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{rev.rating}/10</span>
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Verified Trade Record</span>
                    </div>

                    <p style={{ margin: '0 0 16px', fontStyle: 'italic', color: 'var(--text-primary)' }}>"{rev.comment}"</p>

                    {rev.order?.items?.[0] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <img
                          src={rev.order.items[0].listing?.images?.[0]?.url || 'https://placehold.co/50x50'}
                          alt=""
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                        <div>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Verified Asset Recieved</span>
                          <span style={{ fontWeight: 600 }}>{rev.order.items[0].listing?.title}</span>
                        </div>
                      </div>
                    )}

                    {rev.media_url && (
                      <div style={{ marginTop: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                        <img src={rev.media_url} alt="Review verification" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} />
                        <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '8px', fontSize: '0.7rem', textAlign: 'center', fontWeight: 700 }}>
                          <ShieldCheck size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          MEDIA VERIFIED: TIMESTAMP & SIGNATURE CHECK COMPLETED
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
