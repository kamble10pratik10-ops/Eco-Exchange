import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

type Listing = {
  id: number
  title: string
  description: string
  price: number
  category?: string | null
  city?: string | null
  is_active: boolean
  owner_id: number
}

export default function HomePage({ token }: { token: string | null }) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/listings`)
        if (!res.ok) throw new Error('Failed to load listings')
        const data = (await res.json()) as Listing[]
        setListings(data)
      } catch (e: any) {
        setError(e.message ?? 'Error loading listings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
                  <header>
                    <h3>{item.title}</h3>
                  </header>
                  <p className="meta">
                    {item.category || 'General'} · {item.city || 'Unknown city'}
                  </p>
                  <p className="description">
                    {item.description.length > 120
                      ? item.description.slice(0, 120) + '...'
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
