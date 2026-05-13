import React, { useEffect, useState } from 'react'
import { FaArrowRight, FaEye, FaEyeSlash, FaLock, FaUser, FaUserPlus } from 'react-icons/fa';
import { iconClass, inputBase } from '../../assets/dummydata';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCart } from '../../CartContext/CartContext';

const url = 'https://food-backend-s7t0.onrender.com'

/** Cold Render free tier can take several seconds — avoid hanging forever. */
const LOGIN_TIMEOUT_MS = 28000

/** Lightweight ping — wakes cold Render instance before user submits (first attempt feels faster). */
const BACKEND_WARMUP_MS = 12000

const Login = ({ onLoginSuccess, onclose }) => {
  const { refetchCart } = useCart()

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });

  useEffect(() => {
    const stored = localStorage.getItem('loginData');
    if (stored) {
      const parsed = JSON.parse(stored);
      setFormData(prev => ({
        ...prev,
        email: parsed.email || prev.email,
        rememberMe: Boolean(parsed.rememberMe),
      }));
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController()
    axios.get(`${url}/`, { timeout: BACKEND_WARMUP_MS, signal: ac.signal }).catch(() => {})
    return () => ac.abort()
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    const email = String(formData.email || '').trim();
    const password = String(formData.password || '');

    if (!email) {
      toast.error('Please enter your email first.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!password) {
      toast.error('Please enter your password.');
      return;
    }

    setSubmitting(true)
    try {
      const res = await axios.post(
        `${url}/api/user/login`,
        { email, password },
        { timeout: LOGIN_TIMEOUT_MS },
      );

      if (res.status === 200 && res.data.success && res.data.token) {
        localStorage.setItem('authToken', res.data.token);
        localStorage.setItem('loginData', JSON.stringify({
          loggedIn: true,
          email,
          rememberMe: formData.rememberMe
        }));

        localStorage.setItem('user', JSON.stringify({
          email: res.data.user?.email || email,
          username: res.data.user?.username || '',
        }));

        toast.success('Welcome back!', { duration: 2200 })
        // Navigate first — cart sync can wait so the modal closes immediately.
        onLoginSuccess(res.data.token)
        requestAnimationFrame(() => {
          void refetchCart()
        })

      } else {
        throw new Error(res.data.message || 'Login Failed');
      }

    } catch (err) {
      const msg =
        err.code === 'ECONNABORTED'
          ? 'Login timed out. The server may be waking up — try again in a moment.'
          : err.response?.data?.message || err.message || 'Login Failed';
      toast.error(msg);
    } finally {
      setSubmitting(false)
    }
  };

  const handleChange = ({ target: { name, value, type, checked } }) => {
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleShowPassword = () => setShowPassword(prev => !prev);

  return (
    <div className='space-y-6 relative w-full'> {/* ✅ removed mx-auto */}
      <form onSubmit={handleSubmit} className='space-y-6' noValidate>
        <div className='relative'>
          <FaUser className={iconClass} />
          <input
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            className={`${inputBase} pl-10 pr-4 py-3`}
          />
        </div>

        <div className='relative'>
          <FaLock className={iconClass} />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            className={`${inputBase} py-3 pl-10 pr-11`}
          />

          <button
            type='button'
            onClick={toggleShowPassword}
            className='absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-amber-400'
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        <div className='flex items-center'>
          <label className='flex items-center'>
            <input type="checkbox" name='rememberMe'
              checked={formData.rememberMe}
              onChange={handleChange}
              className='h-5 w-5' />
            <span className='ml-2 text-amber-100'>Remember Me</span>
          </label>
        </div>

        <div className='text-right -mt-3'>
          <Link to="/forgot-password" onClick={onclose}
            className='text-amber-400 text-sm'>
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className='w-full py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-[#2D1B0E] font-bold rounded-lg flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-65'
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2D1B0E]/30 border-t-[#2D1B0E]" aria-hidden />
              Signing in…
            </span>
          ) : (
            <>
              Sign In <FaArrowRight />
            </>
          )}
        </button>
      </form>

      <div className='text-center'>
        <Link to="/signup" onClick={onclose}
          className='inline-flex items-center gap-2 text-amber-400'>
          <FaUserPlus /> Create New Account
        </Link>
      </div>
    </div>
  );
};

export default Login;