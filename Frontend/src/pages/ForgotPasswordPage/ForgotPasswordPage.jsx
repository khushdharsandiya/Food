import React from 'react'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import ForgotPassword from '../../components/ForgotPassword/ForgotPassword'

const ForgotPasswordPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#1a120b]">
      <Navbar />
      <main className="flex-1">
        <ForgotPassword />
      </main>
      <Footer />
    </div>
  )
}

export default ForgotPasswordPage
