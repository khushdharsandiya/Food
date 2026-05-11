import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Scroll to top on every route change so the SPA does not keep the previous scroll position.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
