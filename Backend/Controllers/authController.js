import userModel from '../Modals/userModal.js';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { isOtpMailReady, sendOtpEmail, shouldLogOtpToConsole } from '../Config/mailer.js';

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
                    'Email is not configured. Set EMAIL_USER and EMAIL_PASS (quoted if they contain spaces) in Backend/.env, or MAIL_LOG_OTP_TO_CONSOLE / MAIL_LOG_RESET_LINK_TO_CONSOLE=true for local dev. Or MAIL_OTP_CONSOLE_ONLY=true to print OTP in the server terminal only.',
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
                    'Development mode: OTP is printed in the backend terminal (and below). It expires in 5 minutes.',
                server: { devOtp: otp, delivery: 'console' },
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
            return res.status(500).json({
                success: false,
                message:
                    'Could not send email. Check Gmail App Password and 2-Step Verification on the account.',
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
