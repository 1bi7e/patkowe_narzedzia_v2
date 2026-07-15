import { useState } from 'react'
import { BottomNav, KontoPill } from '../components'
import type { NavTab } from '../components'
import { useStylistka } from '../context/StylistkaContext'
import type { Stylistka } from '../types'

/** Powłoka aplikacji po wyborze profilu: aktywna zakładka + dolna nawigacja. */
export function AppShell() {
  const { stylistka, wyloguj } = useStylistka()
  const [tab, setTab] = useState<NavTab>('dzisiaj')

  // Profil jest gwarantowany przez App (AppShell renderuje się tylko po zalogowaniu).
  const kto = stylistka as Stylistka

  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-md px-6 pt-10 pb-28">
        {tab === 'dzisiaj' ? (
          <DzisPlaceholder stylistka={kto} onWyloguj={wyloguj} />
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

// Zastąpione pełnym ekranem Dziś w kolejnym kroku (płatności + sumy + realtime).
function DzisPlaceholder({ stylistka, onWyloguj }: { stylistka: Stylistka; onWyloguj: () => void }) {
  return (
    <>
      <header className="flex items-start justify-between">
        <h1 className="font-serif text-h2 font-medium text-brown-800">Dziś</h1>
        <KontoPill stylistka={stylistka} onWyloguj={onWyloguj} />
      </header>
      <p className="mt-16 text-center font-light text-brown-400">Wkrótce: dzisiejsze płatności.</p>
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
