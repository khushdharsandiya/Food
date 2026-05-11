import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaRegEnvelope } from "react-icons/fa";
import { FaFacebook, FaInstagram, FaXTwitter, FaYoutube } from 'react-icons/fa6'
import { BiChevronRight } from "react-icons/bi";

/** Decorative only — no external URLs until you add real brand accounts */
const socialDecor = [
    { icon: FaFacebook, color: '#3b5998', label: 'Facebook' },
    { icon: FaInstagram, color: '#E1306C', label: 'Instagram' },
    { icon: FaXTwitter, color: '#e7e5e4', label: 'X' },
    { icon: FaYoutube, color: '#FF0000', label: 'YouTube' },
]

const navItems = [
    { name: 'Home', link: '/' },
    { name: 'Menu', link: '/menu' },
    { name: 'About Us', link: '/about' },
    { name: 'Contact', link: '/contact' },
    { name: 'Feedback', link: '/feedback' },
]

const Footer = () => {


    const [email, setEmail] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        alert(`Thank for subscribing! we'll send updates to  ${email}!`);
        setEmail('');
    }
    return (
        <footer className="bg-[#2A211C] text-amber-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-12">

                    {/* LEFT COLUMN */}
                    <div className="space-y-6">
                        <h2 className="text-4xl sm:text-5xl md:text-5xl font-bold font-sacramento text-amber-400 animate-pulse">
                            Foodie-Frenzy
                        </h2>

                        <p className="text-amber-200/90 text-sm font-sacramento italic">
                            When culinary artistry meets doorstep convenience. <br />
                            Savor handcrafted perfection, delivered with care.
                        </p>

                        <form onSubmit={handleSubmit} className="relative mt-4 group">
                            <div className='flex items-center gap-2 mb-2'>
                                <FaRegEnvelope className='text-amber-400 animate-pulse' />
                                <span className='font-bold text-amber-400'>
                                    Get Exclusive Offers
                                </span>
                            </div>
                            <div className='relative'>
                                <input type="email" placeholder='Enter your email...' value={email} onChange={e => setEmail(e.target.value)} className='w-full px-4 py-2.5 rounded-lg bg-amber-50/5 border-2 border-amber-400/30 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all duration-300 placeholder-amber-200/50 pr-24' required />
                                <button type='submit' className='absolute right-1 top-1 bg-gradient-to-br from-amber-300 via-orange-500 to-amber-600 px-4 py-2 text-white rounded-full flex items-center gap-1.5 shadow-lg hover:shadow-amber-400/30 overflow-hidden transition-all duration-500'>
                                    <span className='font-bold text-sm tracking-wide transition-transform duration-300'>
                                        Join Now
                                    </span>
                                    <BiChevronRight className='text-xl transition-transform duration-300 group-hover:animate-spin flex-shrink-0' />
                                    <span className='absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-50/30 to-transparent group-hover:translate-x-full transition-transform duration-700' />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* MIDDLE COLUMN */}
                    <div className='flex justify-center'>
                        <div className='space-y-4'>
                            <h3 className='text-xl font-semibold mb-4 border-l-4 border-amber-400 pl-3 font-merriwearher italic text-amber-300'>
                                Navigation
                            </h3>
                            <ul className='space-y-3'>
                                {navItems.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            to={item.link}
                                            className="flex items-center transition-all group font-lora hover:pl-2"
                                        >
                                            <BiChevronRight className="mr-2 text-amber-400 group-hover:animate-bounce" />
                                            <span className="hover:italic">{item.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    {/* RIGHT COLUMN */}
                    <div className='flex justify-center md:justify-end'>
                        <div className="max-w-xs space-y-4 text-center md:text-right">
                            <h3 className='text-xl font-semibold mb-1 border-l-4 border-amber-400 pl-3 font-merriwearher italic text-amber-300 md:ml-auto md:border-l-0 md:border-r-4 md:pl-0 md:pr-3'>
                                Stay connected
                            </h3>
                            <p className="font-lora text-sm leading-relaxed text-amber-200/75 md:ml-auto">
                                We’re not on social yet — say hi on{' '}
                                <Link to="/contact" className="text-amber-400 underline decoration-amber-400/40 underline-offset-2 transition hover:text-amber-300">
                                    Contact
                                </Link>
                                {' '}or leave{' '}
                                <Link to="/feedback" className="text-amber-400 underline decoration-amber-400/40 underline-offset-2 transition hover:text-amber-300">
                                    feedback
                                </Link>
                                .
                            </p>
                            <ul
                                className="flex flex-wrap items-center justify-center gap-3 md:justify-end"
                                aria-label="Social platforms (coming soon, decorative)"
                            >
                                {socialDecor.map(({ icon: Icon, color, label }, idx) => (
                                    <li key={label}>
                                        <span
                                            className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/5 text-xl shadow-inner transition duration-300 hover:border-amber-400/35 hover:bg-amber-400/12"
                                            style={{ color }}
                                            title={label}
                                        >
                                            <Icon className="opacity-90" aria-hidden />
                                            <span className="sr-only">{label} (coming soon)</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
                {/* BOTTOM SECTION */}
                <div className="border-t border-amber-800 pt-8 mt-8 text-center">
                    <p className="text-amber-400 text-lg mb-2 font-playfair">
                        &copy; {new Date().getFullYear()} Foodie-Frenzy. All rights reserved.
                    </p>

                    <div className="text-base text-amber-200/85 font-cinzel max-w-2xl mx-auto leading-relaxed space-y-1">
                        <p className="font-semibold text-amber-100/95">
                            President Institute of Computer Application
                        </p>
                        <p>
                            BCA project — developed for academic coursework and demonstration.
                        </p>
                    </div>
                </div>

            </div>
        </footer>

    )
}

export default Footer
