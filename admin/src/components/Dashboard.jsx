import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import adminClient from '../api/adminClient'
import { FiSearch, FiTrash2 } from 'react-icons/fi'
import { FaRupeeSign } from 'react-icons/fa'
import { statusStyles, paymentMethodDetails, styles, iconMap } from '../assets/dummyadmin'

/** Poll orders so the list updates when grace ends (no manual refresh needed) */
const ORDERS_POLL_MS = 800

const formatInr = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

const calcOrderTotal = (order) =>
  (order.items || []).reduce((sum, x) => sum + Number(x.item?.price || 0) * Number(x.quantity || 0), 0)

const normalizeStatus = (status) => {
  const raw = String(status || '').trim().toLowerCase()
  if (raw === 'outfordelivery' || raw === 'out_for_delivery' || raw === 'out-for-delivery') {
    return 'outForDelivery'
  }
  if (raw === 'delivered') return 'delivered'
  if (raw === 'cancelled' || raw === 'canceled') return 'cancelled'
  return 'processing'
}

const normalizePaymentStatus = (status) => {
  const raw = String(status || '').trim().toLowerCase()
  if (raw === 'succeeded' || raw === 'paid' || raw === 'success') return 'succeeded'
  if (raw === 'refunded') return 'refunded'
  if (raw === 'failed') return 'failed'
  return 'pending'
}

const normalizePaymentMethod = (method) => {
  const raw = String(method || '').trim().toLowerCase()
  if (raw === 'cod' || raw === 'card' || raw === 'upi' || raw === 'online') return raw
  return 'online'
}

const useAnimatedNumber = (target, durationMs = 900) => {
  const [val, setVal] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const from = Number(val || 0)
    const to = Number(target || 0)

    if (!Number.isFinite(to)) return

    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(from + (to - from) * eased))
      if (t < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return val
}

const defaultExportFrom = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

