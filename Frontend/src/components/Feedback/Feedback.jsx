import React, { useState } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaRegStar, FaStar } from 'react-icons/fa'
import { FiSend } from 'react-icons/fi'

const API = 'https://food-backend-s7t0.onrender.com'

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'food', label: 'Food quality' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'app', label: 'Website' },
  { value: 'other', label: 'Other' },
]

const Feedback = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('general')
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('authToken')
    if (!token) {
      setShowLoginPrompt(true)
      return
    }
    setLoading(true)
    const t = toast.loading('Sending…')
    try {
      const { data } = await axios.post(`${API}/api/feedback`, {
        name: name.trim(),
        email: email.trim(),
        category,
        message: message.trim(),
        ...(rating > 0 ? { rating } : {}),
      })
      if (data.success) {
        toast.success(data.message || 'Thanks for your feedback!', { id: t })
        setName('')
        setEmail('')
        setCategory('general')
        setRating(0)
        setMessage('')
      } else {
        toast.error(data.message || 'Something went wrong.', { id: t })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reach the server.', { id: t })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-gradient-to-br from-orange-900/90 via-amber-900/95 to-[#2a1e14] py-12 px-4 sm:px-8 font-[Poppins]">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-cinzel text-amber-200/90 transition hover:text-amber-100"
        >
          <FaArrowLeft className="text-xs" />
          Back to home
        </Link>

        <div className="overflow-hidden rounded-3xl border border-amber-700/40 bg-[#2a211c]/95 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.5)] backdrop-blur-sm">
          <div className="border-b border-amber-800/50 bg-gradient-to-r from-amber-900/40 to-transparent px-8 py-6 sm:px-10">
            <h1 className="font-dancingscript text-4xl text-transparent bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text sm:text-5xl">
              Share your feedback
            </h1>
            <p className="mt-2 font-cinzel text-sm text-amber-200/80">
              Tell us what you loved or what we can improve — it’s saved securely so we can make Foodie Frenzy better.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-8 sm:p-10">
            <div>
              <label htmlFor="fb-name" className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/90">
                Name
              </label>
              <input
                id="fb-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 px-4 py-3 font-cinzel text-amber-100 placeholder:text-amber-800 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                placeholder="Your name"
                required
                minLength={2}
              />
            </div>

            <div>
              <label htmlFor="fb-email" className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/90">
                Email
              </label>
              <input
                id="fb-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 px-4 py-3 font-cinzel text-amber-100 placeholder:text-amber-800 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="fb-cat" className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/90">
                Topic
              </label>
              <select
                id="fb-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-amber-800/50 bg-[#1a120b]/80 px-4 py-3 font-cinzel text-amber-100 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-[#1a120b]">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-2 block font-cinzel text-xs uppercase tracking-widest text-amber-400/90">
                Rating <span className="font-normal normal-case text-amber-600/80">(optional)</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n === rating ? 0 : n)}
                    className="rounded-lg p-1 text-amber-400 transition hover:scale-110 hover:text-amber-300"
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  >
                    {n <= rating ? <FaStar className="text-2xl" /> : <FaRegStar className="text-2xl" />}
                  </button>
                ))}
                {rating > 0 && (
                  <button type="button" onClick={() => setRating(0)} className="ml-2 font-cinzel text-xs text-amber-500 underline">
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="fb-msg" className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-amber-400/90">
                Your feedback
              </label>
              <textarea
                id="fb-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                minLength={10}
                className="w-full resize-y rounded-xl border border-amber-800/50 bg-[#1a120b]/80 px-4 py-3 font-cinzel text-amber-100 placeholder:text-amber-800 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                placeholder="What went well? What could be better? (min. 10 characters)"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-widest text-[#1a0f08] shadow-lg shadow-amber-900/30 transition hover:scale-[1.01] disabled:opacity-60"
            >
              <FiSend className="text-lg" />
              {loading ? 'Sending…' : 'Submit feedback'}
            </button>

            <p className="text-center font-cinzel text-xs text-amber-200/60">
              Need help with an order?{' '}
              <Link to="/contact" className="text-amber-400 underline-offset-2 hover:underline">
                Contact us
              </Link>
            </p>
          </form>
        </div>
      </div>
      {showLoginPrompt && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-700/35 bg-[#23180f] p-6 shadow-2xl">
            <h3 className="font-cinzel text-xl font-semibold text-amber-100">Login required</h3>
            <p className="mt-2 font-cinzel text-sm text-amber-200/80">
              Please login first to submit feedback.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLoginPrompt(false)
                  navigate('/login')
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-2.5 font-cinzel text-sm font-semibold text-[#1a0f08]"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setShowLoginPrompt(false)}
                className="flex-1 rounded-xl border border-amber-700/45 py-2.5 font-cinzel text-sm text-amber-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Feedback
