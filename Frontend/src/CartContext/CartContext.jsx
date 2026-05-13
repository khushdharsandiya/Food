import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { flushSync } from 'react-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const CartContext = createContext();

const API = 'https://food-backend-s7t0.onrender.com';

// reducer handling cart actions like Add Rwmove Update 

const cartReducer = (state, action) => {
    switch (action.type) {
        case 'HYDRATE_CART':
            return action.payload;
        case 'ADD_ITEM': {
            const { _id, item, quantity } = action.payload;
            const exists = state.find(ci => String(ci._id) === String(_id));
            if (exists) {
                return state.map(ci =>
                    String(ci._id) === String(_id)
                        ? { ...ci, quantity: ci.quantity + quantity }
                        : ci
                )
            }
            return [...state, { _id, item, quantity }];
        }
        case 'REMOVE_ITEM': {
            return state.filter(ci => String(ci._id) !== String(action.payload));
        }
        case 'UPDATE_ITEM': {
            const { _id, quantity } = action.payload;
            return state.map(ci =>
                String(ci._id) === String(_id)
                    ? { ...ci, quantity }
                    : ci
            )
        }
        case 'CLEAR_CART':
            return [];
        case 'SYNC_LINE': {
            const { _id, item, quantity } = action.payload
            return state.map((ci) =>
                String(ci._id) === String(_id) ? { _id, item, quantity } : ci,
            )
        }
        case 'REPLACE_TEMP_CART_LINE': {
            const { tempId, _id, item, quantity } = action.payload
            return state.map((ci) =>
                String(ci._id) === String(tempId) ? { _id, item, quantity } : ci,
            )
        }
        default: return state;
    }
}

// INITAILISE CART FROM LOCALSTORAGE

const initializer = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem('cart') || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed.map((ci) => ({
            ...ci,
            _id: ci?._id != null ? String(ci._id) : ci._id,
        }));
    } catch {
        return []
    }
}

/** Cart line still syncing with server after optimistic add — disable +/- until real Mongo id arrives. */
export function isCartLinePendingSync(id) {
    return String(id ?? '').startsWith('tmp:')
}

