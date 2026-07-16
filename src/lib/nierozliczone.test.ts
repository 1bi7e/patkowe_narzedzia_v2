import { describe, expect, it } from 'vitest'
import { grupujNierozliczone, sumaDniaZPodsumowania } from './nierozliczone'
import { podsumujDzien } from './sumy'
import type { MetodaPlatnosci, Payment, Stylistka } from '../types'

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
