import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

type SheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/** Arkusz wysuwany od dołu (bottom sheet) na ciepłym, rozmytym tle. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: 'var(--scrim)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-t-[24px] border border-rose-200 bg-cream-25 px-6 pt-3 shadow-satin-lg"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-[5px] w-[42px] rounded-pill bg-rose-200" />
        <div className="flex items-center justify-between">
          {title ? (
            <h2 className="font-serif text-h4 font-medium text-brown-800">{title}</h2>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose} aria-label="Zamknij" className="flex text-brown-400">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
