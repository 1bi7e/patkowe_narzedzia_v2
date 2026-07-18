import { useMemo, useState } from 'react'
import { KontoPill, Segment } from '../components'
import type { ToastTone } from '../components'
import { useStylistka } from '../context/StylistkaContext'
import { dataWarszawa } from '../lib/dzien'
import { czyWZakresie, miesiacOkres } from '../lib/okres'
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
 * Historia). Okres jest na stałe bieżącym miesiącem (wybór okresu usunięty —
 * na razie, do ewentualnego przywrócenia). Płatności okresu ładuje
 * `usePlatnosciOkresu`, koszty przychodzą z powłoki (useKoszty) i są zawężane
 * do okresu client-side.
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
  const okres = useMemo(() => miesiacOkres(dzis, 0), [dzis])

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
      <header className="flex items-center justify-between gap-3">
        <p className="text-[19px] font-medium uppercase tracking-[0.16em] text-gold-600">
          Finanse
        </p>
        <KontoPill stylistka={kto} onWyloguj={wyloguj} />
      </header>
      <div className="mt-4 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />

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

    </>
  )
}
