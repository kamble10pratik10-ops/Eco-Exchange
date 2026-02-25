import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Shield, User, Lock, Save, Sparkles, Camera, Loader2 } from 'lucide-react'
import './AuthLayout.css'

const API_URL = 'http://127.0.0.1:8000'

export default function ProfilePage({ token }: { token: string | null }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        profile_image_url: '',
    })
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [status, setStatus] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                setFormData({
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    profile_image_url: data.profile_image_url || '',
                })
                setLoading(false)
            })
    }, [token])

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !token) return

        setUploading(true)
        const data = new FormData()
        data.append('files', file)

        try {
            const res = await fetch(`${API_URL}/images/bulk`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: data
            })
            if (!res.ok) throw new Error('Upload failed')
            const urls = await res.json()
            const newUrl = urls[0]

            setFormData(prev => ({ ...prev, profile_image_url: newUrl }))

            // Auto-save the new profile image to the backend immediately
            await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    profile_image_url: newUrl
                }),
            })

            window.dispatchEvent(new CustomEvent('profile-updated'))
            setStatus('Biological signature synchronized.')
        } catch (err) {
            setStatus('Photo sync failed.')
        } finally {
            setUploading(false)
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('Synchronizing identity...')
        try {
            const res = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    phone: formData.phone,
                    profile_image_url: formData.profile_image_url
                }),
            })
            if (res.ok) {
                setStatus('Identity updated in ecosystem.')
                window.dispatchEvent(new CustomEvent('profile-updated'))
            }
            else throw new Error('Update failed')
        } catch (err) { setStatus('Sync interruption detected.') }
    }

    if (loading) return <div className="loading-container-elite"><span>Accessing the vault...</span></div>

    return (
        <div className="profile-settings-elite" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
            <header className="page-header-elite" style={{ marginBottom: '60px', textAlign: 'center' }}>
                <h1 className="text-gradient">Identity Vault</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage your digital presence and biological identifiers.</p>
            </header>

            <div className="settings-grid-elite" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <motion.section
                    className="studio-step-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <User className="emerald-glow" />
                        <h3 style={{ margin: 0 }}>Biological Persona</h3>
                    </div>

                    <div className="photo-upload-section" style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '30px' }}>
                        <div className="profile-preview-wrap" style={{ position: 'relative' }}>
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: '2px solid var(--accent-emerald)',
                                background: 'var(--bg-obsidian)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {formData.profile_image_url ? (
                                    <img src={formData.profile_image_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={40} className="text-muted" />
                                )}
                            </div>
                            <button
                                className="cam-btn"
                                onClick={() => fileRef.current?.click()}
                                style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    right: '0',
                                    background: 'var(--accent-emerald)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                {uploading ? <Loader2 size={16} className="animate-spin text-black" /> : <Camera size={16} className="text-black" />}
                            </button>
                            <input type="file" ref={fileRef} hidden onChange={handlePhotoUpload} accept="image/*" />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 4px 0' }}>Identifier Photo</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Used for ecosystem recognition across the platform.</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdate} className="elite-form">
                        <div className="input-group-elite">
                            <label>Full Biological Name</label>
                            <input
                                className="input-premium"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="input-row-elite" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div className="input-group-elite">
                                <label>Communication Email</label>
                                <input
                                    className="input-premium"
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    style={{ opacity: 0.6 }}
                                />
                            </div>
                            <div className="input-group-elite">
                                <label>Vocal Terminal (Phone)</label>
                                <input
                                    className="input-premium"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn-studio-primary" style={{ width: 'fit-content', marginLeft: 'auto' }}>
                            <Save size={18} />
                            <span>Save Changes</span>
                        </button>
                    </form>
                </motion.section >

                <motion.section
                    className="studio-step-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <Shield className="emerald-glow" />
                        <h3 style={{ margin: 0 }}>Security Protocol</h3>
                    </div>

                    <div className="elite-form">
                        <div className="input-group-elite">
                            <label>Current Access Key</label>
                            <input className="input-premium" type="password" placeholder="••••••••" />
                        </div>
                        <div className="input-group-elite">
                            <label>New Access Key</label>
                            <input className="input-premium" type="password" placeholder="••••••••" />
                        </div>

                        <button className="btn-studio-primary" style={{ width: 'fit-content', marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border-glass)', color: '#fff' }}>
                            <Lock size={18} />
                            <span>Rotate Access Key</span>
                        </button>
                    </div>
                </motion.section>

                {status && (
                    <motion.div
                        className="status-toast glass"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)' }}
                    >
                        <Sparkles size={16} style={{ marginRight: '10px' }} />
                        {status}
                    </motion.div>
                )}
            </div>
        </div>
    )
}
