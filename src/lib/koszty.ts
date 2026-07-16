/**
 * Logika pokrycia kosztów — czyste funkcje odwzorowujące widok `costs_coverage`
 * i reguły podziału z bazy (constraints tabeli `costs`). Trzymamy je po stronie
 * klienta do walidacji formularza i podglądu; źródłem prawdy pozostaje baza.
 * Wszystkie kwoty w groszach (integer, nigdy float).
 */

import type { CostPayment, Grosze, StatusPokrycia, Stylistka, TrybPodzialu } from '../types'

/** Krótka etykieta trybu podziału (Badge zamienia na wersję wielkimi literami). */
export const TRYB_LABEL: Record<TrybPodzialu, string> = {
  fifty_fifty: '50/50',
  only_mine: 'tylko moja',
  custom: 'własny',
}

/** Wejście podziału kosztu na części Patrycji i Agaty. */
export type WejsciePodzialu = {
  tryb: TrybPodzialu
  kwotaGrosze: Grosze
  /** Profil dodający — dla „tylko moja" całość ląduje po jego stronie. */
  stylistkaDodajaca: Stylistka
  /** Część Patrycji wpisana ręcznie (tylko tryb custom). */
  czescPatrycjaGrosze?: Grosze
  /** Część Agaty wpisana ręcznie (tylko tryb custom). */
  czescAgataGrosze?: Grosze
}

/** Podział na części albo błąd walidacji (custom: suma części ≠ kwota łączna). */
export type WynikPodzialu =
  | { ok: true; kwota_patrycja_grosze: Grosze; kwota_agata_grosze: Grosze }
  | { ok: false; blad: string }

/**
 * Rozkłada kwotę kosztu na części Patrycji i Agaty wg trybu — dokładnie tak, jak
 * wymagają constrainty tabeli `costs` (suma części = kwota; „tylko moja" po jednej
 * stronie; 50/50 różni się najwyżej o 1 grosz):
 * - `fifty_fifty` → Agata bierze `floor(kwota/2)`, reszta (ewentualny grosz) u Patrycji,
 *   która finansuje wspólny koszt; `kwota_agata_grosze` to jej dług wobec Patrycji.
 * - `only_mine` → całość po stronie dodającej, druga strona 0 (brak rozliczenia).
 * - `custom` → części z wejścia; waliduje `czescPatrycja + czescAgata === kwota`.
 */
export function podzialKosztu(w: WejsciePodzialu): WynikPodzialu {
  const { tryb, kwotaGrosze, stylistkaDodajaca } = w

  if (kwotaGrosze <= 0) {
    return { ok: false, blad: 'Kwota kosztu musi być większa od zera.' }
  }

  if (tryb === 'fifty_fifty') {
    const agata = Math.floor(kwotaGrosze / 2)
    return { ok: true, kwota_patrycja_grosze: kwotaGrosze - agata, kwota_agata_grosze: agata }
  }

  if (tryb === 'only_mine') {
    return stylistkaDodajaca === 'patrycja'
      ? { ok: true, kwota_patrycja_grosze: kwotaGrosze, kwota_agata_grosze: 0 }
      : { ok: true, kwota_patrycja_grosze: 0, kwota_agata_grosze: kwotaGrosze }
  }

  // custom
  const patrycja = w.czescPatrycjaGrosze ?? 0
  const agata = w.czescAgataGrosze ?? 0
  if (patrycja < 0 || agata < 0) {
    return { ok: false, blad: 'Części nie mogą być ujemne.' }
  }
  if (patrycja + agata !== kwotaGrosze) {
    return { ok: false, blad: 'Suma części musi równać się kwocie łącznej.' }
  }
  return { ok: true, kwota_patrycja_grosze: patrycja, kwota_agata_grosze: agata }
}

/**
 * Status pokrycia kosztu — odwzorowanie kolumny `status_pokrycia` z widoku.
 * `only_mine` nie ma statusu (brak rozliczenia między stylistkami) → null.
 * Pełne pokrycie gdy zwroty ≥ należność Agaty; częściowe gdy cokolwiek wpłynęło.
 */
export function statusPokrycia(
  tryb: TrybPodzialu,
  kwotaAgataGrosze: Grosze,
  pokryteGrosze: Grosze,
): StatusPokrycia | null {
  if (tryb === 'only_mine') return null
  if (pokryteGrosze >= kwotaAgataGrosze) return 'pokryty'
  if (pokryteGrosze > 0) return 'czesciowo_pokryty'
  return 'niepokryty'
}

/**
 * Kwota pozostała Agacie do pokrycia — odwzorowanie `pozostalo_grosze` z widoku
 * (`kwota_agata_grosze − pokryte`). `null` dla trybu „tylko moja". Triggery bazy
 * nie dopuszczają nadpłaty, więc dla poprawnych danych wynik nigdy nie jest ujemny.
 */
export function pozostaloDoPokrycia(
  tryb: TrybPodzialu,
  kwotaAgataGrosze: Grosze,
  pokryteGrosze: Grosze,
): Grosze | null {
  if (tryb === 'only_mine') return null
  return kwotaAgataGrosze - pokryteGrosze
}

/** Suma wszystkich zwrotów na koszt (gotówka + przypisane karty), w groszach. */
export function sumaZwrotow(zwroty: CostPayment[]): Grosze {
  return zwroty.reduce((suma, z) => suma + z.kwota_grosze, 0)
}
