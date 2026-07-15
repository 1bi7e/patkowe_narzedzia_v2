import { useCallback, useState } from 'react'
import { BottomNav, Toast } from '../components'
import type { NavTab, ToastTone } from '../components'
import { useStylistka } from '../context/StylistkaContext'
import { dataWarszawa } from '../lib/dzien'
import { useDzien } from '../lib/useDzien'
import { DodajPlatnoscSheet } from './DodajPlatnoscSheet'
import { DzisScreen } from './DzisScreen'
import { RozliczDzienScreen } from './RozliczDzienScreen'
import type { Stylistka } from '../types'

type ToastStan = { tone: ToastTone; tekst: string }

/** Powłoka aplikacji po wyborze profilu: aktywna zakładka + dolna nawigacja. */
export function AppShell() {
  const { stylistka } = useStylistka()
  const kto = stylistka as Stylistka
  const [tab, setTab] = useState<NavTab>('dzisiaj')
  const [dzisiaj] = useState(() => dataWarszawa())
  const [arkuszOtwarty, setArkuszOtwarty] = useState(false)
  const [rozliczOtwarty, setRozliczOtwarty] = useState(false)
  const [toast, setToast] = useState<ToastStan | null>(null)
  const stan = useDzien(dzisiaj)
  const rozliczony = stan.rozliczenie !== null

  const zamknijToast = useCallback(() => setToast(null), [])
  const pokazToast = useCallback((tone: ToastTone, tekst: string) => setToast({ tone, tekst }), [])

  function otworzArkusz() {
    if (rozliczony) {
      pokazToast('error', 'Dzień jest rozliczony — nie dodasz już płatności.')
      return
    }
    setArkuszOtwarty(true)
  }

  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-md px-6 pt-10 pb-28">
        {tab === 'dzisiaj' ? (
          <DzisScreen stan={stan} onRozlicz={() => setRozliczOtwarty(true)} />
        ) : (
          <FinansePlaceholder />
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md">
        <BottomNav active={tab} onNavigate={setTab} onAdd={otworzArkusz} />
      </div>

      <DodajPlatnoscSheet
        open={arkuszOtwarty}
        onClose={() => setArkuszOtwarty(false)}
        stylistka={kto}
        onZapisano={() => {
          void stan.odswiez()
          pokazToast('success', 'Zapisano płatność.')
        }}
      />

      {rozliczOtwarty && (
        <RozliczDzienScreen
          stan={stan}
          stylistka={kto}
          onZamknij={() => setRozliczOtwarty(false)}
          onToast={pokazToast}
        />
      )}

      {toast && (
        <Toast tone={toast.tone} onClose={zamknijToast}>
          {toast.tekst}
        </Toast>
      )}
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
