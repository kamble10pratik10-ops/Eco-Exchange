import { useEffect, useState, useRef } from 'react'
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
  is_active: boolean
  owner_id: number
  images: ProductImage[]
}

export default function HomePage({ token }: { token: string | null }) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [listingsRes, wishlistRes] = await Promise.all([
          fetch(`${API_URL}/listings`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          token ? fetch(`${API_URL}/wishlist`, {
            headers: { Authorization: `Bearer ${token}` },
          }) : Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as any)
        ])

        if (!listingsRes.ok) throw new Error('Failed to load listings')
        const listingsData = (await listingsRes.json()) as Listing[]
        setListings(listingsData)

        if (wishlistRes.ok) {
          const wishlistData = await wishlistRes.json()
          setWishlistIds(new Set(wishlistData.map((item: any) => item.listing_id)))
        }
      } catch (e: any) {
        setError(e.message ?? 'Error loading listings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => setCurrentUserId(data.id))
        .catch(() => { })
    } else {
      setCurrentUserId(null)
    }
  }, [token])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleWishlistToggle = async (e: React.MouseEvent, listingId: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!token) {
      navigate('/login')
      return
    }

    const isInWishlist = wishlistIds.has(listingId)
    try {
      if (isInWishlist) {
        const res = await fetch(`${API_URL}/wishlist/${listingId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const newIds = new Set(wishlistIds)
          newIds.delete(listingId)
          setWishlistIds(newIds)
        }
      } else {
        const res = await fetch(`${API_URL}/wishlist/${listingId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const newIds = new Set(wishlistIds)
          newIds.add(listingId)
          setWishlistIds(newIds)
        }
      }
    } catch (err) {
      console.error('Wishlist error:', err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!token) return
    if (!window.confirm('Are you sure you want to delete this listing?')) return

    try {
      const res = await fetch(`${API_URL}/listings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete listing')
      setListings((prev) => prev.filter((item) => item.id !== id))
      setActiveMenu(null)
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (loading) return <p className="loading-text">Loading listings...</p>
  if (error) return <p className="error">{error}</p>

  return (
    <>
      <section className="hero">
        <h2>Latest Products Available...</h2>
      </section>

      {listings.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">📦</p>
          <p>No listings yet. Be the first to post!</p>
        </div>
      ) : (
        <section className="listings-grid">
          {listings.map((item) => (
            <div key={item.id} className="listing-card-container">
              <Link
                to={`/listings/${item.id}`}
                className="listing-card-link"
              >
                <article className="listing-card">
                  {item.images && item.images.length > 0 ? (
                    <img
                      src={item.images[0].url}
                      alt={item.title}
                      className="listing-card-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image'
                      }}
                    />
                  ) : (
                    <div className="listing-card-no-image">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    </div>
                  )}
                  <header>
                    <h3>{item.title}</h3>
                    {currentUserId !== item.owner_id && (
                      <button
                        className={`card-wishlist-btn ${wishlistIds.has(item.id) ? 'active' : ''}`}
                        onClick={(e) => handleWishlistToggle(e, item.id)}
                        title={wishlistIds.has(item.id) ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={wishlistIds.has(item.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                      </button>
                    )}
                  </header>
                  <p className="meta">
                    {item.category || 'General'} · {item.city || 'Unknown city'}
                  </p>
                  <p className="description">
                    {item.description.length > 80
                      ? item.description.slice(0, 80) + '...'
                      : item.description}
                  </p>
                  <div className="card-footer">
                    <span className="price">₹{item.price.toLocaleString()}</span>
                  </div>
                </article>
              </Link>
              {currentUserId === item.owner_id && (
                <div className="card-actions-wrapper">
                  <button
                    className="three-dot-btn"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setActiveMenu(activeMenu === item.id ? null : item.id)
                    }}
                  >
                    ⋮
                  </button>
                  {activeMenu === item.id && (
                    <div className="actions-dropdown" ref={menuRef}>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          navigate(`/listings/edit/${item.id}`)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDelete(item.id)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </>
  )
}
