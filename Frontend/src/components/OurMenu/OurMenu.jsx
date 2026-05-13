
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useCart } from '../../CartContext/CartContext';
import { FaHeart, FaMinus, FaPlus, FaSearch } from 'react-icons/fa';
import { FaStar, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { menuImageFallback, menuImageSrc } from '../../utils/imageUrl';
import { normalizeMenuCategoryKey } from '../../utils/menuCategory';
import { itemsArrayFromApiResponse } from '../../utils/itemsResponse';
import './OurMenu.css';

const categories = ['Breakfast', 'Lunch', 'Dinner', 'Mexican', 'Italian', 'Desserts', 'Drinks'];
const FAVORITES_KEY = 'menuFavorites';
/** How many items to show first; “View more” loads the next batch */
const INITIAL_MENU_VISIBLE = 12;
const MENU_PAGE_STEP = 12;
const API = 'https://food-backend-s7t0.onrender.com';

const OurMenu = () => {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState(categories[0]);
    const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();
    const [menuData, setMenuData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [query, setQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(INITIAL_MENU_VISIBLE);
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [favorites, setFavorites] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        } catch {
            return [];
        }
    });
    const [quickViewItem, setQuickViewItem] = useState(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);


    useEffect(() => {
        const fetchMenu = async () => {
            setIsLoading(true);
            setLoadError('');
            try {
                const res = await axios.get(`${API}/api/items`);
                const list = itemsArrayFromApiResponse(res.data);
                const byCategory = list.reduce((acc, item) => {
                    const cat = normalizeMenuCategoryKey(item.category);
                    acc[cat] = acc[cat] || [];
                    acc[cat].push(item);
                    return acc;
                }, {});
                setMenuData(byCategory)
            }
            catch (err) {
                console.error('Failed to load menu items:', err)
                setLoadError('Could not load the menu. Please try again.');
            } finally {
                setIsLoading(false);
            }
        }

        fetchMenu()
    }, [])

    useEffect(() => {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }, [favorites]);

    /** O(1) cart lookup per item — avoids .find() on every card */
    const cartByItemId = useMemo(() => {
        const m = new Map();
        for (const ci of cartItems) {
            const iid = ci?.item?._id;
            if (iid != null) m.set(String(iid), ci);
        }
        return m;
    }, [cartItems]);

    const getCartEntry = useCallback((id) => cartByItemId.get(String(id)), [cartByItemId]);
    const getQuantity = id => getCartEntry(id)?.quantity || 0;
    const isFavorite = id => favorites.includes(id);
    const toggleFavorite = id => {
        setFavorites(prev => (prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]));
    };

    const categoryItems = menuData[activeCategory.toLowerCase()] ?? [];
    const lowerQuery = query.trim().toLowerCase();
    const allItems = useMemo(() => Object.values(menuData).flat(), [menuData]);
    const sourceItems = lowerQuery ? allItems : categoryItems;
    const quickCartEntry = quickViewItem ? getCartEntry(quickViewItem._id) : null;
    const quickQty = quickCartEntry?.quantity || 0;

    useEffect(() => {
        // Reset visible count when category, search, or favorites filter changes
        setVisibleCount(INITIAL_MENU_VISIBLE);
    }, [activeCategory, query, favoritesOnly]);

    const resultsAll = useMemo(() => {
        let filtered = sourceItems.filter(item => {
            const matchesQuery =
                !lowerQuery ||
                String(item.name || '').toLowerCase().includes(lowerQuery) ||
                String(item.description || '').toLowerCase().includes(lowerQuery);
            const matchesFavorite = !favoritesOnly || favorites.includes(item._id);
            return matchesQuery && matchesFavorite;
        });

        return filtered;
    }, [sourceItems, favorites, favoritesOnly, lowerQuery]);

    const displayItems = resultsAll.slice(0, visibleCount);
    const canShowMore = resultsAll.length > visibleCount;

    const avgPrice = useMemo(() => {
        const arr = lowerQuery ? resultsAll : categoryItems;
        if (!arr.length) return 0;
        return arr.reduce((sum, item) => sum + Number(item.price || 0), 0) / arr.length;
    }, [lowerQuery, resultsAll, categoryItems]);

    const dishesCount = lowerQuery ? resultsAll.length : categoryItems.length;
    const requireLoginBeforeCart = useCallback(() => {
        const token = localStorage.getItem('authToken');
        if (token) return true;
        setShowLoginPrompt(true);
        return false;
    }, []);

    const handleAddToCart = useCallback(
        (item, qty) => {
            if (!requireLoginBeforeCart()) return;
            addToCart(item, qty);
        },
        [addToCart, requireLoginBeforeCart],
    );

    return (
        <>
        <div className="bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] min-h-screen py-16 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto">
                <h2 className=" text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200">
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
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-amber-800/30 bg-amber-900/20 p-4">
                    <div className="relative flex-1">
                        <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/70" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search dish or flavour..."
                            className="w-full rounded-xl border border-amber-700/50 bg-[#1a120b]/70 py-2.5 pl-10 pr-4 font-cinzel text-sm text-amber-100 placeholder:text-amber-600 focus:border-amber-500/70 focus:outline-none"
                        />
                    </div>

                    <button
                        onClick={() => setFavoritesOnly((v) => !v)}
                        className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-cinzel text-sm transition ${favoritesOnly
                                ? 'border-rose-700/80 bg-rose-900/25 text-rose-200'
                                : 'border-amber-700/50 bg-amber-900/20 text-amber-200'
                            }`}
                    >
                        <FaHeart />
                        {favoritesOnly ? 'Showing Favorites Only' : 'Show Favorites'}
                    </button>
                </div>

                <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-amber-800/30 bg-amber-900/15 px-4 py-3">
                        <p className="font-cinzel text-xs text-amber-300/80">Category</p>
                        <p className="font-dancingscript text-2xl text-amber-100">{lowerQuery ? 'Search Results' : activeCategory}</p>
                    </div>
                    <div className="rounded-xl border border-amber-800/30 bg-amber-900/15 px-4 py-3">
                        <p className="font-cinzel text-xs text-amber-300/80">Dishes</p>
                        <p className="font-dancingscript text-2xl text-amber-100">{dishesCount}</p>
                    </div>
                    <div className="rounded-xl border border-amber-800/30 bg-amber-900/15 px-4 py-3">
                        <p className="font-cinzel text-xs text-amber-300/80">Avg Price</p>
                        <p className="font-dancingscript text-2xl text-amber-100">₹{avgPrice.toFixed(0)}</p>
                    </div>
                    <div className="rounded-xl border border-amber-800/30 bg-amber-900/15 px-4 py-3">
                        <p className="font-cinzel text-xs text-amber-300/80">Favorites</p>
                        <p className="font-dancingscript text-2xl text-amber-100">{favorites.length}</p>
                    </div>
                </div>

                {isLoading && (
                    <p className="mb-8 text-center font-cinzel text-amber-200/80">Loading menu...</p>
                )}

                {loadError && (
                    <div className="mb-8 rounded-xl border border-red-800/40 bg-red-950/20 p-4 text-center">
                        <p className="font-cinzel text-sm text-red-200">{loadError}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-3 rounded-lg border border-red-700/40 px-3 py-1.5 text-xs text-red-100"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!isLoading && !loadError && resultsAll.length === 0 && (
                    <div className="mb-8 rounded-xl border border-amber-800/40 bg-amber-900/10 p-6 text-center">
                        <p className="font-cinzel text-amber-100">No dishes match your search/filter.</p>
                        <button
                            onClick={() => {
                                setQuery('');
                                setFavoritesOnly(false);
                            }}
                            className="mt-3 rounded-lg border border-amber-700/50 px-3 py-1.5 text-xs text-amber-200"
                        >
                            Clear filters
                        </button>
                    </div>
                )}

                {/* Menu Items Grid */}
                <div
                    key={`menu-${activeCategory}-${lowerQuery}-${favoritesOnly}`}
                    className="menu-grid grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
                >
                    {displayItems.map((item, i) => {

                        const cartEntry = getCartEntry(item._id)
                        const quantity = cartEntry?.quantity || 0;
                        const isOutOfStock = item.inStock === false;

                        return (
                            <div
                                key={item._id}
                                className="group relative bg-amber-900/20 rounded-2xl overflow-hidden border border-amber-800/30 flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-900/20"
                                style={{ '--index': Math.min(i, 8) }}
                            >
                                <div className="relative h-48 sm:h-56 md:h-60 flex items-center justify-center bg-black/10">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setQuickViewItem(item);
                                        }}
                                        className="absolute left-3 bottom-3 z-10 rounded-full border border-amber-700/50 bg-black/40 px-3 py-1.5 text-xs font-cinzel text-amber-100/95 opacity-0 transition group-hover:opacity-100"
                                    >
                                        Quick view
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleFavorite(item._id)}
                                        className="absolute right-3 top-3 z-10 rounded-full border border-amber-700/60 bg-black/35 p-2 text-sm text-amber-100/90 backdrop-blur-sm transition hover:scale-110"
                                        aria-label={isFavorite(item._id) ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                        <FaHeart className={isFavorite(item._id) ? 'text-rose-400' : ''} />
                                    </button>
                                    <img
                                        src={menuImageSrc(item.imageUrl || item.image)}
                                        alt={item.name}
                                        loading="lazy"
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
                                        className="h-full w-full object-cover"
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

                                    <div className="mt-auto flex items-center gap-4 justify-between">
                                        {/* Price */}
                                        <div className="bg-amber-100/10 px-3 py-1 rounded-2xl shadow-lg">
                                            <span className="text-xl font-bold text-amber-300 font-dancingscript">
                                                ₹{Number(item.price).toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Cart Controls */}
                                        <div className='flex items-center gap-2'>
                                            {quantity > 0 ? (
                                                <>
                                                    {/* Minus Button */}
                                                    <button
                                                        className='w-8 h-8 rounded-full bg-amber-900/40 flex items-center justify-center hover:bg-amber-800/50 transition-colors'
                                                        onClick={() =>
                                                            quantity > 1
                                                                ? updateQuantity(cartEntry._id, quantity - 1)
                                                                : removeFromCart(cartEntry._id)
                                                        }
                                                    >
                                                        <FaMinus className='text-amber-100' />
                                                    </button>

                                                    {/* Quantity Display */}
                                                    <span className='w-8 text-center text-amber-100'>
                                                        {quantity}
                                                    </span>

                                                    {/* Plus Button */}
                                                    <button
                                                        className='w-8 h-8 rounded-full bg-amber-900/40 flex items-center justify-center hover:bg-amber-800/50 transition-colors'
                                                        onClick={() => updateQuantity(cartEntry._id, quantity + 1)}
                                                    >
                                                        <FaPlus className='text-amber-100' />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddToCart(item, 1)}
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

                {canShowMore && (
                    <div className="mt-10 flex flex-col items-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                setVisibleCount((v) =>
                                    Math.min(v + MENU_PAGE_STEP, resultsAll.length)
                                )
                            }
                            className="rounded-full border border-amber-700/50 bg-amber-900/20 px-6 py-3 font-cinzel text-amber-200 hover:bg-amber-800/40 hover:scale-[1.02] transition"
                        >
                            View more
                        </button>
                      
                    </div>
                )}
            </div>
        </div>

        {quickViewItem && (
            <div
                className="fixed inset-0 z-50 bg-black/70 p-4"
                onClick={() => setQuickViewItem(null)}
                role="dialog"
                aria-modal="true"
            >
                <div
                    className="mx-auto max-w-2xl rounded-3xl border border-amber-800/40 bg-[#1a120b] p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="inline-flex items-center gap-2 rounded-full border border-amber-700/50 bg-amber-900/20 px-3 py-1 text-xs font-cinzel text-amber-200/90">
                                <span className="font-bold">VEG</span>
                                <span>•</span>
                                <span>{quickViewItem.category}</span>
                            </p>
                            <h3 className="mt-3 truncate font-dish-name text-3xl text-amber-100 leading-snug">
                                {quickViewItem.name}
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setQuickViewItem(null)}
                            className="rounded-xl border border-amber-800/40 bg-black/20 p-2 text-amber-200 hover:bg-black/40"
                            aria-label="Close quick view"
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="relative h-56 overflow-hidden rounded-2xl border border-amber-800/30 bg-black/10 sm:h-72">
                            <img
                                src={menuImageSrc(quickViewItem.imageUrl || quickViewItem.image)}
                                alt={quickViewItem.name}
                                className="h-full w-full object-contain p-4"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                    if (!e.currentTarget.dataset.fallbackApplied) {
                                        e.currentTarget.dataset.fallbackApplied = '1';
                                        e.currentTarget.src = menuImageFallback(quickViewItem.name, quickViewItem.category);
                                        return;
                                    }
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = menuImageSrc('');
                                }}
                            />
                            {quickViewItem.inStock === false && (
                                <span className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-10 rounded-xl border border-rose-500/50 bg-black/70 px-3 py-2 text-center text-xs font-cinzel uppercase tracking-wider text-rose-200">
                                    Out of stock
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col">
                            <p className="text-sm text-amber-100/80 font-cinzel leading-relaxed">
                                {quickViewItem.description}
                            </p>

                            <div className="mt-4 flex items-center gap-3">
                                <div className="inline-flex items-center gap-1 rounded-xl border border-amber-800/30 bg-amber-900/15 px-3 py-2">
                                    <FaStar className="text-amber-400" />
                                    <span className="font-cinzel text-amber-100">{Number(quickViewItem.rating || 0).toFixed(1)}</span>
                                </div>
                                <div className="rounded-xl border border-amber-800/30 bg-amber-900/15 px-3 py-2">
                                    <span className="font-dancingscript text-amber-200/95 text-lg">
                                        ₹{Number(quickViewItem.price).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {Number(quickViewItem.rating || 0) >= 4.7 && (
                                    <span className="rounded-full border border-amber-600/50 bg-amber-900/20 px-3 py-1 text-xs font-cinzel text-amber-200/90">
                                        Top Rated
                                    </span>
                                )}
                                {Number(quickViewItem.price || 0) <= 200 && (
                                    <span className="rounded-full border border-amber-600/50 bg-amber-900/20 px-3 py-1 text-xs font-cinzel text-amber-200/90">
                                        Value Deal
                                    </span>
                                )}
                                <span className="rounded-full border border-amber-700/50 bg-black/20 px-3 py-1 text-xs font-cinzel text-amber-200/90">
                                    Fresh & Veg
                                </span>
                            </div>

                            <div className="mt-auto pt-4">
                                {quickQty > 0 ? (
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                quickQty > 1
                                                    ? updateQuantity(quickCartEntry._id, quickQty - 1)
                                                    : removeFromCart(quickCartEntry._id)
                                            }
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-700/50 bg-amber-900/40 text-amber-100 hover:bg-amber-800/50 transition"
                                        >
                                            <FaMinus />
                                        </button>
                                        <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-amber-700/40 bg-black/20 px-3 font-mono text-amber-100">
                                            {quickQty}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(quickCartEntry._id, quickQty + 1)}
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-700/50 bg-amber-900/40 text-amber-100 hover:bg-amber-800/50 transition"
                                        >
                                            <FaPlus />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleAddToCart(quickViewItem, 1)}
                                        disabled={quickViewItem.inStock === false}
                                        className={`w-full rounded-full py-3 font-cinzel text-sm font-semibold uppercase tracking-widest transition ${
                                            quickViewItem.inStock === false
                                                ? 'cursor-not-allowed border border-rose-500/50 bg-rose-900/30 text-rose-200'
                                                : 'bg-gradient-to-r from-amber-700 to-amber-600 text-[#1a0f08] shadow-lg shadow-amber-900/30 hover:scale-[1.02]'
                                        }`}
                                    >
                                        {quickViewItem.inStock === false ? 'Out of stock' : 'Add to cart'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {showLoginPrompt && (
            <div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
            >
                <div className="w-full max-w-md rounded-2xl border border-amber-700/35 bg-[#23180f] p-6 shadow-2xl">
                    <h3 className="font-cinzel text-xl font-semibold text-amber-100">Login required</h3>
                    <p className="mt-2 font-cinzel text-sm text-amber-200/80">
                        Please login first to add items to your cart.
                    </p>
                    <div className="mt-5 flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setShowLoginPrompt(false);
                                navigate('/login');
                            }}
                            className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-2.5 font-cinzel text-sm font-semibold text-[#1a0f08]"
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowLoginPrompt(false)}
                            className="flex-1 rounded-xl border border-amber-700/45 py-2.5 font-cinzel text-sm text-amber-100"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}

export default OurMenu
