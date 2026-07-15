import { Icon } from './Icon'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import type { Stylistka } from '../types'

type KontoPillProps = {
  stylistka: Stylistka
  onWyloguj?: () => void
}

/** Pigułka zalogowanego konta (awatar + imię) z akcją wylogowania. */
export function KontoPill({ stylistka, onWyloguj }: KontoPillProps) {
  const isP = stylistka === 'patrycja'
  return (
    <div className="inline-flex items-center gap-[8px] rounded-pill border border-rose-200 bg-cream-25 py-[5px] pr-[12px] pl-[6px] shadow-satin-sm">
      <span
        className={[
          'inline-flex h-[28px] w-[28px] items-center justify-center rounded-pill border font-serif text-[14px] italic text-brown-700',
          isP ? 'bg-gold-100 border-gold-300' : 'bg-rose-100 border-rose-300',
        ].join(' ')}
      >
        {isP ? 'P' : 'A'}
      </span>
      <span className="text-[13px] font-medium text-brown-700">{IMIE_STYLISTKI[stylistka]}</span>
      <button type="button" onClick={onWyloguj} aria-label="Wyloguj" className="flex">
        <Icon name="sign-out" size={16} className="text-brown-400" />
      </button>
    </div>
  )
}
