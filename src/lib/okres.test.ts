import { describe, expect, it } from 'vitest'
import { czyWZakresie, miesiacOkres, nazwaOkresu, wlasnyOkres } from './okres'

describe('miesiacOkres', () => {
  it('bieżący miesiąc — pierwszy i ostatni dzień', () => {
    expect(miesiacOkres('2026-07-16', 0)).toEqual({ typ: 'ten_miesiac', od: '2026-07-01', do: '2026-07-31' })
  })

  it('poprzedni miesiąc', () => {
    expect(miesiacOkres('2026-07-16', -1)).toEqual({ typ: 'poprzedni', od: '2026-06-01', do: '2026-06-30' })
  })

  it('luty w roku nieprzestępnym ma 28 dni', () => {
    expect(miesiacOkres('2026-02-10', 0).do).toBe('2026-02-28')
  })

  it('luty w roku przestępnym ma 29 dni', () => {
    expect(miesiacOkres('2024-02-10', 0).do).toBe('2024-02-29')
  })

  it('przełom roku: poprzedni miesiąc dla stycznia → grudzień poprzedniego roku', () => {
    expect(miesiacOkres('2026-01-05', -1)).toEqual({ typ: 'poprzedni', od: '2025-12-01', do: '2025-12-31' })
  })
})

describe('nazwaOkresu', () => {
  it('miesiąc → „Miesiąc RRRR" z wielkiej litery', () => {
    expect(nazwaOkresu(miesiacOkres('2026-07-16', 0))).toBe('Lipiec 2026')
    expect(nazwaOkresu(miesiacOkres('2026-01-16', 0))).toBe('Styczeń 2026')
  })

  it('okres własny → zakres krótkich dat', () => {
    expect(nazwaOkresu(wlasnyOkres('2026-07-01', '2026-07-14'))).toBe('1 lip – 14 lip 2026')
  })
})

describe('czyWZakresie', () => {
  const okres = miesiacOkres('2026-07-16', 0)

  it('granice włącznie', () => {
    expect(czyWZakresie('2026-07-01', okres)).toBe(true)
    expect(czyWZakresie('2026-07-31', okres)).toBe(true)
  })

  it('poza zakresem', () => {
    expect(czyWZakresie('2026-06-30', okres)).toBe(false)
    expect(czyWZakresie('2026-08-01', okres)).toBe(false)
  })
})
