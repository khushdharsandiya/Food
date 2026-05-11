import express from 'express';
import {
    adminLogin,
    adminForgotPasswordOtp,
    adminVerifyOtp,
    adminResetPasswordOtp,
} from '../Controllers/adminController.js';

const router = express.Router();
router.post('/login', adminLogin);
router.post('/forgot-password', adminForgotPasswordOtp);
router.post('/verify-otp', adminVerifyOtp);
router.post('/reset-password', adminResetPasswordOtp);

export default router;
