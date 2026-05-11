import React from 'react'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import Profile from '../../components/Profile/Profile'

const ProfilePage = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a120b]">
      <Navbar />
      <main className="flex-1 bg-[#1a120b]">
        <Profile />
      </main>
      <Footer />
    </div>
  )
}

export default ProfilePage
