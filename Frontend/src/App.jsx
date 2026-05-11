import React from 'react'
import './App.css'
import Home from './pages/Home/Home'
import { Route, Routes } from 'react-router-dom'
import ContactPage from './pages/ContactPage/ContactPage'
import AboutPage from './pages/AboutPage/AboutPage'
import Menu from './pages/Menu/Menu'
import Cart from './pages/Cart/Cart'
import SignUp from './components/SignUp/SignUp'
import PrivateRoute from './components/PrivateRoute/PrivteRoute'
import CheckOutPage from './pages/CheckoutPage/CheckOutPage'
import MyOrderPage from './pages/MyOrderPage/MyOrderPage'
import ProfilePage from './pages/ProfilePage/ProfilePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage'
import VerifyPaymentPage from './pages/VerifyPaymentPage/VerifyPaymentPage'
import FeedbackPage from './pages/FeedbackPage/FeedbackPage'

function App() {
  return (
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
  )
}

export default App
