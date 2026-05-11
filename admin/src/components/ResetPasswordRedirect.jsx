import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

/** Must match Foodie_Frenzy/Frontend Vite port (customer site). */
const DEFAULT_STORE = 'http://localhost:5173'

const ResetPasswordRedirect = () => {
  const { token } = useParams()
  const storeBase = String(import.meta.env.VITE_STORE_URL || DEFAULT_STORE)
    .trim()
    .replace(/\/$/, '')
  const [blocked, setBlocked] = useState(null)

  useEffect(() => {
    if (!token) return
    let storeOrigin
    try {
      storeOrigin = new URL(storeBase).origin
    } catch {
      setBlocked('Invalid VITE_STORE_URL.')
      return
    }
    if (storeOrigin === window.location.origin) {
      setBlocked(
        'Reset link is pointing at this admin URL. Set Backend .env FRONTEND_URL=http://localhost:5173, run the customer app on port 5173 and admin on 5174.',
      )
      return
    }
    const url = `${storeBase}/reset-password/${encodeURIComponent(token)}`
    window.location.replace(url)
  }, [token, storeBase])

  if (blocked) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-amber-100">
        <p className="mb-4 text-red-300">{blocked}</p>
        <p className="text-sm text-neutral-400">
          Customer site: <span className="font-mono text-amber-200">{DEFAULT_STORE}</span> · Admin should run on{' '}
          <span className="font-mono text-amber-200">http://localhost:5174</span>
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-neutral-300">
      <p>Opening password reset on the store site…</p>
    </div>
  )
}

export default ResetPasswordRedirect
