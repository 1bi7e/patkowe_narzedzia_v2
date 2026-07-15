import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Brak konfiguracji Supabase — ustaw VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY w pliku .env.local (wzór w .env.example)',
  )
}

/**
 * Współdzielony klient Supabase. Aplikacja nie używa auth Supabase —
 * „logowanie" to wybór profilu (Patrycja/Agata) w localStorage, więc
 * persistSession jest wyłączone.
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: false },
})
