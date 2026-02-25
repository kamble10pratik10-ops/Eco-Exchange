import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Heart,
  MapPin,
  ArrowRight,
  Filter,
  X,
  Package,
  Sparkles,
  ShoppingBag
} from 'lucide-react'
import './HomePage.css'

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

  // Filters state
  const [category, setCategory] = useState<string>('')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  const navigate = useNavigate()

  const CATEGORIES = [
    "Electronics & Technology",
    "Fashion & Apparel",
    "Health, Personal Care",
    "Home, Kitchen & Furniture",
    "Sports & Outdoors",
    "Books & Media",
    "Toys & Games"
  ]

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (category) params.append('category', category)
        if (minPrice) params.append('min_price', minPrice)
        if (maxPrice) params.append('max_price', maxPrice)

        const [listingsRes, wishlistRes] = await Promise.all([
          fetch(`${API_URL}/listings?${params.toString()}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          token ? fetch(`${API_URL}/wishlist`, {
            headers: { Authorization: `Bearer ${token}` },
          }) : Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as any)
        ])

        if (!listingsRes.ok) throw new Error('Sign in to see posts')
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
  }, [token, category, minPrice, maxPrice])

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 20
      }
    }
  }

  if (loading) return (
    <div className="loading-container-elite">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
        <Sparkles size={40} className="emerald-glow" />
      </motion.div>
      <p>Consulting the ecosystem...</p>
    </div>
  )

  return (
    <div className="home-page-elite">
      <motion.section
        className="home-hero"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="hero-tag">
          <Sparkles size={14} />
          <span>The Next Generation Exchange</span>
        </div>
        <h1 className="text-gradient">Discover Curated<br />Eco-Elegance</h1>

        <div className="filter-bar-premium glass">
          <div className="filter-group">
            <Filter size={18} className="filter-icon" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="premium-select"
            >
              <option value="">All Collections</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="price-filters-elite">
            <input
              type="number"
              placeholder="Min ₹"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="premium-input"
            />
            <span className="price-sep">to</span>
            <input
              type="number"
              placeholder="Max ₹"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="premium-input"
            />
          </div>

          {(category || minPrice || maxPrice) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="btn-clear-elite"
              onClick={() => {
                setCategory('')
                setMinPrice('')
                setMaxPrice('')
              }}
            >
              <X size={16} />
              Reset
            </motion.button>
          )}
        </div>
      </motion.section>

      {error ? (
        <div className="error-card glass">
          <p>{error}</p>
        </div>
      ) : listings.length === 0 ? (
        <motion.div
          className="empty-state-elite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="empty-icon-wrap">
            <ShoppingBag size={64} />
          </div>
          <h3>The ecosystem is quiet...</h3>
          <p>Be the first to introduce something beautiful.</p>
          <Link to="/listings/new" className="btn-premium">Create Listing</Link>
        </motion.div>
      ) : (
        <motion.section
          className="listing-grid-elite"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {listings.map((item) => (
            <motion.div key={item.id} variants={itemVariants} className="elite-card-wrap">
              <Link to={`/listings/${item.id}`} className="elite-card-link">
                <article className="elite-card">
                  <div className="card-image-wrap">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0].url}
                        alt={item.title}
                        className="elite-card-image"
                      />
                    ) : (
                      <div className="no-image-elite">
                        <Package size={48} />
                      </div>
                    )}

                    <div className="card-overlay">
                      {currentUserId !== item.owner_id && (
                        <button
                          className={`btn-wishlist-elite ${wishlistIds.has(item.id) ? 'active' : ''}`}
                          onClick={(e) => handleWishlistToggle(e, item.id)}
                        >
                          <Heart size={20} fill={wishlistIds.has(item.id) ? "currentColor" : "none"} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="card-content-elite">
                    <div className="card-meta-elite">
                      <MapPin size={12} />
                      <span>{item.city || 'Global'}</span>
                      <span className="dot">·</span>
                      <span>{item.category?.split(' ')[0] || 'Curated'}</span>
                    </div>

                    <h3 className="card-title-elite">{item.title}</h3>
                    <p className="card-desc-elite">{item.description}</p>

                    <div className="card-footer-elite">
                      <div className="price-wrap-elite">
                        <span className="price-elite">₹{item.price.toLocaleString()}</span>
                      </div>
                      <div className="btn-view-elite">
                        <span>View</span>
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            </motion.div>
          ))}
        </motion.section>
      )}
    </div>
  )
}
