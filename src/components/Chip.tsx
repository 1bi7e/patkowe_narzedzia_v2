import type { ReactNode } from 'react'

type ChipProps = {
  active: boolean
  onClick: () => void
  children: ReactNode
}

/** Filtr-pigułka (okres / status / typ / stylistka). Aktywna: złote tło + obramowanie. */
export function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-pill border px-[14px] py-[7px] text-[12.5px] font-medium tracking-[0.02em] whitespace-nowrap',
        'transition-all duration-[140ms] ease-satin active:scale-[0.97]',
        active
          ? 'border-gold-400 bg-gold-100 text-brown-800'
          : 'border-rose-200 bg-cream-25 text-brown-500',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
