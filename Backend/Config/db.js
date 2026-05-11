import mongoose from 'mongoose';
import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDefaultAdmin } from './ensureAdmin.js';

/** Helps some Windows setups where SRV / IPv6 lookups misbehave */
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const trimmed = typeof process.env.MONGO_URI === 'string' ? process.env.MONGO_URI.trim() : '';
const fallbackTrimmed =
    typeof process.env.MONGO_URI_FALLBACK === 'string' ? process.env.MONGO_URI_FALLBACK.trim() : '';

/** Same URI for `npm run seed` and the server. Set MONGO_URI in .env for MongoDB Atlas (mongodb+srv://...). */
export const MONGO_URI =
    trimmed.length > 0 ? trimmed : 'mongodb://localhost:27017/Foodie_frenzy';

const getFallbackUri = () =>
    fallbackTrimmed.length > 0 ? fallbackTrimmed : 'mongodb://localhost:27017/Foodie_frenzy';

export const connectDB = async () => {
    const opts = {
        serverSelectionTimeoutMS: 20000,
    };
    if (MONGO_URI.startsWith('mongodb+srv')) {
        opts.family = 4;
    }

    try {
        await mongoose.connect(MONGO_URI, opts);
    } catch (err) {
        const msg = String(err?.message || err);
        console.error('MongoDB connection failed:', msg);
        const looksLikeSrvDnsIssue = /querySrv|ECONNREFUSED|ENOTFOUND/i.test(msg);
        if (looksLikeSrvDnsIssue) {
            console.error(
                [
                    'Atlas SRV DNS issue often fixed by:',
                    '  1) Wi‑Fi/Ethernet → IPv4 DNS = 8.8.8.8 and 8.8.4.4 (or 1.1.1.1), then ipconfig /flushdns',
                    '  2) Atlas → Connect → Compass / shell: use “standard connection string” (mongodb://host1:27017,host2... NOT mongodb+srv)',
                    '  3) VPN / firewall off for test',
                ].join('\n'),
            );
        }

        // If SRV lookup is blocked on this network/machine, try a non-SRV URI (or local Mongo) as a fallback.
        if (MONGO_URI.startsWith('mongodb+srv') && looksLikeSrvDnsIssue) {
            const fallbackUri = getFallbackUri();
            if (fallbackUri && fallbackUri !== MONGO_URI) {
                try {
                    console.warn('Retrying MongoDB with fallback URI...');
                    await mongoose.connect(fallbackUri, { ...opts, family: undefined });
                } catch (fallbackErr) {
                    const fallbackMsg = String(fallbackErr?.message || fallbackErr);
                    console.error('MongoDB fallback connection failed:', fallbackMsg);
                    throw fallbackErr;
                }
            } else {
                throw err;
            }
        } else {
            throw err;
        }
    }

    // Labeling only: connection URI local ho ya Atlas, decide by hostname.
    // Atlas standard URI usually contains "mongodb.net" even when it is not "mongodb+srv".
    const connName = mongoose.connection?.name || '';
    const connHost = mongoose.connection?.host || '';
    const via = connHost.toLowerCase().includes('mongodb.net') ? 'MongoDB Atlas' : 'local MongoDB';
    console.log(`DB CONNECTED (${via})`);
    await ensureDefaultAdmin();
};
