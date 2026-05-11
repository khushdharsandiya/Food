import express from 'express';
import {
    forgotPasswordOtp,
    verifyOtp,
    resetPasswordOtp,
    changePasswordWithOld,
} from '../Controllers/authController.js';

const authRouter = express.Router();

authRouter.get('/forgot-password', (req, res) => {
    return res.status(405).json({
        success: false,
        message: 'Method not allowed. Use POST /api/auth/forgot-password with { email }.',
    });
});
authRouter.post('/forgot-password', forgotPasswordOtp);
authRouter.get('/verify-otp', (req, res) => {
    return res.status(405).json({
        success: false,
        message: 'Method not allowed. Use POST /api/auth/verify-otp with { email, otp }.',
    });
});
authRouter.post('/verify-otp', verifyOtp);
authRouter.get('/reset-password', (req, res) => {
    return res.status(405).json({
        success: false,
        message: 'Method not allowed. Use POST /api/auth/reset-password with { email, newPassword }.',
    });
});
authRouter.post('/reset-password', resetPasswordOtp);
authRouter.post('/change-password', changePasswordWithOld);

export default authRouter;
