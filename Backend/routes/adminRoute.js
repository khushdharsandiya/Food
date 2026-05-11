import express from 'express';
import {
    adminLogin,
    adminForgotPasswordOtp ,
    adminVerifyOtp,
    adminResetPasswordOtp,
} from '../Controllers/adminController.js';

const router = express.Router();
router.post('/login', adminLogin);
router.get('/forgot-password', (req, res) => {
    return res.status(405).json({
        success: false,
        message: 'Method not allowed. Use POST /api/admin/forgot-password with { email }.',
    });
});
router.post('/forgot-password', adminForgotPasswordOtp);
router.get('/verify-otp', (req, res) => {
    return res.status(405).json({
        success: false,
        message: 'Method not allowed. Use POST /api/admin/verify-otp with { email, otp }.',
    });
});
router.post('/verify-otp', adminVerifyOtp);
router.get('/reset-password', (req, res) => {
    return res.status(405).json({
        success: false,
        message: 'Method not allowed. Use POST /api/admin/reset-password with { email, newPassword }.',
    });
});
router.post('/reset-password', adminResetPasswordOtp);

export default router;
