import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { EMAIL_SALONU, bladLogowania } from '../lib/auth'
import type { WynikLogowania } from '../lib/auth'

type SesjaContextValue = {
  /** Sesja wspólnego konta salonu albo null, gdy nikt nie podał hasła. */
  sesja: Session | null
  /** Trwa odtwarzanie zapisanej sesji — dopóki true, nie wiadomo jeszcze nic. */
  wczytywanie: boolean
  zaloguj: (haslo: string) => Promise<WynikLogowania>
  wyjdzZSalonu: () => void
}

const SesjaContext = createContext<SesjaContextValue | null>(null)

/**
 * Trzyma sesję wspólnego konta salonu — bramka chroniąca dane przed obcymi.
 * To jest prawdziwa autoryzacja (RLS wpuszcza tylko `authenticated`),
 * w odróżnieniu od wyboru profilu, który jest wyłącznie kontekstem wpisu.
 */
export function SesjaProvider({ children }: { children: ReactNode }) {
  const [sesja, setSesja] = useState<Session | null>(null)
  const [wczytywanie, setWczytywanie] = useState(true)

  useEffect(() => {
    let anulowane = false

    // Sesja siedzi w localStorage — odtworzenie jest asynchroniczne, więc do
    // czasu odpowiedzi trzymamy `wczytywanie`, żeby nie mrugnąć ekranem hasła
    // przy każdym starcie aplikacji.
    void supabase.auth.getSession().then(({ data }) => {
      if (anulowane) return
      setSesja(data.session)
      setWczytywanie(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_zdarzenie, nowa) => {
      setSesja(nowa)
    })

    return () => {
      anulowane = true
      data.subscription.unsubscribe()
    }
  }, [])

  const value: SesjaContextValue = {
    sesja,
    wczytywanie,
    // Sesję ustawi onAuthStateChange — tu zwracamy tylko wynik dla formularza.
    zaloguj: async (haslo) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: EMAIL_SALONU,
        password: haslo,
      })
      if (error) return { ok: false, ...bladLogowania(error.code) }
      return { ok: true }
    },
    // scope 'local' czyści sesję tylko na tym urządzeniu. Domyślny 'global'
    // unieważniłby tokeny wspólnego konta wszędzie — jedna stylistka
    // wylogowałaby drugą z jej telefonu.
    wyjdzZSalonu: () => {
      void supabase.auth.signOut({ scope: 'local' })
    },
  }

  return <SesjaContext value={value}>{children}</SesjaContext>
}

export function useSesja(): SesjaContextValue {
  const ctx = useContext(SesjaContext)
  if (!ctx) throw new Error('useSesja musi być użyte wewnątrz <SesjaProvider>')
  return ctx
}
