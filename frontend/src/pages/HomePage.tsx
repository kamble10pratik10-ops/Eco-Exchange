import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

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

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) return <p className="loading-text">Loading listings...</p>
  if (error) return <p className="error">{error}</p>

  return (
    <>
      <section className="hero">
        <h2>Latest listings</h2>
        <p>Browse second-hand items posted by people around you.</p>
      </section>

      {listings.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">📦</p>
          <p>No listings yet. Be the first to post!</p>
        </div>
      ) : (
        <section className="listings-grid">
          {listings.map((item) => (
            <Link
              to={`/listings/${item.id}`}
              key={item.id}
              className="listing-card-link"
            >
              <article className="listing-card">
                <header>
                  <h3>{item.title}</h3>
                  <span className="price">₹{item.price.toLocaleString()}</span>
                </header>
                <p className="meta">
                  {item.category || 'General'} · {item.city || 'Unknown city'}
                </p>
                <p className="description">
                  {item.description.length > 120
                    ? item.description.slice(0, 120) + '...'
                    : item.description}
                </p>
              </article>
            </Link>
          ))}
        </section>
      )}
    </>
  )
}
