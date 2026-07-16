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

/**
 * Wczytuje WSZYSTKIE płatności z danego okresu (locked i nie — inaczej niż
 * useNierozliczone) i subskrybuje realtime na `payments`. Zapytanie po zakresie
 * UTC odpowiadającym dobie warszawskiej okresu (kolumna `data` to timestamptz);
 * dzięki temu mieści się w limicie `max_rows` Supabase. Re-query przy zmianie okresu.
 */
export function usePlatnosciOkresu(okres: Okres): StanPlatnosciOkresu {
  const [platnosci, setPlatnosci] = useState<Payment[]>([])
  const [ladowanie, setLadowanie] = useState(true)
  const [blad, setBlad] = useState<string | null>(null)

  const odswiez = useCallback(async () => {
    const zakres = zakresOkresuUTC(okres.od, okres.do)
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .gte('data', zakres.od)
      .lt('data', zakres.do)
      .order('data', { ascending: true })

    if (error) {
      setBlad(error.message)
      setLadowanie(false)
      return
    }
    setPlatnosci(data ?? [])
    setBlad(null)
    setLadowanie(false)
  }, [okres.od, okres.do])

  useEffect(() => {
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
  }, [odswiez])

  return { platnosci, ladowanie, blad, odswiez }
}