export const CartProvider = ({ children }) => {
    const [cartItems, dispatch] = useReducer(cartReducer, [], initializer);
    /** Abort in-flight POST /api/cart when user removes a pending tmp line before server responds. Key = menu item id string. */
    const addAbortByItemKeyRef = useRef(new Map())

    /** Defer persistence one frame so the UI can paint removals/qty changes immediately (large cart JSON can block the main thread). */
    useEffect(() => {
        let cancelled = false
        const frame = requestAnimationFrame(() => {
            if (cancelled) return
            try {
                localStorage.setItem('cart', JSON.stringify(cartItems))
            } catch {
                /* quota / private mode */
            }
        })
        return () => {
            cancelled = true
            cancelAnimationFrame(frame)
        }
    }, [cartItems])

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        axios
            .get(`${API}/api/cart`, {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => dispatch({ type: 'HYDRATE_CART', payload: res.data }))
            .catch((err) => {
                const status = err.response?.status;
                if (status !== 401 && status !== 403) console.log(err);
            });
    }, []);

    const refetchCart = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        try {
            const { data } = await axios.get(`${API}/api/cart`, {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` },
            });
            dispatch({ type: 'HYDRATE_CART', payload: data });
        } catch (err) {
            const status = err.response?.status;
            if (status !== 401 && status !== 403) console.log(err);
        }
    }, []);

    /** Optimistic UI: cart updates immediately; server sync runs in the background (fixes slow Render round-trips). */
    const addToCart = useCallback(async (item, qty) => {
        if (item && item.inStock === false) {
            return;
        }
        const token = localStorage.getItem('authToken');
        if (!token) {
            return;
        }
        const itemKey = String(item._id);
        const existing = cartItems.find((ci) => String(ci.item?._id) === itemKey);
        const tempId = existing ? String(existing._id) : `tmp:${itemKey}`;

        flushSync(() => {
            dispatch({
                type: 'ADD_ITEM',
                payload: existing
                    ? { _id: existing._id, item: existing.item, quantity: qty }
                    : { _id: tempId, item, quantity: qty },
            })
        })

        const prevAbort = addAbortByItemKeyRef.current.get(itemKey)
        prevAbort?.abort()
        const ac = new AbortController()
        addAbortByItemKeyRef.current.set(itemKey, ac)

        try {
            const res = await axios.post(
                `${API}/api/cart`,
                { itemId: item._id, quantity: qty },
                {
                    signal: ac.signal,
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const data = res.data;
            if (tempId.startsWith('tmp:')) {
                flushSync(() => {
                    dispatch({
                        type: 'REPLACE_TEMP_CART_LINE',
                        payload: { tempId, ...data },
                    })
                })
            } else {
                flushSync(() => dispatch({ type: 'SYNC_LINE', payload: data }))
            }
        } catch (err) {
            if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError' || axios.isCancel?.(err)) {
                addAbortByItemKeyRef.current.delete(itemKey)
                return
            }
            const status = err.response?.status;
            if (status !== 401 && status !== 403) {
                toast.error('Could not update cart. Please try again.');
            }
            await refetchCart();
        } finally {
            if (addAbortByItemKeyRef.current.get(itemKey) === ac) {
                addAbortByItemKeyRef.current.delete(itemKey)
            }
        }
    }, [cartItems, refetchCart]);

    const removeFromCart = useCallback((_id) => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const sid = String(_id)
        if (sid.startsWith('tmp:')) {
            const itemKey = sid.slice(4)
            addAbortByItemKeyRef.current.get(itemKey)?.abort()
            addAbortByItemKeyRef.current.delete(itemKey)
            flushSync(() => dispatch({ type: 'REMOVE_ITEM', payload: _id }))
            return;
        }
        flushSync(() => dispatch({ type: 'REMOVE_ITEM', payload: _id }));
        axios
            .delete(`${API}/api/cart/${_id}`, {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` },
            })
            .catch(async (err) => {
                const status = err.response?.status;
                if (status !== 401 && status !== 403) {
                    toast.error('Could not update cart. Please try again.');
                }
                await refetchCart();
            });
    }, [refetchCart]);

    const updateQuantity = useCallback((_id, qty) => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        if (String(_id).startsWith('tmp:')) return;

        const safeQty = Math.max(1, qty);
        flushSync(() => dispatch({ type: 'UPDATE_ITEM', payload: { _id, quantity: safeQty } }));
        axios
            .put(
                `${API}/api/cart/${_id}`,
                { quantity: safeQty },
                {
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${token}` },
                },
            )
            .then((res) => {
                flushSync(() => dispatch({ type: 'SYNC_LINE', payload: res.data }));
            })
            .catch(async (err) => {
                const status = err.response?.status;
                if (status !== 401 && status !== 403) {
                    toast.error('Could not update cart. Please try again.');
                }
                await refetchCart();
            });
    }, [refetchCart]);

    const clearCart = useCallback(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            flushSync(() => dispatch({ type: 'CLEAR_CART' }));
            return Promise.resolve();
        }
        flushSync(() => dispatch({ type: 'CLEAR_CART' }));
        return axios
            .post(
                `${API}/api/cart/clear`,
                {},
                {
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${token}` },
                },
            )
            .catch(async (err) => {
                const status = err.response?.status;
                if (status !== 401 && status !== 403) {
                    toast.error('Could not clear cart on server. Restoring…');
                }
                await refetchCart();
            });
    }, [refetchCart]);

    const totalItems = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);
    const totalAmount = cartItems.reduce((sum, ci) => {
        const price = ci?.item?.price ?? 0;
        const qty = ci?.quantity ?? 0;
        return sum + price * qty
    }, 0)

    const contextValue = useMemo(
        () => ({
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            refetchCart,
            totalItems,
            totalAmount,
        }),
        [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, refetchCart, totalItems, totalAmount],
    );

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    )
}

export const useCart = () => useContext(CartContext);