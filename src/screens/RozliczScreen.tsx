import { useEffect, useState } from 'react'
import { Button, Icon } from '../components'
import type { ToastTone } from '../components'
import { formatDzienNaglowek } from '../lib/dzien'
import { formatZlote } from '../lib/format'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import { sumaDniaZPodsumowania, type NierozliczonyDzien } from '../lib/nierozliczone'
import { rozliczDni } from '../lib/rozliczenia'
import type { Stylistka } from '../types'

type RozliczScreenProps = {
  /** Dni do rozliczenia (≥1) — snapshot z ekranu Rozliczenia. */
  dni: NierozliczonyDzien[]
  stylistka: Stylistka
  /** Odświeżenie stanu nadrzędnego (sumy muszą zgadzać się z bazą). */
  onOdswiez: () => Promise<void>
  onZamknij: () => void
  onToast: (tone: ToastTone, tekst: string) => void
}

/**
 * Zatwierdzenie rozliczenia — jeden lub wiele dni naraz (atomowo, RPC rozlicz_dni).
 * Pokazuje sumy kart per dzień; przypisanie kart na koszt (Sposób 2) dojdzie, gdy
 * powstaną koszty/Finanse — na razie rozliczamy z pustą listą przypisań.
 */
export function RozliczScreen({ dni, stylistka, onOdswiez, onZamknij, onToast }: RozliczScreenProps) {
  const [zatwierdzam, setZatwierdzam] = useState(false)
  const wiele = dni.length > 1
  const razemKarty = dni.reduce((s, d) => s + d.sumy.patrycja.karta + d.sumy.agata.karta, 0)

  // Świeże dane tuż po wejściu — trigger bazy waliduje sumy kart per dzień.
  useEffect(() => {
    void onOdswiez()
  }, [onOdswiez])

  async function zatwierdz() {
    setZatwierdzam(true)
    const wynik = await rozliczDni(
      dni.map((d) => sumaDniaZPodsumowania(d.data, d.sumy)),
      stylistka,
    )

    if (!wynik.ok) {
      setZatwierdzam(false)
      await onOdswiez()
      if (wynik.sumyRozne) {
        onToast('error', 'Sumy kart się zmieniły — odświeżono. Otwórz rozliczenie ponownie.')
        onZamknij()
      } else {
        onToast('error', wynik.komunikat)
      }
      return
    }

    await onOdswiez()
    const n = dni.length
    onToast('success', `Rozliczono ${n} ${n === 1 ? 'dzień' : 'dni'} — wpisy zablokowane.`)
    onZamknij()
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-cream-50">
      <div
        className="mx-auto w-full max-w-md px-6"
        style={{
          paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
        }}
      >
        <button
          type="button"
          onClick={onZamknij}
          className="flex items-center gap-[6px] text-[14px] text-brown-500"
        >
          <Icon name="caret-right" size={18} className="rotate-180" />
          Wróć
        </button>

        <h1 className="mt-4 font-serif text-h2 font-medium text-brown-800">
          {wiele ? `Rozlicz ${dni.length} dni` : 'Rozlicz dzień'}
          <span className="italic text-rose-500">.</span>
        </h1>
        <p className="mt-1 text-[13px] font-medium uppercase tracking-[0.16em] text-gold-600">
          {wiele ? `${dni.length} dni do rozliczenia` : formatDzienNaglowek(dni[0]?.data ?? '')}
        </p>

        <section className="mt-8 rounded-md border border-rose-200 bg-cream-25 p-5 shadow-satin-sm">
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold-600">
            Karty z terminala
          </p>
          <div className="mt-4 flex flex-col gap-4">
            {dni.map((d) => (
              <div key={d.data}>
                {wiele && (
                  <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-brown-400">
                    {formatDzienNaglowek(d.data)}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <WierszKarty stylistka="patrycja" grosze={d.sumy.patrycja.karta} />
                  <WierszKarty stylistka="agata" grosze={d.sumy.agata.karta} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-[13px] uppercase tracking-[0.08em] text-brown-500">Razem karty</span>
            <span className="text-[18px] font-medium text-brown-800 tabular-nums">
              {formatZlote(razemKarty)} zł
            </span>
          </div>
        </section>

        <div className="mt-6 flex items-start gap-[10px] rounded-md border border-gold-300 bg-gold-100 px-[14px] py-[12px]">
          <Icon name="lock-simple" size={18} className="mt-[2px] text-gold-700" />
          <p className="text-[13px] text-brown-700">
            Nieodwracalne — wpisy z {wiele ? 'tych dni' : 'tego dnia'} zostaną zablokowane. Rozliczyć
            może każda z Was, ale tylko raz.
          </p>
        </div>
        <div className="mt-6">
          <Button
            variant="gold"
            size="lg"
            fullWidth
            icon="lock-simple"
            disabled={zatwierdzam || dni.length === 0}
            onClick={zatwierdz}
          >
            {zatwierdzam ? 'Rozliczam…' : 'Zatwierdź rozliczenie'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function WierszKarty({ stylistka, grosze }: { stylistka: Stylistka; grosze: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[15px] text-brown-700">{IMIE_STYLISTKI[stylistka]}</span>
      <span className="text-[16px] font-medium text-brown-800 tabular-nums">{formatZlote(grosze)} zł</span>
    </div>
  )
}
