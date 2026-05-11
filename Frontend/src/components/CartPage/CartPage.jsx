import React, { useState } from 'react'
import { useCart } from '../../CartContext/CartContext'
import { Link } from 'react-router-dom'
import { FiMinus, FiPlus } from "react-icons/fi";
import { FaTimes, FaTrash } from 'react-icons/fa';

import { resolveItemImageUrl, menuImageSrc } from '../../utils/imageUrl'


const CartPage = () => {

    const { cartItems, removeFromCart, updateQuantity, totalAmount } = useCart();
    const [selectedImage, setSelectedImage] = useState(null);
    const validCartItems = cartItems.filter((ci) => ci?.item != null);

    return (
        <div className="min-h-screen overflow-x-hidden py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2d1b]">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center mb-12 animate-fade-in-down">
                    <span className="font-dancingscript block text-5xl sm:text-6xl md:text-7xl mb-2 bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                        Your Cart
                    </span>
                </h1>
                {validCartItems.length === 0 ? (
                    <div className="text-center animate-fade-in">
                        <p className="text-amber-100/80 text-xl mb-4">
                            Your cart is empty
                        </p>

                        <Link
                            to="/menu"
                            className="transition-all duration-300 text-amber-100 inline-flex items-center gap-2 hover:gap-3 hover:bg-amber-800/50 bg-amber-900/40 px-6 py-2 rounded-full font-cinzel text-sm uppercase"
                        >
                            Browse All Items
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 items-stretch sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {validCartItems.map(({ _id, item, quantity }) => (
                                <div
                                    key={_id}
                                    className="group flex h-full min-h-0 flex-col rounded-2xl border-4 border-dashed border-amber-800 bg-amber-900/20 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-solid hover:shadow-xl hover:shadow-amber-900/10 animate-fade-in transform"
                                >
                                    <div
                                        className="relative mx-auto h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg transition-transform duration-300"
                                        onClick={() => setSelectedImage(menuImageSrc(resolveItemImageUrl(item?.imageUrl || item?.image)))}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && setSelectedImage(menuImageSrc(resolveItemImageUrl(item?.imageUrl || item?.image)))}
                                    >
                                        <img
                                            src={menuImageSrc(resolveItemImageUrl(item?.imageUrl || item?.image))}
                                            alt={item?.name ?? 'Item'}
                                            referrerPolicy="no-referrer"
                                            className="h-full w-full object-contain"
                                        />
                                    </div>

                                    <div className="mt-3 flex min-h-0 flex-1 flex-col">
                                        <h3 className="min-h-[3.5rem] text-center text-lg font-dish-name leading-snug text-amber-100 line-clamp-2 sm:min-h-[3.75rem] sm:text-xl">
                                            {item?.name}
                                        </h3>
                                        <p className="mt-1 shrink-0 text-center font-cinzel text-sm text-amber-100/50">
                                            ₹{Number(item?.price ?? 0).toFixed(2)}
                                        </p>

                                        <div className="mt-auto flex w-full flex-col gap-4 pt-4">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(_id, Math.max(1, quantity - 1))}
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-900/40 transition-all duration-200 hover:bg-amber-800/50 active:scale-95"
                                                    aria-label="Decrease quantity"
                                                >
                                                    <FiMinus className="h-4 w-4 text-amber-100" />
                                                </button>
                                                <span className="min-w-[2rem] text-center font-cinzel text-base font-semibold text-amber-100">
                                                    {quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(_id, quantity + 1)}
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-900/40 transition-all duration-200 hover:bg-amber-800/50 active:scale-95"
                                                    aria-label="Increase quantity"
                                                >
                                                    <FiPlus className="h-4 w-4 text-amber-100" />
                                                </button>
                                            </div>

                                            <div className="flex min-h-[2.75rem] w-full items-center justify-between gap-2 border-t border-amber-800/30 pt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => removeFromCart(_id)}
                                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-900/40 px-3 py-2 font-cinzel text-xs uppercase tracking-wide text-amber-100 transition-all hover:bg-amber-800/50 active:scale-95"
                                                >
                                                    <FaTrash className="h-3.5 w-3.5" />
                                                    Remove
                                                </button>
                                                <p className="text-right font-dancingscript text-base font-semibold tabular-nums text-amber-300 sm:text-lg">
                                                    ₹{Number((item?.price ?? 0) * quantity).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-12 pt-8 border-t border-amber-800/30 animate-fade-in-up">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
                                <Link
                                    to="/menu"
                                    className="bg-amber-900/40 px-8 py-3 rounded-full font-cinzel uppercase tracking-wider hover:bg-amber-800/50 transition-all duration-300 text-amber-100 inline-flex items-center gap-2 hover:gap-3 active:scale-95"
                                >
                                    Continue Shopping
                                </Link>
                                <div className="flex items-center gap-8">
                                    <h2 className="text-3xl font-dancingscript text-amber-100">
                                        Total: ₹{Number(totalAmount).toFixed(2)}
                                    </h2>
                                    <Link to='/checkout' className="bg-amber-900/40 px-8 py-3 rounded-full font-cinzel uppercase tracking-wider hover:bg-amber-800/50 transition-all duration-300 text-amber-100 flex items-center gap-2 active:scale-95">
                                        Checkout Now
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            {selectedImage && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-amber-900/40 bg-opacity-75 backdrop-blur-sm p-4 overflow-auto'
                    onClick={() => setSelectedImage(null)}>
                    <div className='relative max-w-full max-h-full'>
                        <img src={selectedImage} alt='Full View' className=' max-w-[90vw] max-h-[90vh] rounded-lg object-contain' />

                        <button onClick={() => setSelectedImage(null)}
                            className=' absolute top-1 right-1 bg-amber-900/80 rounded-full p-2 text-black hover:bg-amber-800 duration-200 active:scale-90'>
                            <FaTimes className='w-6 h-6' />
                        </button>

                    </div>
                </div>
            )}

        </div>
    )
}

export default CartPage
