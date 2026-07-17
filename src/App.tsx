import { SesjaProvider, useSesja } from './context/SesjaContext'
import { StylistkaProvider, useStylistka } from './context/StylistkaContext'
import { LogowanieScreen } from './screens/LogowanieScreen'
import { WyborKontaScreen } from './screens/WyborKontaScreen'
import { AppShell } from './screens/AppShell'
import { ComponentsGallery } from './screens/ComponentsGallery'

export default function App() {
  // Prosty gate deweloperski — galeria komponentów pod /dev/components.
  // Zostaje przed bramką: to statyczne demo, nie dotyka bazy.
  if (typeof window !== 'undefined' && window.location.pathname === '/dev/components') {
    return <ComponentsGallery />
  }

  return (
    <SesjaProvider>
      <Brama />
    </SesjaProvider>
  )
}

/**
 * Dwa różne progi, celowo rozdzielone: hasło salonu to autoryzacja (chroni
 * dane przed obcymi), wybór profilu to tylko kontekst wpisu.
 */
function Brama() {
  const { sesja, wczytywanie } = useSesja()

  // Puste tło zamiast ekranu hasła, dopóki nie wiadomo, czy sesja jest zapisana
  // — inaczej przy każdym starcie mrugałby formularz.
  if (wczytywanie) return <main className="min-h-dvh" />
  if (!sesja) return <LogowanieScreen />

  return (
    <StylistkaProvider>
      <Root />
    </StylistkaProvider>
  )
}

/** Bez wybranego profilu pokazujemy wybór konta, w przeciwnym razie aplikację. */
function Root() {
  const { stylistka } = useStylistka()
  return stylistka ? <AppShell /> : <WyborKontaScreen />
}
