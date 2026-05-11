import express from 'express';
import {
    listCoupons,
    createCoupon,
    patchCoupon,
    deleteCoupon,
} from '../Controllers/couponController.js';
import adminAuthMiddleware from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/', adminAuthMiddleware, listCoupons);
router.post('/', adminAuthMiddleware, createCoupon);
router.patch('/:id', adminAuthMiddleware, patchCoupon);
router.delete('/:id', adminAuthMiddleware, deleteCoupon);

export default router;
