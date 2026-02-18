import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

export default function LoginPage({
    onLogin,
}: {
    onLogin: (token: string) => void
}) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const body = new URLSearchParams()
            body.append('username', email)
            body.append('password', password)

            const res = await fetch(`${API_URL}/auth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
            })
            if (!res.ok) {
                throw new Error('Invalid email or password')
            }
            const data = await res.json()
            onLogin(data.access_token)
            navigate('/')
        } catch (e: any) {
            setError(e.message ?? 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="form-card">
            <h2>Welcome back</h2>
            <p className="form-subtitle">Sign in to your Exo Exchange account</p>
            <form onSubmit={handleSubmit} className="form">
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
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                </label>
                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
            <p className="form-footer">
                Don't have an account? <Link to="/register">Create one</Link>
            </p>
        </section>
    )
}
