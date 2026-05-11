import express from 'express';
import {
    addToCart,
    clearCart,
    deleteCartItem,
    getCart,
    updateCartItem,
} from '../Controllers/cartController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(authMiddleware, getCart)
    .post(authMiddleware, addToCart);

router.post('/clear', authMiddleware, clearCart);

router.route('/:id')
    .put(authMiddleware, updateCartItem)
    .delete(authMiddleware, deleteCartItem);

export default router;

