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
    const [images, setImages] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [uploadIndex, setUploadIndex] = useState(0)
    const navigate = useNavigate()

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files) {
            const newFiles = Array.from(files)
            setImages(prev => [...prev, ...newFiles])

            newFiles.forEach(file => {
                const reader = new FileReader()
                reader.onloadend = () => {
                    setPreviews(prev => [...prev, reader.result as string])
                }
                reader.readAsDataURL(file)
            })
        }
    }

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))
        setPreviews(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token) {
            setError('You must be logged in to post an ad.')
            return
        }
        setLoading(true)
        setError(null)
        setSuccess(null)

        const uploadedUrls: string[] = []

        try {
            // 1. Upload all images
            if (images.length > 0) {
                setUploading(true)
                for (let i = 0; i < images.length; i++) {
                    setUploadIndex(i + 1)
                    const formData = new FormData()
                    formData.append('file', images[i])

                    const uploadRes = await fetch(`${API_URL}/chat/upload`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    })

                    if (!uploadRes.ok) throw new Error('One or more images failed to upload')
                    const uploadData = await uploadRes.json()
                    uploadedUrls.push(uploadData.url)
                }
                setUploading(false)
                setUploadIndex(0)
            }

            // 2. Create listing
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
                    image_urls: uploadedUrls,
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
            setUploading(false)
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
                <div className="form-row">
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
                            placeholder="Mobiles, Electronics…"
                        />
                    </label>
                </div>
                <label>
                    City
                    <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Mumbai, Pune…"
                    />
                </label>

                <div className="image-upload-section">
                    <label className="image-upload-label">
                        Photos (Select multiple)
                        <div className="image-dropzone">
                            <div className="dropzone-content">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                <span>Add more images</span>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                className="file-input"
                            />
                        </div>
                    </label>

                    {previews.length > 0 && (
                        <div className="previews-grid">
                            {previews.map((preview, idx) => (
                                <div key={idx} className="preview-item">
                                    <img src={preview} alt={`Preview ${idx}`} />
                                    <button
                                        type="button"
                                        className="remove-preview-btn"
                                        onClick={() => removeImage(idx)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <button type="submit" disabled={loading || uploading}>
                    {loading ? (uploading ? `Uploading image ${uploadIndex} of ${images.length}…` : 'Posting…') : 'Post Ad'}
                </button>
            </form>
        </section>
    )
}
