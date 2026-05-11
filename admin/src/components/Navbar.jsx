import React, { useState } from 'react'
import { navLinks, styles } from '../assets/dummyadmin'
import { GiChefToque } from 'react-icons/gi';
import { FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAdminToken } from '../utils/adminSession';

const Navbar = () => {

    const [menuOpen, setMenuOpen] = useState(false)
    const navigate = useNavigate()

    const logout = () => {
        clearAdminToken()
        navigate('/login', { replace: true })
    }

    return (
        <nav className={`relative ${styles.navWrapper}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
            <div className={styles.navContainer}>
                <div className={`group ${styles.logoSection}`}>
                    <GiChefToque className={styles.logoIcon} />
                    <span className={styles.logoText}>Admin Panel</span>
                </div>

                <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className={styles.menuButton}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                >
                    {menuOpen ? <FiX /> : <FiMenu />}
                </button>

                <div className={styles.desktopMenu}>
                    {navLinks.map(link => (
                        <NavLink key={link.name} to={link.href} className={({ isActive }) => `${styles.navLinkBase} ${isActive ? styles.navLinkActive : styles.navLinkInactive}`}>
                            {link.icon}
                            <span>{link.name}</span>
                        </NavLink>
                    ))}
                    <button
                        type="button"
                        onClick={logout}
                        className={`${styles.navLinkBase} ${styles.navLinkInactive} border-none bg-transparent cursor-pointer`}
                    >
                        <FiLogOut />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* FOR MOBILE VIEW */}
            {menuOpen && (
                <div className={styles.mobileMenu}>
                    {navLinks.map(link => (
                        <NavLink key={link.name} to={link.href} 
                        onClick={()=> setMenuOpen(false)}
                        className={({ isActive }) => `${styles.navLinkBase} ${isActive ? styles.navLinkActive : styles.navLinkInactive}`}>
                            {link.icon}
                            <span>{link.name}</span>
                        </NavLink>
                    ))}
                    <button
                        type="button"
                        onClick={() => { setMenuOpen(false); logout(); }}
                        className={`${styles.navLinkBase} ${styles.navLinkInactive} w-full text-left border-none bg-transparent cursor-pointer`}
                    >
                        <FiLogOut />
                        <span>Logout</span>
                    </button>
                </div>
            )}

        </nav>
    )
}

export default Navbar
