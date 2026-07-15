import { describe, expect, it } from 'vitest'
import { formatZlote, parseZloteNaGrosze } from './format'

describe('parseZloteNaGrosze', () => {
  it('parsuje liczby całkowite (ze spacją tysięcy)', () => {
    expect(parseZloteNaGrosze('150')).toBe(15000)
    expect(parseZloteNaGrosze('1 000')).toBe(100000)
  })

  it('parsuje przecinek i kropkę dziesiętną', () => {
    expect(parseZloteNaGrosze('150,50')).toBe(15050)
    expect(parseZloteNaGrosze('150.5')).toBe(15050)
    expect(parseZloteNaGrosze('0,05')).toBe(5)
  })

  it('odrzuca wejścia niepoprawne oraz ≤ 0', () => {
    expect(parseZloteNaGrosze('')).toBeNull()
    expect(parseZloteNaGrosze('abc')).toBeNull()
    expect(parseZloteNaGrosze('0')).toBeNull()
    expect(parseZloteNaGrosze('12,345')).toBeNull() // za dużo miejsc po przecinku
    expect(parseZloteNaGrosze('-5')).toBeNull()
  })

  it('round-trip z formatZlote', () => {
    for (const grosze of [5, 15000, 15050, 19134, 100000]) {
      expect(parseZloteNaGrosze(formatZlote(grosze))).toBe(grosze)
    }
  })
})
