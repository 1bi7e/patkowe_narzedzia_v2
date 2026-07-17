import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorScreen } from './components/ErrorScreen'

// App importowane dynamicznie: brak konfiguracji Supabase rzuca wyjątek przy
// ewaluacji modułu (zanim React wyrenderuje), więc ErrorBoundary by go nie złapał.
// Dynamiczny import zamienia go w odrzuconą obietnicę, którą obsługujemy poniżej.
const root = createRoot(document.getElementById('root')!)

import('./App')
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
  })
  .catch((err: unknown) => {
    console.error('Nie udało się uruchomić aplikacji:', err)
    const komunikat = err instanceof Error ? err.message : String(err)
    // Rozróżniamy brak konfiguracji Supabase (rzucany świadomie w supabase.ts)
    // od pozostałych porażek importu (brak sieci, chunk-load po redeployu) —
    // inaczej błąd sieci pokazywałby mylące „Brak połączenia z bazą".
    const bladKonfiguracji = komunikat.includes('Brak konfiguracji Supabase')
    root.render(
      bladKonfiguracji ? (
        <ErrorScreen
          overline="Konfiguracja"
          naglowek={['Brak połączenia z ', 'bazą']}
          opis="Aplikacja nie ma dostępu do danych. Sprawdź ustawienia i odśwież."
          szczegol={komunikat}
        />
      ) : (
        <ErrorScreen
          overline="Ups"
          naglowek={['Nie udało się ', 'uruchomić']}
          opis="Nie udało się wczytać aplikacji. Sprawdź połączenie i odśwież."
          szczegol={komunikat}
        />
      ),
    )
  })
