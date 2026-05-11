import React, { useEffect, useRef, useState } from 'react'
import { GiChefToque } from 'react-icons/gi'

const MIN_VISIBLE_MS = 2400
const FADE_OUT_MS = 650
const MAX_VISIBLE_MS = 5200

/**
 * First visit or full refresh: show splash until the page is ready and a minimum display time has passed.
 */
export function InitialSplashGate({ children }) {
  const [showSplash, setShowSplash] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const finished = useRef(false)

  useEffect(() => {
    const start = Date.now()
    let capTimer

    const hide = () => {
      if (finished.current) return
      finished.current = true
      if (capTimer) clearTimeout(capTimer)
      setFadeOut(true)
      window.setTimeout(() => setShowSplash(false), FADE_OUT_MS)
    }

    const scheduleHideAfterMin = () => {
      const elapsed = Date.now() - start
      const rest = Math.max(0, MIN_VISIBLE_MS - elapsed)
      window.setTimeout(hide, rest)
    }

    if (document.readyState === 'complete') {
      scheduleHideAfterMin()
    } else {
      window.addEventListener('load', scheduleHideAfterMin, { once: true })
    }

    capTimer = window.setTimeout(hide, MAX_VISIBLE_MS)

    return () => {
      if (capTimer) clearTimeout(capTimer)
    }
  }, [])

  return (
    <>
      {showSplash && (
        <div
          className={`ff-initial-splash fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden transition-opacity ease-out ${
            fadeOut ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
          style={{ transitionDuration: `${FADE_OUT_MS}ms` }}
          aria-hidden={fadeOut}
        >
          <div className="ff-initial-splash__bg pointer-events-none absolute inset-0" />
          <div className="ff-initial-splash__grain pointer-events-none absolute inset-0 opacity-[0.035]" />
          <div className="pointer-events-none absolute -left-48 top-16 h-[28rem] w-[28rem] rounded-full bg-amber-500/18 blur-[100px]" />
          <div className="pointer-events-none absolute -right-40 bottom-[-10%] h-[32rem] w-[32rem] rounded-full bg-orange-600/22 blur-[110px]" />
          <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-400/10 blur-[80px]" />

          <div className="relative z-10 flex flex-col items-center px-6 text-center">
            <div className="relative mb-12 flex h-[8.5rem] w-[8.5rem] items-center justify-center sm:h-[9.5rem] sm:w-[9.5rem]">
              <div className="ff-splash-orbit pointer-events-none absolute inset-0 rounded-full" aria-hidden />
              <div
                className="ff-splash-orbit ff-splash-orbit--inner pointer-events-none absolute inset-3 rounded-full sm:inset-4"
                aria-hidden
              />
              <div className="ff-splash-sparkles pointer-events-none absolute inset-0" aria-hidden>
                <span className="ff-splash-spark ff-splash-spark--a" />
                <span className="ff-splash-spark ff-splash-spark--b" />
                <span className="ff-splash-spark ff-splash-spark--c" />
              </div>

              <div className="ff-initial-splash__ring relative z-[1] flex h-[7rem] w-[7rem] items-center justify-center rounded-2xl border-2 border-amber-500/45 bg-[#2a1f18]/95 shadow-[0_0_60px_-6px_rgba(245,158,11,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-[7.5rem] sm:w-[7.5rem]">
                <GiChefToque className="ff-initial-splash__toque text-[3.25rem] text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.35)] sm:text-[4rem]" />
              </div>
            </div>

            <h1 className="ff-splash-title font-dancingscript text-[2.75rem] leading-tight sm:text-6xl md:text-7xl">
              Foodie <span className="ff-splash-title-accent">Frenzy</span>
            </h1>

            <div className="ff-splash-progress mt-14 h-1.5 w-52 overflow-hidden rounded-full bg-amber-950/90 shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)] ring-1 ring-amber-700/25 sm:mt-16 sm:w-72">
              <div className="ff-splash-progress-bar h-full rounded-full bg-gradient-to-r from-amber-800 via-amber-400 to-amber-500 shadow-[0_0_14px_rgba(251,191,36,0.45)]" />
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  )
}
