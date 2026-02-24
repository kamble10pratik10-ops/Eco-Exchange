import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

export default function ProfilePage({ token }: { token: string | null }) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
    const [followersCount, setFollowersCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [uploadLoading, setUploadLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) {
            navigate('/login')
            return
        }

        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!res.ok) throw new Error('Failed to load profile')
                const data = await res.json()
                setName(data.name)
                setEmail(data.email)
                setPhone(data.phone || '')
                setProfileImageUrl(data.profile_image_url || null)
                setFollowersCount(data.followers_count || 0)
                setFollowingCount(data.following_count || 0)
            } catch (e: any) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [token, navigate])

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !token) return

        setUploadLoading(true)
        setError(null)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch(`${API_URL}/chat/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            })
            if (!res.ok) throw new Error('Image upload failed')
            const data = await res.json()
            setProfileImageUrl(data.url)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUploadLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdating(true)
        setError(null)
        setSuccess(null)

        try {
            const body: any = {
                name,
                email,
                phone,
                profile_image_url: profileImageUrl
            }
            if (password) body.password = password

            const res = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || 'Update failed')
            }

            setSuccess('Profile updated successfully!')
            setPassword('') // Clear password field
        } catch (e: any) {
            setError(e.message)
        } finally {
            setUpdating(false)
        }
    }

    if (loading) return <p className="loading-text">Loading profile...</p>

    return (
        <section className="form-card">
            <h2>Account Settings</h2>
            <p className="form-subtitle">Update your personal information</p>

            <div className="profile-stats-bar">
                <div className="stat-card">
                    <span className="stat-value">{followersCount}</span>
                    <span className="stat-label">Followers</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{followingCount}</span>
                    <span className="stat-label">Following</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="form">
                <div className="profile-photo-upload">
                    <div className="profile-photo-preview">
                        {profileImageUrl ? (
                            <img src={profileImageUrl} alt="Profile" />
                        ) : (
                            <div className="avatar-placeholder">{name?.[0]?.toUpperCase() || 'U'}</div>
                        )}
                        {uploadLoading && <div className="upload-overlay">...</div>}
                    </div>
                    <div className="photo-upload-controls">
                        <label className="file-input-label">
                            {profileImageUrl ? 'Change Photo' : 'Upload Photo'}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                hidden
                            />
                        </label>
                        {profileImageUrl && (
                            <button
                                type="button"
                                className="remove-photo-btn"
                                onClick={() => setProfileImageUrl(null)}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                </div>

                <label>
                    Full Name
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Name"
                        required
                    />
                </label>

                <label>
                    Email Address
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@mail.com"
                        required
                    />
                </label>

                <label>
                    Phone Number
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 9876543210"
                    />
                </label>

                <label>
                    New Password (leave blank to keep current)
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                    />
                </label>

                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}

                <button type="submit" disabled={updating}>
                    {updating ? 'Updating...' : 'Save Changes'}
                </button>
            </form>
        </section>
    )
}
