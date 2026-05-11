import React from 'react'
import List from './components/List'
import { Navigate, Route, Routes } from 'react-router-dom'
import Order from './components/Order'
import Coupons from './components/Coupons'
import AddItems from './components/AddItems'
import ResetPasswordRedirect from './components/ResetPasswordRedirect'
import Dashboard from './components/Dashboard'
import AdminLogin from './components/AdminLogin'
import AdminForgotPassword from './components/AdminForgotPassword'
import RequireAdmin from './components/RequireAdmin'
import AdminShell from './components/AdminShell'

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/forgot-password" element={<AdminForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPasswordRedirect />} />
      <Route element={<RequireAdmin />}>
        <Route element={<AdminShell />}>
          <Route index element={<Dashboard />} />
          <Route path="add" element={<AddItems />} />
          <Route path="list" element={<List />} />
          <Route path="orders" element={<Order />} />
          <Route path="coupons" element={<Coupons />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
