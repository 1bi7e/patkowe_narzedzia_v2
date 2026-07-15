import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { dataWarszawa, zakresDniaUTC } from './dzien'
import type { DaySettlement, Payment } from '../types'

export type StanDnia = {
  /** Data warszawska 'YYYY-MM-DD', której dotyczy stan. */
  data: string
  platnosci: Payment[]
  /** Rozliczenie dnia albo null, gdy dzień jeszcze nierozliczony. */
  rozliczenie: DaySettlement | null
  ladowanie: boolean
  blad: string | null
  odswiez: () => Promise<void>
}

/**
 * Wczytuje płatności i rozliczenie danej doby warszawskiej oraz subskrybuje
 * realtime (payments + day_settlements) — przy każdej zmianie odświeża dane.
 * Skala aplikacji jest mała (2 stylistki), więc odświeżamy całość zamiast
 * łatać pojedyncze zdarzenia.
 */
export function useDzien(data: string): StanDnia {
  const [platnosci, setPlatnosci] = useState<Payment[]>([])
  const [rozliczenie, setRozliczenie] = useState<DaySettlement | null>(null)
  const [ladowanie, setLadowanie] = useState(true)
  const [blad, setBlad] = useState<string | null>(null)

  const odswiez = useCallback(async () => {
    const zakres = zakresDniaUTC(data)
    const [pl, roz] = await Promise.all([
      supabase
        .from('payments')
        .select('*')
        .gte('data', zakres.od)
        .lt('data', zakres.do)
        .order('data', { ascending: true }),
      supabase.from('day_settlements').select('*').eq('data', data).maybeSingle(),
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

    // Zakres UTC bywa szerszy o brzegi — ostateczny filtr wg daty warszawskiej.
    setPlatnosci((pl.data ?? []).filter((p) => dataWarszawa(p.data) === data))
    setRozliczenie(roz.data ?? null)
    setBlad(null)
    setLadowanie(false)
  }, [data])

  useEffect(() => {
    setLadowanie(true)
    void odswiez()

    const kanal = supabase
      .channel(`dzien-${data}`)
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
  }, [data, odswiez])

  return { data, platnosci, rozliczenie, ladowanie, blad, odswiez }
}
