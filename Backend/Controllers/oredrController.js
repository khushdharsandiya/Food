import crypto from 'crypto'
import mongoose from 'mongoose'
import Razorpay from 'razorpay'
import Order from '../Modals/orderModal.js'
import Item from '../Modals/itemModal.js'
import Coupon from '../Modals/couponModal.js'
import { CartItem } from '../Modals/cartModal.js'
import 'dotenv/config'
import validator from 'validator'
import { notifyOrderEmail } from '../services/orderNotifications.js'

/** 5s grace window for the customer; after that the order appears in the admin panel */
const ADMIN_GRACE_MS = Number(process.env.ORDER_ADMIN_GRACE_MS || 5000);

/** After admin sets “out for delivery”, auto-mark Delivered after this many ms */
const AUTO_DELIVER_AFTER_OUT_MS = Number(
    process.env.ORDER_AUTO_DELIVER_AFTER_OUT_MS || 5 * 60 * 1000,
);

/** GET /api/orders/delivery-timer-hint — public; returns configured auto-deliver delay */
export const deliveryTimerHint = (_req, res) => {
    res.json({ autoDeliverAfterOutMs: AUTO_DELIVER_AFTER_OUT_MS });
};

function scheduleAdminVisibleAt() {
    return new Date(Date.now() + ADMIN_GRACE_MS);
}

/** Cancelled or refunded rows (admin archive view). */
function adminArchivedOrdersFilter() {
    return {
        $or: [{ status: 'cancelled' }, { paymentStatus: 'refunded' }],
    };
}

/** Admin list: paid/COD orders whose grace period has ended */
function adminVisibleOrderFilter() {
    const now = new Date();
    return {
        status: { $ne: 'cancelled' },
        $and: [
            {
                $or: [
                    { paymentStatus: 'succeeded' },
                    { paymentMethod: 'cod' },
                ],
            },
            {
                $or: [
                    { adminVisibleAt: { $lte: now } },
                    { adminVisibleAt: null },
                    { adminVisibleAt: { $exists: false } },
                ],
            },
        ],
    };
}

function getRazorpay() {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) return null
    return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Resolve menu row for stock / menu checks (same rules as reorder). */
async function resolveItemFromOrderLine(line) {
    let itemDoc = null;
    if (line.menuItemId) {
        itemDoc = await Item.findById(line.menuItemId);
    }
    if (!itemDoc && line.item?.name) {
        const rawName = String(line.item.name).trim();
        itemDoc = await Item.findOne({ name: rawName });
        if (!itemDoc && rawName) {
            itemDoc = await Item.findOne({
                name: { $regex: new RegExp(`^${escapeRegex(rawName)}$`, 'i') },
            });
        }
    }
    return itemDoc;
}

/** Apply Razorpay refund entity fields to a mongoose doc or plain patch object. */
function applyRazorpayRefundSnapshot(target, refund) {
    target.razorpayRefundId = refund.id;
    target.razorpayRefundStatus = refund?.status || null;
    target.refundedAt = new Date();
    target.paymentStatus = 'refunded';
}

/** @returns {Promise<Array<{ name: string, reason: string }>>} */
async function collectStockProblems(orderLines) {
    const problems = [];
    for (const line of orderLines) {
        const qty = Number(line.quantity) || 0;
        if (qty < 1) {
            problems.push({ name: line.item?.name || 'Unknown', reason: 'Invalid quantity' });
            continue;
        }
        const itemDoc = await resolveItemFromOrderLine(line);
        if (!itemDoc) {
            problems.push({
                name: line.item?.name || 'Unknown',
                reason: 'Not on menu — refresh cart',
            });
            continue;
        }
        if (itemDoc.inStock === false) {
            problems.push({ name: itemDoc.name, reason: 'Out of stock' });
        }
    }
    return problems;
}

