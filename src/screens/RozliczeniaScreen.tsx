import { useState } from 'react'
import { Awatar, Button, EntryCard, Icon, KontoPill } from '../components'
import type { ToastTone } from '../components'
import { useStylistka } from '../context/StylistkaContext'
import { formatDzienNaglowek } from '../lib/dzien'
import { formatZlote } from '../lib/format'
import type { NierozliczonyDzien } from '../lib/nierozliczone'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import { podsumujDzien, type PodsumowanieStylistki } from '../lib/sumy'
import { useAkcjeRozliczenia } from '../lib/useAkcjeRozliczenia'
import type { StanRozliczen } from '../lib/useNierozliczone'
import type { StanRozliczone } from '../lib/useRozliczone'
import type { DaySettlement, Payment, Stylistka } from '../types'

type RozliczeniaScreenProps = {
  stan: StanRozliczen
  /** Rozliczone dni (z AppShell) — źródło kart-zadań „gotówka dla Agaty". */
  rozliczone: StanRozliczone
  /** Otwiera zatwierdzenie rozliczenia dla podanych dni. */
  onRozlicz: (dni: NierozliczonyDzien[]) => void
  /** Otwiera arkusz edycji wybranej płatności (poprawka przed rozliczeniem). */
  onEdytujPlatnosc: (platnosc: Payment) => void
  onToast: (tone: ToastTone, tekst: string) => void
}

/**
 * Ekran „Rozliczenia" (home): wszystko, co wymaga działania. Na górze
 * karty-zadania „gotówka dla Agaty" z rozliczeń bez przekazanej gotówki,
 * niżej wszystkie nierozliczone dni pogrupowane po dacie (najstarszy pierwszy).
 * Przy ≥2 dniach checkboxy pozwalają wybrać, które dni rozliczyć jedną akcją;
 * przy jednym dniu — prosty przycisk „Rozlicz dzień".
 */
export function RozliczeniaScreen({
  stan,
  rozliczone,
  onRozlicz,
  onEdytujPlatnosc,
  onToast,
}: RozliczeniaScreenProps) {
  const { stylistka, wyloguj } = useStylistka()
  const kto = stylistka as Stylistka
  const { dzis, dni, dzisRozliczony, ladowanie, blad } = stan
  const [zazn, setZazn] = useState<Set<string>>(new Set())
  const wieleDni = dni.length >= 2
  const akcje = useAkcjeRozliczenia({ odswiez: rozliczone.odswiez, onToast, stylistka: kto })

  // Zadania: nieprzekazana gotówka z rozliczonych dni, najstarszy dług pierwszy.
  const doOddania = rozliczone.rozliczenia
    .filter((s) => s.gotowka_dla_agaty_grosze > 0 && !s.gotowka_oddana)
    .sort((a, b) => (a.data < b.data ? -1 : 1))

  function toggle(data: string) {
    setZazn((prev) => {
      const next = new Set(prev)
      if (next.has(data)) next.delete(data)
      else next.add(data)
      return next
    })
  }

  const wybrane = dni.filter((d) => zazn.has(d.data))
  // Sumy zbiorcze do kafelków — ze WSZYSTKICH nierozliczonych dni łącznie.
  const sumy = podsumujDzien(dni.flatMap((d) => d.platnosci))

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <p className="text-[19px] font-medium uppercase tracking-[0.16em] text-gold-600">
          Rozliczenia
        </p>
        <KontoPill stylistka={kto} onWyloguj={wyloguj} />
      </header>
      <div className="mt-4 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />

      {blad && <p className="mt-4 text-[13px] text-error-500">Nie udało się wczytać: {blad}</p>}

      {doOddania.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {doOddania.map((s) => (
            <KartaGotowkiDoOddania
              key={s.id}
              settlement={s}
              zajete={akcje.zajete.has(s.id)}
              online={akcje.online}
              onPrzekazana={() => void akcje.przelaczPrzekazano(s)}
            />
          ))}
        </div>
      )}

      {dni.length > 0 && (
        <div className="mt-6">
          <KafelkiPodsumowania sumy={sumy} kto={kto} />
        </div>
      )}

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
          {/* Wyświetlanie: dzisiejszy dzień na górze, starsze niżej (model trzyma
              rosnąco — patrz grupujNierozliczone; odwracamy tylko widok). */}
          {[...dni].reverse().map((d) => (
            <GrupaDnia
              key={d.data}
              dzien={d}
              jestDzis={d.data === dzis}
              zaznaczalny={wieleDni}
              zaznaczony={zazn.has(d.data)}
              onToggle={() => toggle(d.data)}
              onEdytujPlatnosc={onEdytujPlatnosc}
            />
          ))}
        </div>
      )}

      {dni.length > 0 && (
        <div
          className="sticky z-10 mt-8 -mx-6 px-6"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
        >
          {/* Maska: wiersze listy „gasną" w tło strony, wjeżdżając pod przycisk. */}
          <div className="pointer-events-none absolute inset-x-0 -top-8 bottom-[-48px] bg-linear-to-t from-cream-50 from-65% to-transparent" />
          <div className="relative">
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
  onEdytujPlatnosc,
}: {
  dzien: NierozliczonyDzien
  jestDzis: boolean
  zaznaczalny: boolean
  zaznaczony: boolean
  onToggle: () => void
  onEdytujPlatnosc: (platnosc: Payment) => void
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

      <div className="mt-3 flex flex-col gap-3">
        {[...dzien.platnosci].reverse().map((p) => (
          <EntryCard
            key={p.id}
            variant="payment"
            stylistka={p.stylistka}
            klient={p.klientka}
            metoda={p.metoda}
            grosze={p.kwota_grosze}
            locked={p.locked}
            onEdit={() => onEdytujPlatnosc(p)}
          />
        ))}
      </div>
    </section>
  )
}

