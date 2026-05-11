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
    const user = stripOuterQuotes(process.env.EMAIL_USER ?? process.env.SMTP_USER ?? '');
    let pass = stripOuterQuotes(process.env.EMAIL_PASS ?? process.env.SMTP_PASS ?? '');
    // Gmail app passwords are 16 chars; spaces in .env are optional — SMTP wants no spaces
    pass = pass.replace(/\s+/g, '');
    return { user, pass };
}

export function isOtpMailReady() {
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
    if (envTruthy('MAIL_OTP_CONSOLE_ONLY')) return true;
    if (
        !isOtpMailReady() &&
        (envTruthy('MAIL_LOG_OTP_TO_CONSOLE') || envTruthy('MAIL_LOG_RESET_LINK_TO_CONSOLE'))
    ) {
        return true;
    }
    return false;
}

export function createOtpTransporter() {
    const { user, pass } = getEmailCredentials();
    if (!user || !pass) {
        throw new Error('EMAIL_USER and EMAIL_PASS (or SMTP_USER and SMTP_PASS) are not set');
    }

    const host = stripOuterQuotes(process.env.SMTP_HOST || 'smtp.gmail.com') || 'smtp.gmail.com';
    const portRaw = stripOuterQuotes(process.env.SMTP_PORT || '');
    const secureRaw = stripOuterQuotes(process.env.SMTP_SECURE || '');

    // Gmail on some cloud hosts works more reliably on 465 (implicit TLS).
    const defaultPort = host === 'smtp.gmail.com' ? 465 : 587;
    const port = Number(portRaw || defaultPort);
    const secure =
        secureRaw !== ''
            ? ['true', '1', 'yes'].includes(String(secureRaw).toLowerCase())
            : port === 465;

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 15000),
        greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 15000),
        socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20000),
        tls: {
            // Helps some providers/hosts that need explicit SNI.
            servername: host,
        },
    });
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {string} toEmail
 * @param {string} otp - 6-digit code
 * @param {string} [username]
 */
export async function sendOtpEmail(toEmail, otp, username = '') {
    const transporter = createOtpTransporter();
    const { user } = getEmailCredentials();
    const from =
        String(process.env.MAIL_FROM || '').trim() || `Foodie Frenzy <${user}>`;
    const safeName = String(username || '').replace(/[<>]/g, '');
    const safeOtp = escapeHtml(otp);

    await transporter.sendMail({
        from,
        to: toEmail,
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
