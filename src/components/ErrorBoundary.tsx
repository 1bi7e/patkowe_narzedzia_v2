import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorScreen } from './ErrorScreen'

type Props = { children: ReactNode }
type State = { blad: boolean }

/**
 * Łapie nieoczekiwane wyjątki renderu w drzewie aplikacji i pokazuje markowy
 * ekran zamiast białej strony. Uwaga: błąd konfiguracji Supabase leci przy
 * imporcie modułu (przed renderem), więc ten boundary go NIE złapie — obsługuje
 * go main.tsx przez dynamiczny import App z `.catch()`.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { blad: false }

  static getDerivedStateFromError(): State {
    return { blad: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nieobsłużony błąd renderu:', error, info)
  }

  render() {
    if (this.state.blad) {
      return (
        <ErrorScreen
          overline="Ups"
          naglowek={['Coś poszło ', 'nie tak']}
          opis="Aplikacja się zacięła. Odśwież stronę — Twoje dane są bezpieczne."
        />
      )
    }
    return this.props.children
  }
}
