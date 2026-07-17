import { useMemo, useState } from 'react'
import { AmountDisplay, Awatar, Badge, Button, Chip, EntryCard, Icon, KartaRozliczenia, Sheet } from '../components'
import type { ToastTone } from '../components'
import { dataWarszawa, formatDzienNaglowek } from '../lib/dzien'
import { KOMUNIKAT_OFFLINE, useAkcjeRozliczenia } from '../lib/useAkcjeRozliczenia'
import type { CostCoverage, DaySettlement, Payment, Stylistka } from '../types'

type FiltrTypu = 'wszystko' | 'platnosci' | 'koszty'

type FinanseHistoriaProps = {
  /** Płatności okresu (z usePlatnosciOkresu). */
  platnosci: Payment[]
  /** Koszty JUŻ zawężone do okresu. */
  koszty: CostCoverage[]
  /** Rozliczenia dni z okresu — karta rozliczenia na górze grupy dnia. */
  rozliczenia: DaySettlement[]
  ladowanie: boolean
  blad: string | null
  stylistka: Stylistka
  /** Edycja niezablokowanej płatności (kłódka = wpis po rozliczeniu, bez edycji). */
  onEdytujPlatnosc: (platnosc: Payment) => void
  onToast: (tone: ToastTone, tekst: string) => void
  /** Odświeża stan rozliczeń po korekcie (odhaczenie gotówki / cofnięcie dnia). */
  odswiezRozliczenia: () => Promise<void>
}

type Wpis =
  | { rodzaj: 'platnosc'; sort: string; p: Payment }
  | { rodzaj: 'koszt'; sort: string; k: CostCoverage }

type Grupa = { dzien: string; wpisy: Wpis[] }

/**
 * Pod-zakładka „Historia": zunifikowany feed płatności + kosztów z filtrem typu.
 * Rozliczony dzień dostaje na górze grupy kartę rozliczenia (karty z terminala,
 * gotówka dla Agaty z odhaczaniem, cofnięcie za „…" + arkusz potwierdzenia).
 */
