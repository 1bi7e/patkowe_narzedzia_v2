import { describe, expect, it } from 'vitest'
import { grupujNierozliczone, maksPrzypisania, sumaDniaZPodsumowania } from './nierozliczone'
import { podsumujDzien } from './sumy'
import type { CostCoverage, MetodaPlatnosci, Payment, Stylistka } from '../types'

function platnosc(
  data: string,
  stylistka: Stylistka,
  metoda: MetodaPlatnosci,
  kwota_grosze: number,
  locked = false,
): Payment {
  return {
    id: `${data}-${stylistka}-${metoda}-${kwota_grosze}`,
    klientka: 'Klientka',
    kwota_grosze,
    metoda,
    stylistka,
    data,
    locked,
    created_at: data,
  }
}

describe('grupujNierozliczone', () => {
  it('pusta lista daje pustą tablicę', () => {
    expect(grupujNierozliczone([])).toEqual([])
  })

  it('pomija wpisy zablokowane (należą do rozliczonych dni)', () => {
    const dni = grupujNierozliczone([
      platnosc('2026-07-15T10:00:00.000Z', 'patrycja', 'card', 10000, true),
      platnosc('2026-07-15T11:00:00.000Z', 'agata', 'card', 5000, false),
    ])
    expect(dni).toHaveLength(1)
    expect(dni[0].platnosci).toHaveLength(1)
    expect(dni[0].sumy.agata.karta).toBe(5000)
    expect(dni[0].sumy.patrycja.karta).toBe(0)
  })

  it('grupuje po dobie warszawskiej, nie UTC', () => {
    // 22:30 UTC 15 lipca = 00:30 (16 lipca) czasu warszawskiego (lato, +2).
    const dni = grupujNierozliczone([
      platnosc('2026-07-15T10:00:00.000Z', 'patrycja', 'card', 10000),
      platnosc('2026-07-15T22:30:00.000Z', 'agata', 'cash', 4000),
    ])
    expect(dni.map((d) => d.data)).toEqual(['2026-07-15', '2026-07-16'])
  })

  it('zwraca dni rosnąco — najstarszy pierwszy', () => {
    const dni = grupujNierozliczone([
      platnosc('2026-07-16T09:00:00.000Z', 'agata', 'card', 3000),
      platnosc('2026-07-14T09:00:00.000Z', 'patrycja', 'card', 2000),
      platnosc('2026-07-15T09:00:00.000Z', 'agata', 'cash', 1000),
    ])
    expect(dni.map((d) => d.data)).toEqual(['2026-07-14', '2026-07-15', '2026-07-16'])
  })

  it('liczy sumy per stylistka i metoda w obrębie dnia', () => {
    const dni = grupujNierozliczone([
      platnosc('2026-07-15T08:00:00.000Z', 'patrycja', 'card', 15000),
      platnosc('2026-07-15T09:00:00.000Z', 'patrycja', 'cash', 2000),
      platnosc('2026-07-15T10:00:00.000Z', 'agata', 'card', 5000),
    ])
    expect(dni).toHaveLength(1)
    expect(dni[0].sumy).toEqual({
      patrycja: { karta: 15000, gotowka: 2000 },
      agata: { karta: 5000, gotowka: 0 },
    })
  })
})

describe('sumaDniaZPodsumowania', () => {
  it('bierze wyłącznie karty (gotówka nie wchodzi do rozliczenia)', () => {
    const platnosci = [
      platnosc('2026-07-15T08:00:00.000Z', 'patrycja', 'card', 34000),
      platnosc('2026-07-15T09:00:00.000Z', 'patrycja', 'cash', 9000),
      platnosc('2026-07-15T10:00:00.000Z', 'agata', 'card', 52000),
    ]
    expect(sumaDniaZPodsumowania('2026-07-15', podsumujDzien(platnosci))).toEqual({
      data: '2026-07-15',
      patrycja_grosze: 34000,
      agata_grosze: 52000,
    })
  })
})

function koszt(id: string, pozostalo_grosze: number | null): CostCoverage {
  return {
    id,
    nazwa: `Koszt ${id}`,
    kwota_grosze: 240000,
    // pozostalo_grosze = null odwzorowuje „tylko moja" (brak rozliczenia między stylistkami).
    tryb: pozostalo_grosze === null ? 'only_mine' : 'fifty_fifty',
    kwota_patrycja_grosze: 120000,
    kwota_agata_grosze: 120000,
    data: '2026-07-15',
    stylistka_dodajaca: 'patrycja',
    created_at: '2026-07-15T08:00:00.000Z',
    pokryte_grosze: pozostalo_grosze === null ? null : 120000 - pozostalo_grosze,
    pozostalo_grosze,
    status_pokrycia: pozostalo_grosze === null ? null : 'niepokryty',
  }
}

describe('maksPrzypisania', () => {
  const czynsz = koszt('czynsz', 120000)
  const farby = koszt('farby', 14000)

  it('ogranicza limitem kosztu, gdy budżet kart jest większy', () => {
    expect(maksPrzypisania(farby, [czynsz, farby], {}, 52000)).toBe(14000)
  })

  it('ogranicza budżetem kart Agaty, gdy koszt jest większy', () => {
    expect(maksPrzypisania(czynsz, [czynsz, farby], {}, 52000)).toBe(52000)
  })

  it('odejmuje kwoty INNYCH wybranych kosztów od budżetu', () => {
    // 520 zł kart − 140 zł już przypisane na farby = 380 zł wolne na czynsz.
    expect(maksPrzypisania(czynsz, [czynsz, farby], { farby: '140' }, 52000)).toBe(38000)
  })

  it('pomija własną kwotę przy liczeniu wolnego budżetu', () => {
    // Ponowne policzenie maksa dla czynszu nie może odjąć tego, co już na nim stoi.
    expect(maksPrzypisania(czynsz, [czynsz, farby], { czynsz: '200' }, 52000)).toBe(52000)
  })

  it('klampuje do zera, gdy inne przypisania przekraczają budżet', () => {
    // Bez zewnętrznego max(0, …) prefill byłby ujemny → „-20" → własny parser go odrzuca.
    expect(maksPrzypisania(czynsz, [czynsz, farby], { farby: '600' }, 52000)).toBe(0)
  })

  it('niepoprawny tekst w innym polu nie zatruwa wyniku (liczy się jak 0)', () => {
    expect(maksPrzypisania(czynsz, [czynsz, farby], { farby: 'abc' }, 52000)).toBe(52000)
  })

  it('ignoruje osierocone kwoty kosztów spoza listy niepokrytych', () => {
    // Koszt pokryty w międzyczasie przez Patrycję wypada z `niepokryte`, ale jego
    // klucz może jeszcze wisieć w stanie pola — nie może zjadać budżetu.
    expect(maksPrzypisania(czynsz, [czynsz], { farby: '140' }, 52000)).toBe(52000)
  })

  it('koszt bez pozostałego salda (null → „tylko moja") daje zero', () => {
    expect(maksPrzypisania(koszt('moja', null), [koszt('moja', null)], {}, 52000)).toBe(0)
  })
})
