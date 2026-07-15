import { describe, expect, it } from 'vitest'
import { podsumujDzien, sumujGotowke, sumujKarty } from './sumy'
import type { MetodaPlatnosci, Payment, Stylistka } from '../types'

function platnosc(stylistka: Stylistka, metoda: MetodaPlatnosci, kwota_grosze: number): Payment {
  return {
    id: `${stylistka}-${metoda}-${kwota_grosze}`,
    klientka: 'Klientka',
    kwota_grosze,
    metoda,
    stylistka,
    data: '2026-07-15T10:00:00.000Z',
    locked: false,
    created_at: '2026-07-15T10:00:00.000Z',
  }
}

describe('sumujKarty / sumujGotowke', () => {
  it('pusta lista daje zero', () => {
    expect(sumujKarty([], 'patrycja')).toBe(0)
    expect(sumujGotowke([], 'agata')).toBe(0)
  })

  it('sumuje tylko karty wskazanej stylistki', () => {
    const platnosci = [
      platnosc('patrycja', 'card', 10000),
      platnosc('patrycja', 'card', 5000),
      platnosc('patrycja', 'cash', 3000), // gotówka nie liczy się do kart
      platnosc('agata', 'card', 20000), // inna stylistka nie liczy się
    ]
    expect(sumujKarty(platnosci, 'patrycja')).toBe(15000)
    expect(sumujKarty(platnosci, 'agata')).toBe(20000)
  })

  it('sumuje tylko gotówkę wskazanej stylistki', () => {
    const platnosci = [
      platnosc('agata', 'cash', 8000),
      platnosc('agata', 'cash', 1500),
      platnosc('agata', 'card', 40000), // karta nie liczy się do gotówki
      platnosc('patrycja', 'cash', 9999),
    ]
    expect(sumujGotowke(platnosci, 'agata')).toBe(9500)
    expect(sumujGotowke(platnosci, 'patrycja')).toBe(9999)
  })

  it('sumy pozostają całkowitymi groszami (bez floata)', () => {
    const platnosci = [
      platnosc('patrycja', 'card', 12345),
      platnosc('patrycja', 'card', 6789),
      platnosc('patrycja', 'cash', 1),
    ]
    const karta = sumujKarty(platnosci, 'patrycja')
    expect(karta).toBe(19134)
    expect(Number.isInteger(karta)).toBe(true)
  })
})

describe('podsumujDzien', () => {
  it('rozbija sumy per stylistka i metoda', () => {
    const platnosci = [
      platnosc('patrycja', 'card', 10000),
      platnosc('patrycja', 'cash', 2000),
      platnosc('agata', 'card', 5000),
      platnosc('agata', 'card', 500),
      platnosc('agata', 'cash', 3000),
    ]
    expect(podsumujDzien(platnosci)).toEqual({
      patrycja: { karta: 10000, gotowka: 2000 },
      agata: { karta: 5500, gotowka: 3000 },
    })
  })

  it('pusta lista daje same zera', () => {
    expect(podsumujDzien([])).toEqual({
      patrycja: { karta: 0, gotowka: 0 },
      agata: { karta: 0, gotowka: 0 },
    })
  })
})
