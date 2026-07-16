/**
 * Cienki wrapper na RPC `rozlicz_dni` — atomowe rozliczenie wielu dni naraz.
 * Rozpoznaje błąd „sumy się nie zgadzają" (ktoś zmienił wpis po załadowaniu
 * ekranu), żeby UI mogło odświeżyć dane i poprosić o ponowienie.
 */

import { supabase } from './supabase'
import type { PrzypisanieKart, SumaDnia } from './nierozliczone'
import type { Stylistka } from '../types'

export type WynikRozliczenia =
  | { ok: true; ids: string[] }
  | { ok: false; sumyRozne: boolean; komunikat: string }

/**
 * Rozlicza wybrane dni jedną atomową akcją. `daty` niesie sumy kart każdego
 * rozliczanego dnia (kształt SumaDnia = wejście RPC). `przypisania` (Sposób 2)
 * są opcjonalne — limit to łączne karty Agaty z rozliczanych dni.
 */
export async function rozliczDni(
  daty: SumaDnia[],
  zatwierdzila: Stylistka,
  przypisania: PrzypisanieKart[] = [],
): Promise<WynikRozliczenia> {
  const { data, error } = await supabase.rpc('rozlicz_dni', {
    p_daty: daty.map((d) => d.data),
    p_zatwierdzila: zatwierdzila,
    p_sumy: daty,
    p_przypisania: przypisania,
  })

  if (error) {
    const sumyRozne = /sum|zgadz|odśwież|odswiez/i.test(error.message)
    return { ok: false, sumyRozne, komunikat: error.message }
  }

  return { ok: true, ids: (data ?? []) as string[] }
}
