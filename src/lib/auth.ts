/**
 * Czysta warstwa logowania na wspólne konto salonu — bramka przed wyborem
 * profilu. Bez importu klienta Supabase, żeby dało się to testować w env
 * `node` (moduł `supabase.ts` rzuca przy imporcie, gdy brak zmiennych env).
 * Samo wywołanie `signInWithPassword` siedzi w `context/SesjaContext.tsx`.
 *
 * Hasło broni danych przed obcymi z internetu, a nie stylistek przed sobą:
 * obie dzielą jedno konto i widzą u siebie wszystko. Wybór profilu za bramką
 * pozostaje tym, czym był — kontekstem wpisu, nie autoryzacją.
 */

/**
 * Konto salonu w Supabase Auth. E-mail jest stały, bo UI pyta wyłącznie
 * o hasło — musi zgadzać się z użytkownikiem założonym w panelu Supabase.
 */
export const EMAIL_SALONU = 'salon@patkowecudenka.pl'

/** Powód nieudanego logowania — steruje komunikatem w UI. */
export type PowodBleduLogowania = 'zle_haslo' | 'za_duzo_prob' | 'inny'

export type WynikLogowania =
  | { ok: true }
  | { ok: false; powod: PowodBleduLogowania; komunikat: string }

/** Tłumaczy kod błędu Supabase Auth na powód i komunikat dla stylistek. */
export function bladLogowania(kod: string | undefined): {
  powod: PowodBleduLogowania
  komunikat: string
} {
  switch (kod) {
    case 'invalid_credentials':
      return { powod: 'zle_haslo', komunikat: 'Nieprawidłowe hasło.' }
    case 'over_request_rate_limit':
      return { powod: 'za_duzo_prob', komunikat: 'Za dużo prób — odczekaj chwilę.' }
    case 'email_not_confirmed':
      return { powod: 'inny', komunikat: 'Konto salonu czeka na potwierdzenie w Supabase.' }
    default:
      return { powod: 'inny', komunikat: 'Nie udało się zalogować. Spróbuj ponownie.' }
  }
}