function mapRequestItemsToOrderLines(items) {
    if (!items || !Array.isArray(items)) return [];
    return items.map((row) => {
        const { item, name, price, imageUrl, quantity, productId } = row;
        const base = item || {};
        const rawId = base._id ?? base.id ?? productId;
        let menuItemId;
        if (rawId != null && mongoose.Types.ObjectId.isValid(String(rawId))) {
            menuItemId = new mongoose.Types.ObjectId(String(rawId));
        }
        const line = {
            item: {
                name: base.name || name || 'Unknown',
                price: Number(base.price ?? price) || 0,
                imageUrl: base.imageUrl || imageUrl || '',
            },
            quantity: Number(quantity) || 0,
        };
        if (menuItemId) line.menuItemId = menuItemId;
        return line;
    });
}

function sumOrderItemsSubtotal(orderItems) {
    return orderItems.reduce(
        (s, line) => s + Number(line.item.price) * Math.max(0, Number(line.quantity) || 0),
        0,
    );
}

/** Server-side totals; optional couponCode from request. */
async function totalsWithOptionalCoupon(serverSubtotal, couponCodeRaw) {
    const raw = String(couponCodeRaw || '').trim();
    const base = Number(Number(serverSubtotal).toFixed(2));
    if (!raw) {
        const finalSubtotal = base;
        const finalTax = Number((finalSubtotal * 0.05).toFixed(2));
        const finalTotal = Number((finalSubtotal + finalTax).toFixed(2));
        return {
            couponDiscountAmount: 0,
            appliedCouponCode: null,
            finalSubtotal,
            finalTax,
            finalTotal,
        };
    }
    const doc = await Coupon.findOne({ code: raw.toUpperCase(), active: true }).lean();
    if (!doc) {
        return { error: 'Invalid or inactive coupon code.' };
    }
    if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
        return { error: 'This coupon has expired.' };
    }
    const minS = Number(doc.minSubtotal) || 0;
    if (base + 1e-6 < minS) {
        return { error: `This coupon requires a minimum order subtotal of ₹${minS.toFixed(2)}.` };
    }
    const pct = Number(doc.percentOff) || 0;
    const couponDiscountAmount = Number(((base * pct) / 100).toFixed(2));
    const appliedCouponCode = doc.code;
    const finalSubtotal = Math.max(0, Number((base - couponDiscountAmount).toFixed(2)));
    const finalTax = Number((finalSubtotal * 0.05).toFixed(2));
    const finalTotal = Number((finalSubtotal + finalTax).toFixed(2));
    return { couponDiscountAmount, appliedCouponCode, finalSubtotal, finalTax, finalTotal };
}

