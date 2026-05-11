import { useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:4000';
const SESSION_KEY = 'ff_site_visit_v1';

/**
 * Once per browser session: bump visit count (rough “how many sessions opened the site”).
 */
export default function SiteVisitRecorder() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, '1');
      axios.post(`${API}/api/stats/visit`).catch(() => {});
    } catch {
      /* private mode / storage block */
    }
  }, []);
  return null;
}
