import nodemailer from 'nodemailer';
import dns from 'node:dns';

function stripOuterQuotes(value) {
    const s = String(value ?? '').trim();
    return s.replace(/^["']|["']$/g, '');
}

// Some hosts (Render) have flaky/no IPv6 egress; prefer IPv4 for SMTP.
dns.setDefaultResultOrder('ipv4first');

/** Prefer EMAIL_USER / EMAIL_PASS; fall back to existing SMTP_* used by utils/mail.js */
export function getEmailCredentials() {
    let user = stripOuterQuotes(process.env.EMAIL_USER ?? process.env.SMTP_USER ?? '');
    user = user.trim().toLowerCase();
    let pass = stripOuterQuotes(process.env.EMAIL_PASS ?? process.env.SMTP_PASS ?? '');
    // Gmail app passwords are 16 chars; spaces in Google UI / .env are optional — SMTP wants no spaces
    pass = pass.replace(/\s+/g, '').replace(/\r|\n/g, '');
    return { user, pass };
}

/** Safe log line (never log password). */
function maskEmailForLog(email) {
    const e = String(email || '');
    const at = e.indexOf('@');
    if (at < 1) return e ? `${e.slice(0, 2)}…` : '(empty)';
    return `${e.slice(0, 2)}…${e.slice(at)}`;
}

function isSmtpAuthFailure(err) {
    const code = String(err?.code || '').toUpperCase();
    const resp = String(err?.response || err?.message || err || '');
    return code === 'EAUTH' || /535|534|authentication failed|username and password not accepted/i.test(resp);
}

function isRetriableNetworkError(err) {
    const code = String(err?.code || '').toUpperCase();
    const msg = `${code} ${String(err?.message || '')}`;
    return /ETIMEDOUT|ENETUNREACH|ECONNRESET|ECONNREFUSED|ESOCKET|ETLS|CERT/i.test(msg);
}

/**
 * Human hint for API responses when Gmail rejects auth (535 / EAUTH).
 * Common causes: normal password instead of App Password, 2SV off, wrong user, typos, Render copy-paste with quotes.
 */
export function getGmailSmtpAuthFailureHint() {
    return [
        'Gmail rejected SMTP login (535 / EAUTH). Checklist:',
        '1) Google Account → Security → turn on 2-Step Verification.',
        '2) Security → App passwords → create "Mail" / "Other" → copy the 16-character password (no spaces in Render).',
        '3) EMAIL_USER must be the full Gmail / Google Workspace address (e.g. you@gmail.com), not an alias that is not the account primary.',
        '4) EMAIL_PASS must be that App Password only — never your normal Gmail password.',
        '5) On Render: no smart quotes; paste value without wrapping in extra quotes unless your .env format requires it.',
        '6) If the Google account shows a "sign-in blocked" alert, use the link Google emailed you to allow access.',
    ].join(' ');
}

/** Attach client-safe diagnostic on auth failures (controllers may forward). */
function attachClientHintForAuth(err) {
    if (!err || typeof err !== 'object') return;
    err.clientHint = getGmailSmtpAuthFailureHint();
}

export function isOtpMailReady() {
    const brevoKey = stripOuterQuotes(process.env.BREVO_API_KEY || '');
    if (brevoKey) return true;
    const resendKey = stripOuterQuotes(process.env.RESEND_API_KEY || '');
    if (resendKey) return true;
    const { user, pass } = getEmailCredentials();
    return Boolean(user && pass);
}

function envTruthy(key) {
    const v = String(process.env[key] ?? '').trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
}

/**
 * Log OTP to the backend terminal only (no email) for local dev / when SMTP is unavailable.
 * - MAIL_OTP_CONSOLE_ONLY=true → always console (ignore SMTP)
 * - MAIL_LOG_OTP_TO_CONSOLE or MAIL_LOG_RESET_LINK_TO_CONSOLE → when EMAIL_USER/PASS are not set
 */
export function shouldLogOtpToConsole() {
    // Never expose OTP via API/console fallback in production.
    if (String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production') return false;
    if (envTruthy('MAIL_OTP_CONSOLE_ONLY')) return true;
    if (
        !isOtpMailReady() &&
        (envTruthy('MAIL_LOG_OTP_TO_CONSOLE') || envTruthy('MAIL_LOG_RESET_LINK_TO_CONSOLE'))
    ) {
        return true;
    }
    return false;
}

/**
 * Production Nodemailer transport options for OTP / transactional SMTP.
 * - Gmail (`smtp.gmail.com`): defaults to port 465 + secure:true (Render-friendly; avoids STARTTLS edge cases).
 *   Set GMAIL_ALLOW_STARTTLS=true to use 587 + STARTTLS instead.
 * - Other hosts: uses SMTP_PORT / SMTP_SECURE or 587 + STARTTLS.
 */
export function getSmtpTransportOptions() {
    const { user, pass } = getEmailCredentials();
    if (!user || !pass) {
        throw new Error('EMAIL_USER and EMAIL_PASS (or SMTP_USER and SMTP_PASS) are not set');
    }

    const host = stripOuterQuotes(process.env.SMTP_HOST || 'smtp.gmail.com') || 'smtp.gmail.com';
    const isGmail = host === 'smtp.gmail.com';

    let port;
    let secure;
    if (isGmail && !envTruthy('GMAIL_ALLOW_STARTTLS')) {
        port = 465;
        secure = true;
    } else {
        const portRaw = stripOuterQuotes(process.env.SMTP_PORT || '');
        const secureRaw = stripOuterQuotes(process.env.SMTP_SECURE || '');
        const defaultPort = isGmail ? 465 : 587;
        port = Number(portRaw || defaultPort);
        secure =
            secureRaw !== ''
                ? ['true', '1', 'yes'].includes(String(secureRaw).toLowerCase())
                : port === 465;
    }

    return {
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 20000),
        greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 20000),
        socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 25000),
        tls: {
            servername: host,
            minVersion: 'TLSv1.2',
        },
    };
}

