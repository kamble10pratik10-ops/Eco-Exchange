import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
// removed unused icons
import './AuthLayout.css'

const API_URL = 'http://127.0.0.1:8000'

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        phone: '',
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || 'Registration failed')
            }

            // After registration, request OTP automatically
            await fetch(`${API_URL}/auth/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email }),
            })

            navigate('/verify-email', { state: { email: formData.email } })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
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
                        <h2 className="text-gradient">Join the<br />Circular Revolution</h2>
                        <p>Every shared item is a step toward a greener planet. Create your elite profile today and start making an impact.</p>
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
                    <h1>Register</h1>
                    <p className="auth-subtitle">Begin your journey in our sustainable ecosystem.</p>

                    <form onSubmit={handleSubmit} className="elite-form">
                        <div className="input-group-elite">
                            <label>Full Name</label>
                            <input
                                name="name"
                                type="text"
                                className="input-premium"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="input-group-elite">
                            <label>Email Address</label>
                            <input
                                name="email"
                                type="email"
                                className="input-premium"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="input-group-elite">
                            <label>Phone Number</label>
                            <input
                                name="phone"
                                type="tel"
                                className="input-premium"
                                placeholder="+91 98765 43210"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="input-group-elite">
                            <label>Password</label>
                            <input
                                name="password"
                                type="password"
                                className="input-premium"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {error && <p className="error-message-elite" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}

                        <button type="submit" className="btn-auth-submit" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Join Eco-Exchange'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>Already a member? <Link to="/login">Sign In</Link></p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
