import type { CSSProperties } from 'react'
import {
  ArrowRight,
  CaretDown,
  CaretRight,
  Check,
  CheckCircle,
  CircleHalf,
  Coins,
  House,
  HourglassMedium,
  LockSimple,
  MagnifyingGlass,
  MinusCircle,
  PencilSimple,
  Plus,
  SignOut,
  User,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon, IconWeight } from '@phosphor-icons/react'

/**
 * Mapa nazw ikon (kebab-case, jak w bundlu DS `ph-*`) na komponenty Phosphor.
 * Dodawaj kolejne w miarę potrzeb — trzymamy tu jawną listę, żeby bundlować
 * tylko używane ikony (działa offline, zgodnie z wymogiem PWA).
 */
const IKONY = {
  'arrow-right': ArrowRight,
  'caret-down': CaretDown,
  'caret-right': CaretRight,
  check: Check,
  'check-circle': CheckCircle,
  'circle-half': CircleHalf,
  coins: Coins,
  house: House,
  'hourglass-medium': HourglassMedium,
  'lock-simple': LockSimple,
  'magnifying-glass': MagnifyingGlass,
  'minus-circle': MinusCircle,
  'pencil-simple': PencilSimple,
  plus: Plus,
  'sign-out': SignOut,
  user: User,
  'warning-circle': WarningCircle,
  x: X,
} satisfies Record<string, PhosphorIcon>

export type IconName = keyof typeof IKONY

type IconProps = {
  name: IconName
  /** Domyślnie „light" — odpowiednik `ph-light` z DS. „fill" dla stanów aktywnych. */
  weight?: IconWeight
  size?: number
  className?: string
  style?: CSSProperties
}

/** Ikona Phosphor Light. Kolor dziedziczy z `currentColor` (steruj przez `text-*`). */
export function Icon({ name, weight = 'light', size = 20, className, style }: IconProps) {
  const Glyph = IKONY[name]
  return <Glyph weight={weight} size={size} className={className} style={style} />
}
