import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

export default function ProfilePage({ token }: { token: string | null }) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
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
            } catch (e: any) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [token, navigate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdating(true)
        setError(null)
        setSuccess(null)

        try {
            const body: any = { name, email, phone }
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

            <form onSubmit={handleSubmit} className="form">
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
