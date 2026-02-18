import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

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

export default function ListingDetailPage() {
    const { id } = useParams<{ id: string }>()
    const [listing, setListing] = useState<Listing | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/listings/${id}`)
                if (!res.ok) {
                    if (res.status === 404) throw new Error('Listing not found')
                    throw new Error('Failed to load listing')
                }
                const data = (await res.json()) as Listing
                setListing(data)
            } catch (e: any) {
                setError(e.message ?? 'Error loading listing')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

    if (loading) return <p className="loading-text">Loading listing…</p>
    if (error)
        return (
            <div className="listing-detail">
                <p className="error">{error}</p>
                <Link to="/" className="back-link">
                    ← Back to listings
                </Link>
            </div>
        )
    if (!listing) return null

    return (
        <div className="listing-detail">
            <Link to="/" className="back-link">
                ← Back to listings
            </Link>

            <div className="detail-card">
                <div className="detail-header">
                    <h2>{listing.title}</h2>
                    <span className="detail-price">₹{listing.price.toLocaleString()}</span>
                </div>

                <div className="detail-tags">
                    {listing.category && (
                        <span className="detail-tag">{listing.category}</span>
                    )}
                    {listing.city && (
                        <span className="detail-tag">{listing.city}</span>
                    )}
                    <span className={`detail-tag ${listing.is_active ? 'tag-active' : 'tag-inactive'}`}>
                        {listing.is_active ? 'Active' : 'Sold'}
                    </span>
                </div>

                <div className="detail-section">
                    <h3>Description</h3>
                    <p>{listing.description}</p>
                </div>

                <div className="detail-section">
                    <h3>Seller info</h3>
                    <p className="meta">Seller ID: #{listing.owner_id}</p>
                </div>
            </div>
        </div>
    )
}