function csvEscape(v) {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

const getOrderRetentionHours = () => {
    const raw = Number(process.env.ORDER_RETENTION_HOURS || 0);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

// Auto cleanup rule: delete old delivered orders after configured hours.
export const cleanupOldOrdersRetention = async () => {
    const retentionHours = getOrderRetentionHours();
    if (!retentionHours) {
        return { enabled: false, deletedCount: 0, retentionHours: 0 };
    }

    const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);
    const result = await Order.deleteMany({
        status: 'delivered',
        createdAt: { $lt: cutoff },
    });

    return {
        enabled: true,
        deletedCount: result.deletedCount || 0,
        retentionHours,
        cutoff: cutoff.toISOString(),
    };
}

// CREATE ORDER FUNCTION
export const createOrder = async (req, res) => {
    try {
        const {
            firstName, lastName, phone, email, address, city, zipCode,
            paymentMethod, total, items,
        } = req.body;

        if (!/^\d{10}$/.test(String(phone || ''))) {
            return res.status(400).json({ message: 'Phone number must be exactly 10 digits' })
        }
        if (!validator.isEmail(String(email || ''))) {
            return res.status(400).json({ message: 'Please enter a valid email address' })
        }
        if (!/^\d{6}$/.test(String(zipCode || ''))) {
            return res.status(400).json({ message: 'PIN code must be exactly 6 digits (numbers only)' })
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Invalid or empty items array" })
        }

        const orderItems = mapRequestItemsToOrderLines(items);

        const stockProblems = await collectStockProblems(orderItems);
        if (stockProblems.length > 0) {
            return res.status(400).json({
                message: 'Some items are unavailable. Update your cart and try again.',
                unavailable: stockProblems,
            });
        }

        const serverSubtotal = Number(sumOrderItemsSubtotal(orderItems).toFixed(2));
        const pricing = await totalsWithOptionalCoupon(serverSubtotal, req.body.couponCode);
        if (pricing.error) {
            return res.status(400).json({ message: pricing.error });
        }
        const {
            finalSubtotal,
            finalTax,
            finalTotal,
            couponDiscountAmount,
            appliedCouponCode,
        } = pricing;

        const clientTotal = Number(total);
        if (!Number.isFinite(clientTotal) || Math.abs(clientTotal - finalTotal) > 0.06) {
            return res.status(400).json({
                message: 'Order total does not match server pricing (items or coupon). Use preview or refresh checkout.',
                serverSubtotal,
                couponDiscountAmount,
                appliedCouponCode,
                finalSubtotal,
                finalTax,
                finalTotal,
            });
        }

        const orderMoney = {
            subtotal: finalSubtotal,
            tax: finalTax,
            total: finalTotal,
            appliedCouponCode: appliedCouponCode || null,
            couponDiscountAmount: couponDiscountAmount || 0,
        };

        const shippingCost = 0;
        let newOrder;


        if (paymentMethod === 'online') {
            const rzp = getRazorpay();
            if (!rzp) {
                return res.status(500).json({
                    message: 'Razorpay keys missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to Backend .env (Dashboard → Test mode).',
                });
            }

            const amountPaise = Math.round(Number(finalTotal) * 100);
            if (!Number.isFinite(amountPaise) || amountPaise < 100) {
                return res.status(400).json({ message: 'Invalid order total (min ₹1)' });
            }

            newOrder = new Order({
                user: req.user._id,
                firstName, lastName, phone, email, address, city, zipCode, paymentMethod,
                ...orderMoney,
                shipping: shippingCost,
                items: orderItems,
                paymentStatus: 'pending',
                adminVisibleAt: null,
            });

            await newOrder.save();

            try {
                const receipt = `ff_${String(newOrder._id).slice(-12)}`.slice(0, 40);
                const razorpayOrder = await rzp.orders.create({
                    amount: amountPaise,
                    currency: 'INR',
                    receipt,
                    notes: {
                        mongoOrderId: String(newOrder._id),
                        userId: String(req.user._id),
                    },
                });

                newOrder.razorpayOrderId = razorpayOrder.id;
                await newOrder.save();

                return res.status(201).json({
                    order: newOrder,
                    useRazorpay: true,
                    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                    razorpayOrderId: razorpayOrder.id,
                    amount: amountPaise,
                    currency: 'INR',
                    appOrderId: String(newOrder._id),
                    customerName: `${firstName} ${lastName}`.trim(),
                    customerEmail: email,
                    customerPhone: phone,
                });
            } catch (rzErr) {
                await Order.findByIdAndDelete(newOrder._id);
                console.error('Razorpay order create:', rzErr);
                return res.status(500).json({
                    message: rzErr?.error?.description || rzErr?.message || 'Razorpay order failed',
                });
            }
        }

        // COD: payment stays pending until the order is delivered (cash on handover)
        newOrder = new Order({
            user: req.user._id,
            firstName, lastName, phone, email, address, city, zipCode, paymentMethod,
            ...orderMoney,
            shipping: shippingCost,
            items: orderItems,
            paymentStatus: 'pending',
            adminVisibleAt: scheduleAdminVisibleAt(),
        })

        await newOrder.save();
        notifyOrderEmail(newOrder, 'cod_placed');
        return res.status(201).json({ order: newOrder, checkoutUrl: null })

    } catch (error) {
        console.error("createOrder Error:", error);
        res.status(500).json({ message: "server Error", error: error.message })
    }
};

/** Razorpay success handler: verify signature and mark order paid */
export const verifyRazorpayPayment = async (req, res) => {
    try {
        const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing Razorpay payment fields' });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            return res.status(500).json({ message: 'Razorpay not configured' });
        }

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
        if (expected !== razorpay_signature) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        const order = await Order.findOne({
            _id: orderId,
            user: req.user._id,
            razorpayOrderId: razorpay_order_id,
        });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (order.paymentStatus === 'succeeded') {
            if (order.transactionId === razorpay_payment_id) {
                return res.json({ order });
            }
            return res.status(400).json({ message: 'This order was already paid with a different payment.' });
        }
        if (order.paymentStatus !== 'pending') {
            return res.status(400).json({ message: 'Order cannot accept this payment' });
        }

        const verifyStockProblems = await collectStockProblems(order.items);
        if (verifyStockProblems.length > 0) {
            const rzp = getRazorpay();
            if (!rzp) {
                return res.status(500).json({
                    message:
                        'Items are no longer available and payment cannot be completed automatically. Contact support with your order id.',
                    unavailable: verifyStockProblems,
                });
            }
            try {
                const refund = await rzp.payments.refund(razorpay_payment_id, {
                    notes: {
                        mongoOrderId: String(order._id),
                        reason: 'stock_unavailable_at_payment_verify',
                    },
                });
                if (refund?.status === 'failed') {
                    return res.status(502).json({
                        message: 'Automatic refund failed. Please contact support.',
                        unavailable: verifyStockProblems,
                    });
                }
                order.transactionId = razorpay_payment_id;
                applyRazorpayRefundSnapshot(order, refund);
                order.status = 'cancelled';
                order.cancelledAt = new Date();
                order.adminVisibleAt = null;
                await order.save();
                notifyOrderEmail(order, 'refunded', {
                    reason: 'One or more items were no longer in stock when payment was confirmed.',
                });
                return res.json({
                    order,
                    refundedDueToStock: true,
                    message:
                        'One or more items went out of stock. Your payment has been refunded; it may take a few days to reach your account.',
                    unavailable: verifyStockProblems,
                });
            } catch (rzErr) {
                console.error('verifyRazorpayPayment stock refund', rzErr);
                return res.status(502).json({
                    message:
                        rzErr?.error?.description ||
                        rzErr?.message ||
                        'Could not complete refund. Contact support with your order id.',
                    unavailable: verifyStockProblems,
                });
            }
        }

        order.paymentStatus = 'succeeded';
        order.transactionId = razorpay_payment_id;
        order.adminVisibleAt = scheduleAdminVisibleAt();
        await order.save();

        notifyOrderEmail(order, 'online_paid');

        return res.json({ order });
    } catch (err) {
        console.error('verifyRazorpayPayment', err);
        return res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

// CONFIRM PAYMENT kept for backwards compatibility (Stripe flow removed)
export const confirmPayment = async (_req, res) => {
    return res.status(410).json({ message: 'Stripe checkout has been removed. Use Razorpay flow.' });
};

/**
 * Add all resolvable lines from a past order into the user’s cart (merge quantities).
 * Resolves dish by menuItemId, else by name match on current menu.
 */
export const reorderFromOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(String(orderId))) {
            return res.status(400).json({ success: false, message: 'Invalid order id' });
        }

        const order = await Order.findOne({ _id: orderId, user: req.user._id });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.status === 'cancelled' || order.cancelledAt) {
            return res.status(400).json({
                success: false,
                message: "You can't reorder from a cancelled order.",
            });
        }

        const added = [];
        const skipped = [];

        for (const line of order.items) {
            let itemDoc = null;
            if (line.menuItemId) {
                itemDoc = await Item.findById(line.menuItemId);
            }
            if (!itemDoc && line.item?.name) {
                const rawName = String(line.item.name).trim();
                itemDoc = await Item.findOne({ name: rawName });
                if (!itemDoc && rawName) {
                    itemDoc = await Item.findOne({
                        name: { $regex: new RegExp(`^${escapeRegex(rawName)}$`, 'i') },
                    });
                }
            }
            if (!itemDoc) {
                skipped.push({
                    name: line.item?.name || 'Unknown',
                    reason: 'No longer on menu',
                });
                continue;
            }
            if (itemDoc.inStock === false) {
                skipped.push({ name: itemDoc.name, reason: 'Out of stock' });
                continue;
            }

            const qty = Math.max(1, Number(line.quantity) || 1);
            let cartItem = await CartItem.findOne({ user: req.user._id, item: itemDoc._id });
            if (cartItem) {
                cartItem.quantity += qty;
                await cartItem.save();
                await cartItem.populate('item');
                added.push({ name: itemDoc.name, quantity: qty, cartQuantity: cartItem.quantity });
            } else {
                cartItem = await CartItem.create({
                    user: req.user._id,
                    item: itemDoc._id,
                    quantity: qty,
                });
                await cartItem.populate('item');
                added.push({ name: itemDoc.name, quantity: qty, cartQuantity: qty });
            }
        }

        if (added.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    'No items could be added. They may have been removed from the menu or are out of stock.',
                skipped,
            });
        }

        return res.json({
            success: true,
            message: `Added ${added.length} line(s) to your cart. Open cart to review and checkout.`,
            added,
            skipped,
        });
    } catch (err) {
        console.error('reorderFromOrder', err);
        return res.status(500).json({
            success: false,
            message: err?.message || 'Could not reorder. Please try again.',
        });
    }
};

