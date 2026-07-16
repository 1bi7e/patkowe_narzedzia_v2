import type { Stylistka } from '../types'

/** Awatar stylistki: P — złoto, A — róż; inicjał kursywą w Cormorant. */
export function Awatar({ stylistka, size = 28 }: { stylistka: Stylistka; size?: number }) {
  const isP = stylistka === 'patrycja'
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-pill border font-serif italic text-brown-700',
        isP ? 'bg-gold-100 border-gold-300' : 'bg-rose-100 border-rose-300',
      ].join(' ')}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      {isP ? 'P' : 'A'}
    </span>
  )
}
