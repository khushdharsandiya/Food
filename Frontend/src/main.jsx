import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { CartProvider } from './CartContext/CartContext.jsx'
import SiteVisitRecorder from './components/SiteVisitRecorder/SiteVisitRecorder.jsx'
import ScrollToTop from './components/ScrollToTop/ScrollToTop.jsx'
import { InitialSplashGate } from './components/InitialSplash/InitialSplashGate.jsx'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <InitialSplashGate>
    <CartProvider>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <ScrollToTop />
        <SiteVisitRecorder />
        <App />
      </BrowserRouter>
    </CartProvider>
  </InitialSplashGate>
)