/** @returns {import('nodemailer').Transporter} */
export function createOtpTransporter() {
    return nodemailer.createTransport(getSmtpTransportOptions());
}

/**
 * Verifies SMTP (connect + AUTH). Call before send in production to fail fast on 535.
 * Does not send a message.
 */
export async function verifyOtpMailTransport() {
    const t = createOtpTransporter();
    await t.verify();
}

function smtpVerifyEnabled() {
    const v = String(process.env.SMTP_VERIFY_BEFORE_SEND ?? 'true').trim().toLowerCase();
    return !['false', '0', 'no', 'off'].includes(v);
}

async function deliverViaSmtpWithVerifyAndFallbacks(payload) {
    const base = getSmtpTransportOptions();
    const transporter = nodemailer.createTransport(base);

    if (smtpVerifyEnabled()) {
        try {
            console.info('[mailer] SMTP verify', {
                host: base.host,
                port: base.port,
                secure: base.secure,
                user: maskEmailForLog(base.auth.user),
            });
            await transporter.verify();
            console.info('[mailer] SMTP verify OK');
        } catch (verErr) {
            const snippet = String(verErr?.response || verErr?.message || verErr).slice(0, 220);
            console.error('[mailer] SMTP verify failed', {
                code: verErr?.code,
                responseCode: verErr?.responseCode,
                snippet,
            });
            if (isSmtpAuthFailure(verErr)) {
                attachClientHintForAuth(verErr);
                throw verErr;
            }
            console.warn('[mailer] SMTP verify failed (non-auth); attempting sendMail / fallbacks');
        }
    }

    try {
        await transporter.sendMail(payload);
    } catch (err) {
        if (isSmtpAuthFailure(err)) {
            attachClientHintForAuth(err);
            throw err;
        }
        if (base.host !== 'smtp.gmail.com' && !isRetriableNetworkError(err)) {
            throw err;
        }
        await trySendWithFallbackRoutes(base, payload);
    }
}

function looksLikeIpv6EgressIssue(err) {
    const code = String(err?.code || '').toUpperCase();
    const msg = String(err?.message || err || '');
    return (
        /ENETUNREACH|ETIMEDOUT|ESOCKET/.test(code) &&
        /:[0-9a-f]{1,4}:/i.test(msg)
    );
}

