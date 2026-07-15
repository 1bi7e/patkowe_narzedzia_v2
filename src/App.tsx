import { PlaceholderScreen } from './screens/PlaceholderScreen'
import { ComponentsGallery } from './screens/ComponentsGallery'

export default function App() {
  // Prosty gate deweloperski — galeria komponentów pod /dev/components.
  // Router dodamy przy budowie właściwych ekranów aplikacji.
  if (typeof window !== 'undefined' && window.location.pathname === '/dev/components') {
    return <ComponentsGallery />
  }

  return <PlaceholderScreen />
}
