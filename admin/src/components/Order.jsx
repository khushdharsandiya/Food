import React, { useCallback, useEffect, useState, useRef } from 'react'
import { layoutClasses, tableClasses, statusStyles, paymentMethodDetails, iconMap } from '../assets/dummyadmin'
import adminClient from '../api/adminClient';
import { FiBox, FiCheckCircle, FiUser } from 'react-icons/fi';
import AdminModal from './AdminModal'

/** Poll interval — was 800ms (too fast: fought dropdown clicks + felt “stuck loading”). */
const ORDERS_POLL_MS = 6000;

const DEFAULT_AUTO_DELIVER_MS = 5 * 60 * 1000

function normalizeGetAllPayload(data) {
  if (Array.isArray(data)) {
    return {
      orders: data,
      orderTimeline: { autoDeliverAfterOutMs: DEFAULT_AUTO_DELIVER_MS },
    }
  }
  return {
    orders: data?.orders ?? [],
    orderTimeline: data?.orderTimeline ?? { autoDeliverAfterOutMs: DEFAULT_AUTO_DELIVER_MS },
  }
}

function describeAutoDeliverRule(autoDeliverAfterOutMs) {
  const ms = Number(autoDeliverAfterOutMs) || DEFAULT_AUTO_DELIVER_MS
  const minE = ms / 60000
  if (minE >= 1 && ms % 60000 === 0) {
    const m = Math.round(minE)
    return `After “Out for delivery”, the system marks the order Delivered in ${m} minute${m !== 1 ? 's' : ''}.`
  }
  const s = Math.round(ms / 1000)
  return `After “Out for delivery”, the system marks Delivered in ${s} second${s !== 1 ? 's' : ''}.`
}

