import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GiChefToque } from 'react-icons/gi';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaShieldAlt,
} from 'react-icons/fa';
import adminClient from '../api/adminClient';

const inputBase =
  'w-full rounded-lg bg-[#2D1B0E] text-amber-100 placeholder-amber-400/70 focus:outline-none focus:ring-2 focus:ring-amber-600 border border-amber-900/40';

const AdminForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState(null);

  const isStrongPassword = (value) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);

  const requestForgotPassword = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data } = await adminClient.post('/api/admin/forgot-password', { email });
      if (data.success) {
        setMessage(data.message || 'OTP sent.');
        setDevOtp(data.server?.devOtp ?? null);
        setStep('otp');
      } else {
        setError(data.message || 'Something went wrong.');
      }
    } catch (err) {
      if (!err.response) {
        setError(
          'Cannot reach API. Start the Backend and set VITE_API_URL in admin (e.g. http://localhost:4000).',
        );
      } else {
        setError(err.response?.data?.message || 'Request failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = (e) => {
    e.preventDefault();
    requestForgotPassword();
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data } = await adminClient.post('/api/admin/verify-otp', { email, otp });
      if (data.success) {
        setMessage(data.message || 'Verified.');
        setStep('password');
      } else {
        setError(data.message || 'Verification failed.');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach API. Check Backend and VITE_API_URL.');
      } else {
        setError(err.response?.data?.message || 'Could not verify OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isStrongPassword(newPassword)) {
      setError('Use a strong password (8+ chars, uppercase, lowercase, number, special character)');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { data } = await adminClient.post('/api/admin/reset-password', {
        email,
        newPassword,
      });
      if (data.success) {
        setMessage(data.message || 'Password updated.');
        setTimeout(() => navigate('/login', { replace: true }), 1800);
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach API. Check Backend and VITE_API_URL.');
      } else {
        setError(err.response?.data?.message || 'Failed to reset password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const goBackToEmail = () => {
    setStep('email');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setMessage('');
    setDevOtp(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1a120b] via-[#2a1e14] to-[#3e2b1d] px-4 py-12 font-[Plus_Jakarta_Sans]">
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-amber-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-red-900/20 blur-3xl" />

      <div className="relative mx-auto max-w-lg">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-amber-300/90 transition hover:text-amber-200"
        >
          <FaArrowLeft className="text-xs" />
          Back to admin sign in
        </Link>

        <div className="relative w-full rounded-xl border-4 border-amber-700/30 bg-gradient-to-br from-[#2D1B0E] to-[#4a372a] p-8 shadow-[0_0_40px_rgba(0,0,0,0.45)] sm:p-10">
          <div className="absolute -top-px left-1/2 h-px w-32 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-600/35 bg-amber-950/40">
              <GiChefToque className="text-3xl text-amber-400" />
            </div>
            <div className="mb-2 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-600/30 bg-amber-900/25 text-amber-400">
                {step === 'password' ? <FaLock className="text-xl" /> : <FaKey className="text-xl" />}
              </div>
            </div>
            <h1 className="font-dancingscript text-3xl text-amber-100 sm:text-4xl">
              {step === 'email' && 'Forgot password'}
              {step === 'otp' && 'Enter OTP'}
              {step === 'password' && 'New password'}
            </h1>
            <p className="mt-2 text-sm text-amber-200/70">
              {step === 'email' &&
                'We’ll send a 6-digit code to your admin email. It expires in 5 minutes.'}
              {step === 'otp' && `Check your inbox for ${email}.`}
              {step === 'password' && 'Choose a strong password after OTP verification.'}
            </p>
          </div>

          {step === 'email' && (
            <ul className="mb-6 space-y-2 text-xs text-amber-200/80 sm:text-sm">
              <li className="flex items-start gap-2">
                <FaEnvelope className="mt-0.5 shrink-0 text-amber-500/90" />
                <span>Use the same email you use for admin login.</span>
              </li>
              <li className="flex items-start gap-2">
                <FaShieldAlt className="mt-0.5 shrink-0 text-amber-500/90" />
                <span>SMTP is the same as the store (EMAIL_USER / EMAIL_PASS in Backend .env).</span>
              </li>
            </ul>
          )}

          {step === 'email' && (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label htmlFor="afp-email" className="mb-1 block text-xs text-amber-400/90">
                  Email
                </label>
                <input
                  id="afp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className={`${inputBase} px-4 py-3`}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 py-3.5 font-bold tracking-wide text-[#2D1B0E] shadow-lg transition hover:from-amber-300 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'otp' && devOtp && (
            <div className="mb-4 rounded-lg border border-amber-600/40 bg-amber-950/35 px-4 py-3">
              <p className="mb-1 text-xs text-amber-100/90">Local dev: OTP (also in backend terminal)</p>
              <p className="font-mono text-2xl font-bold tracking-widest text-amber-300">{devOtp}</p>
            </div>
          )}

          {step === 'otp' && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <label htmlFor="afp-otp" className="mb-1 block text-xs text-amber-400/90">
                  6-digit code
                </label>
                <input
                  id="afp-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className={`${inputBase} px-4 py-3 text-center font-mono text-2xl tracking-[0.35em]`}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 py-3.5 font-bold text-[#2D1B0E] shadow-lg transition hover:from-amber-300 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading ? 'Checking…' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={goBackToEmail}
                className="w-full text-sm text-amber-400/90 underline-offset-2 transition hover:text-amber-300"
              >
                Wrong email? Start over
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtp('');
                  requestForgotPassword();
                }}
                disabled={loading}
                className="w-full text-sm text-amber-300/80 transition hover:text-amber-200 disabled:opacity-50"
              >
                Resend OTP
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-amber-400/90">New password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`${inputBase} w-full py-3 pl-4 pr-12`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-amber-400 hover:bg-amber-900/30"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-amber-300/75">
                  Uppercase, lowercase, number and special character (8+ chars).
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-amber-400/90">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`${inputBase} w-full py-3 pl-4 pr-12`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-amber-400 hover:bg-amber-900/30"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 py-3.5 font-bold text-[#2D1B0E] shadow-lg transition hover:from-amber-300 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </form>
          )}

          {message && (
            <div className="mt-5 rounded-lg border border-emerald-800/40 bg-emerald-950/25 px-4 py-3">
              <p className="flex items-start gap-2 text-sm text-emerald-200/95">
                <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-400" />
                {message}
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
