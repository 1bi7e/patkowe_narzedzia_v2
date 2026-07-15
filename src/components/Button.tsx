import type { MouseEventHandler, ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

export type ButtonVariant = 'gold' | 'rose' | 'outline' | 'ghost' | 'dark'
export type ButtonSize = 'sm' | 'md' | 'lg'

/** padding / fontSize / iconSize / gap — dokładne wartości z bundle'a DS. */
const SIZES: Record<ButtonSize, { padding: string; fontSize: number; iconSize: number; gap: number }> = {
  sm: { padding: '8px 18px', fontSize: 13, iconSize: 15, gap: 7 },
  md: { padding: '12px 26px', fontSize: 14.5, iconSize: 17, gap: 9 },
  lg: { padding: '15px 34px', fontSize: 16, iconSize: 19, gap: 10 },
}

const VARIANTS: Record<ButtonVariant, string> = {
  gold: 'bg-[image:var(--gradient-satin-gold)] text-brown-800 border border-transparent shadow-satin-sm hover:shadow-satin hover:brightness-105',
  rose: 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200',
  outline: 'bg-transparent text-brown-700 border border-gold-400 hover:bg-gold-100',
  ghost: 'bg-transparent text-brown-600 border border-transparent hover:bg-rose-100 hover:text-brown-800',
  dark: 'bg-rose-500 text-cream-25 border border-transparent shadow-satin-sm hover:bg-rose-600',
}

type ButtonProps = {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  iconRight?: IconName
  disabled?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export function Button({
  children,
  variant = 'gold',
  size = 'md',
  icon,
  iconRight,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
}: ButtonProps) {
  const { padding, fontSize, iconSize, gap } = SIZES[size]
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ padding, fontSize, gap }}
      className={[
        'inline-flex items-center justify-center rounded-pill font-sans font-medium uppercase tracking-[0.06em]',
        'transition-all duration-[160ms] ease-satin active:scale-[0.98]',
        'disabled:opacity-[0.45] disabled:cursor-not-allowed disabled:pointer-events-none',
        VARIANTS[variant],
        fullWidth ? 'w-full' : '',
      ].join(' ')}
    >
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  )
}
