import React from 'react'
import { aboutfeature } from '../../assets/dummydata'
import { Link } from 'react-router-dom'
import { FaInfoCircle } from 'react-icons/fa'
// import AboutImage from '../../assets/AboutImage.png'
import AboutImage from '../../assets/AboutImage.png'
import FloatingParticle from '../FloatingParticle/FloatingParticle'
import './AboutHome.css'

const AboutHome = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f0a0a] via-[#1a1212] to-[#2a1e1e] text-white py-10 sm:py-20 relative overflow-hidden">

            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-20 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl mix-blend-soft-light" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-600/15 rounded-full blur-3xl mix-blend-soft-light" />
            </div>

            <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12 xl:gap-16">

                {/* LEFT IMAGE */}
                <div className="w-full max-w-[370px] sm:max-w-[430px] lg:max-w-[470px] lg:w-5/12 mx-auto order-1 relative group transform hover:scale-[1.01] transition-all duration-500">
                    <div className="relative rounded-[4rem] overflow-hidden border-4 border-amber-900/30 hover:border-amber-600/40 transition duration-300 shadow-2xl shadow-black/50">
                        <img
                            src={AboutImage}
                            alt="Restaurant"
                            width={900}
                            height={1200}
                            loading="lazy"
                            decoding="async"
                            className="relative z-0 block w-full h-auto object-cover aspect-[3/4] rotate-1 hover:rotate-0 transition-all duration-500"
                        />
                        <div
                            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-amber-400/15 via-transparent to-amber-600/10 mix-blend-soft-light"
                            aria-hidden
                        />

                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-4/5 h-16 bg-amber-900/30 blur-3xl z-0" />
                    </div>
                </div>

                {/* RIGHT CONTENT */}
                <div className="w-full lg:w-7/12 order-2 space-y-8 sm:space-y-12 relative">

                    {/* Heading */}
                    <div className="space-y-4 sm:space-y-8 px-4 sm:px-0">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-bold leading-tight">
                            <span className="font-cursive text-4xl sm:text-5xl md:text-6xl bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                                Epicurean Elegance
                            </span>
                            <br />
                            <span className="inline-block mt-2 sm:mt-4 text-2xl sm:text-3xl md:text-4xl opacity-90 font-light">
                                Where Flavors Dance &amp; Memories Bloom
                            </span>
                        </h2>

                        <p className="text-base sm:text-lg md:text-xl opacity-90 leading-relaxed max-w-3xl font-serif italic border-l-4 border-amber-500/60 pl-4 sm:pl-6 py-2 bg-gradient-to-r from-white/5 to-transparent">
                            In our kitchen, passion meets precision. We craft not just meals,
                            but culinary journeys that linger on the palate and in the heart.
                        </p>
                    </div>

                    {/* FEATURES */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 px-4 sm:px-0">
                        {aboutfeature.map((item, i) => (
                            <div
                                key={i}
                                className="flex flex-col items-center justify-center gap-3 sm:gap-4 p-4 sm:p-5 transition-transform duration-300 hover:translate-x-2"
                            >
                                <div
                                    className={`p-3 sm:p-4 rounded-full bg-gradient-to-br ${item.color} transition-transform duration-300 hover:scale-110`}
                                >
                                    <item.icon className="text-2xl sm:text-3xl text-white" />
                                </div>

                                <div className="text-center">
                                    <h3 className="text-xl sm:text-2xl font-bold font-cursive">
                                        {item.title}
                                    </h3>
                                    <p className="opacity-80 text-sm sm:text-base">
                                        {item.text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* BUTTON */}
                    <div className="flex flex-wrap gap-4 items-center mt-6 sm:mt-8 px-4 sm:px-0">
                        <Link
                            to="/about"
                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold flex items-center gap-3 shadow-xl hover:shadow-amber-500/20 transition-transform duration-300 hover:scale-[1.03] relative overflow-hidden group"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-amber-600/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <FaInfoCircle className="text-xl animate-pulse" />
                            <span className="font-cursive text-lg sm:text-xl">
                                Unveil Our Legacy
                            </span>
                        </Link>
                    </div>

                </div>
            </div>

            <FloatingParticle />
        </div>
    )
}

export default AboutHome
