import React, { useEffect, useState, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FiArrowLeft, FiBox, FiCheckCircle, FiClock, FiMapPin, FiRefreshCw, FiShoppingBag, FiTruck, FiUser } from "react-icons/fi"
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import { resolveItemImageUrl, menuImageSrc } from '../../utils/imageUrl'
import { useCart } from '../../CartContext/CartContext'

const API = 'https://food-backend-s7t0.onrender.com'

/** Order list polls for live status updates (e.g. Out for delivery → Delivered). */
const ORDERS_POLL_MS = 8000

const MyOrder = () => {

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reorderingId, setReorderingId] = useState(null);
    const [reorderModal, setReorderModal] = useState(null); // { id, label } | null
    const navigate = useNavigate();
    const { refetchCart, clearCart, totalItems: cartItemCount } = useCart();

    const user = JSON.parse(localStorage.getItem('user'));

    const fetchOrders = useCallback(async ({ silent } = {}) => {
        try {
            if (!silent) setLoading(true);
            const response = await axios.get(`${API}/api/orders`, {
                params: { email: user?.email },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('authToken')}`
                }
            })

            const formattedOrders = response.data.map(order => ({
                ...order,
                items: order.items?.map(entry => ({
                    _id: entry._id,
                    item: {
                        ...entry.item,
                        imageUrl: entry.item.imageUrl,
                    },
                    quantity: entry.quantity
                })) || [],
                createdAtLabel: new Date(order.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                paymentStatus: order.paymentStatus?.toLowerCase() || 'pending'
            }));

            setOrders(formattedOrders)
            setError(null)
        } catch (err) {
            console.error('Error fetching orders:', err);
            if (!silent) {
                setError(err.response?.data?.message || 'Failed to load orders. Please try again later')
            }
        }
        finally {
            if (!silent) setLoading(false)
        }
    }, [user?.email])

    useEffect(() => {
        fetchOrders({ silent: false });
    }, [fetchOrders])

    useEffect(() => {
        if (!user?.email) return undefined;
        let cancelled = false;
        const id = setInterval(() => {
            if (cancelled) return;
            // Avoid background polling — saves bandwidth and prevents UI feeling laggy.
            if (document.hidden) return;
            fetchOrders({ silent: true });
        }, ORDERS_POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [fetchOrders, user?.email])

    const runReorder = async (orderId, replaceCartFirst) => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            toast.error('Please sign in again to continue.');
            return;
        }
        setReorderModal(null);
        setReorderingId(orderId);
        const t = toast.loading(replaceCartFirst ? 'Clearing cart & adding items…' : 'Adding items to cart…');
        try {
            if (replaceCartFirst) {
                await clearCart();
            }
            const { data } = await axios.post(
                `${API}/api/orders/reorder/${orderId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (data.success) {
                await refetchCart();
                toast.success(data.message, { id: t, duration: 4500 });
                if (Array.isArray(data.skipped) && data.skipped.length > 0) {
                    toast(
                        `${data.skipped.length} item(s) skipped: ${data.skipped.map((s) => s.name).join(', ')}`,
                        { icon: 'ℹ️', duration: 5000 },
                    );
                }
                navigate('/cart');
            } else {
                toast.error(data.message || 'Could not reorder. Please try again.', { id: t });
            }
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                'Could not reorder. Please try again.';
            toast.error(msg, { id: t });
        } finally {
            setReorderingId(null);
        }
    };

    const statusStyles = {
        processing: {
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            icon: <FiClock className="text-lg" />,
            label: 'Processing'
        },
        outForDelivery: {
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            icon: <FiTruck className="text-lg" />,
            label: 'Out for Delivery'
        },
        delivered: {
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            icon: <FiCheckCircle className="text-lg" />,
            label: 'Delivered'
        },
        pending: {
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            icon: <FiClock className="text-lg" />,
            label: 'Payment Pending'
        },
        cancelled: {
            color: 'text-rose-300',
            bg: 'bg-rose-500/10',
            icon: <FiClock className="text-lg" />,
            label: 'Cancelled'
        },
        succeeded: {
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            icon: <FiCheckCircle className="text-lg" />,
            label: 'Completed'
        },
        refunded: {
            color: 'text-cyan-300',
            bg: 'bg-cyan-500/10',
            icon: <FiCheckCircle className="text-lg" />,
            label: 'Refunded'
        }
    };

    const getPaymentMethodDetails = (method) => {
        switch (method?.toLowerCase()) {
            case 'cod':
                return {
                    label: 'Cash on Delivery',
                    class: 'bg-yellow-500/10 text-yellow-400 border border-yellow-400/30'
                };
            case 'card':
                return {
                    label: 'Card Payment',
                    class: 'bg-blue-500/10 text-blue-400 border border-blue-400/30'
                };
            case 'upi':
                return {
                    label: 'UPI Payment',
                    class: 'bg-purple-500/10 text-purple-400 border border-purple-400/30'
                };
            default:
                return {
                    label: 'Online Payment',
                    class: 'bg-green-500/10 text-green-400 border border-green-400/30'
                };
        }
    };

    if (error) return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] flex items-center justify-center text-red-400 text-xl gap-4">
            <p>{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition"
            >
                <FiArrowLeft className="text-xl" />
                <span>Try Again</span>
            </button>
        </div>
    )


    return (
        <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] py-10 pb-16 px-4 sm:px-6 lg:px-8">
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

            {reorderModal && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reorder-modal-title"
                    onClick={() => !reorderingId && setReorderModal(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-amber-700/40 bg-[#2a211c] p-6 shadow-2xl shadow-black/50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3
                            id="reorder-modal-title"
                            className="font-cinzel text-lg font-semibold text-amber-100 sm:text-xl"
                        >
                            Order again
                        </h3>
                        <p className="mt-2 font-cinzel text-sm leading-relaxed text-amber-200/75">
                            How should we add items from order{' '}
                            <span className="font-mono text-amber-300">{reorderModal.label}</span> to your cart?
                        </p>
                        {cartItemCount > 0 && (
                            <p className="mt-2 rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 font-cinzel text-xs text-amber-300/90">
                                Your cart currently has{' '}
                                <strong className="text-amber-200">{cartItemCount}</strong> item
                                {cartItemCount !== 1 ? 's' : ''}.
                            </p>
                        )}
                        <div className="mt-5 flex flex-col gap-3">
                            <button
                                type="button"
                                disabled={!!reorderingId}
                                onClick={() => runReorder(reorderModal.id, false)}
                                className="w-full rounded-xl border border-amber-600/40 bg-gradient-to-r from-amber-700 to-amber-600 py-3 font-cinzel text-sm font-semibold text-[#1a0f08] transition hover:from-amber-600 hover:to-amber-500 disabled:opacity-50"
                            >
                                Add to current cart{' '}
                                <span className="font-normal opacity-90">(merge quantities)</span>
                            </button>
                            <button
                                type="button"
                                disabled={!!reorderingId}
                                onClick={() => runReorder(reorderModal.id, true)}
                                className="w-full rounded-xl border border-amber-800/60 bg-[#1a120b] py-3 font-cinzel text-sm font-semibold text-amber-100 transition hover:bg-amber-950/50 disabled:opacity-50"
                            >
                                Replace cart{' '}
                                <span className="font-normal text-amber-400/90">(clear cart, then add this order)</span>
                            </button>
                            <button
                                type="button"
                                disabled={!!reorderingId}
                                onClick={() => setReorderModal(null)}
                                className="w-full py-2 font-cinzel text-sm text-amber-500/90 transition hover:text-amber-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mx-auto max-w-7xl">

                <div className="flex justify-between items-center mb-8">
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition font-semibold"
                    >
                        <FiArrowLeft className="text-xl" />
                        Back to Home
                    </Link>

                    <span className="text-amber-400/70 text-sm bg-[#3a2b2b]/40 px-3 py-1 rounded-lg border border-amber-500/20">
                        {user?.email}
                    </span>
                </div>


                <div className="rounded-3xl border border-amber-500/20 bg-[#3a2b2b]/55 p-5 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-8">

                    <h2 className="mb-6 text-center text-3xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent sm:mb-8">
                        Order History
                    </h2>

                    {loading && orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-20 text-amber-400/70">
                            <span className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500/25 border-t-amber-400" />
                            <p className="text-sm font-medium">Loading your orders…</p>
                        </div>
                    ) : (
                        <>
                    {/* Mobile / tablet: stacked cards — no wide table + side scrollbar */}
                    <div className="space-y-4 lg:hidden">
                        {orders.map((order) => (
                            <OrderHistoryCard
                                key={order._id}
                                order={order}
                                statusStyles={statusStyles}
                                getPaymentMethodDetails={getPaymentMethodDetails}
                                reorderingId={reorderingId}
                                setReorderModal={setReorderModal}
                                fetchOrders={fetchOrders}
                            />
                        ))}
                    </div>

                    {/* Desktop: full table in a soft inset panel */}
                    <div className="hidden lg:block">
                    <div className="relative rounded-2xl border border-amber-500/10 bg-[#1f1814]/45 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.04)]">
                    <div className="ff-scrollbar max-h-[min(70vh,52rem)] overflow-auto rounded-2xl">
                        <table className="w-full min-w-[1020px] text-sm">

                            <thead className="sticky top-0 z-[1] bg-[#2a211c]/95 text-amber-400 uppercase text-xs tracking-wider backdrop-blur-sm border-b border-amber-500/10">
                                <tr>
                                    <th className="p-4 text-left">Order ID</th>
                                    <th className="p-4 text-left">Customer</th>
                                    <th className="p-4 text-left">Address</th>
                                    <th className="p-4 text-left">Items</th>
                                    <th className="p-4 text-center">Total</th>
                                    <th className="p-4 text-left">Price</th>
                                    <th className="p-4 text-left">Payment</th>
                                    <th className="p-4 text-left">Status</th>
                                    <th className="p-4 text-center min-w-[9rem]">Order again</th>
                                </tr>
                            </thead>


                            <tbody>

                                {orders.map((order) => {

                                    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

                                    const totalPrice = order.total ??
                                        order.items.reduce(
                                            (sum, item) => sum + (item.item.price * item.quantity),
                                            0
                                        );

                                    const paymentMethod = getPaymentMethodDetails(order.paymentMethod);

                                    const status = statusStyles[order.status] || statusStyles.processing;

                                    const paymentStatus = statusStyles[order.paymentStatus] || statusStyles.pending;

                                    const adminVis = order.adminVisibleAt ? new Date(order.adminVisibleAt) : null;
                                    const inGrace =
                                        adminVis &&
                                        adminVis.getTime() > Date.now() &&
                                        order.status !== 'cancelled';

                                    return (
                                        <tr
                                            key={order._id}
                                            className="border-b border-amber-500/10 hover:bg-[#3a2b2b]/40 transition duration-200"
                                        >

                                            <td className="p-4 text-amber-100 font-mono">
                                                #{order._id?.slice(-8)}
                                            </td>


                                            <td className="p-4">

                                                <div className="flex items-center gap-3">

                                                    <FiUser className="text-amber-400" />

                                                    <div>
                                                        <p className="text-amber-100 font-medium">
                                                            {order.firstName} {order.lastName}
                                                        </p>
                                                        <p className="text-xs text-amber-400/60">
                                                            {order.phone}
                                                        </p>
                                                    </div>

                                                </div>

                                            </td>


                                            <td className="p-4">

                                                <div className="flex items-center gap-2 text-amber-100/80">

                                                    <FiMapPin className="text-amber-400" />

                                                    <span className="text-sm">
                                                        {order.address}, {order.city} - {order.zipCode ?? order.ZipCode}
                                                    </span>

                                                </div>

                                            </td>


                                            <td className="p-4 align-top">

                                                <div className="ff-scrollbar-subtle max-h-48 space-y-2 overflow-y-auto overscroll-contain rounded-xl border border-amber-500/10 bg-[#120d0a]/35 p-2">

                                                    {order.items.map((item, index) => (

                                                        <div
                                                            key={`${order._id}-${index}`}
                                                            className="flex items-center gap-3 rounded-lg bg-[#2a211c]/80 p-2 transition hover:bg-[#352a22]/90"
                                                        >

                                                            <img
                                                                src={menuImageSrc(resolveItemImageUrl(item.item?.imageUrl))}
                                                                alt={item.item.name}
                                                                referrerPolicy="no-referrer"
                                                                className="w-10 h-10 rounded-lg object-cover border border-amber-500/20"
                                                            />

                                                            <div className="flex-1">

                                                                <p className="text-amber-100 text-sm font-dish-name truncate">
                                                                    {item.item.name}
                                                                </p>

                                                                <div className="text-xs text-amber-400/60 flex gap-2">
                                                                    ₹{item.item.price}
                                                                    <span>•</span>
                                                                    x{item.quantity}
                                                                </div>

                                                            </div>

                                                        </div>

                                                    ))}

                                                </div>

                                            </td>


                                            <td className="p-4 text-center">

                                                <div className="flex justify-center items-center gap-1 text-amber-300 font-semibold">
                                                    <FiBox />
                                                    {totalItems}
                                                </div>

                                            </td>


                                            <td className="p-4 text-amber-300 font-semibold">
                                                ₹{totalPrice.toFixed(2)}
                                            </td>


                                            <td className="p-4 space-y-2">

                                                <div className={`px-3 py-1 rounded-lg text-xs font-medium ${paymentMethod.class}`}>
                                                    {paymentMethod.label}
                                                </div>

                                                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium ${paymentStatus.bg} ${paymentStatus.color}`}>
                                                    {paymentStatus.icon}
                                                    {paymentStatus.label}
                                                </div>
                                                <RefundTrackingHint order={order} />

                                            </td>


                                            <td className="p-4">

                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 font-medium">
                                                        <span className={status.color}>
                                                            {status.icon}
                                                        </span>
                                                        <span className={`px-3 py-1 rounded-lg text-xs ${status.bg} ${status.color}`}>
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    {inGrace && (
                                                        <GraceCancelInline
                                                            orderId={order._id}
                                                            adminVisibleAt={order.adminVisibleAt}
                                                            onDone={fetchOrders}
                                                        />
                                                    )}
                                                </div>

                                            </td>

                                            <td className="p-4 text-center align-middle">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setReorderModal({
                                                            id: order._id,
                                                            label: `#${order._id?.slice(-8)}`,
                                                        })
                                                    }
                                                    disabled={
                                                        reorderingId === order._id ||
                                                        order.status === 'cancelled' ||
                                                        inGrace
                                                    }
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-700/80 to-amber-600/80 px-2.5 py-2 text-[10px] font-cinzel font-semibold uppercase tracking-wide text-amber-50 shadow-md transition hover:from-amber-600 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-xs"
                                                    title="Reorder these items — choose merge or replace cart"
                                                >
                                                    {reorderingId === order._id ? (
                                                        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-200/40 border-t-amber-100" />
                                                    ) : (
                                                        <FiRefreshCw className="shrink-0 text-sm sm:text-base" />
                                                    )}
                                                    <span className="leading-tight">Order again</span>
                                                    <FiShoppingBag className="hidden shrink-0 text-sm sm:inline" />
                                                </button>
                                            </td>

                                        </tr>
                                    )

                                })}

                            </tbody>

                        </table>
                    </div>
                    </div>
                    </div>

                    {
                        orders.length === 0 && !loading && (
                            <div className="py-14 text-center text-lg text-amber-100/55">
                                No orders found.
                            </div>
                        )
                    }
                        </>
                    )}
                </div>

            </div>

        </div>
    )
}

