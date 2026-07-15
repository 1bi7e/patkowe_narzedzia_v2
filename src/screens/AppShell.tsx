import { useState } from 'react'
import { BottomNav } from '../components'
import type { NavTab } from '../components'
import { dataWarszawa } from '../lib/dzien'
import { useDzien } from '../lib/useDzien'
import { DzisScreen } from './DzisScreen'

/** Powłoka aplikacji po wyborze profilu: aktywna zakładka + dolna nawigacja. */
export function AppShell() {
  const [tab, setTab] = useState<NavTab>('dzisiaj')
  const [dzisiaj] = useState(() => dataWarszawa())
  const stan = useDzien(dzisiaj)

  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-md px-6 pt-10 pb-28">
        {tab === 'dzisiaj' ? (
          <DzisScreen stan={stan} onRozlicz={() => {}} />
        ) : (
          <FinansePlaceholder />
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md">
        <BottomNav active={tab} onNavigate={setTab} onAdd={() => {}} />
      </div>
    </>
  )
}

function FinansePlaceholder() {
  return (
    <>
      <h1 className="font-serif text-h2 font-medium text-brown-800">Finanse</h1>
      <p className="mt-16 text-center font-light text-brown-400">Wkrótce.</p>
    </>
  )
}
