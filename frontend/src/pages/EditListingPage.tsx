import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Camera,
    X,
    ArrowRight,
    Check,
    ArrowLeft,
    Package,
    Info
} from 'lucide-react'
import './NewListingPage.css'

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:8000`
    : 'http://127.0.0.1:8000'

export default function EditListingPage({ token }: { token: string | null }) {
    const { id } = useParams()
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        category: '',
        city: '',
        accept_exchange: true,
        exchange_preferences: '',
    })
    const [existingImages, setExistingImages] = useState<{ id: number, url: string }[]>([])
    const [newImages, setNewImages] = useState<File[]>([])
    const [newPreviews, setNewPreviews] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
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

    useEffect(() => {
        const fetchListing = async () => {
            try {
                const r = await fetch(`${API_URL}/listings/${id}`)
                if (!r.ok) throw new Error('Listing not found')
                const data = await r.json()
                setFormData({
                    title: data.title,
                    description: data.description,
                    price: data.price.toString(),
                    category: data.category || '',
                    city: data.city || '',
                    accept_exchange: data.accept_exchange ?? true,
                    exchange_preferences: data.exchange_preferences || '',
                })
                setExistingImages(data.images || [])
                setLoading(false)
            } catch (err: any) {
                setError(err.message)
                setLoading(false)
            }
        }
        fetchListing()
    }, [id])

    const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            setNewImages([...newImages, ...files])
            const previews = files.map(f => URL.createObjectURL(f))
            setNewPreviews([...newPreviews, ...previews])
        }
    }

    const removeExisting = (index: number) => {
        const updated = [...existingImages]
        updated.splice(index, 1)
        setExistingImages(updated)
    }

    const removeNew = (index: number) => {
        const updatedFiles = [...newImages]
        updatedFiles.splice(index, 1)
        setNewImages(updatedFiles)

        const updatedPreviews = [...newPreviews]
        updatedPreviews.splice(index, 1)
        setNewPreviews(updatedPreviews)
    }

    const handleSubmit = async () => {
        if (!token) return
        setSaving(true)
        setError(null)

        try {
            let finalImageUrls = existingImages.map(img => img.url)

            // 1. Upload new images if any
            if (newImages.length > 0) {
                const bulkData = new FormData()
                newImages.forEach(file => bulkData.append('files', file))

                const uploadRes = await fetch(`${API_URL}/images/bulk`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: bulkData,
                })

                if (!uploadRes.ok) throw new Error('Failed to synchronize new visual assets')
                const uploadedUrls = await uploadRes.json()
                finalImageUrls = [...finalImageUrls, ...uploadedUrls]
            }

            // 2. Update listing
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                image_urls: finalImageUrls,
                accept_exchange: formData.accept_exchange,
                exchange_preferences: formData.exchange_preferences
            }

            const res = await fetch(`${API_URL}/listings/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })

            if (!res.ok) throw new Error('Failed to update asset signature')
            navigate(`/listings/${id}`)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="loading-container-elite"><span>Re-calibrating asset data...</span></div>

    return (
        <div className="listing-studio">
            <header className="studio-header">
                <button className="btn-back-elite" onClick={() => navigate(-1)} style={{ margin: '0 auto 24px', background: 'transparent', border: 'none', color: 'var(--accent-emerald)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowLeft size={18} />
                    <span>Back to Gallery</span>
                </button>
                <h1 className="text-gradient">Asset Re-calibration</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Refine the parameters of your deployed item.</p>
            </header>

            <div className="listing-steps-container">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="visuals"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="studio-step-card"
                        >
                            <span className="step-indicator-lite">Step 01 — Visual Integrity</span>
                            <h3>Current & New Imagery</h3>

                            <div className="canvas-preview-grid" style={{ marginBottom: '32px' }}>
                                {existingImages.map((img, i) => (
                                    <div key={`existing-${i}`} className="preview-thumbnail">
                                        <img src={img.url} alt="" />
                                        <button className="btn-remove-photo" onClick={() => removeExisting(i)}><X size={14} /></button>
                                        <span className="indicator-badge" style={{ position: 'absolute', bottom: '4px', left: '4px', fontSize: '10px', background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '4px' }}>Existing</span>
                                    </div>
                                ))}
                                {newPreviews.map((url, i) => (
                                    <div key={`new-${i}`} className="preview-thumbnail" style={{ border: '1px solid var(--accent-emerald)' }}>
                                        <img src={url} alt="" />
                                        <button className="btn-remove-photo" onClick={() => removeNew(i)}><X size={14} /></button>
                                        <span className="indicator-badge" style={{ position: 'absolute', bottom: '4px', left: '4px', fontSize: '10px', background: 'var(--accent-emerald)', color: 'black', padding: '2px 4px', borderRadius: '4px' }}>New</span>
                                    </div>
                                ))}
                            </div>

                            <label className="canvas-dropzone">
                                <input type="file" multiple accept="image/*" onChange={handleNewImages} hidden />
                                <div className="dropzone-inner">
                                    <Camera size={48} color="var(--text-secondary)" />
                                    <p>Add more photos to the ecosystem</p>
                                </div>
                            </label>

                            <div className="studio-footer" style={{ marginTop: '40px' }}>
                                <button className="btn-studio-primary" onClick={() => setStep(2)}>
                                    <span>Define Narrative</span>
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="studio-step-card"
                        >
                            <span className="step-indicator-lite">Step 02 — Calibration</span>
                            <h3>Refine Parameters</h3>
                            <div className="elite-form" style={{ marginTop: '32px' }}>
                                <div className="input-group-elite">
                                    <label>Asset Title</label>
                                    <input
                                        className="input-premium"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div className="input-group-elite">
                                    <label>Description Archive</label>
                                    <textarea
                                        className="input-premium"
                                        rows={6}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="input-row-elite" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div className="input-group-elite">
                                        <label>Collection</label>
                                        <select
                                            className="premium-select"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="">Select Category</option>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group-elite">
                                        <label>Geo-location</label>
                                        <input
                                            className="input-premium"
                                            value={formData.city}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="input-group-elite" style={{ marginBottom: 0 }}>
                                    <label>Valuation Matrix (₹)</label>
                                    <input
                                        type="number"
                                        className="input-premium"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>

                                <div className="exchange-concept-elite glass" style={{ marginTop: '24px', padding: '20px', borderRadius: '16px', border: '1px solid var(--accent-emerald)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Package size={20} className="emerald-glow" />
                                            <h4 style={{ margin: 0 }}>Open to Exchange?</h4>
                                        </div>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={formData.accept_exchange}
                                                onChange={e => setFormData({ ...formData, accept_exchange: e.target.checked })}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>

                                    {formData.accept_exchange && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="input-group-elite"
                                            style={{ marginBottom: 0 }}
                                        >
                                            <label>What are you looking for in return?</label>
                                            <textarea
                                                className="input-premium"
                                                rows={3}
                                                placeholder="e.g. Looking for a mechanical keyboard..."
                                                value={formData.exchange_preferences}
                                                onChange={e => setFormData({ ...formData, exchange_preferences: e.target.value })}
                                            />
                                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                                <Info size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                                This helps our AI find perfect ecosystem matches.
                                            </p>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            <div className="studio-footer" style={{ marginTop: '60px' }}>
                                <button className="btn-studio-secondary" onClick={() => setStep(1)}>Back</button>
                                <button
                                    className="btn-studio-primary"
                                    onClick={handleSubmit}
                                    disabled={saving}
                                >
                                    <Check size={18} />
                                    <span>{saving ? 'Syncing...' : 'Update Deployment'}</span>
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
