import { useCallback, useRef, useState } from 'react'
import { BottomNav, Toast } from '../components'
import type { NavTab, ToastTone } from '../components'
import { useStylistka } from '../context/StylistkaContext'
import { dataWarszawa } from '../lib/dzien'
import type { NierozliczonyDzien } from '../lib/nierozliczone'
import { useKoszty } from '../lib/useKoszty'
import { useNierozliczone } from '../lib/useNierozliczone'
import { DodajKosztSheet } from './DodajKosztSheet'
import { DodajPlatnoscSheet } from './DodajPlatnoscSheet'
import { FinanseScreen } from './FinanseScreen'
import { KosztSzczegolScreen } from './KosztSzczegolScreen'
import { RozliczeniaScreen } from './RozliczeniaScreen'
import { RozliczScreen } from './RozliczScreen'
import type { Stylistka } from '../types'

type ToastStan = { tone: ToastTone; tekst: string }

/** Powłoka aplikacji po wyborze profilu: aktywna zakładka + dolna nawigacja. */
export function AppShell() {
  const { stylistka } = useStylistka()
  const kto = stylistka as Stylistka
  const [tab, setTab] = useState<NavTab>('rozliczenia')
  // Liczone przy każdym renderze (nie zamrożone w useState): po północy warszawskiej
  // wartość sama się aktualizuje przy następnym renderze. Że to stabilny string,
  // subskrypcja w useNierozliczone przepina się dopiero przy realnej zmianie doby.
  const dzisiaj = dataWarszawa()
  const [arkuszPlatnosc, setArkuszPlatnosc] = useState(false)
  const [arkuszKoszt, setArkuszKoszt] = useState(false)
  const [dniDoRozliczenia, setDniDoRozliczenia] = useState<NierozliczonyDzien[]>([])
  const [wybranyKosztId, setWybranyKosztId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastStan | null>(null)
  // Po własnym rozliczeniu wyciszamy powiadomienie o przypisaniu (to nasza akcja).
  const wyciszDo = useRef(0)

  const stan = useNierozliczone(dzisiaj)

  const zamknijToast = useCallback(() => setToast(null), [])
  const pokazToast = useCallback((tone: ToastTone, tekst: string) => setToast({ tone, tekst }), [])

  const kosztyStan = useKoszty({
    onPrzypisanie: () => {
      if (Date.now() < wyciszDo.current) return
      pokazToast('success', 'Przypisano karty na koszt — pokrycie zaktualizowane.')
    },
  })

  function otworzPlatnosc() {
    if (stan.dzisRozliczony) {
      pokazToast('error', 'Dzień jest rozliczony — nie dodasz już płatności.')
      return
    }
    setArkuszPlatnosc(true)
  }

  const zamknijRozlicz = useCallback(() => setDniDoRozliczenia([]), [])

  const rozliczOtwarty = dniDoRozliczenia.length > 0
  const wybranyKoszt = wybranyKosztId
    ? (kosztyStan.koszty.find((k) => k.id === wybranyKosztId) ?? null)
    : null

  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-md px-6 pt-10 pb-28">
        {tab === 'rozliczenia' ? (
          <RozliczeniaScreen stan={stan} onRozlicz={setDniDoRozliczenia} />
        ) : (
          <FinanseScreen stan={kosztyStan} onWybierzKoszt={(k) => setWybranyKosztId(k.id)} />
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md">
        <BottomNav
          active={tab}
          onNavigate={setTab}
          onDodajPlatnosc={otworzPlatnosc}
          onDodajKoszt={() => setArkuszKoszt(true)}
        />
      </div>

      <DodajPlatnoscSheet
        open={arkuszPlatnosc}
        onClose={() => setArkuszPlatnosc(false)}
        stylistka={kto}
        onZapisano={() => {
          void stan.odswiez()
          pokazToast('success', 'Zapisano płatność.')
        }}
      />

      <DodajKosztSheet
        open={arkuszKoszt}
        onClose={() => setArkuszKoszt(false)}
        stylistka={kto}
        onZapisano={() => {
          void kosztyStan.odswiez()
          pokazToast('success', 'Zapisano koszt.')
        }}
      />

      {rozliczOtwarty && (
        <RozliczScreen
          dni={dniDoRozliczenia}
          koszty={kosztyStan.koszty}
          stylistka={kto}
          onOdswiez={stan.odswiez}
          onZamknij={zamknijRozlicz}
          onZatwierdzanie={() => {
            // Realtime echo naszego przypisania dotrze po commicie — wycisz je na chwilę.
            wyciszDo.current = Date.now() + 8000
          }}
          onToast={pokazToast}
        />
      )}

      {wybranyKoszt && (
        <KosztSzczegolScreen
          koszt={wybranyKoszt}
          onZamknij={() => setWybranyKosztId(null)}
          onZmiana={kosztyStan.odswiez}
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
