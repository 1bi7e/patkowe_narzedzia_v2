import { useMemo, useState } from 'react'
import { Chip, Input, KontoPill, Segment } from '../components'
import { useStylistka } from '../context/StylistkaContext'
import { dataWarszawa } from '../lib/dzien'
import { czyWZakresie, miesiacOkres, nazwaOkresu, wlasnyOkres, type Okres } from '../lib/okres'
import type { StanKosztow } from '../lib/useKoszty'
import { usePlatnosciOkresu } from '../lib/usePlatnosciOkresu'
import { FinanseHistoria } from './FinanseHistoria'
import { FinanseKoszty } from './FinanseKoszty'
import { FinansePodsumowanie } from './FinansePodsumowanie'
import type { CostCoverage, Payment, Stylistka } from '../types'

type PodTab = 'podsumowanie' | 'koszty' | 'historia'

type FinanseScreenProps = {
  koszty: StanKosztow
  onWybierzKoszt: (koszt: CostCoverage) => void
  onDodajKoszt: () => void
  /** Otwiera arkusz edycji płatności (tylko wpisy niezablokowane). */
  onEdytujPlatnosc: (platnosc: Payment) => void
}

/**
 * Zakładka „Finanse" — kontener trzech pod-zakładek (Podsumowanie / Koszty /
 * Historia) z współdzielonym okresem. Płatności okresu ładuje `usePlatnosciOkresu`,
 * koszty przychodzą z powłoki (useKoszty) i są zawężane do okresu client-side.
 */
export function FinanseScreen({ koszty, onWybierzKoszt, onDodajKoszt, onEdytujPlatnosc }: FinanseScreenProps) {
  const { stylistka, wyloguj } = useStylistka()
  const kto = stylistka as Stylistka
  const dzis = dataWarszawa()
  const [podTab, setPodTab] = useState<PodTab>('podsumowanie')
  const [okres, setOkres] = useState<Okres>(() => miesiacOkres(dzis, 0))

  const zOkresem = podTab !== 'koszty' // Koszty pokazują wszystkie, bez filtra okresu

  // Płatności ładujemy tylko na zakładkach z okresem (Podsumowanie/Historia).
  const platnosciStan = usePlatnosciOkresu(okres, zOkresem)
  const kosztyOkresu = useMemo(
    () => koszty.koszty.filter((k) => czyWZakresie(k.data, okres)),
    [koszty.koszty, okres],
  )

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-gold-600">
            {zOkresem ? nazwaOkresu(okres) : 'Koszty i pokrycia'}
          </p>
          <h1 className="mt-1 font-serif text-h2 font-medium text-brown-800">
            Finanse<span className="italic text-rose-500">.</span>
          </h1>
        </div>
        <KontoPill stylistka={kto} onWyloguj={wyloguj} />
      </header>

      <div className="mt-6">
        <Segment<PodTab>
          wariant="zloto"
          wartosc={podTab}
          onChange={setPodTab}
          opcje={[
            { value: 'podsumowanie', label: 'Podsumowanie' },
            { value: 'koszty', label: 'Koszty' },
            { value: 'historia', label: 'Historia' },
          ]}
        />
      </div>

      {zOkresem && (
        <div className="mt-4">
          <SelektorOkresu okres={okres} onZmiana={setOkres} dzis={dzis} />
        </div>
      )}

      <div className="mt-6">
        {podTab === 'podsumowanie' ? (
          <FinansePodsumowanie
            platnosci={platnosciStan.platnosci}
            koszty={kosztyOkresu}
            stylistka={kto}
            ladowanie={platnosciStan.ladowanie || koszty.ladowanie}
            blad={platnosciStan.blad ?? koszty.blad}
          />
        ) : podTab === 'koszty' ? (
          <FinanseKoszty
            koszty={koszty.koszty}
            ladowanie={koszty.ladowanie}
            blad={koszty.blad}
            onWybierzKoszt={onWybierzKoszt}
            onDodajKoszt={onDodajKoszt}
          />
        ) : (
          <FinanseHistoria
            platnosci={platnosciStan.platnosci}
            koszty={kosztyOkresu}
            ladowanie={platnosciStan.ladowanie || koszty.ladowanie}
            blad={platnosciStan.blad ?? koszty.blad}
            onEdytujPlatnosc={onEdytujPlatnosc}
          />
        )}
      </div>
    </>
  )
}

function SelektorOkresu({
  okres,
  onZmiana,
  dzis,
}: {
  okres: Okres
  onZmiana: (o: Okres) => void
  dzis: string
}) {
  const [wlasnyOtwarty, setWlasnyOtwarty] = useState(okres.typ === 'wlasny')
  const [od, setOd] = useState(okres.od)
  const [do_, setDo] = useState(okres.do)

  function wybierzMiesiac(przes: 0 | -1) {
    setWlasnyOtwarty(false)
    onZmiana(miesiacOkres(dzis, przes))
  }

  // Otwiera pola z zakresem bieżącego okresu i od razu je stosuje — chip „Własny…"
  // i nagłówek są spójne, a pola prefillują aktualny zakres.
  function otworzWlasny() {
    setOd(okres.od)
    setDo(okres.do)
    setWlasnyOtwarty(true)
    onZmiana(wlasnyOkres(okres.od, okres.do))
  }

  function zastosuj(nowyOd: string, nowyDo: string) {
    if (nowyOd && nowyDo && nowyOd <= nowyDo) onZmiana(wlasnyOkres(nowyOd, nowyDo))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Chip active={okres.typ === 'ten_miesiac'} onClick={() => wybierzMiesiac(0)}>
          Ten miesiąc
        </Chip>
        <Chip active={okres.typ === 'poprzedni'} onClick={() => wybierzMiesiac(-1)}>
          Poprzedni
        </Chip>
        <Chip active={okres.typ === 'wlasny'} onClick={otworzWlasny}>
          Własny…
        </Chip>
      </div>

      {wlasnyOtwarty && (
        <div className="mt-3 flex items-end gap-3">
          <div className="flex-1">
            <Input
              type="date"
              label="Od"
              value={od}
              onChange={(e) => {
                setOd(e.target.value)
                zastosuj(e.target.value, do_)
              }}
            />
          </div>
          <div className="flex-1">
            <Input
              type="date"
              label="Do"
              value={do_}
              onChange={(e) => {
                setDo(e.target.value)
                zastosuj(od, e.target.value)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
