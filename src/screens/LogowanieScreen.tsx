import { useState } from 'react'
import type { FormEvent } from 'react'
import logo from '../assets/logo.png'
import { Button, Input } from '../components'
import { useSesja } from '../context/SesjaContext'
import { useOnline } from '../lib/useOnline'

const KOMUNIKAT_OFFLINE = 'Jesteś offline — logowanie wymaga połączenia.'

/**
 * Bramka przed wyborem profilu — jedno wspólne hasło salonu.
 * Wpisywane raz na telefon: sesja jest zapamiętywana (patrz SesjaContext).
 */
export function LogowanieScreen() {
  const { zaloguj } = useSesja()
  const online = useOnline()
  const [haslo, setHaslo] = useState('')
  const [blad, setBlad] = useState<string | null>(null)
  const [wysylanie, setWysylanie] = useState(false)

  async function wyslij(e: FormEvent) {
    e.preventDefault()
    if (!online) {
      setBlad(KOMUNIKAT_OFFLINE)
      return
    }
    if (!haslo) {
      setBlad('Podaj hasło.')
      return
    }

    setWysylanie(true)
    setBlad(null)
    const wynik = await zaloguj(haslo)

    // Po sukcesie App przełącza ekran i ten komponent znika — nie ruszamy
    // wtedy stanu, żeby nie mrugnąć formularzem i nie pisać po odmontowaniu.
    if (!wynik.ok) {
      setBlad(wynik.komunikat)
      setHaslo('')
      setWysylanie(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center px-8 py-12 text-center">
      <div className="flex flex-1 flex-col items-center justify-center">
        <img src={logo} alt="Patkowe Cudeńka" className="mb-7 h-28 w-28 object-contain" />
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-gold-600">
          Salon stylizacji paznokci
        </p>
        <h1 className="mt-3 font-serif text-h1 font-medium text-brown-800">
          Patkowe <span className="italic text-rose-500">Cudeńka</span>
        </h1>
        <div className="mt-4 h-px w-32 bg-linear-to-r from-transparent via-gold-400 to-transparent" />
        <h2 className="mt-8 font-serif text-h3 font-medium text-brown-700">
          Hasło <span className="italic text-rose-500">salonu</span>
        </h2>

        <form onSubmit={wyslij} className="mt-8 flex w-full flex-col gap-4">
          <Input
            type="password"
            icon="lock-simple"
            placeholder="Hasło"
            autoComplete="current-password"
            value={haslo}
            onChange={(e) => setHaslo(e.target.value)}
            error={blad ?? undefined}
          />
          <Button type="submit" fullWidth disabled={wysylanie || !online}>
            {wysylanie ? 'Wchodzę…' : 'Wejdź'}
          </Button>
        </form>

        <p className="mt-8 max-w-[300px] text-[13px] font-light leading-relaxed text-brown-400">
          {online
            ? 'Jedno hasło dla Was obu — wpisujesz je raz na telefonie.'
            : KOMUNIKAT_OFFLINE}
        </p>
      </div>
    </main>
  )
}
