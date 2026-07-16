import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { CostCoverage } from '../types'

export type StanKosztow = {
  /** Koszty z wyliczonym pokryciem (widok costs_coverage), najnowsze pierwsze. */
  koszty: CostCoverage[]
  ladowanie: boolean
  blad: string | null
  odswiez: () => Promise<void>
}

type OpcjeKosztow = {
  /** Wołane, gdy realtime przyniesie przypisanie kart na koszt (zrodlo=card_assignment). */
  onPrzypisanie?: () => void
}

/**
 * Wczytuje koszty z widoku `costs_coverage` i subskrybuje realtime na tabelach
 * bazowych (`costs` + `cost_payments`) — przy każdej zmianie odświeża całość
 * (widoku nie da się subskrybować wprost). Gdy przyjdzie INSERT przypisania kart,
 * woła `onPrzypisanie` (powiadomienie u drugiej stylistki po rozliczeniu dnia).
 */
export function useKoszty(opcje: OpcjeKosztow = {}): StanKosztow {
  const [koszty, setKoszty] = useState<CostCoverage[]>([])
  const [ladowanie, setLadowanie] = useState(true)
  const [blad, setBlad] = useState<string | null>(null)

  // Ref, żeby zmiana identyczności callbacku nie przepinała subskrypcji.
  const onPrzypisanieRef = useRef(opcje.onPrzypisanie)
  onPrzypisanieRef.current = opcje.onPrzypisanie

  const odswiez = useCallback(async () => {
    const { data, error } = await supabase
      .from('costs_coverage')
      .select('*')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setBlad(error.message)
      setLadowanie(false)
      return
    }
    setKoszty(data ?? [])
    setBlad(null)
    setLadowanie(false)
  }, [])

  useEffect(() => {
    setLadowanie(true)
    void odswiez()

    const kanal = supabase
      .channel('koszty')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'costs' }, () => {
        void odswiez()
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cost_payments' },
        (payload) => {
          const nowy = payload.new as { zrodlo?: string } | null
          if (payload.eventType === 'INSERT' && nowy?.zrodlo === 'card_assignment') {
            onPrzypisanieRef.current?.()
          }
          void odswiez()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(kanal)
    }
  }, [odswiez])

  return { koszty, ladowanie, blad, odswiez }
}
