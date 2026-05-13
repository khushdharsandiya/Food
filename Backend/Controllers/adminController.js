import userModel from '../Modals/userModal.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { isOtpMailReady, sendOtpEmail, shouldLogOtpToConsole, getGmailSmtpAuthFailureHint } from '../Config/mailer.js';

const OTP_TTL_MS = 5 * 60 * 1000;

const isStrongPassword = (value) =>
    validator.isStrongPassword(String(value || ''), {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    });

function generateSixDigitOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findAdminByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return null;
    return userModel.findOne({
        email: new RegExp(`^${escapeRegex(normalized)}$`, 'i'),
    });
}

/** Same response whether missing user or not admin — avoids email enumeration. Use 400 (not 404) so clients don’t confuse this with a missing API route. */
function noAdminAccountResponse(res) {
    return res.status(400).json({
        success: false,
        message: 'No administrator account found for this email.',
    });
}

const jwtSecret = () => String(process.env.JWT_SECRET ?? '').trim().replace(/^["']|["']$/g, '');

const createToken = (id, email) => {
    const secret = jwtSecret();
    if (!secret) throw new Error('JWT_SECRET is not configured');
    return jwt.sign({ id: String(id), email }, secret, { expiresIn: '7d' });
};

/** Admin login: isAdmin users only (separate from customer login) */
export const adminLogin = async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const password = String(req.body?.password || '').trim();

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const user = await userModel.findOne({
            email: new RegExp(`^${escapeRegex(email)}$`, 'i'),
        });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        if (user.isAdmin !== true) {
            return res.status(403).json({
                success: false,
                message:
                    'This account is not admin. Set ADMIN_EMAIL to this address in Backend .env and restart the server.',
            });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const token = createToken(user._id, user.email);
        return res.json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
            },
        });
    } catch (e) {
        console.error('adminLogin', e);
        if (e.message === 'JWT_SECRET is not configured') {
            return res.status(500).json({ success: false, message: 'Server configuration error' });
        }
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** POST /api/admin/forgot-password { email } — OTP to admin login email (SMTP same as store). */
export const adminForgotPasswordOtp = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email || !validator.isEmail(String(email).trim())) {
            return res.status(400).json({ success: false, message: 'Valid email is required' });
        }

        const user = await findAdminByEmail(email);
        if (!user || user.isAdmin !== true) {
            return noAdminAccountResponse(res);
        }

        const useOtpConsole = shouldLogOtpToConsole();

        if (!useOtpConsole && !isOtpMailReady()) {
            return res.status(503).json({
                success: false,
                message:
                    'Email is not configured. Set EMAIL_USER and EMAIL_PASS in Backend/.env, or MAIL_LOG_OTP_TO_CONSOLE=true (or MAIL_LOG_RESET_LINK_TO_CONSOLE=true) for local dev. Or MAIL_OTP_CONSOLE_ONLY=true to print OTP in the server terminal only.',
            });
        }

        const otp = generateSixDigitOtp();
        const otpExpiry = new Date(Date.now() + OTP_TTL_MS);

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        user.otpVerified = false;
        await user.save();

        if (useOtpConsole) {
            console.log('\n========== ADMIN PASSWORD RESET OTP (dev / no SMTP) ==========');
            console.log('Email:', user.email);
            console.log('OTP:  ', otp, '(expires in 5 minutes)');
            console.log('================================================================\n');
            return res.json({
                success: true,
                message:
                    'Development mode: OTP is printed in the backend terminal. It expires in 5 minutes.',
            });
        }

        try {
            await sendOtpEmail(user.email, otp, user.username);
        } catch (mailErr) {
            console.error(mailErr);
            user.otp = undefined;
            user.otpExpiry = undefined;
            user.otpVerified = false;
            await user.save();
            const code = String(mailErr?.code || '').toUpperCase();
            const resp = String(mailErr?.response || mailErr?.message || '');
            const hint =
                mailErr?.clientHint ||
                (code === 'BREVO_CONFIG'
                    ? 'Brevo: set MAIL_FROM (and optional BREVO_SENDER_EMAIL) to an address verified in Brevo → Senders.'
                    : code === 'BREVO_API_ERROR'
                      ? 'Brevo API error: check BREVO_API_KEY and that the sender in MAIL_FROM is verified in Brevo.'
                      : code === 'RESEND_API_ERROR'
                        ? 'Resend API error: check RESEND_API_KEY and RESEND_FROM / MAIL_FROM.'
                        : code === 'EAUTH' || /535|Username and Password not accepted/i.test(resp)
                          ? getGmailSmtpAuthFailureHint()
                          : /ETIMEDOUT|ENETUNREACH|ECONN|ESOCKET/i.test(code + ' ' + resp)
                            ? 'SMTP network issue on host. Prefer HTTPS email API: set BREVO_API_KEY (recommended on Render), or RESEND_API_KEY. If staying on Gmail SMTP: keep smtp.gmail.com, port 465, secure true, App Password; ensure Render allows outbound 465.'
                            : 'Set BREVO_API_KEY or RESEND_API_KEY for reliable mail on Render, or EMAIL_USER + EMAIL_PASS (Gmail App Password) and SMTP_HOST=smtp.gmail.com.');
            return res.status(500).json({
                success: false,
                message: 'Could not send email.',
                error: code || undefined,
                detail: resp ? resp.slice(0, 180) : undefined,
                hint,
            });
        }

        return res.json({
            success: true,
            message: 'OTP sent to your email. It expires in 5 minutes.',
        });
    } catch (err) {
        console.error('adminForgotPasswordOtp', err);
        return res.status(500).json({ success: false, message: 'Error processing forgot password request' });
    }
};

