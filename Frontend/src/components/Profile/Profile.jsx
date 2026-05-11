import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import {
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaPen,
  FaSignOutAlt,
  FaUser,
  FaUtensils,
} from 'react-icons/fa'

function clearAuthSession() {
  localStorage.removeItem('authToken')
  localStorage.removeItem('loginData')
  localStorage.removeItem('user')
}

const API = 'http://localhost:4000'

const Profile = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ username: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [showPwd, setShowPwd] = useState({ old: false, new: false, confirm: false })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      setLoading(false)
      navigate('/login', { replace: true })
      return
    }

    axios
      .get(`${API}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      })
      .then(({ data }) => {
        if (data.success && data.user) {
          setProfile(data.user)
          setForm({ username: data.user.username || '', email: data.user.email || '' })
        } else {
          const msg = data.message || 'Failed to load profile'
          if (msg === 'User not found') {
            clearAuthSession()
            navigate('/login', { replace: true })
            return
          }
          setError(msg)
        }
      })
      .catch((err) => {
        const status = err.response?.status
        const msg = err.response?.data?.message
        const sessionDead =
          status === 401 ||
          status === 403 ||
          status === 404 ||
          msg === 'User not found' ||
          msg === 'Invalid Token' ||
          msg === 'Token Expired'

        if (sessionDead) {
          clearAuthSession()
          navigate('/login', { replace: true })
          return
        }

        setError(
          msg ||
            (err.code === 'ERR_NETWORK'
              ? 'Cannot reach server. Is the backend running on port 4000?'
              : 'Failed to load profile')
        )
      })
      .finally(() => setLoading(false))
  }, [navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const token = localStorage.getItem('authToken')
    axios
      .put(
        `${API}/api/user/me`,
        { username: form.username },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      )
      .then(({ data }) => {
        if (data.success && data.user) {
          setProfile(data.user)
          setSuccess('Profile saved.')
          setIsEditing(false)
          const existingUser = JSON.parse(localStorage.getItem('user') || '{}')
          localStorage.setItem(
            'user',
            JSON.stringify({
              ...existingUser,
              email: data.user.email,
              username: data.user.username,
            })
          )
        } else {
          setError(data.message || 'Failed to update profile')
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to update profile')
      })
      .finally(() => setSaving(false))
  }

  const handleLogout = () => {
    clearAuthSession()
    navigate('/', { replace: true })
  }

  const isStrongPassword = (value) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value)

  const handlePasswordChange = (e) => {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess('')

    if (!isStrongPassword(pwdForm.newPassword)) {
      setPwdError('Use a strong password (8+ chars, uppercase, lowercase, number, special character)')
      return
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('New passwords do not match')
      return
    }

    const email = profile?.email || form.email
    if (!email) {
      setPwdError('Could not read your email. Please refresh the page.')
      return
    }

    setPwdSaving(true)
    axios
      .post(`${API}/api/auth/change-password`, {
        email,
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword,
      })
      .then(({ data }) => {
        if (data.success) {
          setPwdSuccess(data.message || 'Password updated.')
          setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
          setSuccess('')
          setTimeout(() => {
            setShowPasswordForm(false)
            setPwdSuccess('')
          }, 2200)
        } else {
          setPwdError(data.message || 'Could not update password.')
        }
      })
      .catch((err) => {
        setPwdError(err.response?.data?.message || 'Could not update password.')
      })
      .finally(() => setPwdSaving(false))
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-amber-600/30 border-t-amber-400" />
          <p className="font-cinzel text-sm tracking-widest text-amber-200/80">Loading your profile…</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] px-4 text-center">
        <div className="max-w-md rounded-3xl border border-red-900/40 bg-[#2a1f18]/80 p-8 backdrop-blur-sm">
          <p className="font-cinzel text-red-300">{error}</p>
          <p className="mt-3 font-cinzel text-xs text-amber-200/70">
            If your account was removed or the database was reset, sign in again.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                clearAuthSession()
                navigate('/login', { replace: true })
              }}
              className="rounded-full bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-2.5 font-cinzel text-sm font-semibold text-[#1a0f08]"
            >
              Go to login
            </button>
            <Link
              to="/"
              className="rounded-full border border-amber-600/40 px-6 py-2.5 font-cinzel text-sm text-amber-200 hover:bg-amber-900/30"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] py-16 px-4 sm:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_30%_20%,#f59e0b_0%,transparent_45%),radial-gradient(circle_at_70%_80%,#451a03_0%,transparent_50%)]" />

      <div className="relative mx-auto max-w-xl">
        <div className="mb-10 text-center">
          <p className="mb-2 flex items-center justify-center gap-2 font-cinzel text-xs uppercase tracking-[0.35em] text-amber-500/90">
            <FaUtensils className="text-amber-400" />
            Foodie Frenzy
          </p>
          <h1 className="font-dancingscript text-5xl text-transparent bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text sm:text-6xl">
            My profile
          </h1>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-amber-800/40 bg-[#2a1f18]/85 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <div className="absolute left-1/2 top-0 h-1 w-40 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

          <div className="p-8 sm:p-10">
            <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-amber-600/35 bg-gradient-to-br from-amber-900/40 to-[#1a120b] font-dancingscript text-3xl text-amber-200 shadow-inner">
                {(profile?.username || profile?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 w-full flex-1 text-center sm:w-auto sm:text-left">
                <p className="font-dancingscript text-2xl leading-snug text-amber-100 sm:text-3xl">
                  {profile?.username || 'Guest'}
                </p>
              </div>
            </div>

            {!isEditing ? (
              <div className="space-y-4">
                <div className="group flex items-center gap-4 rounded-2xl border border-amber-800/35 bg-[#1a120b]/55 px-4 py-4 transition hover:border-amber-700/50">
                  <FaUser className="shrink-0 text-amber-500/80" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-cinzel text-[10px] uppercase tracking-widest text-amber-500/90">Username</p>
                    <p className="mt-1 break-words font-cinzel text-amber-100">{profile?.username || '—'}</p>
                  </div>
                </div>
                <div className="group flex items-start gap-4 rounded-2xl border border-amber-800/35 bg-[#1a120b]/55 px-4 py-4 transition hover:border-amber-700/50">
                  <FaEnvelope className="mt-1 text-amber-500/80" />
                  <div>
                    <p className="font-cinzel text-[10px] uppercase tracking-widest text-amber-500/90">Email</p>
                    <p className="mt-1 break-all font-cinzel text-amber-100">{profile?.email || '—'}</p>
                  </div>
                </div>

                {success && (
                  <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-3 font-cinzel text-sm text-emerald-200/95">
                    {success}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ username: profile?.username || '', email: profile?.email || '' })
                      setIsEditing(true)
                      setError('')
                      setSuccess('')
                      setShowPasswordForm(false)
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-wider text-[#1a0f08] shadow-lg shadow-amber-900/25 transition hover:scale-[1.02]"
                  >
                    <FaPen className="text-xs" /> Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-800/50 bg-red-950/25 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-wider text-red-200 transition hover:bg-red-950/40"
                  >
                    <FaSignOutAlt className="text-xs" /> Logout
                  </button>
                </div>

                {!showPasswordForm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(true)
                      setPwdError('')
                      setPwdSuccess('')
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-amber-700/45 bg-[#1a120b]/50 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-wider text-amber-200 transition hover:border-amber-600/50 hover:bg-amber-950/30"
                  >
                    <FaLock className="text-xs" /> Change password
                  </button>
                ) : (
                  <div className="mt-6 rounded-2xl border border-amber-800/35 bg-[#1a120b]/45 p-5 sm:p-6">
                    <p className="mb-4 font-cinzel text-xs text-amber-200/70">
                      Enter your current password and a new one for{' '}
                      <span className="text-amber-100/90">{profile?.email || '—'}</span>
                    </p>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/80">
                          Current password
                        </label>
                        <div className="relative">
                          <input
                            type={showPwd.old ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={pwdForm.oldPassword}
                            onChange={(e) =>
                              setPwdForm((p) => ({ ...p, oldPassword: e.target.value }))
                            }
                            className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 py-3.5 pl-4 pr-12 font-cinzel text-amber-100 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd((s) => ({ ...s, old: !s.old }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-amber-400/90 hover:bg-amber-900/40"
                            aria-label={showPwd.old ? 'Hide password' : 'Show password'}
                          >
                            {showPwd.old ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/80">
                          New password
                        </label>
                        <div className="relative">
                          <input
                            type={showPwd.new ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={pwdForm.newPassword}
                            onChange={(e) =>
                              setPwdForm((p) => ({ ...p, newPassword: e.target.value }))
                            }
                            className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 py-3.5 pl-4 pr-12 font-cinzel text-amber-100 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd((s) => ({ ...s, new: !s.new }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-amber-400/90 hover:bg-amber-900/40"
                            aria-label={showPwd.new ? 'Hide password' : 'Show password'}
                          >
                            {showPwd.new ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                          </button>
                        </div>
                        <p className="mt-1 font-cinzel text-[10px] text-amber-300/75">
                          Uppercase, lowercase, number and special character (8+ chars).
                        </p>
                      </div>
                      <div>
                        <label className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/80">
                          Confirm new password
                        </label>
                        <div className="relative">
                          <input
                            type={showPwd.confirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={pwdForm.confirmPassword}
                            onChange={(e) =>
                              setPwdForm((p) => ({ ...p, confirmPassword: e.target.value }))
                            }
                            className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 py-3.5 pl-4 pr-12 font-cinzel text-amber-100 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd((s) => ({ ...s, confirm: !s.confirm }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-amber-400/90 hover:bg-amber-900/40"
                            aria-label={showPwd.confirm ? 'Hide password' : 'Show password'}
                          >
                            {showPwd.confirm ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                          </button>
                        </div>
                      </div>

                      {pwdSuccess && (
                        <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-3 font-cinzel text-sm text-emerald-200/95">
                          {pwdSuccess}
                        </div>
                      )}
                      {pwdError && (
                        <p className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 font-cinzel text-sm text-red-300">
                          {pwdError}
                        </p>
                      )}

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="submit"
                          disabled={pwdSaving}
                          className="flex-1 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-wider text-[#1a0f08] disabled:opacity-50"
                        >
                          {pwdSaving ? 'Updating…' : 'Update password'}
                        </button>
                        <button
                          type="button"
                          disabled={pwdSaving}
                          onClick={() => {
                            setShowPasswordForm(false)
                            setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                            setPwdError('')
                            setPwdSuccess('')
                          }}
                          className="flex-1 rounded-full border border-amber-700/45 py-3.5 font-cinzel text-sm text-amber-200 hover:bg-amber-900/25 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>

                      <p className="text-center font-cinzel text-xs text-amber-200/60">
                        Forgot your password?{' '}
                        <Link
                          to="/forgot-password"
                          className="text-amber-400 underline-offset-2 hover:text-amber-300 hover:underline"
                        >
                          Reset with email OTP
                        </Link>
                      </p>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/80">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 px-4 py-3.5 font-cinzel text-amber-100 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/80">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-amber-900/40 bg-[#1a120b]/50 px-4 py-3.5 font-cinzel text-amber-400/70"
                  />
                  <p className="mt-1.5 font-cinzel text-[10px] text-amber-500/60">Email is fixed for security. Contact support to change it.</p>
                </div>

                {error && <p className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 font-cinzel text-sm text-red-300">{error}</p>}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-gradient-to-r from-amber-600 to-amber-500 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-wider text-[#1a0f08] disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save to database'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setError('')
                    }}
                    className="rounded-full border border-amber-700/40 py-3.5 font-cinzel text-sm text-amber-200 hover:bg-amber-900/25"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-amber-700/35 bg-[#23180f] p-8 shadow-2xl">
            <h2 className="font-dancingscript text-2xl text-amber-100">Log out?</h2>
            <p className="mt-2 font-cinzel text-sm text-amber-200/70">You’ll need to sign in again to order or view orders.</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-amber-700/40 py-3 font-cinzel text-sm text-amber-100"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3 font-cinzel text-sm font-semibold text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
