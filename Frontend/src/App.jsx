import React, { Suspense, lazy } from 'react'
import './App.css'
import { Route, Routes } from 'react-router-dom'
import PrivateRoute from './components/PrivateRoute/PrivteRoute'

const Home = lazy(() => import('./pages/Home/Home'))
const ContactPage = lazy(() => import('./pages/ContactPage/ContactPage'))
const AboutPage = lazy(() => import('./pages/AboutPage/AboutPage'))
const Menu = lazy(() => import('./pages/Menu/Menu'))
const Cart = lazy(() => import('./pages/Cart/Cart'))
const SignUp = lazy(() => import('./components/SignUp/SignUp'))
const CheckOutPage = lazy(() => import('./pages/CheckoutPage/CheckOutPage'))
const MyOrderPage = lazy(() => import('./pages/MyOrderPage/MyOrderPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage/ProfilePage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage/ResetPasswordPage'))
const VerifyPaymentPage = lazy(() => import('./pages/VerifyPaymentPage/VerifyPaymentPage'))
const FeedbackPage = lazy(() => import('./pages/FeedbackPage/FeedbackPage'))

const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] px-4">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-amber-600/30 border-t-amber-400" />
      <p className="font-cinzel text-sm tracking-widest text-amber-200/80">Loading…</p>
    </div>
  </div>
)

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/Contact' element={<ContactPage />} />
        <Route path='/contact' element={<ContactPage />} />
        <Route path='/feedback' element={<FeedbackPage />} />
        <Route path='/about' element={<AboutPage />} />
        <Route path='/menu' element={<Menu />} />

        <Route path="/login" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* PAYMENT VARIFICATION */}
        <Route path='/myorder/verify' element={<VerifyPaymentPage />} />

        <Route path='/cart' element={
          <PrivateRoute>
            <Cart />
          </PrivateRoute>
        } />

        <Route path="/checkout" element={
          <PrivateRoute>
            <CheckOutPage />
          </PrivateRoute>
        } />

        <Route path="/profile" element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        } />

        <Route path="/myorder" element={
          <PrivateRoute>
            <MyOrderPage />
          </PrivateRoute>
        } />

      </Routes>
    </Suspense>
  )
}

export default App
