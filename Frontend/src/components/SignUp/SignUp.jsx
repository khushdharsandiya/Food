import React, { useEffect, useState } from 'react'
import { FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCart } from '../../CartContext/CartContext'

const url = 'https://food-backend-s7t0.onrender.com'
const REGISTER_TIMEOUT_MS = 28000
const BACKEND_WARMUP_MS = 12000

const SignUp = () => {
  const { refetchCart } = useCart()
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const ac = new AbortController()
    axios.get(`${url}/`, { timeout: BACKEND_WARMUP_MS, signal: ac.signal }).catch(() => {})
    return () => ac.abort()
  }, [])

  const toggleShowPassword = () => setShowPassword(prev => !prev);


  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const isStrongPassword = (value) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value)

  /** At least one Unicode letter; not digits-only; 2–80 chars after trim. */
  const isValidUsername = (value) => {
    const s = String(value ?? '').trim()
    if (s.length < 2 || s.length > 80) return false
    if (/^\d+$/.test(s)) return false
    return /\p{L}/u.test(s)
  }

  const handleSubmit = async e => {
    e.preventDefault();
    if (!isValidUsername(formData.username)) {
      toast.error(
        'Username must include at least one letter (not only numbers), 2–80 characters.',
      )
      return
    }
    if (!isStrongPassword(formData.password)) {
      toast.error(
        'Use a strong password (8+ chars, uppercase, lowercase, number, special character).',
      )
      return
    }
    try {
      const res = await axios.post(`${url}/api/user/register`, formData, {
        timeout: REGISTER_TIMEOUT_MS,
      })

      if (res.data.success && res.data.token) {
        localStorage.setItem('authToken', res.data.token)
        localStorage.setItem('loginData', JSON.stringify({ loggedIn: true, email: formData.email }))
        localStorage.setItem('user', JSON.stringify({
          email: res.data.user?.email || formData.email,
          username: res.data.user?.username || formData.username,
        }))

        toast.success('Account created — welcome!', { duration: 2200 })
        navigate('/', { replace: true })
        requestAnimationFrame(() => {
          void refetchCart()
        })
        return;
      }
      throw new Error(res.data.message || 'Registration faild')
    } catch (err) {
      const msg =
        err.code === 'ECONNABORTED'
          ? 'Request timed out. The server may be waking up — try again.'
          : err.response?.data?.message || err.message || 'Registration faild'
      toast.error(msg)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#1a120b] p-4'>
      <div className='w-full max-w-md bg-gradient-to-br from-[#2D1B0E] to-[#4A372A] p-8 rounded-xl shadow-lg border-4 border-amber-700/30 transform transition-all duration-300 hover:shadow-2xl'>

        <h1 className=' text-3xl font-bold text-center bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-6 hover:scale-105 transition-transform'>
          Create Your Account
        </h1>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <input type="text" name='username' placeholder='Username' value={formData.username} onChange={handleChange} autoComplete="username" className='w-full px-4 py-3 rounded-lg bg-[#2D1B0E] text-amber-100 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all duration-200 hover:scale-[1.02]' required />

          <input type="email" name='email' placeholder='Email' value={formData.email} onChange={handleChange} className='w-full px-4 py-3 rounded-lg bg-[#2D1B0E] text-amber-100 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all duration-200 hover:scale-[1.02]' required />

          <div className='relative'>
            <input
              type={showPassword ? 'text' : 'password'}
              name='password'
              placeholder='Password'
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              className='w-full rounded-lg bg-[#2D1B0E] py-3 pl-4 pr-12 text-amber-100 placeholder-amber-400 transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-600'
              required
            />
            <button
              type='button'
              onClick={toggleShowPassword}
              className='absolute inset-y-0 right-3 flex items-center rounded-lg p-1.5 text-amber-400 hover:bg-[#3d2815] hover:text-amber-300'
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
            </button>
          </div>
          {/* <p className='text-xs text-amber-300/80 px-1'>
            Username: 2–80 characters, at least one letter; cannot be only digits (e.g. use “rahul123” not “12345”).
          </p> */}
          {/* <p className='text-xs text-amber-300/80 px-1'>
            Password must be 8+ chars with uppercase, lowercase, number and special character.
          </p> */}

          <button type='submit' className='w-full bg-gradient-to-r from-amber-400 to-amber-600 text-[#2d1b0e] font-bold py-3 rounded-lg shadow-md transition-transform duration-300 hover:shadow-lg  hover:scale-105'>
            Sign Up
          </button>

          <div className='mt-6 text-center'>
            <Link to='/login' className='group inline-flex items-center text-amber-400 hover:text-amber-600 transition-all duration-300'>
              <FaArrowLeft className='mr-2 transform -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300' />

              <span className='transform group-hover:-translate-x-2 transition-all duration-300'>
                Back to Login
              </span>
            </Link>
          </div>

        </form>
      </div>

    </div>
  )
}

export default SignUp
