import React, { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft, FaCheckCircle, FaEye, FaEyeSlash, FaLock, FaUtensils } from 'react-icons/fa'

const API = 'http://localhost:4000'

const ResetPassword = () => {
  const { token: tokenParam } = useParams()
  const token = tokenParam ? decodeURIComponent(tokenParam) : ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [serverInfo, setServerInfo] = useState(null)
  const isStrongPassword = (value) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setServerInfo(null)

    if (!isStrongPassword(password)) {
      setError('Use a strong password (8+ chars, uppercase, lowercase, number, special character)')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/api/user/reset-password/${encodeURIComponent(token)}`, { password })
      if (data.success) {
        setSuccess(data.message || 'Password updated.')
        setServerInfo(data.server || null)
        setTimeout(() => navigate('/login', { replace: true }), 2200)
      } else {
        setError(data.message || 'Failed to reset password')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] py-12 px-4 sm:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_70%_20%,#f59e0b_0%,transparent_45%),radial-gradient(circle_at_30%_80%,#78350f_0%,transparent_40%)]" />

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
                <FaLock className="text-2xl" />
              </div>
            </div>

            <h1 className="mb-2 text-center font-dancingscript text-4xl text-transparent bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text sm:text-5xl">
              Set new password
            </h1>
            <p className="mb-8 text-center font-cinzel text-sm text-amber-100/70">
              Choose a strong password. It is bcrypt-hashed and stored in MongoDB when you submit.
            </p>

            {!token && (
              <p className="mb-6 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 font-cinzel text-sm text-red-300">
                Invalid or missing reset link. Request a new one from Forgot password.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/80">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 py-3.5 pl-4 pr-12 font-cinzel text-amber-100 placeholder:text-amber-700/80 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-amber-400/90 transition hover:bg-amber-900/40 hover:text-amber-200"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] font-cinzel text-amber-300/75">
                  Must include uppercase, lowercase, number and special character.
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
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 py-3.5 pl-4 pr-12 font-cinzel text-amber-100 placeholder:text-amber-700/80 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-amber-400/90 transition hover:bg-amber-900/40 hover:text-amber-200"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full rounded-full bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-widest text-[#1a0f08] shadow-lg shadow-amber-900/40 transition hover:scale-[1.01] disabled:opacity-60"
              >
                {loading ? 'Saving to database…' : 'Update password'}
              </button>
            </form>

            {success && (
              <div className="mt-6 space-y-3 rounded-2xl border border-emerald-800/40 bg-emerald-950/25 px-4 py-3">
                <p className="flex items-start gap-2 font-cinzel text-sm text-emerald-200/95">
                  <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-400" />
                  {success}
                </p>
                <p className="flex items-center gap-2 font-cinzel text-xs text-amber-200/70">
                  <FaUtensils />
                  Redirecting you to sign in…
                </p>
              </div>
            )}

            {serverInfo && (
              <div className="mt-4 rounded-2xl border border-amber-800/35 bg-black/25 px-4 py-3 font-mono text-[11px] leading-relaxed text-amber-200/85 sm:text-xs">
                <p className="mb-1 font-cinzel text-[10px] uppercase tracking-widest text-amber-500/90">Backend confirmation</p>
                <p>updatedAt: {serverInfo.updatedAt}</p>
                <p>userId: {serverInfo.userId}</p>
                <p>confirmationRef: {serverInfo.confirmationRef}</p>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 font-cinzel text-sm text-red-300">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
