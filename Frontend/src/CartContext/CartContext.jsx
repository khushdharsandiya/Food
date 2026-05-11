import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import axios from 'axios'

const CartContext = createContext();

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

export const CartProvider = ({ children }) => {
    const [cartItems, dispatch] = useReducer(cartReducer, [], initializer);

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }, [cartItems]);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        axios
            .get('http://localhost:4000/api/cart', {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => dispatch({ type: 'HYDRATE_CART', payload: res.data }))
            .catch((err) => {
                const status = err.response?.status;
                if (status !== 401 && status !== 403) console.log(err);
            });
    }, []);


    const addToCart = useCallback(async (item, qty) => {
        if (item && item.inStock === false) {
            return;
        }
        const token = localStorage.getItem('authToken');
        if (!token) {
            return;
        }
        const res = await axios.post(
            'http://localhost:4000/api/cart',
            { itemId: item._id, quantity: qty },
            {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        dispatch({ type: 'ADD_ITEM', payload: res.data });
    }, []);

    const removeFromCart = useCallback(async (_id) => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        await axios.delete(`http://localhost:4000/api/cart/${_id}`, {
            withCredentials: true,
            headers: { Authorization: `Bearer ${token}` },
        });
        dispatch({ type: 'REMOVE_ITEM', payload: _id });
    }, []);

    const updateQuantity = useCallback(async (_id, qty) => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const res = await axios.put(
            `http://localhost:4000/api/cart/${_id}`,
            { quantity: qty },
            {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        dispatch({ type: 'UPDATE_ITEM', payload: res.data });
    }, []);

    const clearCart = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            dispatch({ type: 'CLEAR_CART' });
            return;
        }
        await axios.post(
            `http://localhost:4000/api/cart/clear`,
            {},
            {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        dispatch({ type: 'CLEAR_CART' });
    }, []);

    const refetchCart = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        try {
            const { data } = await axios.get('http://localhost:4000/api/cart', {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` },
            });
            dispatch({ type: 'HYDRATE_CART', payload: data });
        } catch (err) {
            const status = err.response?.status;
            if (status !== 401 && status !== 403) console.log(err);
        }
    }, []);

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