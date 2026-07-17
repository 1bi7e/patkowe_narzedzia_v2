import { describe, expect, it } from 'vitest'
import { bladLogowania } from './auth'

describe('bladLogowania', () => {
  it('złe hasło daje powód zle_haslo i komunikat wprost o haśle', () => {
    expect(bladLogowania('invalid_credentials')).toEqual({
      powod: 'zle_haslo',
      komunikat: 'Nieprawidłowe hasło.',
    })
  })

  it('przekroczony limit prób prosi o odczekanie', () => {
    expect(bladLogowania('over_request_rate_limit')).toEqual({
      powod: 'za_duzo_prob',
      komunikat: 'Za dużo prób — odczekaj chwilę.',
    })
  })

  it('niepotwierdzone konto wskazuje na Supabase — to błąd konfiguracji, nie hasła', () => {
    expect(bladLogowania('email_not_confirmed')).toEqual({
      powod: 'inny',
      komunikat: 'Konto salonu czeka na potwierdzenie w Supabase.',
    })
  })

  it('nieznany kod nie sugeruje złego hasła', () => {
    const w = bladLogowania('some_new_supabase_code')
    expect(w.powod).toBe('inny')
    expect(w.komunikat).toBe('Nie udało się zalogować. Spróbuj ponownie.')
  })

  it('brak kodu (np. zerwana sieć) też ląduje w powodzie inny', () => {
    expect(bladLogowania(undefined).powod).toBe('inny')
  })
})