const Dashboard = () => {
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [deletingOrderId, setDeletingOrderId] = useState('')
  const [siteVisits, setSiteVisits] = useState(0)
  const [exportFrom, setExportFrom] = useState(defaultExportFrom)
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const [itemsRes, ordersRes, statsRes] = await Promise.all([
          adminClient.get('/api/items'),
          adminClient.get('/api/orders/getall'),
          adminClient.get('/api/stats'),
        ])

        if (cancelled) return
        setItems(itemsRes.data || [])
        setOrders(
          Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data?.orders || [],
        )
        setSiteVisits(Number(statsRes.data?.visits) || 0)
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load dashboard data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    const pollId = setInterval(async () => {
      if (cancelled) return
      try {
        const [ordersRes, statsRes] = await Promise.all([
          adminClient.get('/api/orders/getall'),
          adminClient.get('/api/stats'),
        ])
        if (!cancelled) {
          setOrders(
          Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data?.orders || [],
        )
          setSiteVisits(Number(statsRes.data?.visits) || 0)
        }
      } catch {
        /* poll failed — keep previous list */
      }
    }, ORDERS_POLL_MS)

    return () => {
      cancelled = true
      clearInterval(pollId)
    }
  }, [])

  const totals = useMemo(() => {
    const totalOrders = orders.length
    const delivered = orders.filter((o) => normalizeStatus(o.status) === 'delivered').length
    const processing = orders.filter((o) => normalizeStatus(o.status) === 'processing').length
    const outForDelivery = orders.filter((o) => normalizeStatus(o.status) === 'outForDelivery').length

    const succeededPayments = orders.filter((o) => normalizePaymentStatus(o.paymentStatus) === 'succeeded')
    const pendingPayments = orders.filter((o) => normalizePaymentStatus(o.paymentStatus) === 'pending')

    const revenue = succeededPayments.reduce((sum, o) => sum + calcOrderTotal(o), 0)

    return {
      totalOrders,
      delivered,
      processing,
      outForDelivery,
      succeededPaymentsCount: succeededPayments.length,
      pendingPaymentsCount: pendingPayments.length,
      revenue,
    }
  }, [orders])

  const animOrders = useAnimatedNumber(totals.totalOrders)
  const animRevenue = useAnimatedNumber(totals.revenue)
  const animDelivered = useAnimatedNumber(totals.delivered)
  const animPendingPay = useAnimatedNumber(totals.pendingPaymentsCount)
  const animSiteVisits = useAnimatedNumber(siteVisits)

  const paymentBars = useMemo(() => {
    const methods = ['cod', 'online', 'card', 'upi']
    const counts = methods.reduce((acc, m) => {
      acc[m] = 0
      return acc
    }, {})
    for (const o of orders) {
      const m = normalizePaymentMethod(o.paymentMethod)
      if (counts[m] !== undefined) counts[m]++
    }
    const max = Math.max(1, ...Object.values(counts))
    return { counts, max }
  }, [orders])

  const statusBars = useMemo(() => {
    const statuses = ['processing', 'outForDelivery', 'delivered']
    const counts = statuses.reduce((acc, s) => {
      acc[s] = 0
      return acc
    }, {})
    for (const o of orders) {
      const s = normalizeStatus(o.status)
      if (counts[s] !== undefined) counts[s]++
    }
    const max = Math.max(1, ...Object.values(counts))
    return { counts, max }
  }, [orders])

  const lowStockCount = useMemo(
    () => (items || []).filter((it) => it && it.inStock === false).length,
    [items],
  )

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) => {
      const idPart = String(o._id || '').slice(-8)
      return (
        idPart.includes(q) ||
        String(o.email || '').toLowerCase().includes(q) ||
        String(o.firstName || '').toLowerCase().includes(q) ||
        String(o.phone || '').toLowerCase().includes(q) ||
        String(o.address || '').toLowerCase().includes(q)
      )
    })
  }, [orders, search])

  const recentOrders = filteredOrders.slice(0, 8)

  const exportCsv = () => {
    const header = ['orderId', 'email', 'phone', 'status', 'paymentMethod', 'paymentStatus', 'total']
    const rows = filteredOrders.map((o) => [
      String(o._id || ''),
      String(o.email || ''),
      String(o.phone || ''),
      String(o.status || ''),
      String(o.paymentMethod || ''),
      String(o.paymentStatus || ''),
      String(calcOrderTotal(o)),
    ])

    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [header.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_export_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const reloadDashboard = async () => {
    const [itemsRes, ordersRes, statsRes] = await Promise.all([
      adminClient.get('/api/items'),
      adminClient.get('/api/orders/getall'),
      adminClient.get('/api/stats'),
    ])
    setItems(itemsRes.data || [])
    setOrders(
      Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data?.orders || [],
    )
    setSiteVisits(Number(statsRes.data?.visits) || 0)
  }

  const exportSalesCsv = async () => {
    try {
      const res = await adminClient.get('/api/orders/admin/sales-export', {
        params: { from: exportFrom, to: exportTo },
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sales_${exportFrom}_${exportTo}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e?.response?.data?.message || 'Export failed.')
    }
  }

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Delete this order from admin records?')) return
    try {
      setDeletingOrderId(orderId)
      await adminClient.delete(`/api/orders/getall/${orderId}`)
      await reloadDashboard()
    } catch (e) {
      alert(e?.response?.data?.message || 'Order delete failed.')
    } finally {
      setDeletingOrderId('')
    }
  }

  return (
    <div className={styles.pageWrapper}>
      <div className="mx-auto max-w-7xl">
        <div className={`${styles.cardContainer} relative overflow-hidden`}>
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative">
            <h2 className={`${styles.title} mb-6`}>Admin Dashboard</h2>

            {loading && <p className="text-amber-100/70">Loading dashboard…</p>}
            {!!error && <p className="mb-4 text-red-300">{error}</p>}

            {!loading && !error && (
              <>
                {lowStockCount > 0 && (
                  <div className="mb-6 rounded-xl border border-rose-500/35 bg-rose-950/30 px-4 py-3 text-sm text-rose-100/95">
                    <strong className="text-rose-200">Low stock:</strong> {lowStockCount} menu item(s) are marked out
                    of stock — update them in{' '}
                    <Link to="/list" className="font-medium text-amber-200 underline decoration-amber-400/60 hover:text-amber-100">
                      List items
                    </Link>
                    .
                  </div>
                )}

                <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-[#2D1B0E]/35 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-cinzel text-sm text-amber-200/90">Sales export (CSV)</p>
                    <p className="mt-1 text-xs text-amber-100/60">Includes all orders created in the date range.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-amber-200/80">
                      From
                      <input
                        type="date"
                        value={exportFrom}
                        onChange={(e) => setExportFrom(e.target.value)}
                        className="ml-1 rounded-lg border border-amber-500/25 bg-[#1a120b]/70 px-2 py-1.5 text-amber-50"
                      />
                    </label>
                    <label className="text-xs text-amber-200/80">
                      To
                      <input
                        type="date"
                        value={exportTo}
                        onChange={(e) => setExportTo(e.target.value)}
                        className="ml-1 rounded-lg border border-amber-500/25 bg-[#1a120b]/70 px-2 py-1.5 text-amber-50"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={exportSalesCsv}
                      className="rounded-xl border border-amber-500/40 bg-amber-700/40 px-4 py-2 text-sm font-semibold text-amber-50 hover:bg-amber-600/50"
                    >
                      Download CSV
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-2xl border border-amber-500/15 bg-[#2D1B0E]/30 p-5 transition-all duration-300 hover:border-amber-400/30 hover:bg-[#2D1B0E]/45 hover:shadow-lg hover:shadow-amber-950/30">
                    <p className="text-sm text-amber-300/70 font-cinzel">Site visits</p>
                    <p className="mt-2 text-3xl font-dancingscript text-amber-100">{animSiteVisits}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/15 bg-[#2D1B0E]/30 p-5 transition-all duration-300 hover:border-amber-400/30 hover:bg-[#2D1B0E]/45 hover:shadow-lg hover:shadow-amber-950/30">
                    <p className="text-sm text-amber-300/70 font-cinzel">Total Orders</p>
                    <p className="mt-2 text-3xl font-dancingscript text-amber-100">{animOrders}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/15 bg-[#2D1B0E]/30 p-5 transition-all duration-300 hover:border-amber-400/30 hover:bg-[#2D1B0E]/45 hover:shadow-lg hover:shadow-amber-950/30">
                    <p className="text-sm text-amber-300/70 font-cinzel">Revenue (Paid)</p>
                    <p className="mt-2 text-3xl font-dancingscript text-amber-100">
                      {formatInr(animRevenue)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/15 bg-[#2D1B0E]/30 p-5 transition-all duration-300 hover:border-amber-400/30 hover:bg-[#2D1B0E]/45 hover:shadow-lg hover:shadow-amber-950/30">
                    <p className="text-sm text-amber-300/70 font-cinzel">Delivered</p>
                    <p className="mt-2 text-3xl font-dancingscript text-amber-100">{animDelivered}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/15 bg-[#2D1B0E]/30 p-5 transition-all duration-300 hover:border-amber-400/30 hover:bg-[#2D1B0E]/45 hover:shadow-lg hover:shadow-amber-950/30">
                    <p className="text-sm text-amber-300/70 font-cinzel">Pending Payments</p>
                    <p className="mt-2 text-3xl font-dancingscript text-amber-100">{animPendingPay}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-amber-500/15 bg-[#2D1B0E]/30 p-5">
                    <p className="font-cinzel text-amber-200/90 mb-3">Payment Methods</p>
                    {(() => {
                      // Admin UI shows only COD vs Online; merge legacy `card`/`upi` into Online.
                      const codCount = paymentBars.counts.cod || 0
                      const onlineCount =
                        (paymentBars.counts.online || 0) +
                        (paymentBars.counts.card || 0) +
                        (paymentBars.counts.upi || 0)
                      const max = Math.max(1, codCount, onlineCount)

                      const codMethod = paymentMethodDetails.cod
                      const onlineMethod = paymentMethodDetails.default // Online

                      const widthFor = (count) => `${Math.round((count / max) * 100)}%`

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-xl border border-amber-500/10 bg-[#1a120b]/25 p-3">
                            <div className="flex items-center justify-between text-xs text-amber-200/70 mb-2">
                              <span className="font-cinzel">{codMethod.label}</span>
                              <span className="text-amber-100">{codCount}</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-black/20 overflow-hidden">
                              <div className={`h-full ${codMethod.class}`} style={{ width: widthFor(codCount) }} />
                            </div>
                          </div>

                          <div className="rounded-xl border border-amber-500/10 bg-[#1a120b]/25 p-3">
                            <div className="flex items-center justify-between text-xs text-amber-200/70 mb-2">
                              <span className="font-cinzel">{onlineMethod.label}</span>
                              <span className="text-amber-100">{onlineCount}</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-black/20 overflow-hidden">
                              <div className={`h-full ${onlineMethod.class}`} style={{ width: widthFor(onlineCount) }} />
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="rounded-2xl border border-amber-500/15 bg-[#2D1B0E]/30 p-5">
                    <p className="font-cinzel text-amber-200/90 mb-3">Order Status</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(statusBars.counts).map(([s, count]) => {
                        const width = `${Math.round((count / statusBars.max) * 100)}%`
                        const st = statusStyles[s] || statusStyles.processing
                        return (
                          <div
                            key={s}
                            className="rounded-xl border border-amber-500/10 bg-[#1a120b]/25 p-3"
                          >
                            <div className="flex items-center justify-between text-xs text-amber-200/70 mb-2">
                              <span className="font-cinzel flex items-center gap-2">
                                <span className={st.color}>{iconMap[st.icon]}</span>
                                {st.label}
                              </span>
                              <span className="text-amber-100">{count}</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-black/20 overflow-hidden">
                              <div className={`h-full ${st.bg}`} style={{ width }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-amber-500/15 bg-[#2D1B0E]/30 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-cinzel text-amber-200/90">Recent Orders</p>
                      <p className="text-sm text-amber-100/60 mt-1">
                        Total items in menu: <span className="font-bold text-amber-200">{items.length}</span>
                      </p>
                    </div>
                    <div className="flex w-full sm:w-auto items-center gap-2">
                      <div className="relative flex-1 sm:w-72">
                        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/70" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search by email / name / id…"
                          className="w-full rounded-xl border border-amber-700/50 bg-[#1a120b]/70 py-2.5 pl-10 pr-4 text-sm text-amber-100 placeholder:text-amber-600 focus:border-amber-500/70 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={exportCsv}
                        className="rounded-xl border border-amber-700/50 bg-amber-900/20 px-4 py-2.5 font-cinzel text-amber-200 hover:bg-amber-800/40 transition"
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>

                  <div className="ff-scrollbar mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#3a2b2b]/50">
                        <tr>
                          {['ID', 'Customer', 'Status', 'Payment', 'Items', 'Total', 'Delete'].map((h) => (
                            <th key={h} className="p-4 text-left text-amber-400">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((o) => {
                          const statusKey = normalizeStatus(o.status)
                          const st = statusStyles[statusKey] || statusStyles.processing
                          const total = calcOrderTotal(o)
                          const itemsCount = (o.items || []).reduce((s, x) => s + Number(x.quantity || 0), 0)
                          const pm = normalizePaymentMethod(o.paymentMethod)
                          const ps = normalizePaymentStatus(o.paymentStatus)
                          return (
                            <tr key={o._id} className="border-b border-amber-500/20 hover:bg-[#3a2b2b]/30 transition-colors">
                              <td className="p-4 font-mono text-amber-100">#{String(o._id).slice(-8)}</td>
                              <td className="p-4">
                                <div className="text-amber-100">{o.firstName} {o.lastName}</div>
                                <div className="text-amber-400/70 text-xs">{o.email}</div>
                              </td>
                              <td className="p-4 align-middle">
                                <span
                                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${st.color} ${st.bg}`}
                                >
                                  <span className="text-sm leading-none">{iconMap[st.icon]}</span>
                                  <span className="leading-none">{st.label}</span>
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="text-xs text-amber-200/80">
                                  <span className="font-semibold">{pm}</span>
                                  <span className="text-amber-100/60"> • {ps}</span>
                                </div>
                              </td>
                              <td className="p-4 text-amber-100">{itemsCount}</td>
                              <td className="p-4 font-semibold text-amber-300">
                                <FaRupeeSign className="inline mr-1" />{total.toFixed(0)}
                              </td>
                              <td className="p-4">
                                <button
                                  type="button"
                                  onClick={() => deleteOrder(o._id)}
                                  disabled={deletingOrderId === o._id}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-700/40 bg-red-900/20 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-800/30 disabled:opacity-60"
                                >
                                  <FiTrash2 />
                                  {deletingOrderId === o._id ? 'Deleting…' : 'Delete'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                        {recentOrders.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-10 text-center text-amber-100/60">
                              No orders found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

