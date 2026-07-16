import { EntryCard, KontoPill } from '../components'
import { useStylistka } from '../context/StylistkaContext'
import type { StanKosztow } from '../lib/useKoszty'
import type { CostCoverage, Stylistka } from '../types'

type FinanseScreenProps = {
  stan: StanKosztow
  /** Otwiera szczegół wybranego kosztu. */
  onWybierzKoszt: (koszt: CostCoverage) => void
}

/**
 * Zakładka „Finanse": lista kosztów salonu z wyliczonym pokryciem (najnowsze
 * pierwsze). Klik w kartę otwiera szczegół (status, historia zwrotów, zwrot
 * gotówką). Nowy koszt dodaje się z FAB („+" → Koszt).
 */
export function FinanseScreen({ stan, onWybierzKoszt }: FinanseScreenProps) {
  const { stylistka, wyloguj } = useStylistka()
  const kto = stylistka as Stylistka
  const { koszty, ladowanie, blad } = stan

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-gold-600">
            Koszty i pokrycia
          </p>
          <h1 className="mt-1 font-serif text-h2 font-medium text-brown-800">
            Finanse<span className="italic text-rose-500">.</span>
          </h1>
        </div>
        <KontoPill stylistka={kto} onWyloguj={wyloguj} />
      </header>

      {blad && <p className="mt-4 text-[13px] text-error-500">Nie udało się wczytać: {blad}</p>}

      {ladowanie && koszty.length === 0 ? (
        <p className="mt-10 py-8 text-center font-light text-brown-400">Wczytuję…</p>
      ) : koszty.length === 0 ? (
        <p className="mt-10 py-8 text-center font-light text-brown-400">
          Brak kosztów — dodaj pierwszy przyciskiem +.
        </p>
      ) : (
        <div className="mt-7 flex flex-col gap-3">
          {koszty.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => onWybierzKoszt(k)}
              className="block w-full text-left transition-transform duration-[140ms] ease-satin active:scale-[0.99]"
            >
              <EntryCard
                variant="cost"
                nazwa={k.nazwa}
                grosze={k.kwota_grosze}
                tryb={k.tryb}
                status={k.status_pokrycia}
                pokryteGrosze={k.pokryte_grosze ?? undefined}
                caloscGrosze={k.kwota_agata_grosze}
              />
            </button>
          ))}
        </div>
      )}
    </>
  )
}
