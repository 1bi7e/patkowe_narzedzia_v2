import { StylistkaProvider, useStylistka } from './context/StylistkaContext'
import { WyborKontaScreen } from './screens/WyborKontaScreen'
import { AppShell } from './screens/AppShell'
import { ComponentsGallery } from './screens/ComponentsGallery'

export default function App() {
  // Prosty gate deweloperski — galeria komponentów pod /dev/components.
  if (typeof window !== 'undefined' && window.location.pathname === '/dev/components') {
    return <ComponentsGallery />
  }

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
