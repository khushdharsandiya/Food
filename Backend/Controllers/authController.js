import userModel from '../Modals/userModal.js';
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

/** POST /api/auth/forgot-password { email } */
export const forgotPasswordOtp = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email || !validator.isEmail(String(email).trim())) {
            return res.status(400).json({ success: false, message: 'Valid email is required' });
        }

        const trimmedEmail = String(email).trim();
        const user = await userModel.findOne({ email: trimmedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const useOtpConsole = shouldLogOtpToConsole();

        if (!useOtpConsole && !isOtpMailReady()) {
            return res.status(503).json({
                success: false,
                message:
                    'Email is not configured. On Render set EMAIL_USER (full Gmail), EMAIL_PASS (16-char App Password), SMTP_HOST=smtp.gmail.com, MAIL_FROM, or set BREVO_API_KEY / RESEND_API_KEY. For local dev only: MAIL_LOG_OTP_TO_CONSOLE or MAIL_OTP_CONSOLE_ONLY.',
            });
        }

        const otp = generateSixDigitOtp();
        const otpExpiry = new Date(Date.now() + OTP_TTL_MS);

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        user.otpVerified = false;
        await user.save();

        if (useOtpConsole) {
            console.log('\n========== PASSWORD RESET OTP (dev / no SMTP) ==========');
            console.log('Email:', user.email);
            console.log('OTP:  ', otp, '(expires in 5 minutes)');
            console.log('==========================================================\n');
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
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error processing forgot password request' });
    }
};

/** POST /api/auth/verify-otp { email, otp } */
export const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    try {
        if (!email || !validator.isEmail(String(email).trim())) {
            return res.status(400).json({ success: false, message: 'Valid email is required' });
        }
        if (otp === undefined || otp === null || String(otp).trim() === '') {
            return res.status(400).json({ success: false, message: 'OTP is required' });
        }

        const trimmedEmail = String(email).trim();
        const user = await userModel.findOne({ email: trimmedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
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
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error verifying OTP' });
    }
};

/** POST /api/auth/reset-password { email, newPassword } */
export const resetPasswordOtp = async (req, res) => {
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

        const trimmedEmail = String(email).trim();
        const user = await userModel.findOne({ email: trimmedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.otpVerified) {
            return res.status(403).json({
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
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error resetting password' });
    }
};

/** POST /api/auth/change-password { email, oldPassword, newPassword } — user knows current password */
export const changePasswordWithOld = async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;

    try {
        if (!email || !validator.isEmail(String(email).trim())) {
            return res.status(400).json({ success: false, message: 'Valid email is required' });
        }
        if (oldPassword === undefined || oldPassword === null || String(oldPassword) === '') {
            return res.status(400).json({ success: false, message: 'Current password is required' });
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

        const trimmedEmail = String(email).trim();
        const user = await userModel.findOne({ email: trimmedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with this email.' });
        }

        const oldOk = await bcrypt.compare(String(oldPassword), user.password);
        if (!oldOk) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        const sameAsOld = await bcrypt.compare(String(newPassword), user.password);
        if (sameAsOld) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from your current password.',
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
            message: 'Password updated successfully. You can sign in with your new password.',
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error changing password' });
    }
};
