import React, { useEffect, useRef, useState } from 'react'
import { GiChefToque } from 'react-icons/gi'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
    FiHome,
    FiBook,
    FiStar,
    FiPhone,
    FiShoppingCart,
    FiKey,
    FiPackage,
    FiUser,
    FiMessageCircle,
    FiChevronDown,
} from 'react-icons/fi'
import { useCart } from '../../CartContext/CartContext'
import Login from '../Login/Login'

const primaryLinks = (isAuthenticated) => [
    { name: 'Home', to: '/', icon: FiHome },
    { name: 'Menu', to: '/menu', icon: FiBook },
    { name: 'About', to: '/about', icon: FiStar },
    ...(isAuthenticated ? [{ name: 'Orders', to: '/myorder', icon: FiPackage }] : []),
]

const supportLinks = [
    { name: 'Contact', to: '/contact', icon: FiPhone },
    { name: 'Feedback', to: '/feedback', icon: FiMessageCircle },
]

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [supportOpen, setSupportOpen] = useState(false)
    const supportRef = useRef(null)
    const navigate = useNavigate()
    const location = useLocation()
    const { totalItems } = useCart()
    const [showLoginModal, setShowLoginModal] = useState(false)

    const [isAuthenticated, setIsAuthenticated] = useState(
        Boolean(localStorage.getItem('authToken')),
    )

    useEffect(() => {
        setShowLoginModal(location.pathname === '/login')
        setIsAuthenticated(Boolean(localStorage.getItem('authToken')))
        setSupportOpen(false)
        setIsOpen(false)
    }, [location.pathname])

    useEffect(() => {
        const close = (e) => {
            if (supportRef.current && !supportRef.current.contains(e.target)) {
                setSupportOpen(false)
            }
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    // Prevent body scrolling when login modal is open
    useEffect(() => {
        if (showLoginModal) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [showLoginModal])

    const handleLoginSuccess = () => {
        const existing = JSON.parse(localStorage.getItem('loginData') || '{}')
        localStorage.setItem('loginData', JSON.stringify({ ...existing, loggedIn: true }))
        setIsAuthenticated(Boolean(localStorage.getItem('authToken')))
        navigate('/')
    }

    const linkClass = ({ isActive }) =>
        `flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 lg:px-5 ${isActive
            ? 'bg-amber-500/20 text-amber-200 shadow-inner shadow-amber-900/30'
            : 'text-amber-100/85 hover:bg-amber-900/35 hover:text-amber-50'
        }`

    const renderDesktopAuthButton = () =>
        isAuthenticated ? (
            <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 rounded-xl border border-amber-600/35 bg-gradient-to-br from-amber-500 to-amber-700 px-4 py-2 text-sm font-bold text-[#2d1b0e] shadow-md shadow-amber-950/40 transition hover:scale-[1.02] hover:shadow-amber-500/25"
            >
                <FiUser className="text-lg" />
                <span>Profile</span>
            </button>
        ) : (
            <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 rounded-xl border border-amber-600/35 bg-gradient-to-br from-amber-500 to-amber-700 px-4 py-2 text-sm font-bold text-[#2d1b0e] shadow-md shadow-amber-950/40 transition hover:scale-[1.02] hover:shadow-amber-500/25"
            >
                <FiKey className="text-lg" />
                <span>Login</span>
            </button>
        )

    const renderMobileAuthButton = () =>
        isAuthenticated ? (
            <button
                type="button"
                onClick={() => {
                    navigate('/profile')
                    setIsOpen(false)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 px-4 py-3 text-sm font-semibold text-[#2D1B0E]"
            >
                <FiUser />
                <span>Profile</span>
            </button>
        ) : (
            <button
                type="button"
                onClick={() => {
                    navigate('/login')
                    setIsOpen(false)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 px-4 py-3 text-sm font-semibold text-[#2D1B0E]"
            >
                <FiKey />
                <span>Login</span>
            </button>
        )

    const main = primaryLinks(isAuthenticated)

    return (
        <>
        <nav className="sticky top-0 z-50 overflow-visible border-b border-amber-900/40 bg-[#2D1B0E]/98 font-vibes shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

            <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
                <div className="flex h-[4.25rem] items-center justify-between gap-3 sm:h-[4.5rem] lg:h-[4.75rem]">
                    {/* Logo */}
                    <NavLink
                        to="/"
                        className="group relative flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5"
                    >
                        <GiChefToque className="shrink-0 text-3xl text-amber-500 transition group-hover:rotate-6 group-hover:text-amber-400 sm:text-4xl" />
                        <div className="min-w-0">
                            <span className="block truncate bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text font-monsieur text-xl tracking-wide text-transparent sm:text-2xl lg:text-[1.65rem] lg:leading-tight">
                                Foodie-frenzy
                            </span>
                            <span className="mt-0.5 block h-0.5 max-w-[4.5rem] rounded-full bg-gradient-to-r from-amber-600/50 via-amber-400 to-amber-600/50 sm:max-w-[5.5rem]" />
                        </div>
                    </NavLink>

                    {/* Desktop: single pill — primary links + Support dropdown */}
                    <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex lg:px-4">
                        <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-800/50 bg-[#1a0f08]/70 p-1.5 pl-2 pr-2 shadow-inner shadow-black/40 sm:gap-2.5 sm:pl-2.5 sm:pr-2.5">
                            {main.map(({ name, to, icon: Icon }) => (
                                <NavLink key={to} to={to} className={linkClass} end={to === '/'}>
                                    <Icon className="h-[1.05rem] w-[1.05rem] shrink-0 opacity-90" />
                                    <span>{name}</span>
                                </NavLink>
                            ))}

                            <div
                                className="relative flex items-stretch border-l border-amber-800/45 pl-2 sm:pl-2.5"
                                ref={supportRef}
                            >
                                <button
                                    type="button"
                                    onClick={() => setSupportOpen((v) => !v)}
                                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 lg:px-5 ${supportOpen
                                            ? 'bg-amber-500/20 text-amber-200 shadow-inner shadow-amber-900/30'
                                            : 'text-amber-100/85 hover:bg-amber-900/35 hover:text-amber-50'
                                        }`}
                                    aria-expanded={supportOpen}
                                    aria-haspopup="true"
                                >
                                    Support
                                    <FiChevronDown
                                        className={`h-4 w-4 shrink-0 transition-transform ${supportOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {supportOpen && (
                                    <div className="absolute right-0 top-[calc(100%+0.45rem)] z-[60] min-w-[11rem] overflow-hidden rounded-xl border border-amber-800/60 bg-[#23160f] py-1 shadow-xl shadow-black/50 ring-1 ring-amber-900/30">
                                        {supportLinks.map(({ name, to, icon: Icon }) => (
                                            <NavLink
                                                key={to}
                                                to={to}
                                                onClick={() => setSupportOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition ${isActive
                                                        ? 'bg-amber-600/20 text-amber-200'
                                                        : 'text-amber-100/90 hover:bg-amber-900/50'
                                                    }`
                                                }
                                            >
                                                <Icon className="h-4 w-4 text-amber-500/90" />
                                                {name}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: cart + auth (desktop) + hamburger */}
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <NavLink
                            to="/cart"
                            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-amber-800/45 bg-[#1a0f08]/60 text-amber-200 transition hover:border-amber-600/50 hover:bg-amber-900/35 sm:h-11 sm:w-11"
                            aria-label="Cart"
                        >
                            <FiShoppingCart className="text-lg sm:text-xl" />
                            {totalItems > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-amber-950">
                                    {totalItems > 99 ? '99+' : totalItems}
                                </span>
                            )}
                        </NavLink>

                        <div className="hidden lg:block">{renderDesktopAuthButton()}</div>

                        <button
                            type="button"
                            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-800/45 bg-[#1a0f08]/60 text-amber-400 transition hover:border-amber-600/50 hover:text-amber-200 lg:hidden"
                            onClick={() => setIsOpen((v) => !v)}
                            aria-label={isOpen ? 'Close menu' : 'Open menu'}
                        >
                            <span
                                className={`block h-0.5 w-5 rounded-full bg-current transition ${isOpen ? 'translate-y-2 rotate-45' : ''}`}
                            />
                            <span
                                className={`block h-0.5 w-5 rounded-full bg-current transition ${isOpen ? 'opacity-0' : ''}`}
                            />
                            <span
                                className={`block h-0.5 w-5 rounded-full bg-current transition ${isOpen ? '-translate-y-2 -rotate-45' : ''}`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile / tablet drawer */}
            {isOpen && (
                <div className="border-t border-amber-900/50 bg-[#25160e] lg:hidden">
                    <div className="mx-auto max-w-7xl space-y-2 px-4 py-4">
                        <p className="px-1 font-cinzel text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600/90">
                            Menu
                        </p>
                        {main.map(({ name, to, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium ${isActive
                                        ? 'bg-amber-600/25 text-amber-200'
                                        : 'text-amber-100/90 hover:bg-amber-900/40'
                                    }`
                                }
                                end={to === '/'}
                            >
                                <Icon className="text-lg text-amber-500" />
                                {name}
                            </NavLink>
                        ))}

                        <p className="mt-5 px-1 font-cinzel text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600/90">
                            Support
                        </p>
                        {supportLinks.map(({ name, to, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium ${isActive
                                        ? 'bg-amber-600/25 text-amber-200'
                                        : 'text-amber-100/90 hover:bg-amber-900/40'
                                    }`
                                }
                            >
                                <Icon className="text-lg text-amber-500" />
                                {name}
                            </NavLink>
                        ))}

                        <div className="mt-5 border-t border-amber-900/40 pt-5">
                            {renderMobileAuthButton()}
                        </div>
                    </div>
                </div>
            )}
        </nav>
        {showLoginModal && (
            <div
                className="fixed inset-0 z-[100] flex min-h-0 items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="login-modal-title"
            >
                <div className="relative my-auto w-full max-w-[480px] shrink-0 rounded-xl border-4 border-amber-700/30 bg-gradient-to-br from-[#2D1B0E] to-[#4a372a] p-6 shadow-[0_0_30px]">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="absolute right-2 top-3 text-2xl text-amber-500 hover:text-amber-300"
                        aria-label="Close login"
                    >
                        &times;
                    </button>

                    <h2 id="login-modal-title" className="mb-4 text-center text-2xl font-bold text-amber-400">
                        Foodie-Frenzy
                    </h2>

                    <Login onLoginSuccess={handleLoginSuccess} onclose={() => navigate('/')} />
                </div>
            </div>
        )}
        </>
    )
}

export default Navbar