/** POST /api/admin/verify-otp { email, otp } */
export const adminVerifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    try {
        if (!email || !validator.isEmail(String(email).trim())) {
            return res.status(400).json({ success: false, message: 'Valid email is required' });
        }
        if (otp === undefined || otp === null || String(otp).trim() === '') {
            return res.status(400).json({ success: false, message: 'OTP is required' });
        }

        const user = await findAdminByEmail(email);
        if (!user || user.isAdmin !== true) {
            return noAdminAccountResponse(res);
        }

        if (!user.otp || !user.otpExpiry) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (new Date() > user.otpExpiry) {
            return res.status(400).json({ success: false, message: 'Expired OTP' });
        }

        if (String(user.otp) !== String(otp).trim()) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        user.otpVerified = true;
        await user.save();

        return res.json({ success: true, message: 'OTP verified. You can set a new password.' });
    } catch (err) {
        console.error('adminVerifyOtp', err);
        return res.status(500).json({ success: false, message: 'Error verifying OTP' });
    }
};

/** POST /api/admin/reset-password { email, newPassword } */
export const adminResetPasswordOtp = async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        if (!email || !validator.isEmail(String(email).trim())) {
            return res.status(400).json({ success: false, message: 'Valid email is required' });
        }
        if (!newPassword) {
            return res.status(400).json({ success: false, message: 'New password is required' });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message:
                    'Use a strong password (8+ chars, uppercase, lowercase, number, special character)',
            });
        }

        const user = await findAdminByEmail(email);
        if (!user || user.isAdmin !== true) {
            return noAdminAccountResponse(res);
        }

        if (!user.otpVerified) {
            return res.status(400).json({
                success: false,
                message: 'Verify OTP first before resetting password',
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.otp = undefined;
        user.otpExpiry = undefined;
        user.otpVerified = false;
        await user.save();

        return res.json({
            success: true,
            message: 'Password reset successfully. You can sign in with your new password.',
        });
    } catch (err) {
        console.error('adminResetPasswordOtp', err);
        return res.status(500).json({ success: false, message: 'Error resetting password' });
    }
};
