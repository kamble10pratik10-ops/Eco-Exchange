import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

export default function NewListingPage({
    token,
}: {
    token: string | null
}) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState('')
    const [category, setCategory] = useState('')
    const [city, setCity] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token) {
            setError('You must be logged in to post an ad.')
            return
        }
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            const res = await fetch(`${API_URL}/listings`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title,
                    description,
                    price: Number(price),
                    category: category || null,
                    city: city || null,
                }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => null)
                throw new Error(data?.detail ?? 'Failed to create listing')
            }
            setSuccess('Listing posted!')
            setTimeout(() => navigate('/'), 1000)
        } catch (e: any) {
            setError(e.message ?? 'Failed to create listing')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="form-card">
            <h2>Post a new ad</h2>
            <p className="form-subtitle">Describe the item you want to sell</p>
            <form onSubmit={handleSubmit} className="form">
                <label>
                    Title
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. iPhone 13 Pro Max"
                        required
                    />
                </label>
                <label>
                    Description
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        placeholder="Describe condition, features, reason for selling…"
                        required
                    />
                </label>
                <label>
                    Price (₹)
                    <input
                        type="number"
                        min={0}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0"
                        required
                    />
                </label>
                <label>
                    Category
                    <input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Mobiles, Electronics, Furniture…"
                    />
                </label>
                <label>
                    City
                    <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Mumbai, Pune…"
                    />
                </label>
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Posting…' : 'Post ad'}
                </button>
            </form>
        </section>
    )
}
