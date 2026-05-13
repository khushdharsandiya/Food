import { isOtpMailReady, sendTransactionalEmail } from '../Config/mailer.js';

function money(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return '—';
    return `₹${x.toFixed(2)}`;
}

function orderId(order) {
    return String(order?._id ?? order?.id ?? '');
}

/**
 * @param {import('mongoose').Document|object} order
 * @param {'cod_placed'|'online_paid'|'refunded'} kind
 * @param {{ reason?: string }} [extra]
 */
export async function notifyOrderEmail(order, kind, extra = {}) {
    try {
        const to = String(order?.email || '').trim();
        if (!to) return;

        const name = [order.firstName, order.lastName].filter(Boolean).join(' ').trim() || 'Customer';
        const id = orderId(order);
        const total = money(order.total);
        const reason = String(extra?.reason || '').trim();

        const subjects = {
            cod_placed: 'Order placed — pay on delivery',
            online_paid: 'Payment confirmed',
            refunded: 'Refund update',
        };
        const subject = `Foodie Frenzy — ${subjects[kind] || 'Order update'}`;

        let text = '';
        if (kind === 'cod_placed') {
            text = [
                `Hi ${name},`,
                '',
                `Thanks — we received your order #${id} (Cash on Delivery).`,
                `Total: ${total}`,
                '',
                'We will prepare your food and update you when it is on the way.',
                '',
                '— Foodie Frenzy',
            ].join('\n');
        } else if (kind === 'online_paid') {
            text = [
                `Hi ${name},`,
                '',
                `Your payment for order #${id} was successful.`,
                `Total paid: ${total}`,
                '',
                'We are preparing your order. You will get updates as the status changes.',
                '',
                '— Foodie Frenzy',
            ].join('\n');
        } else if (kind === 'refunded') {
            text = [
                `Hi ${name},`,
                '',
                `Regarding order #${id}: your online payment status is refunded.`,
                reason ? `Details: ${reason}` : '',
                '',
                'If the amount does not show in your account within a few business days, contact your bank or wallet provider.',
                '',
                '— Foodie Frenzy',
            ]
                .filter(Boolean)
                .join('\n');
        } else {
            text = [`Hi ${name},`, '', `Update for order #${id}.`, '', '— Foodie Frenzy'].join('\n');
        }

        if (!isOtpMailReady()) {
            console.log('[order email — mail not configured]', { kind, to, orderId: id });
            console.log(text);
            return;
        }

        await sendTransactionalEmail(to, { subject, text });
    } catch (err) {
        console.error('[notifyOrderEmail]', err?.message || err);
    }
}
