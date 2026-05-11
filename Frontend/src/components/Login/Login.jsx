import React, { useEffect, useState } from 'react'
import { FaArrowRight, FaCheckCircle, FaEye, FaEyeSlash, FaLock, FaUser, FaUserPlus } from 'react-icons/fa';
import { iconClass, inputBase } from '../../assets/dummydata';
import { Link } from 'react-router-dom';
import axios from 'axios';

const url = 'http://localhost:4000'

const Login = ({ onLoginSuccess, onclose }) => {

  const [showToast, setShowToast] = useState({ visible: false, message: '', isError: false });
  const [showPassword, setShowPassword] = useState(false);
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

  const flashError = (message) => {
    setShowToast({ visible: true, message, isError: true });
    setTimeout(() => {
      setShowToast({ visible: false, message: '', isError: false });
    }, 2800);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const email = String(formData.email || '').trim();
    const password = String(formData.password || '');

    if (!email) {
      flashError('Please enter your email first.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      flashError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      flashError('Please enter your password.');
      return;
    }

    try {
      const res = await axios.post(`${url}/api/user/login`, {
        email,
        password,
      });

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

        setShowToast({ visible: true, message: 'Login Successful', isError: false });

        setTimeout(() => {
          setShowToast({ visible: false, message: '', isError: false });
          onLoginSuccess(res.data.token);
        }, 1500);

      } else {
        throw new Error(res.data.message || 'Login Failed');
      }

    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login Failed';
      setShowToast({ visible: true, message: msg, isError: true });

      setTimeout(() => {
        setShowToast({ visible: false, message: '', isError: false });
      }, 2000);
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
      
      <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${showToast.visible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}>
        <div className={`text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-2 text-sm ${showToast.isError ? 'bg-red-600' : 'bg-green-600'}`}>
          <FaCheckCircle />
          <span>{showToast.message}</span>
        </div>
      </div>

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

        <button className='w-full py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-[#2D1B0E] font-bold rounded-lg flex items-center justify-center gap-2'>
          Sign In <FaArrowRight />
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