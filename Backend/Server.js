import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './Config/db.js';
import { handleRazorpayWebhook } from './Controllers/razorpayWebhookController.js';

import userRouter from './routes/userRoute.js';
import authRouter from './routes/authRoute.js';
import itemRouter from './routes/itemRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRoute from './routes/orderRoute.js';
import feedbackRouter from './routes/feedbackRoute.js';
import siteStatRouter from './routes/siteStatRoute.js';
import adminRoute from './routes/adminRoute.js';
import couponRoute from './routes/couponRoute.js';
import { cleanupOldOrdersRetention, runOrderTimelineAutoProgress } from './Controllers/oredrController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Render / some networks may not have IPv6 egress; prefer IPv4 for SMTP (Gmail) + Atlas SRV, etc.
dns.setDefaultResultOrder('ipv4first');

const app = express();
const port = process.env.PORT || 4000;

/** Razorpay webhooks need raw body for HMAC — register before express.json() */
app.post(
    '/api/webhooks/razorpay',
    express.raw({ type: 'application/json' }),
    handleRazorpayWebhook,
);

//MIDDLEWARE
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
);

// Reflect request origin so any local dev port (5173, 5175, 127.0.0.1, …) works with credentials
app.use(cors({
    origin: true,
    credentials: true,
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Math.max(100, Number(process.env.API_RATE_LIMIT_MAX || 500)),
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= ROUTES =================
app.use('/api/user', userRouter);
app.use('/api/auth', authRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/items', itemRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRoute)
app.use('/api/coupons', couponRoute);
app.use('/api/feedback', feedbackRouter);
app.use('/api/stats', siteStatRouter);
app.use('/api/admin', adminRoute);

app.get('/', (req, res) => {
    res.send('API WORKING')
})

// Periodic retention cleanup for old delivered orders.
const retentionCleanupEveryMs = 30 * 60 * 1000; // 30 minutes
setInterval(async () => {
    try {
        const info = await cleanupOldOrdersRetention();
        if (info.enabled && info.deletedCount > 0)  {
            console.log( 
                `[Retention] Deleted ${info.deletedCount} delivered order(s) older than ${info.retentionHours}h`,
            );
        }
    } catch (err) {
        console.error('[Retention] Cleanup failed:', err?.message || err);
    }
}, retentionCleanupEveryMs);

// Order status timeline (paid orders) — background tick so statuses advance even with no open admin tab.
const orderTimelineEveryMs = Number(process.env.ORDER_TIMELINE_TICK_MS || 30000);
setInterval(async () => {
    try {
        await runOrderTimelineAutoProgress();
    } catch (err) {
        console.error('[OrderTimeline] Tick failed:', err?.message || err);
    }
}, orderTimelineEveryMs);

// ================= SERVER =================
async function start() {
    await connectDB();
    app.listen(port, () => {
        console.log(`Server Started on http://localhost:${port}`);
    });
}

start().catch((err) => {
    console.error('Failed to start:', err?.message || err);
    process.exit(1);
});
