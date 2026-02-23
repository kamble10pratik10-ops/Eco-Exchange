import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

export default function VerifyEmailPage() {
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [resending, setResending] = useState(false)

    const navigate = useNavigate()
    const location = useLocation()
    const email = location.state?.email

    useEffect(() => {
        if (!email) {
            navigate('/register')
        }
    }, [email, navigate])

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
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
            setSuccess('Email verified! Redirecting to login...')
            setTimeout(() => navigate('/login'), 2000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        setResending(true)
        setError(null)
        try {
            const res = await fetch(`${API_URL}/auth/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            if (!res.ok) throw new Error('Failed to resend OTP')
            alert('A new code has been sent to your email.')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setResending(false)
        }
    }

    return (
        <section className="form-card">
            <h2>Verify Your Email</h2>
            <p className="form-subtitle">We've sent a 6-digit code to <strong>{email}</strong></p>

            <form onSubmit={handleVerify} className="form">
                <label>
                    Enter 6-digit Code
                    <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="otp-input"
                        required
                    />
                </label>

                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}

                <button type="submit" disabled={loading || success !== null}>
                    {loading ? 'Verifying...' : 'Verify Account'}
                </button>
            </form>

            <div className="form-footer">
                <p>Didn't receive the code?</p>
                <button
                    className="link-button"
                    onClick={handleResend}
                    disabled={resending}
                >
                    {resending ? 'Sending...' : 'Resend Code'}
                </button>
            </div>
        </section>
    )
}
