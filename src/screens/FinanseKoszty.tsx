import { useState } from 'react'
import { Button, Chip, EntryCard } from '../components'
import type { CostCoverage } from '../types'

type FiltrStatusu = 'wszystkie' | 'niepokryte' | 'pokryte'

type FinanseKosztyProps = {
  koszty: CostCoverage[]
  ladowanie: boolean
  blad: string | null
  onWybierzKoszt: (koszt: CostCoverage) => void
  onDodajKoszt: () => void
}

/** „Niepokryte" = niepokryty lub częściowo (tylko koszty z rozliczeniem między stylistkami). */
function pasuje(k: CostCoverage, filtr: FiltrStatusu): boolean {
  if (filtr === 'wszystkie') return true
  if (filtr === 'pokryte') return k.status_pokrycia === 'pokryty'
  return k.status_pokrycia === 'niepokryty' || k.status_pokrycia === 'czesciowo_pokryty'
}

/** Pod-zakładka „Koszty": filtr statusu + przycisk dodawania + lista kosztów. */
export function FinanseKoszty({ koszty, ladowanie, blad, onWybierzKoszt, onDodajKoszt }: FinanseKosztyProps) {
  const [filtr, setFiltr] = useState<FiltrStatusu>('wszystkie')
  const widoczne = koszty.filter((k) => pasuje(k, filtr))

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Chip active={filtr === 'wszystkie'} onClick={() => setFiltr('wszystkie')}>
          Wszystkie
        </Chip>
        <Chip active={filtr === 'niepokryte'} onClick={() => setFiltr('niepokryte')}>
          Niepokryte
        </Chip>
        <Chip active={filtr === 'pokryte'} onClick={() => setFiltr('pokryte')}>
          Pokryte
        </Chip>
      </div>

      <div className="mt-5">
        <Button variant="outline" fullWidth icon="plus" onClick={onDodajKoszt}>
          Dodaj koszt
        </Button>
      </div>

      {blad && <p className="mt-4 text-[13px] text-error-500">Nie udało się wczytać: {blad}</p>}

      {ladowanie && koszty.length === 0 ? (
        <p className="mt-8 py-6 text-center font-light text-brown-400">Wczytuję…</p>
      ) : koszty.length === 0 ? (
        <p className="mt-8 py-6 text-center font-light text-brown-400">
          Brak kosztów — dodaj pierwszy powyżej.
        </p>
      ) : widoczne.length === 0 ? (
        <p className="mt-8 py-6 text-center font-light text-brown-400">Brak kosztów w tym filtrze.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {widoczne.map((k) => (
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
    </div>
  )
}
