import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GiChefToque } from 'react-icons/gi';
import {
  FaArrowRight,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaShieldAlt,
  FaUser,
} from 'react-icons/fa';
import adminClient from '../api/adminClient';
import { getAdminToken, setAdminToken } from '../utils/adminSession';

const inputBase =
  'w-full rounded-lg bg-[#2D1B0E] text-amber-100 placeholder-amber-400/70 focus:outline-none focus:ring-2 focus:ring-amber-600 border border-amber-900/40';
const iconClass = 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-amber-400';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', isError: false });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (getAdminToken()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const showToast = (message, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, isError ? 2800 : 1200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await adminClient.post('/api/admin/login', { email, password });
      if (data?.success && data.token) {
        setAdminToken(data.token);
        showToast('Welcome back', false);
        setTimeout(() => navigate('/', { replace: true }), 600);
        return;
      }
      showToast(data?.message || 'Login failed', true);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (!err.response) {
        showToast(
          'Cannot reach API. Start Backend and set admin/.env VITE_API_URL (e.g. http://localhost:4000).',
          true,
        );
      } else if (status === 401) {
        showToast(msg || 'Invalid email or password', true);
      } else if (status === 403) {
        showToast(msg || 'This account is not an admin.', true);
      } else {
        showToast(msg || 'Login failed', true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] px-4 py-12 font-[Plus_Jakarta_Sans]">
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-amber-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-red-900/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />

      <div
        className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
          toast.visible ? 'translate-y-0 opacity-100' : '-translate-y-16 opacity-0'
        }`}
      >
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.isError ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          <FaCheckCircle className="shrink-0 opacity-90" />
          <span>{toast.message}</span>
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] max-w-lg flex-col items-center justify-center">
        <div className="relative w-full rounded-xl border-4 border-amber-700/30 bg-gradient-to-br from-[#2D1B0E] to-[#4a372a] p-8 shadow-[0_0_40px_rgba(0,0,0,0.45)] sm:p-10">
          <div className="absolute -top-px left-1/2 h-px w-32 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-600/35 bg-amber-950/40 shadow-inner shadow-black/40">
              <GiChefToque className="text-4xl text-amber-400" />
            </div>
            <div className="flex items-center justify-center gap-2 text-amber-500/90">
              <FaShieldAlt className="text-sm" />
              <span className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.25em]">
                Staff only
              </span>
            </div>
            <h1 className="mt-3 font-dancingscript text-4xl text-amber-100 sm:text-5xl">
              Foodie-Frenzy
            </h1>
            <p className="mt-1 font-cinzel text-sm font-semibold tracking-wide text-amber-400/90">
              Admin Panel
            </p>
            <p className="mt-3 text-sm leading-relaxed text-amber-200/65">
              Sign in with your administrator email and password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <FaUser className={iconClass} />
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email address"
                className={`${inputBase} py-3 pl-10 pr-4`}
              />
            </div>

            <div className="relative">
              <FaLock className={iconClass} />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                className={`${inputBase} py-3 pl-10 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-amber-400 transition hover:bg-amber-900/30 hover:text-amber-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 py-3.5 font-bold tracking-wide text-[#2D1B0E] shadow-lg shadow-amber-950/30 transition hover:from-amber-300 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? (
                <span className="font-cinzel text-sm">Signing in…</span>
              ) : (
                <>
                  <span className="font-cinzel text-sm uppercase tracking-wider">Sign in</span>
                  <FaArrowRight className="text-lg" />
                </>
              )}
            </button>

            <p className="pt-2 text-center">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-amber-400/95 underline-offset-2 transition hover:text-amber-300 hover:underline"
              >
                Forgot password?
              </Link>
            </p>
          </form>

          <p className="mt-8 text-center text-[11px] leading-relaxed text-amber-500/50">
            This area is restricted to authorised personnel.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
