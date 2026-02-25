import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import './AuthLayout.css'

const API_URL = 'http://127.0.0.1:8000'

type LoginPageProps = {
    onLogin: (token: string | null) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as any)?.from?.pathname || '/'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Use the standard OAuth2 password flow form data
            const formData = new URLSearchParams()
            formData.append('username', email)
            formData.append('password', password)

            const res = await fetch(`${API_URL}/auth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || 'Invalid credentials')
            }

            const data = await res.json()
            if (!data.is_verified) {
                // If not verified, redirect to verification page
                navigate('/verify-email', { state: { email } })
                return
            }
            onLogin(data.access_token)
            navigate(from, { replace: true })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page-elite">
            <motion.div
                className="auth-visual"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
            >
                <div className="visual-content">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h2 className="text-gradient">Welcome Back to<br />the Ecosystem</h2>
                        <p>Your sustainable journey continues here. Access your curated marketplace and connect with the community.</p>
                    </motion.div>
                </div>
            </motion.div>

            <motion.div
                className="auth-form-container"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 25 }}
            >
                <div className="auth-card-elite">
                    <div className="auth-header-mobile">
                        <Sparkles className="emerald-glow" size={32} />
                    </div>
                    <h1>Sign In</h1>
                    <p className="auth-subtitle">Enter your credentials to access Exo-Exchange.</p>

                    <form onSubmit={handleSubmit} className="elite-form">
                        <div className="input-group-elite">
                            <label>Email Address</label>
                            <div className="input-with-icon">
                                <input
                                    type="email"
                                    className="input-premium"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group-elite">
                            <label>Password</label>
                            <div className="input-with-icon">
                                <input
                                    type="password"
                                    className="input-premium"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="error-message-elite"
                                style={{ color: '#ef4444', fontSize: '0.85rem' }}
                            >
                                {error}
                            </motion.p>
                        )}

                        <button type="submit" className="btn-auth-submit" disabled={loading}>
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>Don't have an account? <Link to="/register">Create one for free</Link></p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