/** Cancel own order while still inside the grace window (online paid → Razorpay refund) */
export const cancelUserOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(String(id))) {
            return res.status(400).json({ message: 'Invalid order id' });
        }
        const order = await Order.findOne({ _id: id, user: req.user._id });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (order.status === 'cancelled' || order.cancelledAt) {
            return res.status(400).json({ message: 'Order already cancelled' });
        }
        if (!order.adminVisibleAt) {
            return res.status(400).json({ message: 'This order cannot be cancelled from here.' });
        }
        if (Date.now() >= new Date(order.adminVisibleAt).getTime()) {
            return res.status(400).json({ message: 'Time over — order is now with the restaurant.' });
        }

        const paidOnline =
            order.paymentStatus === 'succeeded' &&
            order.transactionId &&
            ['online', 'card', 'upi'].includes(String(order.paymentMethod));

        if (paidOnline && !order.razorpayRefundId) {
            const rzp = getRazorpay();
            if (!rzp) {
                return res.status(500).json({
                    message:
                        'Cannot refund automatically — Razorpay is not configured. Contact support with your order id.',
                });
            }
            try {
                const refund = await rzp.payments.refund(order.transactionId, {
                    notes: {
                        mongoOrderId: String(order._id),
                        reason: 'user_cancelled_during_grace_window',
                    },
                });
                if (refund?.status === 'failed') {
                    return res.status(502).json({ message: 'Refund failed. Please contact support.' });
                }
                applyRazorpayRefundSnapshot(order, refund);
            } catch (rzErr) {
                console.error('cancelUserOrder refund', rzErr);
                return res.status(502).json({
                    message:
                        rzErr?.error?.description ||
                        rzErr?.message ||
                        'Refund failed. Please contact support.',
                });
            }
        }

        order.status = 'cancelled';
        order.cancelledAt = new Date();
        await order.save();

        if (order.paymentStatus === 'refunded') {
            notifyOrderEmail(order, 'refunded', {
                reason: 'You cancelled the order during the grace period; the online payment has been refunded.',
            });
        }

        return res.json({ success: true, order });
    } catch (err) {
        console.error('cancelUserOrder', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET ORDER
export const getOrders = async (req, res) => {
    try {
        await cleanupOldOrdersRetention();
        await runOrderTimelineAutoProgress();
        const filter = { user: req.user._id }; // order belong to that particular user
        const rawOrders = await Order.find(filter).sort({ createdAt: -1 }).lean()

        // FORMAT
        const formatted = rawOrders.map(o => ({
            ...o,
            items: o.items.map(i => ({
                _id: i._id,
                menuItemId: i.menuItemId,
                item: i.item,
                quantity: i.quantity,
            })),
            createdAt: o.createdAt,
            paymentStatus: o.paymentStatus,
            adminVisibleAt: o.adminVisibleAt,
            cancelledAt: o.cancelledAt,
        }));

        res.json(formatted)
    }
    catch (error) {
        console.error("createOrder Error:", error);
        res.status(500).json({ message: "server Error", error: error.message })
    }
}

// ADMIN ROUTE GET ALL ORDERS
export const getAllOrders = async (req, res) => {
    try {
        await cleanupOldOrdersRetention();
        await runOrderTimelineAutoProgress();
        const archive = String(req.query.archive || '').trim() === '1';
        const filter = archive ? adminArchivedOrdersFilter() : adminVisibleOrderFilter();
        const raw = await Order
            .find(filter)
            .sort({ createdAt: -1 })
            .lean()

        const formatted = raw.map(o => ({
            _id: o._id,
            user: o.user,
            firstName: o.firstName,
            lastName: o.lastName,
            email: o.email,
            phone: o.phone,
            address: o.address ?? o.shippingAddress?.address ?? '',
            city: o.city ?? o.shippingAddress?.city ?? '',
            zipCode: o.zipCode ?? o.shippingAddress?.zipCode ?? '',

            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            status: o.status,
            createdAt: o.createdAt,
            adminVisibleAt: o.adminVisibleAt,
            cancelledAt: o.cancelledAt ?? null,
            razorpayRefundId: o.razorpayRefundId ?? null,
            razorpayRefundStatus: o.razorpayRefundStatus ?? null,
            refundedAt: o.refundedAt ?? null,
            subtotal: o.subtotal,
            tax: o.tax,
            total: o.total,
            appliedCouponCode: o.appliedCouponCode ?? null,
            couponDiscountAmount: o.couponDiscountAmount ?? 0,
            deliveredAt: o.deliveredAt ?? null,
            outForDeliveryAt: o.outForDeliveryAt ?? null,

            items: o.items.map(i => ({
                _id: i._id,
                item: i.item,
                quantity: i.quantity
            }))
        }));
        res.json({
            orders: formatted,
            listMode: archive ? 'archive' : 'active',
            orderTimeline: {
                autoDeliverAfterOutMs: AUTO_DELIVER_AFTER_OUT_MS,
            },
        })

    } catch (error) {
        console.error("getAllOrders Error:", error);
        res.status(500).json({ message: "server Error", error: error.message })
    }
}

/** Authenticated: recompute subtotal / tax / total for current cart lines + optional coupon (no order created). */
export const previewOrderPricing = async (req, res) => {
    try {
        const { items, couponCode } = req.body;
        const orderItems = mapRequestItemsToOrderLines(items);
        if (!orderItems.length) {
            return res.status(400).json({ message: 'Invalid or empty items array' });
        }
        const stockProblems = await collectStockProblems(orderItems);
        if (stockProblems.length > 0) {
            return res.status(400).json({
                message: 'Some items are unavailable.',
                unavailable: stockProblems,
            });
        }
        const serverSubtotal = Number(sumOrderItemsSubtotal(orderItems).toFixed(2));
        const pricing = await totalsWithOptionalCoupon(serverSubtotal, couponCode);
        if (pricing.error) {
            return res.status(400).json({ message: pricing.error });
        }
        return res.json({
            serverSubtotal,
            ...pricing,
        });
    } catch (err) {
        console.error('previewOrderPricing', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

/** Admin CSV: orders in date range (inclusive end-of-day on `to`). */
export const exportSalesCsv = async (req, res) => {
    try {
        const toDay = req.query.to ? new Date(String(req.query.to)) : new Date();
        let fromDay = req.query.from
            ? new Date(String(req.query.from))
            : new Date(toDay.getTime() - 30 * 86400000);
        if (Number.isNaN(fromDay.getTime()) || Number.isNaN(toDay.getTime())) {
            return res.status(400).json({ message: 'Invalid from or to date (use YYYY-MM-DD).' });
        }
        let from = new Date(fromDay);
        let to = new Date(toDay);
        if (from > to) {
            const t = from;
            from = to;
            to = t;
        }
        const fileFrom = from.toISOString().slice(0, 10);
        const fileTo = to.toISOString().slice(0, 10);
        to.setHours(23, 59, 59, 999);

        const rows = await Order.find({ createdAt: { $gte: from, $lte: to } })
            .sort({ createdAt: -1 })
            .lean();

        const header = [
            'orderId',
            'createdAt',
            'email',
            'firstName',
            'lastName',
            'phone',
            'status',
            'paymentMethod',
            'paymentStatus',
            'subtotal',
            'tax',
            'total',
            'couponCode',
            'couponDiscount',
            'items',
        ];

        const lines = rows.map((o) => {
            const itemSummary = (o.items || [])
                .map((i) => `${i.quantity}x ${String(i.item?.name || '').replace(/,/g, ' ')}`)
                .join('; ');
            return [
                String(o._id),
                o.createdAt ? new Date(o.createdAt).toISOString() : '',
                o.email,
                o.firstName,
                o.lastName,
                o.phone,
                o.status,
                o.paymentMethod,
                o.paymentStatus,
                o.subtotal,
                o.tax,
                o.total,
                o.appliedCouponCode || '',
                o.couponDiscountAmount ?? 0,
                itemSummary,
            ]
                .map(csvEscape)
                .join(',');
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="sales_${fileFrom}_${fileTo}.csv"`,
        );
        res.send([header.join(','), ...lines].join('\n'));
    } catch (err) {
        console.error('exportSalesCsv', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


// UPDATE ORDER WITHOUT TOKEN FOR ADMIN
export const updateAnyOrder = async (req, res) => {
    try {
        const existing = await Order.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const body = { ...req.body };
        const newStatus = body.status;
        delete body.status;

        if (newStatus === 'delivered') {
            return res.status(400).json({
                message: 'Delivered status is automatic after the order is out for delivery for the configured time.',
            });
        }

        // Online orders need payment first; COD can go out for delivery without online pay
        if (newStatus === 'outForDelivery' && existing.paymentStatus !== 'succeeded') {
            if (existing.paymentMethod !== 'cod') {
                return res.status(400).json({
                    message: 'Out for delivery only after payment is successful.',
                });
            }
        }

        if (newStatus === 'cancelled' && existing.status === 'cancelled') {
            return res.status(400).json({ message: 'Order already cancelled' });
        }

        const patch = { ...body };

        if (newStatus !== undefined) {
            patch.status = newStatus;
            if (newStatus === 'outForDelivery') {
                patch.outForDeliveryAt = new Date();
            } else if (newStatus === 'processing' || newStatus === 'cancelled') {
                patch.outForDeliveryAt = null;
            }
        }

        /** Paid online (Razorpay): refund full payment before cancelling (e.g. out of stock). */
        if (newStatus === 'cancelled') {
            patch.cancelledAt = new Date();
            const paidOnline =
                existing.paymentStatus === 'succeeded' &&
                existing.transactionId &&
                ['online', 'card', 'upi'].includes(String(existing.paymentMethod));

            if (paidOnline) {
                if (!existing.razorpayRefundId) {
                    const rzp = getRazorpay();
                    if (!rzp) {
                        return res.status(500).json({
                            message:
                                'Paid order — Razorpay is not configured (.env keys). Add keys or refund manually in Razorpay Dashboard, then try cancel again.',
                        });
                    }
                    try {
                        const refund = await rzp.payments.refund(existing.transactionId, {
                            notes: {
                                mongoOrderId: String(existing._id),
                                reason: 'order_cancelled_by_restaurant',
                            },
                        });
                        if (refund?.status === 'failed') {
                            return res.status(502).json({
                                message: 'Razorpay refund failed. Order was not cancelled.',
                            });
                        }
                        applyRazorpayRefundSnapshot(patch, refund);
                    } catch (rzErr) {
                        console.error('Razorpay refund', rzErr);
                        const msg =
                            rzErr?.error?.description ||
                            rzErr?.message ||
                            'Refund failed. Order was not cancelled — fix the issue and try again.';
                        return res.status(502).json({ message: msg });
                    }
                } else if (existing.paymentStatus !== 'refunded') {
                    patch.paymentStatus = 'refunded';
                }
            }
        }

        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            patch,
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if (newStatus === 'cancelled' && updated.paymentStatus === 'refunded') {
            notifyOrderEmail(updated, 'refunded', {
                reason: 'Your order was cancelled and the online payment was refunded.',
            });
        }

        res.json(updated)
    }
    catch (error) {
        console.error("updateAnyOrder Error:", error);
        res.status(500).json({ message: "server Error", error: error.message })
    }
}

// DELETE ORDER FOR ADMIN
export const deleteAnyOrder = async (req, res) => {
    try {
        const deleted = await Order.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Order not found' });
        return res.json({ success: true, deletedId: String(req.params.id) });
    } catch (error) {
        console.error("deleteAnyOrder Error:", error);
        res.status(500).json({ message: "server Error", error: error.message });
    }
}

/**
 * Auto-marks paid + `outForDelivery` orders as Delivered after the configured delay from dispatch.
 * Admin sets out for delivery / processing / cancelled.
 */
export async function runOrderTimelineAutoProgress() {
    const now = Date.now();
    // outForDelivery: online already succeeded; COD can be pending until delivered
    const all = await Order.find({
        status: 'outForDelivery',
    }).lean();

    let updatedCount = 0;

    for (const o of all) {
        const visAt = o.adminVisibleAt ? new Date(o.adminVisibleAt).getTime() : 0;
        if (visAt && now < visAt) continue;

        const startMs = o.outForDeliveryAt
            ? new Date(o.outForDeliveryAt).getTime()
            : new Date(o.updatedAt || o.createdAt).getTime();

        if (!Number.isFinite(startMs)) continue;
        if (now - startMs < AUTO_DELIVER_AFTER_OUT_MS) continue;

        const patch = {
            status: 'delivered',
            deliveredAt: new Date(),
        };
        // COD: delivery = user ne cash diya → payment complete
        if (String(o.paymentMethod) === 'cod' && o.paymentStatus === 'pending') {
            patch.paymentStatus = 'succeeded';
        }

        await Order.findByIdAndUpdate(o._id, patch);
        updatedCount++;
    }

    return { updatedCount };
}


//GET ORDER BY ID
export const getOrderById = async (req, res) => {
    try {
        await runOrderTimelineAutoProgress();
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (!order.user.equals(req.user._id)) {
            return res.status(403).json({ message: 'Access Denied' })
        }

        if (req.query.email && order.email !== req.query.email) {
            return res.status(403).json({ message: 'Access Denied' })
        }

        res.json(order)
    }
    catch (error) {
        console.error('hetOrderById Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message })
    }
}

// UPDATE BY ID

export const UpdateOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (!order.user.equals(req.user._id)) {
            return res.status(403).json({ message: 'Access Denied' })
        }

        if (req.body.email && order.email !== req.body.email) {
            return res.status(403).json({ message: 'Access Denied' })
        }

        const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated)

    }
    catch (error) {
        console.error('hetOrderById Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message })
    }
}