async function trySendWithFallbackRoutes(base, payload) {
    const routes = [];
    const pushRoute = (host, port, secure, servername = 'smtp.gmail.com') => {
        routes.push({ host, port, secure, servername });
    };

    // Try the originally configured route first.
    pushRoute(base.host, base.port, base.secure, base.tls?.servername || base.host);

    // For Gmail, also try both standard ports and resolved IPv4 targets.
    if (base.host === 'smtp.gmail.com') {
        pushRoute('smtp.gmail.com', 465, true, 'smtp.gmail.com');
        pushRoute('smtp.gmail.com', 587, false, 'smtp.gmail.com');
        const v4 = await dns.promises.resolve4('smtp.gmail.com').catch(() => []);
        for (const ip of v4) {
            pushRoute(ip, 465, true, 'smtp.gmail.com');
            pushRoute(ip, 587, false, 'smtp.gmail.com');
        }
    }

    const seen = new Set();
    let lastErr = null;
    for (const route of routes) {
        const key = `${route.host}:${route.port}:${route.secure}`;
        if (seen.has(key)) continue;
        seen.add(key);
        try {
            const transporter = nodemailer.createTransport({
                ...base,
                host: route.host,
                port: route.port,
                secure: route.secure,
                tls: { ...base.tls, servername: route.servername },
            });
            await transporter.sendMail(payload);
            return;
        } catch (err) {
            lastErr = err;
        }
    }
    if (lastErr && isSmtpAuthFailure(lastErr)) attachClientHintForAuth(lastErr);
    throw lastErr || new Error('SMTP delivery failed on all fallback routes');
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Parse "Name <email@domain>" or bare email into { name, email } for Brevo / from headers. */
export function parseFromHeader(fromLine) {
    const s = String(fromLine || '').trim();
    const m = s.match(/^(?:([^<]+?)\s*)?<([^>]+)>$/);
    if (m) {
        const name =
            String(m[1] || '')
                .replace(/^["']|["']$/g, '')
                .trim() || 'Foodie Frenzy';
        return { name, email: m[2].trim() };
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || /^[^\s@]+@[^\s@]+$/.test(s)) {
        return { name: 'Foodie Frenzy', email: s };
    }
    return { name: 'Foodie Frenzy', email: s };
}

function resolveDefaultFromLine() {
    const { user } = getEmailCredentials();
    const explicit = String(
        process.env.MAIL_FROM || process.env.BREVO_SENDER_FROM || process.env.RESEND_FROM || '',
    ).trim();
    if (explicit) return explicit;
    if (user) return `Foodie Frenzy <${user}>`;
    return 'Foodie Frenzy <onboarding@resend.dev>';
}

/**
 * Send a transactional email: Brevo API → Resend API → SMTP (with Gmail fallbacks).
 * @param {string} toEmail
 * @param {{ subject: string, text: string, html?: string }} body
 */
export async function sendTransactionalEmail(toEmail, body) {
    const { subject, text, html } = body;
    const fromLine = resolveDefaultFromLine();
    const payload = {
        from: fromLine,
        to: toEmail,
        subject,
        text,
        ...(html ? { html } : {}),
    };

    const brevoKey = stripOuterQuotes(process.env.BREVO_API_KEY || '');
    if (brevoKey) {
        let sender = parseFromHeader(fromLine);
        const fallbackEmail = stripOuterQuotes(process.env.BREVO_SENDER_EMAIL || '');
        if (!sender.email && fallbackEmail) {
            sender = { name: sender.name || 'Foodie Frenzy', email: fallbackEmail };
        }
        if (!sender.email || !String(sender.email).includes('@')) {
            const err = new Error(
                'Set MAIL_FROM or BREVO_SENDER_EMAIL to a sender verified in Brevo',
            );
            err.code = 'BREVO_CONFIG';
            throw err;
        }
        const jsonBody = {
            sender: { name: sender.name, email: sender.email },
            to: [{ email: toEmail }],
            subject,
            textContent: text,
        };
        if (html) jsonBody.htmlContent = html;

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': brevoKey,
                'Content-Type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify(jsonBody),
        });
        if (!res.ok) {
            const responseText = await res.text().catch(() => '');
            const err = new Error(responseText || `Brevo API failed with status ${res.status}`);
            err.code = 'BREVO_API_ERROR';
            throw err;
        }
        return;
    }

    const resendKey = stripOuterQuotes(process.env.RESEND_API_KEY || '');
    if (resendKey) {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: payload.from,
                to: [toEmail],
                subject: payload.subject,
                text: payload.text,
                ...(payload.html ? { html: payload.html } : {}),
            }),
        });
        if (!res.ok) {
            const responseBody = await res.text().catch(() => '');
            const err = new Error(responseBody || `Resend API failed with status ${res.status}`);
            err.code = 'RESEND_API_ERROR';
            throw err;
        }
        return;
    }

    await deliverViaSmtpWithVerifyAndFallbacks(payload);
}

/**
 * @param {string} toEmail
 * @param {string} otp - 6-digit code
 * @param {string} [username]
 */
export async function sendOtpEmail(toEmail, otp, username = '') {
    const safeName = String(username || '').replace(/[<>]/g, '');
    const safeOtp = escapeHtml(otp);

    await sendTransactionalEmail(toEmail, {
        subject: 'Foodie Frenzy — Your password reset code',
        text: [
            `Hello${safeName ? ` ${safeName}` : ''},`,
            '',
            `Your one-time password reset code is: ${otp}`,
            'It expires in 5 minutes.',
            '',
            "If you didn’t request this, ignore this email.",
        ].join('\n'),
        html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fffbeb;padding:28px;border-radius:16px;border:1px solid #d97706;">
  <h1 style="color:#92400e;font-size:22px;margin:0 0 12px;">Foodie Frenzy</h1>
  <p style="color:#451a03;font-size:15px;">Hello${safeName ? ' ' + escapeHtml(safeName) : ''},</p>
  <p style="color:#451a03;font-size:15px;">Use this code to reset your password. It expires in <strong>5 minutes</strong>:</p>
  <p style="margin:20px 0;font-size:28px;letter-spacing:0.25em;font-weight:700;color:#b45309;text-align:center;">${safeOtp}</p>
  <p style="color:#78716c;font-size:13px;">If you didn’t ask for a reset, you can ignore this message.</p>
</div>`,
    });
}
