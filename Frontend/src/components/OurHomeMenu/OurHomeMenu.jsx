import React, { useEffect, useState } from 'react'
import { useCart } from '../../CartContext/CartContext';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './OurHomeMenu.css';
import axios from 'axios';
import { menuImageFallback, menuImageSrc } from '../../utils/imageUrl';
import { normalizeMenuCategoryKey } from '../../utils/menuCategory';
import { itemsArrayFromApiResponse } from '../../utils/itemsResponse';

const categories = ['breakfast', 'lunch', 'dinner', 'mexican', 'italian', 'desserts', 'drinks'];

const OurHomeMenu = () => {
    const [activeCategory, setActiveCategory] = useState(categories[0]);
    const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();
    const [menuData, setMenuData] = useState({});

    useEffect(() => {
        axios.get("http://localhost:4000/api/items")
            .then(res => {
                const list = itemsArrayFromApiResponse(res.data);
                const grouped = list.reduce((acc, item) => {
                    const category = normalizeMenuCategoryKey(item.category);
                    acc[category] = acc[category] || [];
                    acc[category].push(item);
                    return acc;
                }, {});
                setMenuData(grouped);
            })
            .catch(console.error);
    }, []);


    const getCartEntry = id => cartItems.find(ci => ci.item?._id === id);
    const getQuantity = id => getCartEntry(id)?.quantity || 0;
    const displayItems = (menuData[activeCategory] || []).slice(0, 6)

    return (
        <div className="bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] min-h-screen py-16 px-4 sm:px-8">

            <div className="max-w-7xl mx-auto">

                <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200">
                    <span className="font-dancingscript block text-5xl md:text-7xl sm:text-6xl mb-2">
                        Our Exquisite Menu
                    </span>
                    <span className="block text-xl sm:text-2xl md:text-3xl font-cinzel mt-4 text-amber-100/80">
                        A Symphony of Flavours
                    </span>
                </h2>

                {/* Category Buttons */}
                <div className="flex flex-wrap justify-center gap-4 mb-16">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 sm:px-6 py-2 rounded-full border-2 transition-all duration-300 transform font-cinzel text-sm sm:text-lg tracking-widest backdrop-blur-sm
                             ${activeCategory === cat
                                    ? 'bg-gradient-to-r from-amber-900/80 to-amber-700/80 border-amber-800 scale-105 shadow-amber-900/30'
                                    : 'bg-amber-900/20 border-amber-800/30 text-amber-100/80 hover:bg-amber-800/40 hover:scale-95'
                                }`}
                        >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Menu Items Grid */}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                    {displayItems.map((item, i) => {
                        const qty = getQuantity(item._id);
                        const cartEntry = getCartEntry(item._id)
                        const isOutOfStock = item.inStock === false;
                        return (
                            <div
                                key={item._id}
                                className="relative bg-amber-900/20 rounded-2xl overflow-hidden border border-amber-800/30 backdrop-blur-sm flex flex-col transition-all duration-500"
                                style={{ '--index': i }}
                            >
                                <div className="relative h-48 sm:h-56 md:h-60 flex items-center justify-center bg-black/10">
                                    {Number(item.rating || 0) >= 4.7 && (
                                        <span className="absolute right-3 top-3 z-10 rounded-full border border-amber-600/50 bg-amber-900/20 px-3 py-1 text-xs font-cinzel text-amber-200/90 backdrop-blur-sm">
                                            Top Rated
                                        </span>
                                    )}
                                    <img
                                        src={menuImageSrc(item.imageUrl)}
                                        alt={item.name}
                                        referrerPolicy="no-referrer"
                                        decoding="async"
                                        onError={(e) => {
                                            if (!e.currentTarget.dataset.fallbackApplied) {
                                                e.currentTarget.dataset.fallbackApplied = '1';
                                                e.currentTarget.src = menuImageFallback(item.name, item.category);
                                                return;
                                            }
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = menuImageSrc('');
                                        }}
                                        className="h-full w-full object-cover transition-all duration-700"
                                    />
                                    {isOutOfStock && (
                                        <span className="absolute inset-x-3 top-1/2 -translate-y-1/2 z-10 rounded-xl border border-rose-500/50 bg-black/70 px-3 py-2 text-center text-xs font-cinzel uppercase tracking-wider text-rose-200">
                                            Out of stock
                                        </span>
                                    )}
                                </div>

                                <div className="p-4 sm:p-6 flex flex-col flex-grow">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-amber-800/50 to-transparent opacity-50 transition-all duration-300" />
                                    <h3 className='text-xl sm:text-2xl mb-2 font-dish-name text-amber-100 transition-colors leading-snug'>
                                        {item.name}
                                    </h3>
                                    <p className='text-amber-100/80 text-xs sm:text-sm mb-4 font-cinzel leading-relaxed'>
                                        {item.description}
                                    </p>

                                    <div className="mb-4 flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-xl border border-amber-800/30 bg-amber-900/10 px-3 py-1 text-amber-200/90">
                                            <FaStar className="text-amber-400" />
                                            <span className="font-cinzel text-xs">{Number(item.rating || 0).toFixed(1)}</span>
                                        </span>
                                    </div>

                                    <div className="mt-auto flex items-center gap-4 justify-between">
                                        {/* Price */}
                                        <div className="bg-amber-100/10 backdrop-blur-sm px-3 py-1 rounded-2xl shadow-lg">
                                            <span className="text-xl font-bold text-amber-300 font-dancingscript">
                                                ₹{Number(item.price).toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Cart Controls */}
                                        <div className='flex items-center gap-2'>
                                            {qty > 0 ? (
                                                <>
                                                    {/* Minus Button */}
                                                    <button
                                                        className='w-8 h-8 rounded-full bg-amber-900/40 flex items-center justify-center hover:bg-amber-800/50 transition-colors'
                                                        onClick={() =>
                                                            qty > 1
                                                                ? updateQuantity(cartEntry._id, qty - 1)
                                                                : removeFromCart(cartEntry._id)
                                                        }
                                                    >
                                                        <FaMinus className='text-amber-100' />
                                                    </button>

                                                    {/* Quantity Display */}
                                                    <span className='w-8 text-center text-amber-100'>
                                                        {qty}
                                                    </span>

                                                    {/* Plus Button */}
                                                    <button
                                                        className='w-8 h-8 rounded-full bg-amber-900/40 flex items-center justify-center hover:bg-amber-800/50 transition-colors'
                                                        onClick={() => updateQuantity(cartEntry._id, qty + 1)}
                                                    >
                                                        <FaPlus className='text-amber-100' />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => addToCart(item, 1)}
                                                    disabled={isOutOfStock}
                                                    className={`px-4 py-1.5 rounded-full font-cinzel text-xs uppercase sm:text-sm tracking-wider relative overflow-hidden border transition-transform duration-300 ${
                                                        isOutOfStock
                                                            ? 'cursor-not-allowed border-rose-700/50 bg-rose-900/30 text-rose-200/90'
                                                            : 'bg-amber-900/40 border-amber-800/50 hover:scale-110 hover:shadow-lg hover:shadow-amber-900/20'
                                                    }`}
                                                >
                                                    <span className='relative z-10 text-xs text-black'>
                                                        {isOutOfStock ? 'Out of stock' : 'Add to Cart'}
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Explore Full Menu Button */}
                <div className="flex justify-center mt-16">
                    <Link
                        className="bg-amber-900/30 border-2 border-amber-800/30 text-amber-100 px-8 sm:px-10 py-3 rounded-full font-cinzel uppercase tracking-widest transition-all duration-300 hover:bg-amber-800/40 hover:text-amber-50 hover:scale-105 hover:shadow-lg hover:shadow-amber-900/20 backdrop-blur-sm"
                        to="/menu"
                    >
                        Explore Full Menu
                    </Link>
                </div>

            </div>
        </div>
    )
}

export default OurHomeMenu
