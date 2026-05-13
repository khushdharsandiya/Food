import { useEffect } from 'react';
import axios from 'axios';

const API = 'https://food-backend-s7t0.onrender.com';
const SESSION_KEY = 'ff_site_visit_v1';

/**
 * Once per browser session: bump visit count (rough “how many sessions opened the site”).
 */
export default function SiteVisitRecorder() {
  useEffect(() => {
    let cancelled = false

    const record = () => {
      if (cancelled) return
      try {
        if (sessionStorage.getItem(SESSION_KEY)) return
        sessionStorage.setItem(SESSION_KEY, '1')
        axios.post(`${API}/api/stats/visit`).catch(() => {})
      } catch {
        /* private mode / storage block */
      }
    }

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(record, { timeout: 4000 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    }

    const t = window.setTimeout(record, 1800)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [])
  return null;
}
