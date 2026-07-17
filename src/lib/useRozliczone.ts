import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { DaySettlement } from '../types'

export type StanRozliczone = {
  /** Rozliczone dni, najnowszy pierwszy. */
  rozliczenia: DaySettlement[]
  ladowanie: boolean
  blad: string | null
  odswiez: () => Promise<void>
}

/**
 * Wczytuje rozliczone dni (day_settlements) i subskrybuje realtime tej tabeli —
 * przy każdej zmianie (nowe rozliczenie, odhaczenie gotówki, cofnięcie) odświeża
 * całość. Ładuje i subskrybuje tylko gdy `aktywna` (pod-zakładka „Rozliczone"
 * otwarta) — poza nią nie trzyma zbędnego kanału realtime.
 */
export function useRozliczone(aktywna: boolean): StanRozliczone {
  const [rozliczenia, setRozliczenia] = useState<DaySettlement[]>([])
  const [ladowanie, setLadowanie] = useState(true)
  const [blad, setBlad] = useState<string | null>(null)

  const odswiez = useCallback(async () => {
    const { data, error } = await supabase
      .from('day_settlements')
      .select('*')
      .order('data', { ascending: false })

    if (error) {
      setBlad(error.message)
      setLadowanie(false)
      return
    }
    setRozliczenia(data ?? [])
    setBlad(null)
    setLadowanie(false)
  }, [])

  useEffect(() => {
    if (!aktywna) return
    setLadowanie(true)
    void odswiez()

    const kanal = supabase
      .channel('rozliczone')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'day_settlements' }, () => {
        void odswiez()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(kanal)
    }
  }, [aktywna, odswiez])

  return { rozliczenia, ladowanie, blad, odswiez }
}
