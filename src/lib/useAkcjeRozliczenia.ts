import { useState } from 'react'
import { cofnijRozliczenie, oznaczGotowkeOddana } from './rozliczenia'
import { useOnline } from './useOnline'
import type { ToastTone } from '../components'
import type { DaySettlement, Stylistka } from '../types'

export const KOMUNIKAT_OFFLINE = 'Jesteś offline — akcja wróci z połączeniem.'

export type AkcjeRozliczen = {
  /** Rozliczenia w trakcie zmiany (odhaczanie / cofanie) — blokują ponowne tapnięcie. */
  zajete: Set<string>
  online: boolean
  /** Odhacza (lub cofa odhaczenie) przekazania Agacie gotówki z rozliczenia. */
  przelaczPrzekazano: (s: DaySettlement) => Promise<void>
  /** Cofa rozliczenie dnia (po potwierdzeniu w arkuszu). */
  cofnij: (s: DaySettlement) => Promise<void>
}

/**
 * Akcje korekt rozliczenia współdzielone przez karty-zadania gotówki na home
 * i karty rozliczonych dni w Historii: guard offline, blokada podwójnego
 * tapnięcia i wyścig „ktoś już cofnął" (wtedy tylko odświeżenie + toast).
 */
export function useAkcjeRozliczenia({
  odswiez,
  onToast,
  stylistka,
}: {
  odswiez: () => Promise<void>
  onToast: (tone: ToastTone, tekst: string) => void
  stylistka: Stylistka
}): AkcjeRozliczen {
  const online = useOnline()
  const [zajete, setZajete] = useState<Set<string>>(new Set())

  function ustawZajete(id: string, wl: boolean) {
    setZajete((prev) => {
      const next = new Set(prev)
      if (wl) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function przelaczPrzekazano(s: DaySettlement) {
    if (!online) {
      onToast('error', KOMUNIKAT_OFFLINE)
      return
    }
    ustawZajete(s.id, true)
    const wynik = await oznaczGotowkeOddana(s.id, !s.gotowka_oddana, stylistka)
    ustawZajete(s.id, false)
    await odswiez()
    if (!wynik.ok) {
      onToast('error', wynik.powod === 'juz_cofniete' ? 'Tego rozliczenia już nie ma — odświeżono.' : wynik.komunikat)
    }
  }

  async function cofnij(s: DaySettlement) {
    if (!online) {
      onToast('error', KOMUNIKAT_OFFLINE)
      return
    }
    ustawZajete(s.id, true)
    const wynik = await cofnijRozliczenie(s.id)
    ustawZajete(s.id, false)
    await odswiez()
    if (!wynik.ok) {
      onToast('error', wynik.powod === 'juz_cofniete' ? 'Rozliczenie było już cofnięte — odświeżono.' : wynik.komunikat)
      return
    }
    onToast('success', 'Cofnięto rozliczenie — dzień wrócił do Rozliczeń.')
  }

  return { zajete, online, przelaczPrzekazano, cofnij }
}
