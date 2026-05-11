import React from 'react'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import ResetPassword from '../../components/ResetPassword/ResetPassword'

const ResetPasswordPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#1a120b]">
      <Navbar />
      <main className="flex-1">
        <ResetPassword />
      </main>
      <Footer />
    </div>
  )
}

export default ResetPasswordPage
