import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Stylistka } from '../types'

/** Klucz localStorage pod wybranym profilem — „logowanie" bez haseł. */
const STORAGE_KEY = 'salon:stylistka'

function odczytajZapisany(): Stylistka | null {
  if (typeof window === 'undefined') return null
  const zapisany = window.localStorage.getItem(STORAGE_KEY)
  return zapisany === 'patrycja' || zapisany === 'agata' ? zapisany : null
}

type StylistkaContextValue = {
  /** Zalogowany profil albo null, gdy nikt jeszcze nie wybrany. */
  stylistka: Stylistka | null
  zaloguj: (s: Stylistka) => void
  wyloguj: () => void
}

const StylistkaContext = createContext<StylistkaContextValue | null>(null)

/**
 * Trzyma wybrany profil (Patrycja/Agata) w stanie i localStorage.
 * To nie jest autoryzacja — jedynie kontekst, na kogo zapisują się wpisy.
 */
export function StylistkaProvider({ children }: { children: ReactNode }) {
  const [stylistka, setStylistka] = useState<Stylistka | null>(odczytajZapisany)

  useEffect(() => {
    if (stylistka) window.localStorage.setItem(STORAGE_KEY, stylistka)
    else window.localStorage.removeItem(STORAGE_KEY)
  }, [stylistka])

  const value: StylistkaContextValue = {
    stylistka,
    zaloguj: setStylistka,
    wyloguj: () => setStylistka(null),
  }

  return <StylistkaContext value={value}>{children}</StylistkaContext>
}

export function useStylistka(): StylistkaContextValue {
  const ctx = useContext(StylistkaContext)
  if (!ctx) throw new Error('useStylistka musi być użyte wewnątrz <StylistkaProvider>')
  return ctx
}
