import express from 'express';
import {
    forgotPasswordOtp,
    verifyOtp,
    resetPasswordOtp,
    changePasswordWithOld,
} from '../Controllers/authController.js';

const authRouter = express.Router();

authRouter.post('/forgot-password', forgotPasswordOtp);
authRouter.post('/verify-otp', verifyOtp);
authRouter.post('/reset-password', resetPasswordOtp);
authRouter.post('/change-password', changePasswordWithOld);

export default authRouter;
