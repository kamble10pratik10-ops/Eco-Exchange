import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Globe, Package, ArrowRight, UserPlus, UserMinus, Calendar } from 'lucide-react'
import './HomePage.css'

const API_URL = 'http://127.0.0.1:8000'

export default function PublicProfilePage({ token }: { token: string | null }) {
  const { id } = useParams()
  const [profile, setProfile] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (!id || !token) return

    const fetchProfile = async () => {
      try {
        const [pRes, fRes] = await Promise.all([
          fetch(`${API_URL}/users/${id}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_URL}/users/${id}/follow-status`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ])

        if (pRes.ok) {
          const pData = await pRes.json()
          setProfile(pData)
        }
        if (fRes.ok) {
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
        const pRes = await fetch(`${API_URL}/users/${id}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        })
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

          <div className="profile-meta-row" style={{ display: 'flex', gap: '24px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={16} />
              <span>Global Citizen</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} />
              <span>Member since 2026</span>
            </div>
          </div>
        </div>
      </motion.section >

      <section className="profile-assets">
        <h2 className="text-gradient" style={{ marginBottom: '32px' }}>Member's Inventory</h2>
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
      </section>
    </div >
  )
}
