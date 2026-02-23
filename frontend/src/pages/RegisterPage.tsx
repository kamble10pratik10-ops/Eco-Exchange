import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, password }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => null)
                throw new Error(data?.detail ?? 'Registration failed')
            }

            // Registration success - now request OTP
            await fetch(`${API_URL}/auth/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            setSuccess('Account created! Sending verification code…')
            setTimeout(() => navigate('/verify-email', { state: { email } }), 1500)
        } catch (e: any) {
            setError(e.message ?? 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="form-card">
            <h2>Create account</h2>
            <p className="form-subtitle">Join Exo Exchange and start trading</p>
            <form onSubmit={handleSubmit} className="form">
                <label>
                    Name
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        required
                    />
                </label>
                <label>
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />
                </label>
                <label>
                    Phone
                    <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Optional"
                    />
                </label>
                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        required
                    />
                </label>
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Creating account…' : 'Register'}
                </button>
            </form>
            <p className="form-footer">
                Already have an account? <Link to="/login">Sign in</Link>
            </p>
        </section>
    )
}
