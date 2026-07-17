/**
 * Cienki wrapper na RPC `rozlicz_dni` — atomowe rozliczenie wielu dni naraz.
 * Rozpoznaje dwa wyścigi, których nie da się uniknąć w apce realtime, żeby UI
 * mogło odświeżyć dane zamiast pokazywać surowy błąd bazy:
 *   - `sumy_rozne`     — ktoś zmienił wpis po załadowaniu ekranu (trigger sum),
 *   - `juz_rozliczony` — inna stylistka rozliczyła ten dzień w międzyczasie
 *                        (UNIQUE(data) na day_settlements → SQLSTATE 23505).
 */

import { supabase } from './supabase'
import type { PrzypisanieKart, SumaDnia } from './nierozliczone'
import type { Stylistka } from '../types'

/** Powód nieudanego rozliczenia — steruje komunikatem i zachowaniem UI. */
export type PowodBledu = 'sumy_rozne' | 'juz_rozliczony' | 'inny'

export type WynikRozliczenia =
  | { ok: true; ids: string[] }
  | { ok: false; powod: PowodBledu; komunikat: string }

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
    const powod: PowodBledu =
      error.code === '23505'
        ? 'juz_rozliczony'
        : /sum|zgadz|odśwież|odswiez/i.test(error.message)
          ? 'sumy_rozne'
          : 'inny'
    return { ok: false, powod, komunikat: error.message }
  }

  return { ok: true, ids: (data ?? []) as string[] }
}

/** Powód nieudanej korekty rozliczenia (cofnięcie / odhaczenie gotówki). */
export type PowodKorekty = 'juz_cofniete' | 'inny'

export type WynikKorekty =
  | { ok: true }
  | { ok: false; powod: PowodKorekty; komunikat: string }

/**
 * Cofa rozliczenie jednego dnia (RPC cofnij_rozliczenie): usuwa przypisania kart
 * tego dnia, odblokowuje jego płatności i kasuje wiersz rozliczenia. Brak wiersza
 * = ktoś cofnął go równolegle (wyścig) — UI wtedy tylko odświeża.
 */
export async function cofnijRozliczenie(settlementId: string): Promise<WynikKorekty> {
  const { error } = await supabase.rpc('cofnij_rozliczenie', { p_settlement_id: settlementId })
  if (error) {
    const powod: PowodKorekty = /nie istnieje/i.test(error.message) ? 'juz_cofniete' : 'inny'
    return { ok: false, powod, komunikat: error.message }
  }
  return { ok: true }
}

/** Odhacza (lub cofa odhaczenie) przekazania Agacie gotówki z rozliczenia. */
export async function oznaczGotowkeOddana(
  settlementId: string,
  oddana: boolean,
  przez: Stylistka,
): Promise<WynikKorekty> {
  const { error } = await supabase.rpc('oznacz_gotowke_oddana', {
    p_settlement_id: settlementId,
    p_oddana: oddana,
    p_przez: przez,
  })
  if (error) {
    const powod: PowodKorekty = /nie istnieje/i.test(error.message) ? 'juz_cofniete' : 'inny'
    return { ok: false, powod, komunikat: error.message }
  }
  return { ok: true }
}
