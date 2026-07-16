import { useCallback, useState } from 'react'
import { BottomNav, Toast } from '../components'
import type { NavTab, ToastTone } from '../components'
import { useStylistka } from '../context/StylistkaContext'
import { dataWarszawa } from '../lib/dzien'
import type { NierozliczonyDzien } from '../lib/nierozliczone'
import { useNierozliczone } from '../lib/useNierozliczone'
import { DodajPlatnoscSheet } from './DodajPlatnoscSheet'
import { RozliczeniaScreen } from './RozliczeniaScreen'
import { RozliczScreen } from './RozliczScreen'
import type { Stylistka } from '../types'

type ToastStan = { tone: ToastTone; tekst: string }

/** Powłoka aplikacji po wyborze profilu: aktywna zakładka + dolna nawigacja. */
export function AppShell() {
  const { stylistka } = useStylistka()
  const kto = stylistka as Stylistka
  const [tab, setTab] = useState<NavTab>('rozliczenia')
  const [dzisiaj] = useState(() => dataWarszawa())
  const [arkuszOtwarty, setArkuszOtwarty] = useState(false)
  const [dniDoRozliczenia, setDniDoRozliczenia] = useState<NierozliczonyDzien[]>([])
  const [toast, setToast] = useState<ToastStan | null>(null)
  const stan = useNierozliczone(dzisiaj)

  const zamknijToast = useCallback(() => setToast(null), [])
  const pokazToast = useCallback((tone: ToastTone, tekst: string) => setToast({ tone, tekst }), [])

  function otworzArkusz() {
    if (stan.dzisRozliczony) {
      pokazToast('error', 'Dzień jest rozliczony — nie dodasz już płatności.')
      return
    }
    setArkuszOtwarty(true)
  }

  const rozliczOtwarty = dniDoRozliczenia.length > 0

  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-md px-6 pt-10 pb-28">
        {tab === 'rozliczenia' ? (
          <RozliczeniaScreen stan={stan} onRozlicz={setDniDoRozliczenia} />
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
        <RozliczScreen
          dni={dniDoRozliczenia}
          stylistka={kto}
          onOdswiez={stan.odswiez}
          onZamknij={() => setDniDoRozliczenia([])}
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
