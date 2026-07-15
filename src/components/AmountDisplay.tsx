import { formatZlote } from '../lib/format'
import type { Grosze } from '../types'

export type AmountSize = 'sm' | 'md' | 'lg' | 'xl'

/** rozmiar liczby / sufiksu „zł" (px) — wg hi-fi Canvas. */
const SIZES: Record<AmountSize, { num: number; suffix: number }> = {
  sm: { num: 19, suffix: 13 },
  md: { num: 22, suffix: 15 },
  lg: { num: 44, suffix: 22 },
  xl: { num: 58, suffix: 26 },
}

type AmountDisplayProps = {
  grosze: Grosze
  size?: AmountSize
  /** Ujemna kwota (odliczenie) — prefiks „−" i kolor róży. */
  deduction?: boolean
  /** Złoty kursor tekstowy jak w klawiaturze kwoty (tylko `xl`). */
  caret?: boolean
  showSuffix?: boolean
}

/** Duża kwota w Jost (font-sans, tabularne cyfry) — czytelność liczb; „zł" mniejsze i przygaszone. */
export function AmountDisplay({
  grosze,
  size = 'md',
  deduction = false,
  caret = false,
  showSuffix = true,
}: AmountDisplayProps) {
  const { num, suffix } = SIZES[size]
  return (
    <span className="inline-flex items-baseline font-sans font-medium leading-none tabular-nums">
      <span className={deduction ? 'text-rose-600' : 'text-brown-800'} style={{ fontSize: num }}>
        {deduction ? '−' : ''}
        {formatZlote(grosze)}
      </span>
      {showSuffix && (
        <span
          className={deduction ? 'text-rose-400' : 'text-brown-400'}
          style={{ fontSize: suffix, marginLeft: 6 }}
        >
          zł
        </span>
      )}
      {caret && (
        <span
          aria-hidden="true"
          className="self-center bg-gold-500"
          style={{ display: 'inline-block', width: 2, height: 44, marginLeft: 5 }}
        />
      )}
    </span>
  )
}
