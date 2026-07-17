import { Awatar } from './Awatar'
import { Icon } from './Icon'
import { formatZlote } from '../lib/format'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import type { DaySettlement, Stylistka } from '../types'

type KartaRozliczeniaProps = {
  settlement: DaySettlement
  /** Trwa akcja na tym rozliczeniu — blokuje checkbox i „…". */
  zajete: boolean
  online: boolean
  onPrzelaczPrzekazano: () => void
  /** „…" w nagłówku — otwiera arkusz potwierdzenia cofnięcia rozliczenia. */
  onCofnij: () => void
}

/**
 * Karta rozliczonego dnia (w Historii, na górze grupy dnia — datę niesie
 * nagłówek grupy): karty z terminala per stylistka, gotówka należna Agacie
 * z odhaczaniem „przekazana", cofnięcie rozliczenia schowane za „…".
 */
export function KartaRozliczenia({
  settlement,
  zajete,
  online,
  onPrzelaczPrzekazano,
  onCofnij,
}: KartaRozliczeniaProps) {
  const s = settlement
  const maGotowke = s.gotowka_dla_agaty_grosze > 0

  return (
    <section className="rounded-md border border-rose-200 bg-cream-25 p-5 shadow-satin-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold-600">
          Rozliczono
        </p>
        <div className="flex items-center gap-1">
          <span className="text-[11px] uppercase tracking-[0.1em] text-brown-400">
            rozliczyła {IMIE_STYLISTKI[s.zatwierdzila]}
          </span>
          <button
            type="button"
            aria-label="Więcej opcji rozliczenia"
            onClick={onCofnij}
            disabled={zajete}
            className="-m-1 flex p-1 text-brown-400 disabled:opacity-[0.55]"
          >
            <Icon name="dots-three" size={22} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <WierszKarty stylistka="patrycja" grosze={s.suma_kart_patrycja_grosze} />
        <WierszKarty stylistka="agata" grosze={s.suma_kart_agata_grosze} />
      </div>

      <div className="mt-4 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />

      {maGotowke ? (
        <>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-[13px] text-brown-600">Do oddania Agacie</span>
            <span className="font-serif text-[19px] font-medium text-brown-800 tabular-nums">
              {formatZlote(s.gotowka_dla_agaty_grosze)} zł
            </span>
          </div>

          <button
            type="button"
            role="checkbox"
            aria-checked={s.gotowka_oddana}
            onClick={onPrzelaczPrzekazano}
            disabled={zajete || !online}
            className="mt-3 flex w-full items-center gap-[11px] rounded-sm border border-rose-200 bg-cream-50 px-[13px] py-[11px] text-left transition-colors duration-[140ms] disabled:opacity-[0.55]"
          >
            <span
              className={[
                'flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border',
                s.gotowka_oddana
                  ? 'border-gold-300 bg-[image:var(--gradient-satin-gold)]'
                  : 'border-rose-300 bg-cream-25',
              ].join(' ')}
            >
              {s.gotowka_oddana && <Icon name="check" size={15} className="text-brown-800" />}
            </span>
            <span className="flex-1 text-[14px] text-brown-700">
              {s.gotowka_oddana ? 'Gotówka przekazana' : 'Oznacz jako przekazaną'}
            </span>
            {s.gotowka_oddana && s.gotowka_oddana_przez && (
              <span className="text-[11px] uppercase tracking-[0.08em] text-brown-400">
                {IMIE_STYLISTKI[s.gotowka_oddana_przez]}
              </span>
            )}
          </button>
        </>
      ) : (
        <p className="mt-4 text-[13px] text-brown-500">Bez gotówki do przekazania Agacie.</p>
      )}
    </section>
  )
}

function WierszKarty({ stylistka, grosze }: { stylistka: Stylistka; grosze: number }) {
  return (
    <div className="flex items-center gap-[10px]">
      <Awatar stylistka={stylistka} size={24} />
      <span className="flex-1 text-[14px] text-brown-700">{IMIE_STYLISTKI[stylistka]}</span>
      <span className="text-[11px] uppercase tracking-[0.08em] text-brown-400">karta</span>
      <span className="text-[15px] font-medium text-brown-800 tabular-nums">{formatZlote(grosze)} zł</span>
    </div>
  )
}
