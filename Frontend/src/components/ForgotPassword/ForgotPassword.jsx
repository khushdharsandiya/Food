import React, { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import {
  FaArrowLeft,
  FaCheckCircle,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaShieldAlt,
} from 'react-icons/fa'

const API = 'http://localhost:4000'

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' | 'otp' | 'password'

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  /** Backend sends this when MAIL_LOG_OTP_TO_CONSOLE=true (local dev). */
  const [devOtp, setDevOtp] = useState(null)

  const isStrongPassword = (value) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value)

  const requestForgotPassword = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data } = await axios.post(`${API}/api/auth/forgot-password`, { email })
      if (data.success) {
        setMessage(data.message || 'OTP sent.')
        setDevOtp(data.server?.devOtp ?? null)
        setStep('otp')
      } else {
        setError(data.message || 'Something went wrong.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  const sendOtp = (e) => {
    e.preventDefault()
    requestForgotPassword()
  }

  const verifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data } = await axios.post(`${API}/api/auth/verify-otp`, { email, otp })
      if (data.success) {
        setMessage(data.message || 'Verified.')
        setStep('password')
      } else {
        setError(data.message || 'Verification failed.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify OTP.')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!isStrongPassword(newPassword)) {
      setError('Use a strong password (8+ chars, uppercase, lowercase, number, special character)')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/api/auth/reset-password`, {
        email,
        newPassword,
      })
      if (data.success) {
        setMessage(data.message || 'Password updated.')
        setTimeout(() => navigate('/login', { replace: true }), 1800)
      } else {
        setError(data.message || 'Failed to reset password.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  const goBackToEmail = () => {
    setStep('email')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setMessage('')
    setDevOtp(null)
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] py-12 px-4 sm:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_20%_30%,#f59e0b_0%,transparent_45%),radial-gradient(circle_at_80%_70%,#b45309_0%,transparent_40%)]" />

      <div className="relative mx-auto max-w-lg">
        <Link
          to="/login"
          className="mb-8 inline-flex items-center gap-2 text-sm font-cinzel tracking-wide text-amber-300/90 transition hover:text-amber-200"
        >
          <FaArrowLeft className="text-xs" />
          Back to sign in
        </Link>

        <div className="relative overflow-hidden rounded-3xl border border-amber-800/40 bg-[#2a1f18]/90 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.65)] backdrop-blur-md">
          <div className="absolute left-1/2 top-0 h-1 w-32 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

          <div className="p-8 sm:p-10">
            <div className="mb-2 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-600/30 bg-amber-900/20 text-amber-400 shadow-inner">
                {step === 'password' ? <FaLock className="text-2xl" /> : <FaKey className="text-2xl" />}
              </div>
            </div>

            <h1 className="mb-2 text-center font-dancingscript text-4xl text-transparent bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text sm:text-5xl">
              {step === 'email' && 'Forgot password'}
              {step === 'otp' && 'Enter OTP'}
              {step === 'password' && 'New password'}
            </h1>
            <p className="mb-8 text-center font-cinzel text-sm text-amber-100/70">
              {step === 'email' &&
                'We’ll send a 6-digit code to your email. It expires in 5 minutes.'}
              {step === 'otp' && `Check your inbox for ${email}. Enter the code below.`}
              {step === 'password' && 'Choose a strong password after OTP verification.'}
            </p>

            {step === 'email' && (
              <ul className="mb-8 space-y-3 font-cinzel text-xs text-amber-200/80 sm:text-sm">
                <li className="flex items-start gap-3">
                  <FaEnvelope className="mt-0.5 shrink-0 text-amber-500/90" />
                  <span>Use the Gmail address you registered with.</span>
                </li>
                <li className="flex items-start gap-3">
                  <FaShieldAlt className="mt-0.5 shrink-0 text-amber-500/90" />
                  <span>Check spam if the email doesn’t arrive in a minute.</span>
                </li>
              </ul>
            )}

            {step === 'email' && (
              <form onSubmit={sendOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="fp-email"
                    className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/80"
                  >
                    Email
                  </label>
                  <input
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 px-4 py-3.5 font-cinzel text-amber-100 placeholder:text-amber-700/80 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-widest text-[#1a0f08] shadow-lg shadow-amber-900/40 transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send OTP'}
                </button>
              </form>
            )}

            {step === 'otp' && devOtp && (
              <div className="mb-4 rounded-2xl border border-amber-600/40 bg-amber-950/35 px-4 py-3">
                <p className="mb-1 font-cinzel text-xs text-amber-100/90">
                  Local dev: OTP from server (also in backend terminal)
                </p>
                <p className="font-mono text-2xl font-bold tracking-widest text-amber-300">{devOtp}</p>
              </div>
            )}

            {step === 'otp' && (
              <form onSubmit={verifyOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="fp-otp"
                    className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/80"
                  >
                    6-digit code
                  </label>
                  <input
                    id="fp-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 px-4 py-3.5 text-center font-mono text-2xl tracking-[0.35em] text-amber-100 placeholder:text-amber-700/80 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full rounded-full bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-widest text-[#1a0f08] shadow-lg shadow-amber-900/40 transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {loading ? 'Checking…' : 'Verify OTP'}
                </button>
                <button
                  type="button"
                  onClick={goBackToEmail}
                  className="w-full font-cinzel text-sm text-amber-400/90 underline-offset-2 transition hover:text-amber-300"
                >
                  Wrong email? Start over
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtp('')
                    requestForgotPassword()
                  }}
                  disabled={loading}
                  className="w-full font-cinzel text-sm text-amber-300/80 transition hover:text-amber-200 disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <label className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/80">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 py-3.5 pl-4 pr-12 font-cinzel text-amber-100 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-amber-400/90 hover:bg-amber-900/40"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] font-cinzel text-amber-300/75">
                    Uppercase, lowercase, number and special character (8+ chars).
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/80">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 py-3.5 pl-4 pr-12 font-cinzel text-amber-100 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-amber-400/90 hover:bg-amber-900/40"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-widest text-[#1a0f08] shadow-lg shadow-amber-900/40 transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {loading ? 'Saving…' : 'Update password'}
                </button>
              </form>
            )}

            {message && (
              <div className="mt-6 rounded-2xl border border-emerald-800/40 bg-emerald-950/25 px-4 py-3">
                <p className="flex items-start gap-2 font-cinzel text-sm text-emerald-200/95">
                  <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-400" />
                  {message}
                </p>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 font-cinzel text-sm text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
