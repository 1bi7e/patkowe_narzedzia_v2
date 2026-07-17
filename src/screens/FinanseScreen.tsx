import { useMemo, useState } from 'react'
import { Chip, Icon, Input, KontoPill, Segment, Sheet } from '../components'
import type { ToastTone } from '../components'
import { useStylistka } from '../context/StylistkaContext'
import { dataWarszawa } from '../lib/dzien'
import { czyWZakresie, miesiacOkres, nazwaOkresu, wlasnyOkres, type Okres } from '../lib/okres'
import type { StanKosztow } from '../lib/useKoszty'
import { usePlatnosciOkresu } from '../lib/usePlatnosciOkresu'
import type { StanRozliczone } from '../lib/useRozliczone'
import { FinanseHistoria } from './FinanseHistoria'
import { FinanseKoszty } from './FinanseKoszty'
import { FinansePodsumowanie } from './FinansePodsumowanie'
import type { CostCoverage, Payment, Stylistka } from '../types'

type PodTab = 'podsumowanie' | 'koszty' | 'historia'

type FinanseScreenProps = {
  koszty: StanKosztow
  /** Rozliczone dni (z AppShell) — Historia pokazuje ich karty w grupach dni. */
  rozliczone: StanRozliczone
  onWybierzKoszt: (koszt: CostCoverage) => void
  onDodajKoszt: () => void
  /** Otwiera arkusz edycji płatności (tylko wpisy niezablokowane). */
  onEdytujPlatnosc: (platnosc: Payment) => void
  onToast: (tone: ToastTone, tekst: string) => void
}

/**
 * Zakładka „Finanse" — kontener trzech pod-zakładek (Podsumowanie / Koszty /
 * Historia) z współdzielonym okresem wybieranym z nagłówka (overline = przycisk
 * otwierający arkusz okresu). Płatności okresu ładuje `usePlatnosciOkresu`,
 * koszty przychodzą z powłoki (useKoszty) i są zawężane do okresu client-side.
 */
export function FinanseScreen({
  koszty,
  rozliczone,
  onWybierzKoszt,
  onDodajKoszt,
  onEdytujPlatnosc,
  onToast,
}: FinanseScreenProps) {
  const { stylistka, wyloguj } = useStylistka()
  const kto = stylistka as Stylistka
  const dzis = dataWarszawa()
  const [podTab, setPodTab] = useState<PodTab>('podsumowanie')
  const [okres, setOkres] = useState<Okres>(() => miesiacOkres(dzis, 0))
  const [okresOtwarty, setOkresOtwarty] = useState(false)

  // Okres dotyczy tylko Podsumowania i Historii — Koszty pokazują wszystko.
  const zOkresem = podTab === 'podsumowanie' || podTab === 'historia'

  // Płatności ładujemy tylko na zakładkach z okresem (Podsumowanie/Historia).
  const platnosciStan = usePlatnosciOkresu(okres, zOkresem)
  const kosztyOkresu = useMemo(
    () => koszty.koszty.filter((k) => czyWZakresie(k.data, okres)),
    [koszty.koszty, okres],
  )
  const rozliczeniaOkresu = useMemo(
    () => rozliczone.rozliczenia.filter((s) => czyWZakresie(s.data, okres)),
    [rozliczone.rozliczenia, okres],
  )

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          {zOkresem ? (
            <button
              type="button"
              onClick={() => setOkresOtwarty(true)}
              className="flex items-center gap-[5px] text-[12px] font-medium uppercase tracking-[0.18em] text-gold-600"
            >
              {nazwaOkresu(okres)}
              <Icon name="caret-down" size={13} />
            </button>
          ) : (
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-gold-600">
              Koszty i pokrycia
            </p>
          )}
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
            rozliczenia={rozliczeniaOkresu}
            ladowanie={platnosciStan.ladowanie || koszty.ladowanie || rozliczone.ladowanie}
            blad={platnosciStan.blad ?? koszty.blad ?? rozliczone.blad}
            stylistka={kto}
            onEdytujPlatnosc={onEdytujPlatnosc}
            onToast={onToast}
            odswiezRozliczenia={rozliczone.odswiez}
          />
        )}
      </div>

      {okresOtwarty && (
        <SheetOkresu
          okres={okres}
          onZmiana={setOkres}
          onClose={() => setOkresOtwarty(false)}
          dzis={dzis}
        />
      )}
    </>
  )
}

/**
 * Arkusz wyboru okresu (otwierany z overline'u nagłówka). Miesiące stosują się
 * i zamykają arkusz od razu; „Własny…" odsłania pola Od/Do stosowane na żywo.
 */
function SheetOkresu({
  okres,
  onZmiana,
  onClose,
  dzis,
}: {
  okres: Okres
  onZmiana: (o: Okres) => void
  onClose: () => void
  dzis: string
}) {
  const [wlasnyOtwarty, setWlasnyOtwarty] = useState(okres.typ === 'wlasny')
  const [od, setOd] = useState(okres.od)
  const [do_, setDo] = useState(okres.do)

  function wybierzMiesiac(przes: 0 | -1) {
    onZmiana(miesiacOkres(dzis, przes))
    onClose()
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
    <Sheet open onClose={onClose} title="Okres">
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
        <div className="mt-4 flex items-end gap-3">
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
    </Sheet>
  )
}
