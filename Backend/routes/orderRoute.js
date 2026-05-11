import express from 'express';
import {
    cancelUserOrder,
    confirmPayment,
    createOrder,
    deleteAnyOrder,
    deliveryTimerHint,
    exportSalesCsv,
    getAllOrders,
    getOrderById,
    getOrders,
    previewOrderPricing,
    reorderFromOrder,
    updateAnyOrder,
    UpdateOrder,
    verifyRazorpayPayment,
} from '../Controllers/oredrController.js';
import authMiddleware from '../middleware/auth.js';
import adminAuthMiddleware from '../middleware/adminAuth.js';

const orderRoute = express.Router();

orderRoute.get('/getall', adminAuthMiddleware, getAllOrders)
orderRoute.put('/getall/:id', adminAuthMiddleware, updateAnyOrder)
orderRoute.delete('/getall/:id', adminAuthMiddleware, deleteAnyOrder)
orderRoute.get('/admin/sales-export', adminAuthMiddleware, exportSalesCsv)
/** Public: returns configured auto-deliver delay after “out for delivery” (no auth). */
orderRoute.get('/delivery-timer-hint', deliveryTimerHint)
//PROTECT REST OF ROUTES USINING MIDDLEWARE
orderRoute.use(authMiddleware)

orderRoute.post('/preview-pricing', previewOrderPricing)
orderRoute.post('/', createOrder)
orderRoute.post('/reorder/:orderId', reorderFromOrder)
orderRoute.post('/razorpay-verify', verifyRazorpayPayment)
orderRoute.post('/:id/cancel', cancelUserOrder)
orderRoute.get('/', getOrders)
orderRoute.get('/confirm', confirmPayment)
orderRoute.get('/:id', getOrderById)
orderRoute.put('/:id', UpdateOrder)

export default orderRoute;