/**
 * Karta-zadanie: gotówka z rozliczonego dnia, której Patrycja jeszcze nie
 * przekazała Agacie. Odhaczenie znika z home; stan (i cofnięcie odhaczenia)
 * pozostaje na karcie rozliczenia w Historii. Złoty akcent sekcji zadań.
 */
function KartaGotowkiDoOddania({
  settlement,
  zajete,
  online,
  onPrzekazana,
}: {
  settlement: DaySettlement
  zajete: boolean
  online: boolean
  onPrzekazana: () => void
}) {
  const s = settlement
  return (
    <section className="rounded-md border border-gold-300 bg-gold-100 p-[15px] shadow-satin-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-[7px] text-[12px] font-medium uppercase tracking-[0.14em] text-gold-700">
          <Icon name="coins" size={16} />
          Do oddania Agacie
        </span>
        <span className="text-[11px] uppercase tracking-[0.1em] text-brown-400">
          {formatDzienNaglowek(s.data)}
        </span>
      </div>

      <p className="mt-2 font-serif text-[24px] font-medium text-brown-800 tabular-nums">
        {formatZlote(s.gotowka_dla_agaty_grosze)} zł
      </p>

      <button
        type="button"
        role="checkbox"
        aria-checked={false}
        onClick={onPrzekazana}
        disabled={zajete || !online}
        className="mt-3 flex w-full items-center gap-[11px] rounded-sm border border-rose-200 bg-cream-25 px-[13px] py-[11px] text-left transition-colors duration-[140ms] disabled:opacity-[0.55]"
      >
        <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border border-rose-300 bg-cream-50" />
        <span className="flex-1 text-[14px] text-brown-700">Oznacz jako przekazaną</span>
      </button>
    </section>
  )
}

/**
 * Dwa kafelki podsumowania (per stylistka) — sumy karta/gotówka ze wszystkich
 * nierozliczonych dni. Zalogowana (`kto`) dostaje różowy wariant z „Ty".
 */
function KafelkiPodsumowania({
  sumy,
  kto,
}: {
  sumy: Record<Stylistka, PodsumowanieStylistki>
  kto: Stylistka
}) {
  return (
    <div className="flex gap-3">
      <KafelekStylistki stylistka="patrycja" sumy={sumy.patrycja} zalogowana={kto === 'patrycja'} />
      <KafelekStylistki stylistka="agata" sumy={sumy.agata} zalogowana={kto === 'agata'} />
    </div>
  )
}

function KafelekStylistki({
  stylistka,
  sumy,
  zalogowana,
}: {
  stylistka: Stylistka
  sumy: PodsumowanieStylistki
  zalogowana: boolean
}) {
  return (
    <div
      className={[
        'flex flex-1 flex-col gap-2 rounded-md border p-[13px_15px] shadow-satin-sm',
        zalogowana ? 'border-rose-300 bg-rose-100' : 'border-rose-200 bg-cream-25',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Awatar stylistka={stylistka} size={24} />
        <span className="text-[15px] font-medium text-brown-800">{IMIE_STYLISTKI[stylistka]}</span>
        {zalogowana && (
          <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.12em] text-rose-600">
            Ty
          </span>
        )}
      </div>
      <div
        className={[
          'h-px w-full bg-linear-to-r to-transparent',
          zalogowana ? 'from-rose-300' : 'from-gold-300',
        ].join(' ')}
      />
      <WierszKafelka etykieta="karta" grosze={sumy.karta} />
      <WierszKafelka etykieta="gotówka" grosze={sumy.gotowka} />
    </div>
  )
}

function WierszKafelka({ etykieta, grosze }: { etykieta: string; grosze: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[13px] font-light text-brown-600">{etykieta}</span>
      <span className="text-[17px] font-medium tabular-nums text-brown-800">
        {formatZlote(grosze)} zł
      </span>
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