function OrderHistoryCard({
    order,
    statusStyles,
    getPaymentMethodDetails,
    reorderingId,
    setReorderModal,
    fetchOrders,
}) {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice =
        order.total ??
        order.items.reduce((sum, item) => sum + item.item.price * item.quantity, 0);
    const paymentMethod = getPaymentMethodDetails(order.paymentMethod);
    const status = statusStyles[order.status] || statusStyles.processing;
    const paymentStatus = statusStyles[order.paymentStatus] || statusStyles.pending;
    const adminVis = order.adminVisibleAt ? new Date(order.adminVisibleAt) : null;
    const inGrace =
        adminVis && adminVis.getTime() > Date.now() && order.status !== 'cancelled';

    return (
        <article className="overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-[#403028]/90 to-[#221814]/95 p-4 shadow-lg ring-1 ring-black/25 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-500/10 pb-3">
                <div>
                    <p className="font-mono text-sm text-amber-200">#{order._id?.slice(-8)}</p>
                    <p className="mt-0.5 text-xs text-amber-400/65">{order.createdAtLabel}</p>
                </div>
                <div
                    className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}
                >
                    {status.icon}
                    {status.label}
                </div>
            </div>

            <div className="mt-3 flex items-start gap-2 text-sm text-amber-100/90">
                <FiUser className="mt-0.5 shrink-0 text-amber-500/80" />
                <div>
                    <p className="font-medium">
                        {order.firstName} {order.lastName}
                    </p>
                    <p className="text-xs text-amber-400/70">{order.phone}</p>
                </div>
            </div>

            <div className="mt-2 flex items-start gap-2 text-sm text-amber-100/75">
                <FiMapPin className="mt-0.5 shrink-0 text-amber-500/80" />
                <span className="leading-relaxed">
                    {order.address}, {order.city} - {order.zipCode ?? order.ZipCode}
                </span>
            </div>

            <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-500/70">
                    Items
                </p>
                <div className="space-y-2">
                    {order.items.map((item, index) => (
                        <div
                            key={`${order._id}-m-${index}`}
                            className="flex items-center gap-3 rounded-xl border border-amber-500/10 bg-[#1a1410]/70 p-2.5"
                        >
                            <img
                                src={menuImageSrc(resolveItemImageUrl(item.item?.imageUrl))}
                                alt={item.item.name}
                                referrerPolicy="no-referrer"
                                className="h-11 w-11 shrink-0 rounded-lg border border-amber-500/20 object-cover"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-amber-100">
                                    {item.item.name}
                                </p>
                                <p className="text-xs text-amber-400/70">
                                    ₹{item.item.price} × {item.quantity}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-amber-500/10 pt-4">
                <div className="flex items-center gap-1.5 text-amber-300">
                    <FiBox className="text-lg" />
                    <span className="text-sm font-semibold">{totalItems} items</span>
                    <span className="text-amber-500/40">·</span>
                    <span className="font-semibold">₹{totalPrice.toFixed(2)}</span>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <div className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${paymentMethod.class}`}>
                    {paymentMethod.label}
                </div>
                <div
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${paymentStatus.bg} ${paymentStatus.color}`}
                >
                    {paymentStatus.icon}
                    {paymentStatus.label}
                </div>
            </div>
            <RefundTrackingHint order={order} />

            {inGrace && (
                <div className="mt-3">
                    <GraceCancelInline
                        orderId={order._id}
                        adminVisibleAt={order.adminVisibleAt}
                        onDone={fetchOrders}
                    />
                </div>
            )}

            <button
                type="button"
                onClick={() =>
                    setReorderModal({
                        id: order._id,
                        label: `#${order._id?.slice(-8)}`,
                    })
                }
                disabled={reorderingId === order._id || order.status === 'cancelled' || inGrace}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-700/85 to-amber-600/85 py-3 text-xs font-semibold uppercase tracking-wide text-amber-50 transition hover:from-amber-600 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
                {reorderingId === order._id ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-200/40 border-t-amber-100" />
                ) : (
                    <FiShoppingBag className="text-base" />
                )}
                Order again
            </button>
        </article>
    );
}

