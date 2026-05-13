import React, { useEffect } from 'react'

function useLockBodyScroll(enabled) {
  useEffect(() => {
    if (!enabled) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [enabled])
}

export default function AdminModal({
  open,
  title,
  message,
  tone = 'amber', // 'amber' | 'danger' | 'success'
  primaryLabel = 'OK',
  secondaryLabel = '',
  onPrimary,
  onSecondary,
  onClose,
  children,
}) {
  useLockBodyScroll(open)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const toneClasses =
    tone === 'danger'
      ? {
          ring: 'border-rose-500/35',
          header: 'from-rose-900/40',
          primary: 'from-rose-600 to-rose-500',
        }
      : tone === 'success'
        ? {
            ring: 'border-emerald-500/35',
            header: 'from-emerald-900/35',
            primary: 'from-emerald-600 to-emerald-500',
          }
        : {
            ring: 'border-amber-700/45',
            header: 'from-amber-900/40',
            primary: 'from-amber-600 to-amber-500',
          }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => onClose?.()}
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-3xl border ${toneClasses.ring} bg-[#2a211c] shadow-[0_25px_90px_-20px_rgba(0,0,0,0.85)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`border-b border-amber-800/50 bg-gradient-to-r ${toneClasses.header} to-transparent px-6 py-5`}
        >
          <h3 className="font-cinzel text-lg font-semibold text-amber-100">{title}</h3>
          {message ? (
            <p className="mt-2 font-cinzel text-sm text-amber-200/80 leading-relaxed">{message}</p>
          ) : null}
        </div>

        <div className="px-6 py-6">
          {children}
          <div className="mt-5 flex gap-3">
            {secondaryLabel ? (
              <button
                type="button"
                onClick={() => onSecondary?.()}
                className="flex-1 rounded-xl border border-amber-700/45 bg-[#1a120b]/60 py-2.5 font-cinzel text-sm text-amber-100 transition hover:bg-amber-900/35"
              >
                {secondaryLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onPrimary?.()}
              className={`flex-1 rounded-xl bg-gradient-to-r ${toneClasses.primary} py-2.5 font-cinzel text-sm font-semibold text-[#1a0f08] transition hover:scale-[1.01]`}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

