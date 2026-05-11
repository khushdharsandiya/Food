import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop.jsx'

// Remove legacy admin token from localStorage (admin now uses sessionStorage only).
try {
  localStorage.removeItem('adminToken')
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ScrollToTop />
    <App />
  </BrowserRouter>
)
