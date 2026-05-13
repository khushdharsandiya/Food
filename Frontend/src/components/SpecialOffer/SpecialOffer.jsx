import React, { useEffect, useState } from 'react';
import { addButtonBase, addButtonHover, commonTransition } from '../../assets/dummydata'
import { useCart, isCartLinePendingSync } from '../../CartContext/CartContext';
import { FaFire, FaHeart, FaPlus, FaStar } from 'react-icons/fa';
import { HiMinus, HiPlus } from "react-icons/hi";
import FloatingParticle from '../FloatingParticle/FloatingParticle';
import axios from 'axios';
import { menuImageFallback, menuImageSrc } from '../../utils/imageUrl';
import { itemsArrayFromApiResponse } from '../../utils/itemsResponse';
import { useNavigate } from 'react-router-dom';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'

const SpecialOffer = () => {
  const navigate = useNavigate();

  const [showAll, setShowAll] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { addToCart, removeFromCart, cartItems, updateQuantity } = useCart();

  useLockBodyScroll(showLoginPrompt)

  const requireLoginBeforeCart = () => {
    const token = localStorage.getItem('authToken');
    if (token) return true;
    setShowLoginPrompt(true);
    return false;
  };
  const handleAddToCart = (item, qty) => {
    if (!requireLoginBeforeCart()) return;
    addToCart(item, qty);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError('');
    axios
      .get('https://food-backend-s7t0.onrender.com/api/items')
      .then((res) => {
        if (cancelled) return;
        setItems(itemsArrayFromApiResponse(res.data));
      })
      .catch((err) => {
        console.error('SpecialOffer /api/items:', err);
        if (!cancelled) {
          setItems([]);
          setFetchError(
            'Could not load the menu. Make sure the backend is reachable and the database has menu items.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayList = items.slice(0, showAll ? 8 : 4);
  return (
    <div className='bg-gradient-to-b from-[#1a1212] to-[#2a1e1e] text-white py-16 px-4 font-[Poppins]'>
      <div className='max-w-7xl mx-auto'>
        <div className='text-center mb-14'>
          <h1 className='text-5xl font-bold mb-4 transform transition-all bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent font-[Playfair_Display] italic'>
            Today's <span className='text-stroke-gold'>Special</span> Offers
          </h1>
          <p className='text-lg text-gray-300 max-w-3xl mx-auto tracking-wide
                leading-relaxed'>
            Savor the extraordinary with our culinary masterpieces to perfection.
          </p>
        </div>

        {loading && (
          <p className="text-center text-amber-200/80">Loading offers…</p>
        )}
        {!loading && fetchError && (
          <p className="mx-auto max-w-xl rounded-xl border border-amber-800/50 bg-amber-950/40 px-4 py-3 text-center text-sm text-amber-100/90">
            {fetchError}
          </p>
        )}
        {!loading && !fetchError && items.length === 0 && (
          <p className="text-center text-gray-400">
            No menu items found. Add items in the admin panel or run the seed script.
          </p>
        )}

        {/* PRODUCT CARD */}

        <div className="grid grid-cols-1 items-stretch sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {displayList.map(item => {
            const cartItem = cartItems.find(ci => String(ci.item?._id) === String(item._id));
            const qty = cartItem ? cartItem.quantity : 0;
            const cartId = cartItem?._id
            const qtyPending = cartItem ? isCartLinePendingSync(cartItem._id) : false;
            const isOutOfStock = item.inStock === false;

            return (
              <div
                key={item._id}
                className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border-2 border-transparent bg-[#4b3b3b] shadow-2xl transition-all duration-500 before:absolute before:inset-0 before:bg-gradient-to-t before:opacity-20 hover:-translate-y-4 hover:border-amber-500/20 hover:shadow-red-900/40 group"
              >
                <div className="relative h-72 shrink-0 overflow-hidden">
                  <img
                    src={menuImageSrc(item.imageUrl)}
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
                    className="w-full h-full object-cover brightness-90 group-hover:brightness-110 transition-all duration-500"
                  />
                  {isOutOfStock && (
                    <span className="absolute inset-x-3 top-1/2 -translate-y-1/2 z-10 rounded-xl border border-rose-500/50 bg-black/70 px-3 py-2 text-center text-xs font-cinzel uppercase tracking-wider text-rose-200">
                      Out of stock
                    </span>
                  )}
                  <div className='absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90' />
                  <div className=' absolute bottom-4 left-4 right-4 flex justify-between items-center bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full '>
                    <span className='flex items-center gap-2 text-amber-400'>
                      <FaStar className='text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' />
                      <span className='font-bold'>{item.rating}</span>
                    </span>
                    <span className='flex items-center gap-2 text-red-400'>
                      <FaHeart className='text-xl animate-heartbeat' />
                      <span className='font-bold'>{item.hearts}</span>
                    </span>
                  </div>
                </div>
                <div className="relative z-10 flex min-h-0 flex-1 flex-col p-6">
                  <h3 className="mb-2 text-2xl font-dish-name font-bold leading-snug bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                    {item.name}
                  </h3>
                  <p className="mb-4 min-h-0 flex-1 text-sm leading-relaxed tracking-wide text-gray-300 line-clamp-4">
                    {item.description}
                  </p>
                  <div className="mt-auto grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 pt-1">
                    <span className="min-w-0 truncate text-left text-xl font-bold tabular-nums leading-none text-amber-400 sm:text-2xl">
                      ₹{Number(item.price).toFixed(2)}
                    </span>
                    <div className="flex justify-end">
                      {qty > 0 ? (
                        <div className={`flex h-9 flex-nowrap items-center gap-1.5 sm:h-10 sm:gap-2 ${qtyPending ? 'pointer-events-none opacity-60' : ''}`}>
                          <button
                            type="button"
                            disabled={qtyPending}
                            onClick={() => {
                              qty > 1 ? updateQuantity(cartId, qty - 1) : removeFromCart(cartId)
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-900/40 transition-all duration-200 hover:bg-amber-800/50 active:scale-95 sm:h-9 sm:w-9"
                          >
                            <HiMinus className="h-4 w-4 text-amber-100" />
                          </button>
                          <span className="w-7 shrink-0 text-center font-cinzel text-sm font-semibold text-amber-100 sm:w-8 sm:text-base">
                            {qty}
                          </span>
                          <button
                            type="button"
                            disabled={qtyPending}
                            onClick={() => {
                              updateQuantity(cartId, qty + 1)
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-900/40 transition-all duration-200 hover:bg-amber-800/50 active:scale-95 sm:h-9 sm:w-9"
                          >
                            <HiPlus className="h-4 w-4 text-amber-100" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item, 1)}
                          disabled={isOutOfStock}
                          className={`${addButtonBase} ${isOutOfStock ? 'cursor-not-allowed opacity-60' : addButtonHover} ${commonTransition} !flex h-9 shrink-0 flex-row flex-nowrap items-center justify-center !py-0 px-3 text-sm whitespace-nowrap sm:h-10 sm:px-4 sm:text-base`}
                        >
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
                          <FaPlus className="relative z-10 shrink-0 text-base transition-transform sm:text-lg" />
                          <span className="relative z-10">{isOutOfStock ? 'Out' : 'Add'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className='absolute inset-0 rounded-3xl pointer-events-none border-2 border-transparent group-hover:border-amber-500/30 transition-all duration-500' />
                <div className='opacity-0 group-hover:opacity-100'>
                  <FloatingParticle />
                </div>
              </div>
            );
          })}
        </div>
        {items.length > 4 && (
        <div className='mt-12 flex justify-center'>
          <button onClick={() => setShowAll(!showAll)}
            className='flex items-center gap-7 bg-gradient-to-r from-red-700 to-amber-700 text-white px-8 py-4 rounded-2xl font-bold text-lg uppercase tracking-wider hover:gap-4 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 group border-2 border-amber-400/30 relative overflow-hidden'>
            <div className='absolute inset-0 bg-gradient-to-r fill-amber-500/20 via-transparent to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
            <FaFire className='text-xl animate-pulse' />
            <span>{showAll ? 'show Less' : 'Show More'}</span>
            <div className='h-full w-1 bg-amber-400/30 absolute right-0 top-0 group-hover:animate-border-pulse' />
          </button>
        </div>
        )}
      </div>
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
    </div>
  )
}

export default SpecialOffer
