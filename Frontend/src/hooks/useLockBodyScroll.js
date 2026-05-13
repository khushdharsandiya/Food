import { useEffect } from 'react'

/** Prevent background page scroll while overlays/modals are open (restores previous overflow on close). */
export function useLockBodyScroll(lock) {
  useEffect(() => {
    if (!lock) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [lock])
}
