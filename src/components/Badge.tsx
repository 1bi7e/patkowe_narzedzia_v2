import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

export type BadgeTone = 'rose' | 'gold' | 'cream' | 'success' | 'error' | 'dark'

/** tło / kolor tekstu / obramowanie — 1:1 z bundle'em DS. */
const TONES: Record<BadgeTone, string> = {
  rose: 'bg-rose-100 text-rose-700 border border-rose-200',
  gold: 'bg-gold-100 text-gold-700 border border-gold-200',
  cream: 'bg-cream-100 text-brown-600 border border-cream-200',
  success: 'bg-success-100 text-success-700 border border-transparent',
  error: 'bg-error-100 text-error-700 border border-transparent',
  dark: 'bg-rose-500 text-cream-25 border border-transparent shadow-satin-sm',
}

type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
  icon?: IconName
}

export function Badge({ children, tone = 'cream', icon }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-[6px] rounded-pill px-[13px] py-[5px]',
        'font-sans text-[11.5px] font-medium uppercase tracking-[0.1em] whitespace-nowrap',
        TONES[tone],
      ].join(' ')}
    >
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  )
}
