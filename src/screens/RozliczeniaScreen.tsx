import { useState } from 'react'
import { Button, EntryCard, Icon, KontoPill } from '../components'
import { useStylistka } from '../context/StylistkaContext'
import { formatDzienNaglowek } from '../lib/dzien'
import { formatZlote } from '../lib/format'
import type { NierozliczonyDzien } from '../lib/nierozliczone'
import type { PodsumowanieDnia } from '../lib/sumy'
import type { StanRozliczen } from '../lib/useNierozliczone'
import type { Stylistka } from '../types'

type RozliczeniaScreenProps = {
  stan: StanRozliczen
  /** Otwiera zatwierdzenie rozliczenia dla podanych dni. */
  onRozlicz: (dni: NierozliczonyDzien[]) => void
}

/**
 * Ekran „Rozliczenia": wszystkie nierozliczone dni pogrupowane po dacie
 * (najstarszy pierwszy). Przy ≥2 dniach checkboxy pozwalają wybrać, które dni
 * rozliczyć jedną akcją; przy jednym dniu — prosty przycisk „Rozlicz dzień".
 */
export function RozliczeniaScreen({ stan, onRozlicz }: RozliczeniaScreenProps) {
  const { stylistka, wyloguj } = useStylistka()
  const kto = stylistka as Stylistka
  const { dzis, dni, dzisRozliczony, ladowanie, blad } = stan
  const [zazn, setZazn] = useState<Set<string>>(new Set())
  const wieleDni = dni.length >= 2

  function toggle(data: string) {
    setZazn((prev) => {
      const next = new Set(prev)
      if (next.has(data)) next.delete(data)
      else next.add(data)
      return next
    })
  }

  const wybrane = dni.filter((d) => zazn.has(d.data))

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-gold-600">
            {formatDzienNaglowek(dzis)}
          </p>
          <h1 className="mt-1 font-serif text-h2 font-medium text-brown-800">
            Rozliczenia<span className="italic text-rose-500">.</span>
          </h1>
        </div>
        <KontoPill stylistka={kto} onWyloguj={wyloguj} />
      </header>

      {blad && <p className="mt-4 text-[13px] text-error-500">Nie udało się wczytać: {blad}</p>}

      {ladowanie && dni.length === 0 ? (
        <p className="mt-10 py-8 text-center font-light text-brown-400">Wczytuję…</p>
      ) : dni.length === 0 ? (
        <p className="mt-10 py-8 text-center font-light text-brown-400">
          {dzisRozliczony
            ? 'Dzień rozliczony — wpisy zablokowane.'
            : 'Nic do rozliczenia — dodaj płatność przyciskiem +.'}
        </p>
      ) : (
        <div className="mt-7 flex flex-col gap-8">
          {dni.map((d) => (
            <GrupaDnia
              key={d.data}
              dzien={d}
              jestDzis={d.data === dzis}
              zaznaczalny={wieleDni}
              zaznaczony={zazn.has(d.data)}
              onToggle={() => toggle(d.data)}
            />
          ))}
        </div>
      )}

      {dni.length > 0 && (
        <div className="mt-8">
          {wieleDni ? (
            <Button
              variant="gold"
              size="lg"
              fullWidth
              iconRight="arrow-right"
              disabled={wybrane.length === 0}
              onClick={() => onRozlicz(wybrane)}
            >
              {wybrane.length === 0
                ? 'Zaznacz dni do rozliczenia'
                : `Rozlicz zaznaczone (${wybrane.length})`}
            </Button>
          ) : (
            <Button
              variant="gold"
              size="lg"
              fullWidth
              iconRight="arrow-right"
              onClick={() => onRozlicz(dni)}
            >
              Rozlicz dzień
            </Button>
          )}
        </div>
      )}
    </>
  )
}

function GrupaDnia({
  dzien,
  jestDzis,
  zaznaczalny,
  zaznaczony,
  onToggle,
}: {
  dzien: NierozliczonyDzien
  jestDzis: boolean
  zaznaczalny: boolean
  zaznaczony: boolean
  onToggle: () => void
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold-600">
          {formatDzienNaglowek(dzien.data)}
          {jestDzis && <span className="ml-2 font-light text-brown-400">· dziś</span>}
        </p>
        {zaznaczalny && <Checkbox checked={zaznaczony} onToggle={onToggle} />}
      </div>
      <div className="mt-2 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />

      <SumyDnia sumy={dzien.sumy} />

      <div className="mt-3 flex flex-col gap-3">
        {dzien.platnosci.map((p) => (
          <EntryCard
            key={p.id}
            variant="payment"
            stylistka={p.stylistka}
            klient={p.klientka}
            metoda={p.metoda}
            grosze={p.kwota_grosze}
            locked={p.locked}
          />
        ))}
      </div>
    </section>
  )
}

function SumyDnia({ sumy }: { sumy: PodsumowanieDnia }) {
  return (
    <dl className="mt-3 flex flex-col gap-[5px]">
      <WierszSum etykieta="Karta" p={sumy.patrycja.karta} a={sumy.agata.karta} />
      <WierszSum etykieta="Gotówka" p={sumy.patrycja.gotowka} a={sumy.agata.gotowka} />
    </dl>
  )
}

function WierszSum({ etykieta, p, a }: { etykieta: string; p: number; a: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[11px] uppercase tracking-[0.1em] text-brown-400">{etykieta}</dt>
      <dd className="flex gap-4 text-[13px] tabular-nums text-brown-700">
        <span>
          <span className="text-brown-400">P</span> {formatZlote(p)} zł
        </span>
        <span>
          <span className="text-brown-400">A</span> {formatZlote(a)} zł
        </span>
      </dd>
    </div>
  )
}

function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={[
        'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px] border transition-colors duration-[140ms]',
        checked
          ? 'border-gold-300 bg-[image:var(--gradient-satin-gold)]'
          : 'border-rose-300 bg-cream-25',
      ].join(' ')}
    >
      {checked && <Icon name="check" size={16} className="text-brown-800" />}
    </button>
  )
}
