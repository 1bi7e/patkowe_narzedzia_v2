import { useMemo, useState } from 'react'
import { AmountDisplay, Awatar, Badge, Chip, EntryCard, Icon } from '../components'
import { dataWarszawa, formatDzienNaglowek } from '../lib/dzien'
import type { CostCoverage, Payment, Stylistka } from '../types'

type FiltrTypu = 'wszystko' | 'platnosci' | 'koszty'
type FiltrStylistki = 'obie' | Stylistka

type FinanseHistoriaProps = {
  /** Płatności okresu (z usePlatnosciOkresu). */
  platnosci: Payment[]
  /** Koszty JUŻ zawężone do okresu. */
  koszty: CostCoverage[]
  ladowanie: boolean
  blad: string | null
}

type Wpis =
  | { rodzaj: 'platnosc'; sort: string; p: Payment }
  | { rodzaj: 'koszt'; sort: string; k: CostCoverage }

type Grupa = { dzien: string; wpisy: Wpis[]; etykieta: 'edytowalne' | 'rozliczono' | null }

/** Pod-zakładka „Historia": zunifikowany feed płatności + kosztów z filtrami. */
export function FinanseHistoria({ platnosci, koszty, ladowanie, blad }: FinanseHistoriaProps) {
  const [typ, setTyp] = useState<FiltrTypu>('wszystko')
  const [ktora, setKtora] = useState<FiltrStylistki>('obie')

  const grupy = useMemo<Grupa[]>(() => {
    const mapa = new Map<string, Wpis[]>()
    const dodaj = (dzien: string, w: Wpis) => {
      const lista = mapa.get(dzien)
      if (lista) lista.push(w)
      else mapa.set(dzien, [w])
    }

    if (typ !== 'koszty') {
      for (const p of platnosci) {
        if (ktora !== 'obie' && p.stylistka !== ktora) continue
        dodaj(dataWarszawa(p.data), { rodzaj: 'platnosc', sort: p.data, p })
      }
    }
    if (typ !== 'platnosci') {
      for (const k of koszty) {
        if (ktora !== 'obie' && k.stylistka_dodajaca !== ktora) continue
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
        const platnosciDnia = wpisy.filter((w) => w.rodzaj === 'platnosc')
        const etykieta: Grupa['etykieta'] =
          platnosciDnia.length === 0
            ? null
            : platnosciDnia.every((w) => w.rodzaj === 'platnosc' && w.p.locked)
              ? 'rozliczono'
              : 'edytowalne'
        return { dzien, wpisy, etykieta }
      })
  }, [platnosci, koszty, typ, ktora])

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
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip active={ktora === 'obie'} onClick={() => setKtora('obie')}>
          Obie
        </Chip>
        <Chip active={ktora === 'patrycja'} onClick={() => setKtora('patrycja')}>
          Patrycja
        </Chip>
        <Chip active={ktora === 'agata'} onClick={() => setKtora('agata')}>
          Agata
        </Chip>
      </div>

      {blad && <p className="mt-4 text-[13px] text-error-500">Nie udało się wczytać: {blad}</p>}

      {ladowanie && grupy.length === 0 ? (
        <p className="mt-8 py-6 text-center font-light text-brown-400">Wczytuję…</p>
      ) : grupy.length === 0 ? (
        <p className="mt-8 py-6 text-center font-light text-brown-400">Brak wpisów w tym okresie.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-7">
          {grupy.map((g) => (
            <section key={g.dzien}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold-600">
                  {formatDzienNaglowek(g.dzien)}
                </p>
                {g.etykieta && <EtykietaGrupy etykieta={g.etykieta} />}
              </div>
              <div className="mt-2 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />

              <div className="mt-3 flex flex-col gap-3">
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
                    />
                  ) : (
                    <WierszKoszt key={`k-${w.k.id}`} koszt={w.k} />
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function EtykietaGrupy({ etykieta }: { etykieta: 'edytowalne' | 'rozliczono' }) {
  const rozliczono = etykieta === 'rozliczono'
  return (
    <span className="flex items-center gap-[5px] text-[11px] uppercase tracking-[0.1em] text-brown-400">
      <Icon name={rozliczono ? 'lock-simple' : 'pencil-simple'} size={13} />
      {rozliczono ? 'rozliczono' : 'edytowalne'}
    </span>
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
