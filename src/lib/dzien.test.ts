import { describe, expect, it } from 'vitest'
import { dataWarszawa, formatDzienNaglowek, zakresDniaUTC } from './dzien'

describe('dataWarszawa', () => {
  it('latem (UTC+2) rozdziela dobę o 22:00 UTC', () => {
    // 21:59 UTC = 23:59 czasu warszawskiego → jeszcze ten sam dzień.
    expect(dataWarszawa('2026-07-15T21:59:00.000Z')).toBe('2026-07-15')
    // 22:00 UTC = 00:00 następnego dnia w Warszawie.
    expect(dataWarszawa('2026-07-15T22:00:00.000Z')).toBe('2026-07-16')
  })

  it('zimą (UTC+1) rozdziela dobę o 23:00 UTC', () => {
    expect(dataWarszawa('2026-01-15T22:59:00.000Z')).toBe('2026-01-15')
    expect(dataWarszawa('2026-01-15T23:00:00.000Z')).toBe('2026-01-16')
  })
})

describe('zakresDniaUTC', () => {
  it('latem doba warszawska to [22:00 dnia poprzedniego, 22:00 tego dnia)', () => {
    expect(zakresDniaUTC('2026-07-15')).toEqual({
      od: '2026-07-14T22:00:00.000Z',
      do: '2026-07-15T22:00:00.000Z',
    })
  })

  it('zimą doba warszawska to [23:00 dnia poprzedniego, 23:00 tego dnia)', () => {
    expect(zakresDniaUTC('2026-01-15')).toEqual({
      od: '2026-01-14T23:00:00.000Z',
      do: '2026-01-15T23:00:00.000Z',
    })
  })

  it('początek zakresu należy do tej samej daty warszawskiej', () => {
    const data = '2026-07-15'
    const { od, do: koniec } = zakresDniaUTC(data)
    expect(dataWarszawa(od)).toBe(data)
    // Chwila tuż przed końcem należy jeszcze do tej doby.
    const tuzPrzedKoncem = new Date(new Date(koniec).getTime() - 1).toISOString()
    expect(dataWarszawa(tuzPrzedKoncem)).toBe(data)
  })
})

describe('formatDzienNaglowek', () => {
  it('zwraca wersalikowy nagłówek z polskim miesiącem', () => {
    const naglowek = formatDzienNaglowek('2026-07-15')
    expect(naglowek).toBe(naglowek.toUpperCase())
    expect(naglowek).toContain('LIPCA')
    expect(naglowek).toContain('·')
  })
})
