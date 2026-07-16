import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { grupujNierozliczone, type NierozliczonyDzien } from './nierozliczone'

export type StanRozliczen = {
  /** Data warszawska „dziś" (do nagłówka ekranu). */
  dzis: string
  /** Nierozliczone dni pogrupowane po dacie, najstarszy pierwszy. */
  dni: NierozliczonyDzien[]
  /** Czy dzisiejszy dzień ma już rozliczenie — blokada dodawania płatności. */
  dzisRozliczony: boolean
  ladowanie: boolean
  blad: string | null
  odswiez: () => Promise<void>
}

/**
 * Wczytuje WSZYSTKIE nierozliczone płatności (locked = false), grupuje po dobie
 * warszawskiej i subskrybuje realtime (payments + day_settlements) — przy każdej
 * zmianie odświeża całość. „Dzień nierozliczony" ⟺ payments.locked = false, więc
 * odczyt nie potrzebuje JOIN-a z day_settlements ani zakresu dat.
 */
export function useNierozliczone(dzis: string): StanRozliczen {
  const [dni, setDni] = useState<NierozliczonyDzien[]>([])
  const [dzisRozliczony, setDzisRozliczony] = useState(false)
  const [ladowanie, setLadowanie] = useState(true)
  const [blad, setBlad] = useState<string | null>(null)

  const odswiez = useCallback(async () => {
    const [pl, roz] = await Promise.all([
      supabase.from('payments').select('*').eq('locked', false).order('data', { ascending: true }),
      supabase.from('day_settlements').select('data').eq('data', dzis).maybeSingle(),
    ])

    if (pl.error) {
      setBlad(pl.error.message)
      setLadowanie(false)
      return
    }
    if (roz.error) {
      setBlad(roz.error.message)
      setLadowanie(false)
      return
    }

    setDni(grupujNierozliczone(pl.data ?? []))
    setDzisRozliczony(roz.data !== null)
    setBlad(null)
    setLadowanie(false)
  }, [dzis])

  useEffect(() => {
    setLadowanie(true)
    void odswiez()

    const kanal = supabase
      .channel('rozliczenia')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        void odswiez()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'day_settlements' }, () => {
        void odswiez()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(kanal)
    }
  }, [odswiez])

  return { dzis, dni, dzisRozliczony, ladowanie, blad, odswiez }
}