function formatDeliveredAt(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

/**
 * Reconcile API status with an in-flight dropdown choice.
 * Critical: do not let stale `cancelled` / `outForDelivery` pending overwrite `delivered`
 * when auto-deliver runs between polls (otherwise the select flashes wrong labels).
 */
function resolveStatusMerge(rawStatus, pendingStatus) {
  if (pendingStatus === undefined) return rawStatus
  if (rawStatus === pendingStatus) return rawStatus

  if (rawStatus === 'delivered') return rawStatus
  if (rawStatus === 'cancelled') return rawStatus

  if (pendingStatus === 'cancelled') return 'cancelled'

  const rank = { processing: 1, outForDelivery: 2, delivered: 3 }
  const rr = rank[rawStatus]
  const rp = rank[pendingStatus]
  if (rr !== undefined && rp !== undefined) {
    if (rr > rp) return rawStatus
    if (rp > rr) return pendingStatus
  }

  return pendingStatus
}

/** Only these appear in the dispatch select — Cancel uses a separate button (avoids accidental middle clicks). */
const DISPATCH_SELECT_STATUSES = ['processing', 'outForDelivery']

function isAbortError(err) {
  return err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError'
}

const Order = () => {

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** Popup when an order becomes delivered (customer received) while this screen is open */
  const [deliveredNotice, setDeliveredNotice] = useState(null);
  useEffect(() => {
    if (!deliveredNotice?.orders?.length) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [deliveredNotice])
  const [orderTimelineMeta, setOrderTimelineMeta] = useState({
    autoDeliverAfterOutMs: DEFAULT_AUTO_DELIVER_MS,
  });
  /** When true, loads cancelled / refunded rows only (archive). */
  const [showArchive, setShowArchive] = useState(false);
  const [modal, setModal] = useState({
    open: false,
    tone: 'amber',
    title: '',
    message: '',
    primaryLabel: 'OK',
    secondaryLabel: '',
    onPrimary: null,
    onSecondary: null,
  })
  const closeModal = () => setModal((m) => ({ ...m, open: false }))

  const prevStatusesRef = useRef({});
  const hasInitializedSnapshotRef = useRef(false);
  /** Skip background polls while a status PUT is in flight (cancel/refund can call Razorpay). */
  const statusUpdateInFlightRef = useRef(false);
  /**
   * Survives stale GET responses: a poll that started before your click can finish after and
   * otherwise overwrote optimistic UI with old server status.
   */
  const pendingLocalStatusRef = useRef({});
  /** Ignore out-of-order GET /getall responses (older slow request overwriting newer data causes status glitches). */
  const ordersFetchGenRef = useRef(0);
  /** Abort the previous in-flight list GET when a newer one starts (pairs with gen guard). */
  const ordersGetAbortRef = useRef(null);
  /** Row id → saving (disables select + shows Working…) */
  const [statusSaving, setStatusSaving] = useState({});

  const mapOrders = (raw) =>
    raw.map(order => ({
      ...order,
      address: order.address ?? order.shippingAddress?.address ?? '',
      city: order.city ?? order.shippingAddress?.city ?? '',
      zipCode: order.zipCode ?? order.shippingAddress?.zipCode ?? '',
      phone: order.phone ?? '',
      items: order.items?.map(e => ({
        _id: e._id,
        item: e.item,
        quantity: e.quantity
      })) || [],
      createdAt: new Date(order.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

  const fetchOrders = useCallback(async ({ silent } = {}) => {
    const gen = ++ordersFetchGenRef.current;
    try {
      if (!silent) setLoading(true);
      ordersGetAbortRef.current?.abort();
      const ac = new AbortController();
      ordersGetAbortRef.current = ac;
      const response = await adminClient.get('/api/orders/getall', {
        params: { archive: showArchive ? 1 : 0 },
        signal: ac.signal,
      });
      if (gen !== ordersFetchGenRef.current) {
        return false;
      }
      const { orders: rawList, orderTimeline } = normalizeGetAllPayload(response.data);
      setOrderTimelineMeta(orderTimeline);
      const mapped = mapOrders(rawList || []);

      const pendRef = pendingLocalStatusRef.current;
      for (const id of [...Object.keys(pendRef)]) {
        const rawRow = mapped.find((x) => String(x._id) === id);
        if (!rawRow) {
          delete pendRef[id];
          continue;
        }
        const mergedStatus = resolveStatusMerge(rawRow.status, pendRef[id]);
        if (mergedStatus === rawRow.status) {
          delete pendRef[id];
        }
      }
      const pending = pendingLocalStatusRef.current;
      const merged =
        Object.keys(pending).length === 0
          ? mapped
          : mapped.map((o) => {
              const id = String(o._id);
              const pend = pending[id];
              if (pend === undefined) return o;
              const next = resolveStatusMerge(o.status, pend);
              return next === o.status ? o : { ...o, status: next };
            });

      const prev = prevStatusesRef.current;
      if (!showArchive && hasInitializedSnapshotRef.current) {
        const newlyDelivered = [];
        for (const o of merged) {
          const id = String(o._id);
          const oldS = prev[id];
          if (oldS != null && oldS !== 'delivered' && o.status === 'delivered') {
            newlyDelivered.push(o);
          }
        }
        if (newlyDelivered.length > 0) {
          setDeliveredNotice({ orders: newlyDelivered });
        }
      }

      const next = {};
      for (const o of merged) {
        next[String(o._id)] = o.status;
      }
      prevStatusesRef.current = next;
      if (!showArchive) {
        hasInitializedSnapshotRef.current = true;
      }

      setOrders(merged);
      setError(null);
      return true;
    }
    catch (err) {
      if (isAbortError(err)) {
        return false;
      }
      if (gen !== ordersFetchGenRef.current) {
        return false;
      }
      if (!silent) setError(err.response?.data?.message || 'Failed to load orders.');
      return false;
    }
    finally {
      if (!silent && gen === ordersFetchGenRef.current) {
        setLoading(false);
      }
    }
  }, [showArchive]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await fetchOrders({ silent: false });
    };
    run();

    const id = setInterval(() => {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.hidden) return
      if (statusUpdateInFlightRef.current) return
      fetchOrders({ silent: true })
    }, ORDERS_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      ordersGetAbortRef.current?.abort();
    };
  }, [fetchOrders]);

  const openCancelOrderConfirm = (orderId) => {
    setModal({
      open: true,
      tone: 'danger',
      title: 'Cancel this order?',
      message:
        'Online paid orders will try a full Razorpay refund before cancel (can take a moment). COD orders cancel immediately.',
      primaryLabel: 'Yes, cancel order',
      secondaryLabel: 'Back',
      onPrimary: () => {
        closeModal()
        void handleStatusChange(orderId, 'cancelled')
      },
      onSecondary: closeModal,
    })
  }

  const handleStatusChange = async (orderId, newStatus) => {
    const idStr = String(orderId)
    const snapshot = orders
    pendingLocalStatusRef.current[idStr] = newStatus
    statusUpdateInFlightRef.current = true
    setStatusSaving((s) => ({ ...s, [idStr]: true }))
    setOrders((prev) =>
      prev.map((o) => (String(o._id) === idStr ? { ...o, status: newStatus } : o)),
    )
    let putOk = false
    try {
      await adminClient.put(`/api/orders/getall/${orderId}`, { status: newStatus }, { timeout: 120000 })
      putOk = true
      const refreshed = await fetchOrders({ silent: true })
      if (refreshed) {
        delete pendingLocalStatusRef.current[idStr]
      }
    } catch (err) {
      if (!putOk) {
        delete pendingLocalStatusRef.current[idStr]
        setOrders(snapshot)
        setModal({
          open: true,
          tone: 'danger',
          title: 'Update failed',
          message: err.response?.data?.message || 'Failed to update order status.',
          primaryLabel: 'OK',
          secondaryLabel: '',
          onPrimary: closeModal,
          onSecondary: null,
        })
      }
      /** PUT succeeded but refresh failed — keep pending so stale polls cannot revert the row. */
    } finally {
      statusUpdateInFlightRef.current = false
      setStatusSaving((s) => {
        const next = { ...s }
        delete next[idStr]
        return next
      })
    }
  };

  if (error) return (
    <div className={`${layoutClasses.page} flex items-center justify-center`}>
      <div className="text-red-400 text-xl font-semibold">{error}</div>
    </div>
  )

  return (
    <>
      <AdminModal
        open={modal.open}
        tone={modal.tone}
        title={modal.title}
        message={modal.message}
        primaryLabel={modal.primaryLabel}
        secondaryLabel={modal.secondaryLabel}
        onPrimary={modal.onPrimary || closeModal}
        onSecondary={modal.onSecondary || closeModal}
        onClose={closeModal}
      />
      {/* Portal-free: render outside blurred card so fixed overlay is viewport-centered */}
      {deliveredNotice && deliveredNotice.orders?.length > 0 && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-delivered-title"
          onClick={() => setDeliveredNotice(null)}
        >
          <div
            className="mx-auto w-full max-w-md shrink-0 rounded-2xl border border-emerald-500/40 bg-[#1a1a1a] p-6 text-center shadow-2xl shadow-emerald-950/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
              <FiCheckCircle className="text-3xl text-emerald-400" aria-hidden />
            </div>
            <h3
              id="admin-delivered-title"
              className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-lg font-bold text-transparent sm:text-xl"
            >
              Customer received the order
            </h3>
            <p className="mt-2 text-sm text-amber-50/90">
              {deliveredNotice.orders.length === 1
                ? 'This order is now marked delivered — the customer has received it.'
                : 'These orders are now marked delivered — the customers have received them.'}
            </p>
            <div className="mt-4 max-h-52 space-y-3 overflow-y-auto text-left">
              {deliveredNotice.orders.map((o) => {
                const total =
                  o.total ??
                  o.items?.reduce((s, i) => s + (i.item?.price || 0) * (i.quantity || 0), 0);
                const name = [o.firstName, o.lastName].filter(Boolean).join(' ') || 'Customer';
                const deliveredLabel = formatDeliveredAt(o.deliveredAt);
                const payLabel =
                  paymentMethodDetails[o.paymentMethod?.toLowerCase()]?.label ||
                  (o.paymentMethod ? String(o.paymentMethod) : '—');
                return (
                  <div
                    key={o._id}
                    className="rounded-xl border border-emerald-500/25 bg-[#252525]/90 px-4 py-3 text-sm"
                  >
                    <div className="text-amber-50">
                      <span className="font-mono text-amber-200">#{String(o._id).slice(-8)}</span>
                      <span className="mx-2 text-amber-500/50">·</span>
                      <span>{name}</span>
                    </div>
                    {o.phone ? (
                      <div className="mt-1 text-amber-400">{o.phone}</div>
                    ) : null}
                    <div className="mt-1 font-medium text-amber-50">
                      ₹{Number(total || 0).toFixed(2)}
                    </div>
                    <div className="mt-2 text-amber-100/90">
                      Delivered at: {deliveredLabel ?? '—'}
                    </div>
                    <div className="mt-1 text-amber-100/90">Payment: {payLabel}</div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="mt-5 w-full rounded-xl bg-teal-600 py-3 font-cinzel text-sm font-bold uppercase tracking-wide text-white transition hover:bg-teal-500"
              onClick={() => setDeliveredNotice(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}

    <div className={`${layoutClasses.page} p-4 sm:p-6`}>
      <div className="mx-auto max-w-7xl w-full">
        <div className={`${layoutClasses.card} p-4 sm:p-6`}>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className={`${layoutClasses.heading} mb-0 text-center sm:text-left`}>
              Orders Management
            </h2>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-[#2a211c]/80 px-4 py-2 text-sm text-amber-100/90 sm:justify-end">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-amber-600 text-amber-600 focus:ring-amber-500"
                checked={showArchive}
                onChange={(e) => {
                  hasInitializedSnapshotRef.current = false;
                  setShowArchive(e.target.checked);
                }}
              />
              <span>Show cancelled &amp; refunded (archive)</span>
            </label>
          </div>
          {showArchive && (
            <p className="mb-4 text-sm text-amber-200/75">
              Archive lists orders that were cancelled or refunded. Status changes are disabled here — use live orders
              for dispatch.
            </p>
          )}
          {/* <p className="mb-6 max-w-3xl text-left text-sm leading-relaxed text-amber-100/68">
            Set <strong className="text-amber-200/90">Out for delivery</strong> from the status column here.{' '}
            <strong className="text-amber-200/90">Delivered</strong> is not set manually —{' '}
            {describeAutoDeliverRule(orderTimelineMeta.autoDeliverAfterOutMs)} When an order becomes Delivered, a
            notification pops up on this admin page with customer and order details.
          </p> */}

          <div className={`${tableClasses.wrapper} w-full`}>
            <table className={`${tableClasses.table} min-w-[900px]`}>

              <thead className={`${tableClasses.headerRow}`}>
                <tr>
                  {['Order ID', 'Customer', 'Address', 'Items', 'Total Items', 'Price', 'Payment', 'Status'].map(h => (
                    <th
                      key={h}
                      className={`${tableClasses.headerCell} whitespace-nowrap ${h === 'Total Items' ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>

                {orders.map(order => {

                  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

                  const totalPrice =
                    order.total ??
                    order.items.reduce((s, i) => s + i.item.price * i.quantity, 0);

                  const payMethod =
                    paymentMethodDetails[order.paymentMethod?.toLowerCase()] ||
                    paymentMethodDetails.default;

                  const payStatusStyle =
                    statusStyles[order.paymentStatus] ||
                    statusStyles.processing;

                  const stat =
                    statusStyles[order.status] ||
                    statusStyles.processing;

                  return (

                    <tr
                      key={order._id}
                      className={`${tableClasses.row} hover:bg-amber-500/5 transition`}
                    >

                      <td className={`${tableClasses.cellBase} font-mono text-sm text-amber-100`}>
                        #{order._id.slice(-8)}
                      </td>


                      {/* Customer */}
                      <td className={`${tableClasses.cellBase}`}>
                        <div className="flex items-start gap-3">

                          <FiUser className="text-amber-400 mt-1 shrink-0" />

                          <div className="space-y-0.5">

                            <p className="text-amber-100 font-medium">
                              {order.user?.name || order.firstName + ' ' + order.lastName}
                            </p>

                            <p className="text-xs text-amber-400/70">
                              {order.user?.phone || order.phone}
                            </p>

                            <p className="text-xs text-amber-400/70 break-all">
                              {order.user?.email || order.email}
                            </p>

                          </div>

                        </div>
                      </td>


                      {/* Address */}
                      <td className={`${tableClasses.cellBase}`}>
                        <div className="text-amber-100/80 text-sm max-w-[220px] break-words">
                          {order.address}, {order.city} - {order.zipCode}
                        </div>
                      </td>


                      {/* Items */}
                      <td className={`${tableClasses.cellBase}`}>
                        <div className="ff-scrollbar max-h-52 space-y-2 overflow-y-auto overscroll-contain pr-1">

                          {order.items.map((itm, idx) => (

                            <div
                              key={idx}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-amber-500/5 transition"
                            >

                              <div className="flex-1 min-w-0">

                                <span className="text-amber-100 text-sm truncate block">
                                  {itm.item.name}
                                </span>

                                <div className="flex items-center gap-2 text-xs text-amber-400/70">

                                  <span>₹{itm.item.price.toFixed(2)}</span>

                                  <span>•</span>

                                  <span>x{itm.quantity}</span>

                                </div>

                              </div>

                            </div>

                          ))}

                        </div>
                      </td>


                      {/* Total Items */}
                      <td className={`${tableClasses.cellBase} text-center`}>
                        <div className="flex items-center justify-center gap-1">

                          <FiBox className="text-amber-400" />

                          <span className="text-amber-300 font-semibold">
                            {totalItems}
                          </span>

                        </div>
                      </td>


                      {/* Price */}
                      <td className={`${tableClasses.cellBase} text-amber-300 font-semibold whitespace-nowrap`}>
                        ₹{totalPrice.toFixed(2)}
                      </td>


                      {/* Payment */}
                      <td className={`${tableClasses.cellBase}`}>
                        <div className="flex flex-col gap-2">

                          <div className={`${payMethod.class} px-3 py-1 rounded-lg border text-xs font-medium w-fit`}>
                            {payMethod.label}
                          </div>

                          <div className={`${payStatusStyle.color} flex items-center gap-2 text-xs font-medium`}>
                            {iconMap[payStatusStyle.icon]}
                            {payStatusStyle.label}
                          </div>

                        </div>
                      </td>


                      {/* Status: dispatch = select (no Cancel in list); Cancel = separate confirm */}
                      <td className={`${tableClasses.cellBase}`}>
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`${stat.color}`}>
                              {iconMap[stat.icon]}
                            </span>
                            {showArchive || order.status === 'delivered' ? (
                              <span
                                className={`inline-flex items-center rounded-lg border border-amber-500/20 px-3 py-1 text-xs font-medium ${stat.bg} ${stat.color}`}
                              >
                                {stat.label}
                              </span>
                            ) : DISPATCH_SELECT_STATUSES.includes(order.status) ? (
                              <>
                                <select
                                  value={order.status}
                                  disabled={Boolean(statusSaving[String(order._id)])}
                                  onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                  className={`px-3 py-1 rounded-lg ${stat.bg} ${stat.color} border border-amber-500/20 text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:cursor-wait disabled:opacity-70`}
                                >
                                  {DISPATCH_SELECT_STATUSES.map((key) => {
                                    const sty = statusStyles[key]
                                    return (
                                      <option value={key} key={key} className={`${sty.bg} ${sty.color}`}>
                                        {sty.label}
                                      </option>
                                    )
                                  })}
                                </select>
                                <button
                                  type="button"
                                  disabled={Boolean(statusSaving[String(order._id)])}
                                  onClick={() => openCancelOrderConfirm(order._id)}
                                  className="text-[11px] font-semibold text-rose-300/95 underline decoration-rose-400/50 underline-offset-2 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                                >
                                  Cancel order…
                                </button>
                              </>
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-lg border border-amber-500/20 px-3 py-1 text-xs font-medium ${stat.bg} ${stat.color}`}
                              >
                                {stat.label}
                              </span>
                            )}
                            {/* {!showArchive &&
                              order.status !== 'delivered' &&
                              statusSaving[String(order._id)] ? (
                              <span className="text-[10px] font-medium text-amber-300/90">
                                Updating… paid orders may wait on Razorpay refund.
                              </span>
                            ) : null} */}
                          </div>
                          {showArchive && order.razorpayRefundStatus && (
                            <span className="text-[10px] text-cyan-300/80">
                              Refund: {String(order.razorpayRefundStatus)}
                            </span>
                          )}
                        </div>
                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>
          </div>


          {orders.length === 0 && !loading &&
            <div className="text-center text-amber-100/60 py-12 text-lg">
              No orders found.
            </div>
          }

        </div>
      </div>
    </div>
    </>
  )
}

export default Order
