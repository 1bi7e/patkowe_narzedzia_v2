import { describe, expect, it } from 'vitest'
import { podzialKosztu, pozostaloDoPokrycia, statusPokrycia, sumaZwrotow } from './koszty'
import type { CostPayment, ZrodloZwrotu } from '../types'

/** Zwrot na koszt (do testów sumaZwrotow) — tylko istotne pola. */
function zwrot(kwota_grosze: number, zrodlo: ZrodloZwrotu = 'cash'): CostPayment {
  return {
    id: `${zrodlo}-${kwota_grosze}`,
    cost_id: 'koszt-1',
    kwota_grosze,
    zrodlo,
    data: '2026-07-16',
    settlement_id: zrodlo === 'card_assignment' ? 'rozl-1' : null,
    created_at: '2026-07-16',
  }
}

describe('podzialKosztu', () => {
  it('50/50 dla parzystej kwoty dzieli po równo', () => {
    const w = podzialKosztu({ tryb: 'fifty_fifty', kwotaGrosze: 20000, stylistkaDodajaca: 'patrycja' })
    expect(w).toEqual({ ok: true, kwota_patrycja_grosze: 10000, kwota_agata_grosze: 10000 })
  })

  it('50/50 dla nieparzystej kwoty daje różnicę 1 grosz, grosz u Patrycji', () => {
    const w = podzialKosztu({ tryb: 'fifty_fifty', kwotaGrosze: 1001, stylistkaDodajaca: 'agata' })
    expect(w).toEqual({ ok: true, kwota_patrycja_grosze: 501, kwota_agata_grosze: 500 })
    if (w.ok) expect(Math.abs(w.kwota_patrycja_grosze - w.kwota_agata_grosze)).toBeLessThanOrEqual(1)
  })

  it('tylko moja — całość po stronie dodającej Patrycji', () => {
    const w = podzialKosztu({ tryb: 'only_mine', kwotaGrosze: 8000, stylistkaDodajaca: 'patrycja' })
    expect(w).toEqual({ ok: true, kwota_patrycja_grosze: 8000, kwota_agata_grosze: 0 })
  })

  it('tylko moja — całość po stronie dodającej Agaty', () => {
    const w = podzialKosztu({ tryb: 'only_mine', kwotaGrosze: 8000, stylistkaDodajaca: 'agata' })
    expect(w).toEqual({ ok: true, kwota_patrycja_grosze: 0, kwota_agata_grosze: 8000 })
  })

  it('custom — części sumujące się do kwoty przechodzą', () => {
    const w = podzialKosztu({
      tryb: 'custom',
      kwotaGrosze: 15000,
      stylistkaDodajaca: 'patrycja',
      czescPatrycjaGrosze: 10000,
      czescAgataGrosze: 5000,
    })
    expect(w).toEqual({ ok: true, kwota_patrycja_grosze: 10000, kwota_agata_grosze: 5000 })
  })

  it('custom — części niesumujące się do kwoty dają błąd', () => {
    const w = podzialKosztu({
      tryb: 'custom',
      kwotaGrosze: 15000,
      stylistkaDodajaca: 'patrycja',
      czescPatrycjaGrosze: 10000,
      czescAgataGrosze: 4000,
    })
    expect(w.ok).toBe(false)
  })

  it('custom — brak podanych części traktuje jako 0 i zgłasza błąd sumy', () => {
    const w = podzialKosztu({ tryb: 'custom', kwotaGrosze: 15000, stylistkaDodajaca: 'patrycja' })
    expect(w.ok).toBe(false)
  })

  it('kwota ≤ 0 zawsze jest błędem', () => {
    const w = podzialKosztu({ tryb: 'fifty_fifty', kwotaGrosze: 0, stylistkaDodajaca: 'patrycja' })
    expect(w.ok).toBe(false)
  })
})

describe('statusPokrycia', () => {
  it('tylko moja nie ma statusu (null)', () => {
    expect(statusPokrycia('only_mine', 0, 0)).toBeNull()
  })

  it('brak zwrotów → niepokryty', () => {
    expect(statusPokrycia('fifty_fifty', 10000, 0)).toBe('niepokryty')
  })

  it('część zwrócona → częściowo pokryty', () => {
    expect(statusPokrycia('fifty_fifty', 10000, 4000)).toBe('czesciowo_pokryty')
  })

  it('pełna należność zwrócona → pokryty', () => {
    expect(statusPokrycia('fifty_fifty', 10000, 10000)).toBe('pokryty')
  })

  it('należność 0 (np. custom z całością u Patrycji) → od razu pokryty', () => {
    expect(statusPokrycia('custom', 0, 0)).toBe('pokryty')
  })
})

describe('pozostaloDoPokrycia', () => {
  it('tylko moja → null', () => {
    expect(pozostaloDoPokrycia('only_mine', 0, 0)).toBeNull()
  })

  it('liczy różnicę należność − pokryte', () => {
    expect(pozostaloDoPokrycia('fifty_fifty', 10000, 3000)).toBe(7000)
  })

  it('pełne pokrycie → 0', () => {
    expect(pozostaloDoPokrycia('fifty_fifty', 10000, 10000)).toBe(0)
  })
})

describe('sumaZwrotow', () => {
  it('pusta lista → 0', () => {
    expect(sumaZwrotow([])).toBe(0)
  })

  it('sumuje gotówkę i przypisane karty razem', () => {
    expect(sumaZwrotow([zwrot(3000, 'cash'), zwrot(2000, 'card_assignment')])).toBe(5000)
  })
})
