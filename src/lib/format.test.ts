import { describe, expect, it } from 'vitest'
import { formatZlote, groszeNaPole, parseZloteNaGrosze } from './format'

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

  it('zeroOk: puste pole i „0" znaczą 0, niepoprawny tekst nadal null', () => {
    expect(parseZloteNaGrosze('', { zeroOk: true })).toBe(0)
    expect(parseZloteNaGrosze('0', { zeroOk: true })).toBe(0)
    expect(parseZloteNaGrosze('0,00', { zeroOk: true })).toBe(0)
    expect(parseZloteNaGrosze('150', { zeroOk: true })).toBe(15000)
    expect(parseZloteNaGrosze('abc', { zeroOk: true })).toBeNull()
  })
})

describe('groszeNaPole', () => {
  it('zdejmuje separator tysięcy, zostawia przecinek dziesiętny', () => {
    expect(groszeNaPole(120000)).toBe('1200')
    expect(groszeNaPole(150050)).toBe('1500,50')
    expect(groszeNaPole(52000)).toBe('520')
    expect(groszeNaPole(0)).toBe('0')
  })

  // Przypina założenie prefillu kwoty przypisania w RozliczScreen: to, co wstawimy
  // do pola, musi wrócić tą samą liczbą groszy. Chroni przed zmianą separatora
  // pl-PL w przyszłym CLDR (dziś NBSP; `\s` łapie też U+202F, ale test to pilnuje).
  it('round-trip przez parseZloteNaGrosze zachowuje grosze', () => {
    for (const grosze of [0, 5, 99, 52000, 120000, 150050, 999999, 100000000]) {
      expect(parseZloteNaGrosze(groszeNaPole(grosze), { zeroOk: true })).toBe(grosze)
    }
  })
})