/** Shown when paymentStatus is refunded — Razorpay status + reference (final bank credit is on bank/UPI timeline). */
function RefundTrackingHint({ order }) {
    const ps = String(order.paymentStatus || '').toLowerCase();
    if (ps !== 'refunded') return null;
    const rz = String(order.razorpayRefundStatus || '').toLowerCase();
    let detail =
        'A refund was started. Credit usually appears in your UPI app or card statement within a few banking days.';
    if (rz === 'processed') {
        detail =
            'Razorpay reports this refund as processed — the amount is on its way back to your original payment method.';
    } else if (rz === 'pending') {
        detail =
            'Razorpay shows this refund as pending. Refresh in a little while; the status updates when they finish processing.';
    }
    const when = order.refundedAt
        ? `Refund started: ${new Date(order.refundedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}. `
        : '';
    const ref = order.razorpayRefundId ? ` Refund ID: ${order.razorpayRefundId}.` : '';
    return (
        <p className="mt-1.5 max-w-[14rem] text-[11px] leading-snug text-amber-200/75 sm:max-w-md">
            {when}
            {detail}
            {ref}
        </p>
    );
}

function GraceCancelInline({ orderId, adminVisibleAt, onDone }) {
    const [msLeft, setMsLeft] = useState(() =>
        Math.max(0, new Date(adminVisibleAt).getTime() - Date.now()),
    );
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const id = setInterval(() => {
            setMsLeft(Math.max(0, new Date(adminVisibleAt).getTime() - Date.now()));
        }, 250);
        return () => clearInterval(id);
    }, [adminVisibleAt]);

    const sec = Math.max(0, Math.ceil(msLeft / 1000));

    const cancel = async () => {
        if (msLeft <= 0 || busy) return;
        setBusy(true);
        const t = toast.loading('Cancelling…');
        try {
            await axios.post(
                `${API}/api/orders/${orderId}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } },
            );
            toast.success('Order cancelled.', { id: t });
            await onDone();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not cancel the order.', { id: t });
        } finally {
            setBusy(false);
        }
    };

    if (msLeft <= 0) return null;

    return (
        <div className="rounded-lg border border-amber-700/40 bg-amber-950/30 px-2 py-2">
            <p className="text-[10px] text-amber-300/90">
                Visible to admin in{' '}
                <span className="font-semibold text-amber-200">{sec}s</span>
            </p>
            <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="mt-1 w-full rounded-md border border-rose-700/40 bg-rose-950/30 py-1.5 text-[10px] font-semibold text-rose-200 hover:bg-rose-900/40 disabled:opacity-50"
            >
                {busy ? '…' : 'Cancel order'}
            </button>
        </div>
    );
}

export default MyOrder
