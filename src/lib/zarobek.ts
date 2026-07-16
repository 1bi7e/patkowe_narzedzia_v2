/**
 * Zarobek netto stylistki za okres — czysta formuła (grosze integer, nigdy float).
 * Odejmujemy UDZIAŁ własny stylistki w każdym koszcie (kwota_patrycja_grosze /
 * kwota_agata_grosze), nie sztywne ÷2 — dzięki temu `only_mine` i `custom` liczą
 * się poprawnie, a suma odliczeń obu stylistek zawsze równa się sumie kosztów
 * (formuła się bilansuje). Karty przypisane na koszt są już wierszami `payments`
 * i wliczają się do przychodu — bez osobnej obsługi.
 */

import { sumujGotowke, sumujKarty } from './sumy'
import type { Cost, Grosze, Payment, Stylistka } from '../types'

/** Minimalny kształt kosztu potrzebny do formuły (Cost i CostCoverage pasują). */
type UdzialKosztu = Pick<Cost, 'tryb' | 'kwota_patrycja_grosze' | 'kwota_agata_grosze'>

export type ZarobekNetto = {
  /** Suma kart tej stylistki w okresie. */
  karty: Grosze
  /** Suma gotówki tej stylistki w okresie. */
  gotowka: Grosze
  /** Udział w kosztach z rozliczeniem (tryb ≠ only_mine): 50/50 → połowa, custom → jej część. */
  kosztyWspolne: Grosze
  /** Udział w kosztach „tylko moja" (jej własne, pełna kwota). */
  kosztyWlasne: Grosze
  netto: Grosze
}

/** Udział danej stylistki w koszcie = jej kolumna kwoty (jej dług/koszt własny). */
function udzialStylistki(koszt: UdzialKosztu, stylistka: Stylistka): Grosze {
  return stylistka === 'patrycja' ? koszt.kwota_patrycja_grosze : koszt.kwota_agata_grosze
}

/**
 * Netto = karty + gotówka − udział w kosztach wspólnych − udział w kosztach własnych.
 * `koszty` i `platnosci` muszą być już zawężone do okresu (odpowiednio po dacie kosztu
 * i po dacie płatności) — ta funkcja nie filtruje po dacie.
 */
export function zarobekNetto(
  platnosci: Payment[],
  koszty: UdzialKosztu[],
  stylistka: Stylistka,
): ZarobekNetto {
  const karty = sumujKarty(platnosci, stylistka)
  const gotowka = sumujGotowke(platnosci, stylistka)

  let kosztyWspolne = 0
  let kosztyWlasne = 0
  for (const k of koszty) {
    const udzial = udzialStylistki(k, stylistka)
    if (k.tryb === 'only_mine') kosztyWlasne += udzial
    else kosztyWspolne += udzial
  }

  return {
    karty,
    gotowka,
    kosztyWspolne,
    kosztyWlasne,
    netto: karty + gotowka - kosztyWspolne - kosztyWlasne,
  }
}
