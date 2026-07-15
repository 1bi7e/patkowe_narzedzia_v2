import { Button, EntryCard, Icon, KontoPill } from '../components'
import { useStylistka } from '../context/StylistkaContext'
import { formatDzienNaglowek } from '../lib/dzien'
import { formatZlote } from '../lib/format'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import { podsumujDzien } from '../lib/sumy'
import type { PodsumowanieStylistki } from '../lib/sumy'
import type { StanDnia } from '../lib/useDzien'
import type { Stylistka } from '../types'

type DzisScreenProps = {
  stan: StanDnia
  onRozlicz: () => void
}

/** Ekran „Dziś": dzisiejsze płatności, sumy kart/gotówki per stylistka, rozliczenie. */
export function DzisScreen({ stan, onRozlicz }: DzisScreenProps) {
  const { stylistka, wyloguj } = useStylistka()
  const kto = stylistka as Stylistka
  const { data, platnosci, rozliczenie, ladowanie, blad } = stan
  const rozliczony = rozliczenie !== null
  const sumy = podsumujDzien(platnosci)

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-gold-600">
            {formatDzienNaglowek(data)}
          </p>
          <h1 className="mt-1 font-serif text-h2 font-medium text-brown-800">Dziś</h1>
        </div>
        <KontoPill stylistka={kto} onWyloguj={wyloguj} />
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <KafelStylistki stylistka="patrycja" sumy={sumy.patrycja} ty={kto === 'patrycja'} />
        <KafelStylistki stylistka="agata" sumy={sumy.agata} ty={kto === 'agata'} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-brown-400">
          Płatności · {platnosci.length}
        </p>
        {rozliczony && (
          <span className="inline-flex items-center gap-[5px] text-[12px] text-brown-400">
            <Icon name="lock-simple" weight="fill" size={13} /> rozliczony
          </span>
        )}
      </div>
      <div className="mt-3 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />

      {blad && <p className="mt-4 text-[13px] text-error-500">Nie udało się wczytać: {blad}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {ladowanie && platnosci.length === 0 ? (
          <p className="py-8 text-center font-light text-brown-400">Wczytuję…</p>
        ) : platnosci.length === 0 ? (
          <p className="py-8 text-center font-light text-brown-400">
            Brak płatności — dodaj pierwszą przyciskiem&nbsp;+.
          </p>
        ) : (
          platnosci.map((p) => (
            <EntryCard
              key={p.id}
              variant="payment"
              stylistka={p.stylistka}
              klient={p.klientka}
              metoda={p.metoda}
              grosze={p.kwota_grosze}
              locked={p.locked}
            />
          ))
        )}
      </div>

      {!rozliczony && platnosci.length > 0 && (
        <div className="mt-8">
          <Button variant="gold" size="lg" fullWidth iconRight="arrow-right" onClick={onRozlicz}>
            Rozlicz dzień
          </Button>
        </div>
      )}

      {rozliczony && (
        <p className="mt-8 text-center text-[13px] font-light text-brown-400">
          Dzień rozliczony — wpisy zablokowane.
        </p>
      )}
    </>
  )
}

function KafelStylistki({
  stylistka,
  sumy,
  ty,
}: {
  stylistka: Stylistka
  sumy: PodsumowanieStylistki
  ty: boolean
}) {
  return (
    <div
      className={[
        'rounded-md border p-4 shadow-satin-sm',
        ty ? 'bg-rose-100 border-rose-300' : 'bg-cream-25 border-rose-200',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-serif text-[17px] text-brown-800">{IMIE_STYLISTKI[stylistka]}</span>
        {ty && (
          <span className="rounded-pill bg-rose-500 px-[8px] py-[2px] text-[10px] font-medium uppercase tracking-[0.1em] text-cream-25">
            Ty
          </span>
        )}
      </div>
      <dl className="mt-3 flex flex-col gap-[6px]">
        <KwotaWiersz etykieta="Karta" grosze={sumy.karta} />
        <KwotaWiersz etykieta="Gotówka" grosze={sumy.gotowka} />
      </dl>
    </div>
  )
}

function KwotaWiersz({ etykieta, grosze }: { etykieta: string; grosze: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[12px] uppercase tracking-[0.08em] text-brown-500">{etykieta}</dt>
      <dd className="text-[15px] font-medium text-brown-800 tabular-nums">{formatZlote(grosze)} zł</dd>
    </div>
  )
}
