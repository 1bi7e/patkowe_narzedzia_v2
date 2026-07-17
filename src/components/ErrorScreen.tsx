import { Icon } from './Icon'
import { Button } from './Button'

type ErrorScreenProps = {
  /** Złoty overline nad nagłówkiem (uppercase). */
  overline?: string
  /** [tekst bazowy, akcent w italiku] — akcent renderowany serifem w kolorze rose. */
  naglowek: [string, string]
  /** Lead — ciepłe, zrozumiałe zdanie dla użytkowniczki. */
  opis: string
  /** Krótka linia techniczna (np. treść błędu konfiguracji) — tylko gdy podana. */
  szczegol?: string
  /** Akcja przycisku „Odśwież". Domyślnie przeładowanie strony. */
  onOdswiez?: () => void
}

/**
 * Pełnoekranowy, markowy stan błędu — używany przez ErrorBoundary (nieoczekiwany
 * błąd renderu) oraz main.tsx (brak konfiguracji Supabase). Ciepły ton, bez
 * surowego stack trace dla użytkowniczek. Wzorzec wizualny jak WyborKontaScreen:
 * złoty overline → serif z italic akcentem → złota hairline → light lead.
 */
export function ErrorScreen({
  overline = 'Ups',
  naglowek: [baza, akcent],
  opis,
  szczegol,
  onOdswiez,
}: ErrorScreenProps) {
  const przeladuj = onOdswiez ?? (() => window.location.reload())
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-8 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-pill border border-rose-200 bg-rose-100">
        <Icon name="warning-circle" size={30} className="text-rose-500" />
      </span>
      <p className="mt-7 text-[12px] font-medium uppercase tracking-[0.18em] text-gold-600">
        {overline}
      </p>
      <h1 className="mt-3 font-serif text-h2 font-medium text-brown-800">
        {baza}
        <span className="italic text-rose-500">{akcent}</span>
      </h1>
      <div className="mt-4 h-px w-32 bg-linear-to-r from-transparent via-gold-400 to-transparent" />
      <p className="mt-6 max-w-[320px] text-[15px] font-light leading-relaxed text-brown-500">
        {opis}
      </p>
      {szczegol && (
        <p className="mt-4 max-w-[320px] break-words text-[12px] font-light leading-relaxed text-brown-400">
          {szczegol}
        </p>
      )}
      <div className="mt-8">
        <Button variant="rose" onClick={przeladuj}>
          Odśwież
        </Button>
      </div>
    </main>
  )
}
