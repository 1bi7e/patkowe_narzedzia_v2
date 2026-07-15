import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

export type ToastTone = 'success' | 'error'

type ToastProps = {
  tone?: ToastTone
  children: ReactNode
  onClose: () => void
  /** Automatyczne zamknięcie po tylu ms (domyślnie 3800). */
  autoMs?: number
}

const IKONA: Record<ToastTone, IconName> = {
  success: 'check-circle',
  error: 'warning-circle',
}

const KOLOR: Record<ToastTone, string> = {
  success: 'text-success-500',
  error: 'text-error-500',
}

/** Toast potwierdzenia/błędu — nad dolną nawigacją, znika sam. */
export function Toast({ tone = 'success', children, onClose, autoMs = 3800 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, autoMs)
    return () => clearTimeout(t)
  }, [onClose, autoMs])

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center px-6"
      style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={onClose}
        className="flex w-full max-w-md items-center gap-[12px] rounded-md border border-gold-300 bg-cream-25 px-[18px] py-[14px] text-left shadow-satin"
      >
        <Icon name={IKONA[tone]} weight="fill" size={22} className={KOLOR[tone]} />
        <span className="text-[14px] text-brown-700">{children}</span>
      </button>
    </div>
  )
}
