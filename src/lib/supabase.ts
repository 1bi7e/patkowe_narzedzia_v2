import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
// Supabase przemianował klucze „anon" na „publishable" — używamy nowej nazwy,
// z fallbackiem do starej dla zgodności ze starszymi konfiguracjami.
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !publishableKey) {
  throw new Error(
    'Brak konfiguracji Supabase — ustaw VITE_SUPABASE_URL i VITE_SUPABASE_PUBLISHABLE_KEY w pliku .env.local (wzór w .env.example)',
  )
}

/**
 * Współdzielony klient Supabase. Aplikacja loguje się na jedno wspólne konto
 * salonu (patrz `lib/auth.ts`) — to jest bramka chroniąca dane, bo RLS wpuszcza
 * wyłącznie rolę `authenticated`. Wybór profilu (Patrycja/Agata) to osobna
 * sprawa: kontekst wpisu w localStorage, nie autoryzacja.
 *
 * Sesja musi przeżyć zamknięcie PWA, żeby dziewczyny podawały hasło raz na
 * telefon — stąd persistSession i odświeżanie tokenu w tle.
 */
export const supabase = createClient<Database>(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
