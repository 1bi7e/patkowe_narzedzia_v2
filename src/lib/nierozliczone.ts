/**
 * Warstwa logiki ekranu „Rozliczenia": grupowanie NIEROZLICZONYCH płatności po
 * dobie warszawskiej. „Dzień nierozliczony" ⟺ payments.locked = false — rozliczenie
 * blokuje wszystkie wpisy dnia, a do rozliczonego dnia nie da się dopisać. Dzięki
 * temu odczyt nie wymaga JOIN-a z day_settlements ani zmian w schemacie.
 *
 * To rozszerza dawny model „tylko dziś": nierozliczone wpisy z poprzednich dni
 * nie znikają z widoku, dopóki dzień nie zostanie rozliczony (patrz CLAUDE.md).
 */

import { dataWarszawa } from './dzien'
import { podsumujDzien, type PodsumowanieDnia } from './sumy'
import type { Grosze, Payment } from '../types'

/** Jeden nierozliczony dzień: data (YYYY-MM-DD, strefa Warszawa), jego płatności i sumy. */
export type NierozliczonyDzien = {
  data: string
  platnosci: Payment[]
  sumy: PodsumowanieDnia
}

/** Sumy KART jednego dnia w kształcie oczekiwanym przez RPC rozlicz_dni. */
export type SumaDnia = { data: string; patrycja_grosze: Grosze; agata_grosze: Grosze }

/** Przypisanie kart Agaty na koszt przy rozliczeniu (Sposób 2). */
export type PrzypisanieKart = { cost_id: string; kwota_grosze: Grosze }

/**
 * Grupuje płatności nierozliczone (locked = false) po dobie warszawskiej.
 * Zwraca dni rosnąco (najstarszy pierwszy — naturalna kolejność rozliczania).
 * Wpisy locked = true są pomijane (należą do już rozliczonych dni).
 * Kolejność płatności w obrębie dnia zachowana z wejścia.
 */
export function grupujNierozliczone(platnosci: Payment[]): NierozliczonyDzien[] {
  const wgDnia = new Map<string, Payment[]>()
  for (const p of platnosci) {
    if (p.locked) continue
    const dzien = dataWarszawa(p.data)
    const lista = wgDnia.get(dzien)
    if (lista) lista.push(p)
    else wgDnia.set(dzien, [p])
  }
  // Klucze 'YYYY-MM-DD' sortują się leksykograficznie = chronologicznie.
  return [...wgDnia.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([data, dniPlatnosci]) => ({
      data,
      platnosci: dniPlatnosci,
      sumy: podsumujDzien(dniPlatnosci),
    }))
}

/** Buduje wejście RPC (SumaDnia) z podsumowania dnia — bierze wyłącznie karty. */
export function sumaDniaZPodsumowania(data: string, sumy: PodsumowanieDnia): SumaDnia {
  return { data, patrycja_grosze: sumy.patrycja.karta, agata_grosze: sumy.agata.karta }
}
