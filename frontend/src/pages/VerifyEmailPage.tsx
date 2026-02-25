import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import './AuthLayout.css'

const API_URL = 'http://127.0.0.1:8000'

export default function VerifyEmailPage() {
    const [otp, setOtp] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()
    const email = location.state?.email || ''

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || 'Verification failed')
            }
            navigate('/login', { state: { message: 'Verification successful! Please login.' } })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${API_URL}/auth/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            if (res.ok) {
                alert('A new code has been sent to your email.')
            } else {
                const data = await res.json()
                throw new Error(data.detail || 'Failed to resend code')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page-elite">
            <div className="auth-visual">
                <div className="visual-content">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", damping: 15 }}
                    >
                        <ShieldCheck size={120} className="emerald-glow" style={{ marginBottom: '40px' }} />
                        <h2 className="text-gradient">Secure Your<br />Identity</h2>
                        <p>We've sent a unique access code to your email. Enter it to verify your account and join the elite circle of Eco-Exchange.</p>
                    </motion.div>
                </div>
            </div>

            <div className="auth-form-container">
                <div className="auth-card-elite">
                    <button className="btn-back-elite" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>

                    <h1>Verification</h1>
                    <p className="auth-subtitle">Confirm the code sent to <strong>{email}</strong></p>

                    <form onSubmit={handleSubmit} className="elite-form">
                        <div className="input-group-elite">
                            <label>OTP Code</label>
                            <input
                                type="text"
                                maxLength={6}
                                className="input-premium otp-input"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                required
                                style={{
                                    textAlign: 'center',
                                    fontSize: '2rem',
                                    letterSpacing: '0.5em',
                                    fontFamily: 'monospace',
                                    background: 'rgba(16, 185, 129, 0.05)',
                                    borderColor: 'rgba(16, 185, 129, 0.2)'
                                }}
                            />
                        </div>

                        {error && <p className="error-message-elite" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}

                        <button type="submit" className="btn-auth-submit" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify Account'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>Didn't receive a code? <button type="button" className="btn-link-elite" onClick={handleResend} disabled={loading}>Resend Code</button></p>
                    </div>
                </div>
            </div>
        </div>
    )
}
