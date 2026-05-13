import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = 'https://food-backend-s7t0.onrender.com';

/** After checkout: short grace window before order shows in admin; user may cancel. */
const OrderGraceOverlay = ({
  orderId,
  adminVisibleAt,
  authHeaders,
  onComplete,
  onCancelled,
}) => {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(adminVisibleAt).getTime() - Date.now()),
  );
  const [cancelling, setCancelling] = useState(false);
  const totalGraceMs = useMemo(
    () => Math.max(1, new Date(adminVisibleAt).getTime() - Date.now()),
    [adminVisibleAt],
  );

  const doneRef = useRef(false);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const tick = () => {
      const end = new Date(adminVisibleAt).getTime();
      const ms = Math.max(0, end - Date.now());
      setRemainingMs(ms);
      if (ms <= 0) finish();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [adminVisibleAt, finish]);

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, []);

  const sec = Math.max(0, Math.ceil(remainingMs / 1000));

  const handleCancel = async () => {
    if (remainingMs <= 0 || cancelling) return;
    setCancelling(true);
    const t = toast.loading('Cancelling…');
    try {
      await axios.post(`${API}/api/orders/${orderId}/cancel`, {}, { headers: authHeaders });
      toast.success('Order cancelled.', { id: t });
      onCancelled?.();
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Could not cancel. Please try again.';
      toast.error(msg, { id: t });
      setCancelling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grace-title"
      aria-describedby="grace-desc"
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-600/40 bg-gradient-to-br from-[#2a211c] to-[#1a120b] p-8 text-center shadow-2xl shadow-black/60">
        <div
          className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-amber-900/50 border-t-amber-400"
          aria-hidden
        />
        <h2 id="grace-title" className="font-cinzel text-xl font-semibold text-amber-100 sm:text-2xl">
          Confirming your order
        </h2>
        <p id="grace-desc" className="mt-3 text-sm leading-relaxed text-amber-200/80">
          In <span className="font-semibold text-amber-300">{sec}s</span> your order will appear in the
          restaurant. Until then you can cancel if you change your mind.
        </p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-amber-950/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-[width] duration-200 ease-linear"
            style={{
              width: `${Math.min(100, (100 * (1 - remainingMs / totalGraceMs)) | 0)}%`,
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling || remainingMs <= 0}
          className="mt-8 w-full rounded-xl border border-rose-700/50 bg-rose-950/40 py-3 font-cinzel text-sm font-semibold text-rose-200 transition hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {cancelling ? 'Cancelling…' : 'Cancel order'}
        </button>
      </div>
    </div>
  );
};

export default OrderGraceOverlay;
