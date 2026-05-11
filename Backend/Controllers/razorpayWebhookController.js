import crypto from 'crypto';

/**
 * POST /api/webhooks/razorpay — raw JSON body (see Server.js express.raw).
 * Atlas / Razorpay dashboard: add URL + same secret as RAZORPAY_WEBHOOK_SECRET.
 */
export const handleRazorpayWebhook = (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body ?? '');
        const sig = req.get('x-razorpay-signature') || '';

        if (!sig) {
            return res.status(400).json({ message: 'Missing X-Razorpay-Signature' });
        }
        if (!secret) {
            console.warn('[Razorpay webhook] RAZORPAY_WEBHOOK_SECRET not set in .env');
            return res.status(503).json({ message: 'Webhook secret not configured' });
        }

        const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
        if (expected !== sig) {
            return res.status(400).json({ message: 'Invalid webhook signature' });
        }

        let payload;
        try {
            payload = JSON.parse(raw);
        } catch {
            return res.status(400).json({ message: 'Invalid JSON body' });
        }

        const eventName = payload?.event;
        if (eventName) {
            const payId = payload?.payload?.payment?.entity?.id;
            console.log('[Razorpay webhook]', eventName, payId || '');
        }

        return res.status(200).json({ received: true });
    } catch (err) {
        console.error('[Razorpay webhook]', err?.message || err);
        return res.status(500).json({ message: 'Webhook handler error' });
    }
};
