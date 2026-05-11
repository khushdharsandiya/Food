import React, { useEffect, useState } from 'react'
import { styles } from '../assets/dummyadmin'
import adminClient from '../api/adminClient'
import { FiPlus, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi'

const Coupons = () => {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    code: '',
    percentOff: 10,
    minSubtotal: 0,
    expiresAt: '',
  })

  const load = async () => {
    try {
      setError('')
      const { data } = await adminClient.get('/api/coupons')
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not load coupons.')
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createCoupon = async (e) => {
    e.preventDefault()
    try {
      setError('')
      await adminClient.post('/api/coupons', {
        code: form.code.trim(),
        percentOff: Number(form.percentOff),
        minSubtotal: Number(form.minSubtotal) || 0,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        active: true,
      })
      setForm({ code: '', percentOff: 10, minSubtotal: 0, expiresAt: '' })
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Create failed.')
    }
  }

  const toggle = async (c) => {
    try {
      const { data } = await adminClient.patch(`/api/coupons/${c._id}`, { active: !c.active })
      setList((prev) => prev.map((x) => (x._id === c._id ? data : x)))
    } catch (e) {
      alert(e?.response?.data?.message || 'Update failed.')
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this coupon?')) return
    try {
      await adminClient.delete(`/api/coupons/${id}`)
      setList((prev) => prev.filter((x) => x._id !== id))
    } catch (e) {
      alert(e?.response?.data?.message || 'Delete failed.')
    }
  }

  if (loading) {
    return (
      <div className={`${styles.pageWrapper} flex items-center justify-center text-amber-100`}>
        Loading coupons…
      </div>
    )
  }

  return (
    <div className={styles.pageWrapper}>
      <div className="mx-auto max-w-3xl">
        <div className={styles.cardContainer}>
          <h2 className={styles.title}>Discount coupons</h2>
          <p className="mb-6 text-center text-sm text-amber-100/70">
            Codes are stored in uppercase. Customers enter the code at checkout; discount applies to subtotal before
            tax.
          </p>

          {error && <p className="mb-4 text-center text-red-300">{error}</p>}

          <form onSubmit={createCoupon} className="mb-10 space-y-4 rounded-2xl border border-amber-500/15 bg-[#2D1B0E]/30 p-5">
            <h3 className="font-cinzel text-lg text-amber-200">New coupon</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-amber-200/80">
                Code
                <input
                  className="mt-1 w-full rounded-xl border border-amber-500/20 bg-[#1a120b]/60 px-3 py-2 text-amber-50"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="SAVE10"
                  required
                  minLength={2}
                />
              </label>
              <label className="block text-sm text-amber-200/80">
                % off (1–90)
                <input
                  type="number"
                  min={1}
                  max={90}
                  className="mt-1 w-full rounded-xl border border-amber-500/20 bg-[#1a120b]/60 px-3 py-2 text-amber-50"
                  value={form.percentOff}
                  onChange={(e) => setForm((f) => ({ ...f, percentOff: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-sm text-amber-200/80">
                Min. subtotal (₹)
                <input
                  type="number"
                  min={0}
                  step="1"
                  className="mt-1 w-full rounded-xl border border-amber-500/20 bg-[#1a120b]/60 px-3 py-2 text-amber-50"
                  value={form.minSubtotal}
                  onChange={(e) => setForm((f) => ({ ...f, minSubtotal: e.target.value }))}
                />
              </label>
              <label className="block text-sm text-amber-200/80">
                Expires (optional)
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-amber-500/20 bg-[#1a120b]/60 px-3 py-2 text-amber-50"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </label>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-amber-500 hover:to-amber-600"
            >
              <FiPlus /> Create coupon
            </button>
          </form>

          <div className="space-y-3">
            {list.length === 0 ? (
              <p className="text-center text-amber-100/60">No coupons yet.</p>
            ) : (
              list.map((c) => (
                <div
                  key={c._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/15 bg-[#2a211c]/80 px-4 py-3"
                >
                  <div>
                    <p className="font-mono text-lg font-bold text-amber-200">{c.code}</p>
                    <p className="text-xs text-amber-100/65">
                      {c.percentOff}% off · min ₹{Number(c.minSubtotal || 0).toFixed(0)} ·{' '}
                      {c.expiresAt ? `expires ${new Date(c.expiresAt).toLocaleDateString('en-IN')}` : 'no expiry'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(c)}
                      className="rounded-lg border border-amber-500/25 p-2 text-amber-200 hover:bg-amber-900/30"
                      title={c.active ? 'Deactivate' : 'Activate'}
                    >
                      {c.active ? <FiToggleRight className="text-2xl text-emerald-400" /> : <FiToggleLeft className="text-2xl text-amber-500/50" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c._id)}
                      className="rounded-lg border border-rose-500/30 p-2 text-rose-300 hover:bg-rose-950/40"
                      title="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Coupons
