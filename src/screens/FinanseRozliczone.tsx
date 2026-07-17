import { useState } from 'react'
import { Awatar, Button, Icon, Sheet } from '../components'
import type { ToastTone } from '../components'
import { formatDzienNaglowek } from '../lib/dzien'
import { formatZlote } from '../lib/format'
import { cofnijRozliczenie, oznaczGotowkeOddana } from '../lib/rozliczenia'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import { useOnline } from '../lib/useOnline'
import type { StanRozliczone } from '../lib/useRozliczone'
import type { DaySettlement, Stylistka } from '../types'

const KOMUNIKAT_OFFLINE = 'Jesteś offline — akcja wróci z połączeniem.'

type FinanseRozliczoneProps = {
  stan: StanRozliczone
  stylistka: Stylistka
  onToast: (tone: ToastTone, tekst: string) => void
}

/**
 * Pod-zakładka „Rozliczone": lista rozliczonych dni. Każdy dzień pokazuje karty
 * z terminala, gotówkę należną Agacie (karty Agaty − przypisania) z odhaczaniem
 * „przekazano", oraz cofnięcie rozliczenia (za potwierdzeniem). Zmiany propagują
 * się na drugi telefon przez realtime (useRozliczone subskrybuje day_settlements).
 */
export function FinanseRozliczone({ stan, stylistka, onToast }: FinanseRozliczoneProps) {
  const online = useOnline()
  const { rozliczenia, ladowanie, blad, odswiez } = stan
  // Rozliczenia w trakcie zmiany (odhaczanie / cofanie) — blokują ponowne tapnięcie.
  const [zajete, setZajete] = useState<Set<string>>(new Set())
  // Rozliczenie oczekujące na potwierdzenie cofnięcia (arkusz).
  const [doCofniecia, setDoCofniecia] = useState<DaySettlement | null>(null)

  function ustawZajete(id: string, wl: boolean) {
    setZajete((prev) => {
      const next = new Set(prev)
      if (wl) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function przelaczPrzekazano(s: DaySettlement) {
    if (!online) {
      onToast('error', KOMUNIKAT_OFFLINE)
      return
    }
    ustawZajete(s.id, true)
    const wynik = await oznaczGotowkeOddana(s.id, !s.gotowka_oddana, stylistka)
    ustawZajete(s.id, false)
    if (!wynik.ok) {
      await odswiez()
      onToast('error', wynik.powod === 'juz_cofniete' ? 'Tego rozliczenia już nie ma — odświeżono.' : wynik.komunikat)
      return
    }
    await odswiez()
  }

  async function cofnij(s: DaySettlement) {
    if (!online) {
      onToast('error', KOMUNIKAT_OFFLINE)
      return
    }
    ustawZajete(s.id, true)
    const wynik = await cofnijRozliczenie(s.id)
    ustawZajete(s.id, false)
    setDoCofniecia(null)
    await odswiez()
    if (!wynik.ok) {
      onToast('error', wynik.powod === 'juz_cofniete' ? 'Rozliczenie było już cofnięte — odświeżono.' : wynik.komunikat)
      return
    }
    onToast('success', 'Cofnięto rozliczenie — dzień wrócił do Rozliczeń.')
  }

  return (
    <div>
      {blad && <p className="text-[13px] text-error-500">Nie udało się wczytać: {blad}</p>}

      {ladowanie && rozliczenia.length === 0 ? (
        <p className="mt-8 py-6 text-center font-light text-brown-400">Wczytuję…</p>
      ) : rozliczenia.length === 0 ? (
        <p className="mt-8 py-6 text-center font-light text-brown-400">
          Brak rozliczonych dni. Rozlicz dzień w zakładce „Rozliczenia".
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {rozliczenia.map((s) => (
            <KartaRozliczenia
              key={s.id}
              settlement={s}
              zajete={zajete.has(s.id)}
              online={online}
              onPrzelaczPrzekazano={() => przelaczPrzekazano(s)}
              onCofnij={() => setDoCofniecia(s)}
            />
          ))}
        </div>
      )}

      <Sheet
        open={doCofniecia !== null}
        onClose={() => setDoCofniecia(null)}
        title="Cofnąć rozliczenie?"
      >
        {doCofniecia && (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] text-brown-700">
              Dzień <span className="font-medium">{formatDzienNaglowek(doCofniecia.data)}</span> wróci
              do rozliczenia — wpisy znów będzie można edytować, a przypisania kart z tego dnia znikną.
            </p>

            {doCofniecia.gotowka_oddana && (
              <div className="flex items-start gap-[10px] rounded-md border border-gold-300 bg-gold-100 px-[14px] py-[12px]">
                <Icon name="warning-circle" size={18} className="mt-[2px] text-gold-700" />
                <p className="text-[13px] text-brown-700">
                  Gotówka była oznaczona jako przekazana Agacie — cofnięcie usunie ten zapis.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                onClick={() => setDoCofniecia(null)}
                disabled={zajete.has(doCofniecia.id)}
              >
                Anuluj
              </Button>
              <Button
                variant="dark"
                size="lg"
                fullWidth
                onClick={() => cofnij(doCofniecia)}
                disabled={zajete.has(doCofniecia.id) || !online}
              >
                {zajete.has(doCofniecia.id) ? 'Cofam…' : 'Tak, cofnij'}
              </Button>
            </div>
            {!online && <p className="text-[13px] text-brown-500">{KOMUNIKAT_OFFLINE}</p>}
          </div>
        )}
      </Sheet>
    </div>
  )
}

function KartaRozliczenia({
  settlement,
  zajete,
  online,
  onPrzelaczPrzekazano,
  onCofnij,
}: {
  settlement: DaySettlement
  zajete: boolean
  online: boolean
  onPrzelaczPrzekazano: () => void
  onCofnij: () => void
}) {
  const s = settlement
  const maGotowke = s.gotowka_dla_agaty_grosze > 0

  return (
    <section className="rounded-md border border-rose-200 bg-cream-25 p-5 shadow-satin-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold-600">
          {formatDzienNaglowek(s.data)}
        </p>
        <span className="text-[11px] uppercase tracking-[0.1em] text-brown-400">
          rozliczyła {IMIE_STYLISTKI[s.zatwierdzila]}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <WierszKarty stylistka="patrycja" grosze={s.suma_kart_patrycja_grosze} />
        <WierszKarty stylistka="agata" grosze={s.suma_kart_agata_grosze} />
      </div>

      <div className="mt-4 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />

      {maGotowke ? (
        <>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-[13px] text-brown-600">Do oddania Agacie</span>
            <span className="font-serif text-[19px] font-medium text-brown-800 tabular-nums">
              {formatZlote(s.gotowka_dla_agaty_grosze)} zł
            </span>
          </div>

          <button
            type="button"
            role="checkbox"
            aria-checked={s.gotowka_oddana}
            onClick={onPrzelaczPrzekazano}
            disabled={zajete || !online}
            className="mt-3 flex w-full items-center gap-[11px] rounded-sm border border-rose-200 bg-cream-50 px-[13px] py-[11px] text-left transition-colors duration-[140ms] disabled:opacity-[0.55]"
          >
            <span
              className={[
                'flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border',
                s.gotowka_oddana
                  ? 'border-gold-300 bg-[image:var(--gradient-satin-gold)]'
                  : 'border-rose-300 bg-cream-25',
              ].join(' ')}
            >
              {s.gotowka_oddana && <Icon name="check" size={15} className="text-brown-800" />}
            </span>
            <span className="flex-1 text-[14px] text-brown-700">
              {s.gotowka_oddana ? 'Gotówka przekazana' : 'Oznacz jako przekazaną'}
            </span>
            {s.gotowka_oddana && s.gotowka_oddana_przez && (
              <span className="text-[11px] uppercase tracking-[0.08em] text-brown-400">
                {IMIE_STYLISTKI[s.gotowka_oddana_przez]}
              </span>
            )}
          </button>
        </>
      ) : (
        <p className="mt-4 text-[13px] text-brown-500">Bez gotówki do przekazania Agacie.</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          icon="arrow-counter-clockwise"
          onClick={onCofnij}
          disabled={zajete}
        >
          Cofnij rozliczenie
        </Button>
      </div>
    </section>
  )
}

function WierszKarty({ stylistka, grosze }: { stylistka: Stylistka; grosze: number }) {
  return (
    <div className="flex items-center gap-[10px]">
      <Awatar stylistka={stylistka} size={24} />
      <span className="flex-1 text-[14px] text-brown-700">{IMIE_STYLISTKI[stylistka]}</span>
      <span className="text-[11px] uppercase tracking-[0.08em] text-brown-400">karta</span>
      <span className="text-[15px] font-medium text-brown-800 tabular-nums">{formatZlote(grosze)} zł</span>
    </div>
  )
}
