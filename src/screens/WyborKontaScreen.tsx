import logo from '../assets/logo.png'
import { Icon } from '../components'
import { useSesja } from '../context/SesjaContext'
import { useStylistka } from '../context/StylistkaContext'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import type { Stylistka } from '../types'

/**
 * Wybór profilu (Patrycja/Agata) — już za bramką hasła salonu.
 * To nie jest logowanie: ustawia tylko, na kogo zapisują się wpisy.
 */
export function WyborKontaScreen() {
  const { zaloguj } = useStylistka()
  const { wyjdzZSalonu } = useSesja()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center px-8 py-12 text-center">
      <div className="flex flex-1 flex-col items-center justify-center">
        <img
          src={logo}
          alt="Patkowe Cudeńka"
          className="mb-7 h-28 w-28 object-contain"
        />
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-gold-600">
          Salon stylizacji paznokci
        </p>
        <h1 className="mt-3 font-serif text-h1 font-medium text-brown-800">
          Patkowe <span className="italic text-rose-500">Cudeńka</span>
        </h1>
        <div className="mt-4 h-px w-32 bg-linear-to-r from-transparent via-gold-400 to-transparent" />
        <h2 className="mt-8 font-serif text-h3 font-medium text-brown-700">
          Kto <span className="italic text-rose-500">dziś</span> pracuje?
        </h2>

        <div className="mt-8 flex w-full flex-col gap-4">
          <KontoKarta stylistka="patrycja" onClick={() => zaloguj('patrycja')} />
          <KontoKarta stylistka="agata" onClick={() => zaloguj('agata')} />
        </div>

        <p className="mt-8 max-w-[300px] text-[13px] font-light leading-relaxed text-brown-400">
          Wybór ustawia tylko, na kogo zapisują się Twoje wpisy.
        </p>
      </div>

      <button
        type="button"
        onClick={wyjdzZSalonu}
        className="mt-6 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.1em] text-brown-400 transition-colors duration-[160ms] ease-satin hover:text-brown-600"
      >
        <Icon name="sign-out" size={14} />
        Wyjdź z salonu
      </button>
    </main>
  )
}

function KontoKarta({ stylistka, onClick }: { stylistka: Stylistka; onClick: () => void }) {
  const isP = stylistka === 'patrycja'
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 rounded-md border border-rose-200 bg-cream-25 px-[18px] py-4 text-left shadow-satin-sm transition-all duration-[160ms] ease-satin hover:shadow-satin active:scale-[0.98]"
    >
      <span
        className={[
          'flex h-[64px] w-[56px] shrink-0 items-center justify-center rounded-arch border font-serif text-[27px] italic text-brown-700',
          isP ? 'bg-gold-100 border-gold-300' : 'bg-rose-100 border-rose-300',
        ].join(' ')}
      >
        {isP ? 'P' : 'A'}
      </span>
      <span className="flex-1">
        <span className="block font-serif text-[18px] text-brown-800">{IMIE_STYLISTKI[stylistka]}</span>
        <span className="block text-[12px] uppercase tracking-[0.1em] text-brown-400">stylistka</span>
      </span>
      <Icon name="caret-right" size={20} className="text-gold-500" />
    </button>
  )
}
