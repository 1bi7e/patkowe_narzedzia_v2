import { describe, expect, it } from 'vitest'
import { zarobekNetto } from './zarobek'
import type { Cost, MetodaPlatnosci, Payment, Stylistka, TrybPodzialu } from '../types'

function platnosc(stylistka: Stylistka, metoda: MetodaPlatnosci, kwota_grosze: number): Payment {
  return {
    id: `${stylistka}-${metoda}-${kwota_grosze}`,
    klientka: 'Klientka',
    kwota_grosze,
    metoda,
    stylistka,
    data: '2026-07-10T10:00:00Z',
    locked: false,
    created_at: '2026-07-10T10:00:00Z',
  }
}

function koszt(
  tryb: TrybPodzialu,
  kwota_patrycja_grosze: number,
  kwota_agata_grosze: number,
): Pick<Cost, 'tryb' | 'kwota_patrycja_grosze' | 'kwota_agata_grosze'> {
  return { tryb, kwota_patrycja_grosze, kwota_agata_grosze }
}

describe('zarobekNetto', () => {
  it('puste listy → same zera', () => {
    expect(zarobekNetto([], [], 'patrycja')).toEqual({
      karty: 0,
      gotowka: 0,
      kosztyWspolne: 0,
      kosztyWlasne: 0,
      netto: 0,
    })
  })

  it('same płatności (bez kosztów) → netto = karty + gotówka', () => {
    const platnosci = [platnosc('agata', 'card', 364000), platnosc('agata', 'cash', 148000)]
    const z = zarobekNetto(platnosci, [], 'agata')
    expect(z.karty).toBe(364000)
    expect(z.gotowka).toBe(148000)
    expect(z.netto).toBe(364000 + 148000)
  })

  it('50/50 odejmuje połowę jako koszt wspólny każdej stylistce', () => {
    const koszty = [koszt('fifty_fifty', 120000, 120000)] // 2400 zł, po połowie
    const p = zarobekNetto([], koszty, 'patrycja')
    const a = zarobekNetto([], koszty, 'agata')
    expect(p.kosztyWspolne).toBe(120000)
    expect(a.kosztyWspolne).toBe(120000)
    expect(p.kosztyWlasne).toBe(0)
    expect(p.netto).toBe(-120000)
  })

  it('„tylko moja" liczy się w całości tej stylistce, drugiej zero', () => {
    // koszt tylko Patrycji: cała kwota po stronie Patrycji
    const koszty = [koszt('only_mine', 40000, 0)]
    const p = zarobekNetto([], koszty, 'patrycja')
    const a = zarobekNetto([], koszty, 'agata')
    expect(p.kosztyWlasne).toBe(40000)
    expect(p.kosztyWspolne).toBe(0)
    expect(a.kosztyWlasne).toBe(0)
    expect(a.netto).toBe(0)
  })

  it('custom odejmuje ręczne udziały', () => {
    const koszty = [koszt('custom', 100000, 50000)] // 1500 zł: 1000 P, 500 A
    expect(zarobekNetto([], koszty, 'patrycja').kosztyWspolne).toBe(100000)
    expect(zarobekNetto([], koszty, 'agata').kosztyWspolne).toBe(50000)
  })

  it('bilans: odliczenia Patrycji + Agaty = suma wszystkich kosztów', () => {
    const koszty = [
      koszt('fifty_fifty', 60050, 60050), // 1201 zł (nieparzyste, różnica 0 tu)
      koszt('only_mine', 40000, 0),
      koszt('custom', 30000, 70000),
    ]
    const suma = koszty.reduce((s, k) => s + k.kwota_patrycja_grosze + k.kwota_agata_grosze, 0)
    const p = zarobekNetto([], koszty, 'patrycja')
    const a = zarobekNetto([], koszty, 'agata')
    const odliczeniaP = p.kosztyWspolne + p.kosztyWlasne
    const odliczeniaA = a.kosztyWspolne + a.kosztyWlasne
    expect(odliczeniaP + odliczeniaA).toBe(suma)
  })

  it('liczy tylko wpisy danej stylistki', () => {
    const platnosci = [platnosc('patrycja', 'card', 50000), platnosc('agata', 'card', 30000)]
    expect(zarobekNetto(platnosci, [], 'patrycja').karty).toBe(50000)
    expect(zarobekNetto(platnosci, [], 'agata').karty).toBe(30000)
  })
})
