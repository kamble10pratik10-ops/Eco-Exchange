import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Camera,
    Upload,
    X,
    Sparkles,
    ArrowRight,
    Info,
    Package,
    Check
} from 'lucide-react'
import './NewListingPage.css'

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:8000`
    : 'http://127.0.0.1:8000'

export default function NewListingPage({ token }: { token: string | null }) {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        category: '',
        city: '',
    })
    const [images, setImages] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            setImages([...images, ...newFiles])
            const newPreviews = newFiles.map(file => URL.createObjectURL(file))
            setPreviews([...previews, ...newPreviews])
        }
    }

    const removePhoto = (index: number) => {
        const newImages = [...images]
        newImages.splice(index, 1)
        setImages(newImages)

        const newPreviews = [...previews]
        newPreviews.splice(index, 1)
        setPreviews(newPreviews)
    }

    const handleSubmit = async () => {
        if (!token) return
        setLoading(true)
        setError(null)

        try {
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
            }

            const res = await fetch(`${API_URL}/listings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })

            if (!res.ok) throw new Error('Failed to create listing profile')
            const listing = await res.json()

            if (images.length > 0) {
                const bulkData = new FormData()
                images.forEach(file => bulkData.append('files', file))

                const uploadRes = await fetch(`${API_URL}/listings/${listing.id}/images/bulk`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: bulkData,
                })

                if (!uploadRes.ok) throw new Error('Bulk image synchronization failed')
            }

            navigate(`/listings/${listing.id}`)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="listing-studio">
            <header className="studio-header">
                <Sparkles size={32} className="emerald-glow" style={{ marginBottom: '16px' }} />
                <h1 className="text-gradient">Listing Studio</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Curate your item's narrative within the ecosystem.</p>
            </header>

            <div className="listing-steps-container">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="studio-step-card"
                        >
                            <span className="step-indicator-lite">Step 01 — Visuals</span>
                            <h3>Capture the Essence</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>High-quality images increase trust and impact scores.</p>

                            <label className="canvas-dropzone">
                                <input type="file" multiple accept="image/*" onChange={handleImageChange} hidden />
                                <div className="dropzone-inner">
                                    <Camera size={48} color="var(--text-secondary)" />
                                    <p>Drag photos or click to browse</p>
                                    <span className="emerald-badge">Up to 10 photos</span>
                                </div>
                            </label>

                            {previews.length > 0 && (
                                <div className="canvas-preview-grid">
                                    {previews.map((url, i) => (
                                        <div key={i} className="preview-thumbnail">
                                            <img src={url} alt="" />
                                            <button className="btn-remove-photo" onClick={() => removePhoto(i)}><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="studio-footer">
                                <button className="btn-studio-primary" onClick={() => setStep(2)}>
                                    <span>Continue</span>
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="studio-step-card"
                        >
                            <span className="step-indicator-lite">Step 02 — Narrative</span>
                            <h3>The Narrative & Details</h3>
                            <div className="elite-form" style={{ marginTop: '32px' }}>
                                <div className="input-group-elite">
                                    <label>Title</label>
                                    <input
                                        className="input-premium"
                                        placeholder="e.g. Rare Vintage Film Camera"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div className="input-group-elite">
                                    <label>Description</label>
                                    <textarea
                                        className="input-premium"
                                        rows={6}
                                        placeholder="Tell the story of this item..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="input-row-elite" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div className="input-group-elite">
                                        <label>Category</label>
                                        <select
                                            className="premium-select"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="">Select Collection</option>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group-elite">
                                        <label>City / Region</label>
                                        <input
                                            className="input-premium"
                                            placeholder="e.g. Mumbai"
                                            value={formData.city}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="input-group-elite">
                                    <label>Valuation (₹)</label>
                                    <input
                                        type="number"
                                        className="input-premium"
                                        placeholder="0.00"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="studio-footer">
                                <button className="btn-studio-secondary" onClick={() => setStep(1)}>Back</button>
                                <button
                                    className="btn-studio-primary"
                                    disabled={loading || !formData.title || !formData.price}
                                    onClick={handleSubmit}
                                >
                                    <Check size={18} />
                                    <span>{loading ? 'Deploying...' : 'Deploy to Ecosystem'}</span>
                                </button>
                            </div>
                            {error && <p style={{ color: '#ef4444', marginTop: '16px', textAlign: 'center' }}>{error}</p>}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
