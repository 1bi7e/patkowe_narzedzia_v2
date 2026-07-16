import { useCallback, useEffect, useState } from 'react'
import { zakresOkresuUTC } from './dzien'
import { supabase } from './supabase'
import type { Okres } from './okres'
import type { Payment } from '../types'

export type StanPlatnosciOkresu = {
  /** Wszystkie płatności okresu (zablokowane i nie), rosnąco po dacie. */
  platnosci: Payment[]
  ladowanie: boolean
  blad: string | null
  odswiez: () => Promise<void>
}

/** Rozmiar strony = limit `max_rows` Supabase; szersze okresy pobieramy stronami. */
const STRONA = 1000

/**
 * Wczytuje WSZYSTKIE płatności z danego okresu (locked i nie — inaczej niż
 * useNierozliczone) i subskrybuje realtime na `payments`. Zapytanie po zakresie
 * UTC odpowiadającym dobie warszawskiej okresu (kolumna `data` to timestamptz).
 * Paginuje przez `.range`, bo Supabase tnie odpowiedź do `max_rows` — inaczej
 * zakres „Własny" na wiele miesięcy zostałby po cichu ucięty. Gdy `wlaczony`
 * jest `false` (np. pod-zakładka Koszty) nie pobiera i nie subskrybuje.
 */
export function usePlatnosciOkresu(okres: Okres, wlaczony = true): StanPlatnosciOkresu {
  const [platnosci, setPlatnosci] = useState<Payment[]>([])
  const [ladowanie, setLadowanie] = useState(true)
  const [blad, setBlad] = useState<string | null>(null)

  const odswiez = useCallback(async () => {
    const zakres = zakresOkresuUTC(okres.od, okres.do)
    const zebrane: Payment[] = []
    for (let od = 0; ; od += STRONA) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .gte('data', zakres.od)
        .lt('data', zakres.do)
        .order('data', { ascending: true })
        .range(od, od + STRONA - 1)

      if (error) {
        setBlad(error.message)
        setLadowanie(false)
        return
      }
      zebrane.push(...(data ?? []))
      if (!data || data.length < STRONA) break
    }
    setPlatnosci(zebrane)
    setBlad(null)
    setLadowanie(false)
  }, [okres.od, okres.do])

  useEffect(() => {
    if (!wlaczony) return

    setLadowanie(true)
    void odswiez()

    const kanal = supabase
      .channel('platnosci-okresu')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        void odswiez()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(kanal)
    }
  }, [odswiez, wlaczony])

  return { platnosci, ladowanie, blad, odswiez }
}