export function FinanseHistoria({
  platnosci,
  koszty,
  rozliczenia,
  ladowanie,
  blad,
  stylistka,
  onEdytujPlatnosc,
  onToast,
  odswiezRozliczenia,
}: FinanseHistoriaProps) {
  const [typ, setTyp] = useState<FiltrTypu>('wszystko')
  const akcje = useAkcjeRozliczenia({ odswiez: odswiezRozliczenia, onToast, stylistka })
  // Rozliczenie oczekujące na potwierdzenie cofnięcia (arkusz).
  const [doCofniecia, setDoCofniecia] = useState<DaySettlement | null>(null)

  const rozliczeniaDnia = useMemo(
    () => new Map(rozliczenia.map((s) => [s.data, s])),
    [rozliczenia],
  )

  const grupy = useMemo<Grupa[]>(() => {
    const mapa = new Map<string, Wpis[]>()
    const dodaj = (dzien: string, w: Wpis) => {
      const lista = mapa.get(dzien)
      if (lista) lista.push(w)
      else mapa.set(dzien, [w])
    }

    if (typ !== 'koszty') {
      for (const p of platnosci) {
        dodaj(dataWarszawa(p.data), { rodzaj: 'platnosc', sort: p.data, p })
      }
    }
    if (typ !== 'platnosci') {
      for (const k of koszty) {
        dodaj(k.data, { rodzaj: 'koszt', sort: k.created_at, k })
      }
    }

    return [...mapa.entries()]
      .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0)) // dni malejąco
      .map(([dzien, wpisy]) => {
        // W obrębie dnia: najpierw płatności, potem koszty. Nie porównujemy
        // heterogenicznych znaczników (płatność = data zdarzenia, koszt =
        // czas wpisu) — każdy rodzaj sortujemy jego własnym `sort` malejąco.
        wpisy.sort((x, y) => {
          if (x.rodzaj !== y.rodzaj) return x.rodzaj === 'platnosc' ? -1 : 1
          return x.sort < y.sort ? 1 : x.sort > y.sort ? -1 : 0
        })
        return { dzien, wpisy }
      })
  }, [platnosci, koszty, typ])

  async function potwierdzCofniecie(s: DaySettlement) {
    await akcje.cofnij(s)
    setDoCofniecia(null)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Chip active={typ === 'wszystko'} onClick={() => setTyp('wszystko')}>
          Wszystko
        </Chip>
        <Chip active={typ === 'platnosci'} onClick={() => setTyp('platnosci')}>
          Płatności
        </Chip>
        <Chip active={typ === 'koszty'} onClick={() => setTyp('koszty')}>
          Koszty
        </Chip>
      </div>

      {blad && <p className="mt-4 text-[13px] text-error-500">Nie udało się wczytać: {blad}</p>}

      {ladowanie && grupy.length === 0 ? (
        <p className="mt-8 py-6 text-center font-light text-brown-400">Wczytuję…</p>
      ) : grupy.length === 0 ? (
        <p className="mt-8 py-6 text-center font-light text-brown-400">Brak wpisów w tym okresie.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-7">
          {grupy.map((g) => {
            const rozliczenie = rozliczeniaDnia.get(g.dzien)
            return (
              <section key={g.dzien}>
                <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold-600">
                  {formatDzienNaglowek(g.dzien)}
                </p>
                <div className="mt-2 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />

                <div className="mt-3 flex flex-col gap-3">
                  {rozliczenie && (
                    <KartaRozliczenia
                      settlement={rozliczenie}
                      zajete={akcje.zajete.has(rozliczenie.id)}
                      online={akcje.online}
                      onPrzelaczPrzekazano={() => void akcje.przelaczPrzekazano(rozliczenie)}
                      onCofnij={() => setDoCofniecia(rozliczenie)}
                    />
                  )}
                  {g.wpisy.map((w) =>
                    w.rodzaj === 'platnosc' ? (
                      <EntryCard
                        key={`p-${w.p.id}`}
                        variant="payment"
                        stylistka={w.p.stylistka}
                        klient={w.p.klientka}
                        metoda={w.p.metoda}
                        grosze={w.p.kwota_grosze}
                        locked={w.p.locked}
                        onEdit={() => onEdytujPlatnosc(w.p)}
                      />
                    ) : (
                      <WierszKoszt key={`k-${w.k.id}`} koszt={w.k} />
                    ),
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <Sheet
        open={doCofniecia !== null}
        onClose={() => setDoCofniecia(null)}
        title="Cofnąć rozliczenie?"
      >
        {doCofniecia && (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] text-brown-700">
              Dzień <span className="font-medium">{formatDzienNaglowek(doCofniecia.data)}</span> wróci
              do rozliczenia — wpisy znów będzie można edytować, a przypisania kart z tego dnia znikną.
            </p>

            {doCofniecia.gotowka_oddana && (
              <div className="flex items-start gap-[10px] rounded-md border border-gold-300 bg-gold-100 px-[14px] py-[12px]">
                <Icon name="warning-circle" size={18} className="mt-[2px] text-gold-700" />
                <p className="text-[13px] text-brown-700">
                  Gotówka była oznaczona jako przekazana Agacie — cofnięcie usunie ten zapis.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                onClick={() => setDoCofniecia(null)}
                disabled={akcje.zajete.has(doCofniecia.id)}
              >
                Anuluj
              </Button>
              <Button
                variant="dark"
                size="lg"
                fullWidth
                onClick={() => void potwierdzCofniecie(doCofniecia)}
                disabled={akcje.zajete.has(doCofniecia.id) || !akcje.online}
              >
                {akcje.zajete.has(doCofniecia.id) ? 'Cofam…' : 'Tak, cofnij'}
              </Button>
            </div>
            {!akcje.online && <p className="text-[13px] text-brown-500">{KOMUNIKAT_OFFLINE}</p>}
          </div>
        )}
      </Sheet>
    </div>
  )
}

function WierszKoszt({ koszt }: { koszt: CostCoverage }) {
  return (
    <div className="flex items-center gap-[11px] rounded-md border border-rose-200 bg-cream-25 px-[14px] py-[12px] shadow-satin-sm">
      <Awatar stylistka={koszt.stylistka_dodajaca} />
      <span className="flex-1 text-[15px]">{koszt.nazwa}</span>
      <Badge tone="cream">koszt</Badge>
      <AmountDisplay grosze={koszt.kwota_grosze} size="sm" deduction />
    </div>
  )
}
