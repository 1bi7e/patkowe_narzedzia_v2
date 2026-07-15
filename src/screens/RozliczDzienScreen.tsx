import { useEffect, useState } from 'react'
import { Button, Icon } from '../components'
import type { ToastTone } from '../components'
import { formatDzienNaglowek } from '../lib/dzien'
import { formatZlote } from '../lib/format'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import { podsumujDzien } from '../lib/sumy'
import { supabase } from '../lib/supabase'
import type { StanDnia } from '../lib/useDzien'
import type { Stylistka } from '../types'

type RozliczDzienScreenProps = {
  stan: StanDnia
  stylistka: Stylistka
  onZamknij: () => void
  onToast: (tone: ToastTone, tekst: string) => void
}

/**
 * Rozliczenie dnia — bez przypisywania kart na koszt (to osobne zadanie).
 * Pokazuje sumy kart per stylistka i wywołuje RPC `rozlicz_dzien` z pustą listą
 * przypisań; sumy muszą zgadzać się z bazą, więc odświeżamy je przy wejściu.
 */
export function RozliczDzienScreen({ stan, stylistka, onZamknij, onToast }: RozliczDzienScreenProps) {
  const { data, platnosci, rozliczenie, odswiez } = stan
  const [zatwierdzam, setZatwierdzam] = useState(false)
  const sumy = podsumujDzien(platnosci)
  const razemKarty = sumy.patrycja.karta + sumy.agata.karta
  const rozliczony = rozliczenie !== null

  // Świeże dane tuż po wejściu — sumy kart muszą zgadzać się z bazą.
  useEffect(() => {
    void odswiez()
  }, [odswiez])

  async function zatwierdz() {
    setZatwierdzam(true)
    const { error } = await supabase.rpc('rozlicz_dzien', {
      p_data: data,
      p_zatwierdzila: stylistka,
      p_suma_kart_patrycja_grosze: sumy.patrycja.karta,
      p_suma_kart_agata_grosze: sumy.agata.karta,
      p_przypisania: [],
    })

    if (error) {
      setZatwierdzam(false)
      await odswiez()
      const sumyRozne = /sum|zgadz|odśwież|odswiez/i.test(error.message)
      onToast(
        'error',
        sumyRozne
          ? 'Sumy kart się zmieniły — odświeżono podsumowanie. Spróbuj ponownie.'
          : error.message,
      )
      return
    }

    await odswiez()
    onToast('success', 'Dzień rozliczony — wpisy zablokowane.')
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
          Rozlicz dzień<span className="italic text-rose-500">.</span>
        </h1>
        <p className="mt-1 text-[13px] font-medium uppercase tracking-[0.16em] text-gold-600">
          {formatDzienNaglowek(data)}
        </p>

        <section className="mt-8 rounded-md border border-rose-200 bg-cream-25 p-5 shadow-satin-sm">
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold-600">
            Karty z terminala — dziś
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <WierszKarty stylistka="patrycja" grosze={sumy.patrycja.karta} />
            <WierszKarty stylistka="agata" grosze={sumy.agata.karta} />
          </div>
          <div className="mt-4 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-[13px] uppercase tracking-[0.08em] text-brown-500">Razem karty</span>
            <span className="text-[18px] font-medium text-brown-800 tabular-nums">
              {formatZlote(razemKarty)} zł
            </span>
          </div>
        </section>

        {rozliczony ? (
          <>
            <div className="mt-6 flex items-start gap-[10px] rounded-md border border-success-500 bg-success-100 px-[14px] py-[12px]">
              <Icon name="check-circle" weight="fill" size={18} className="mt-[2px] text-success-700" />
              <p className="text-[13px] text-brown-700">Dzień jest już rozliczony — wpisy są zablokowane.</p>
            </div>
            <div className="mt-6">
              <Button variant="outline" size="lg" fullWidth onClick={onZamknij}>
                Wróć do Dziś
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 flex items-start gap-[10px] rounded-md border border-gold-300 bg-gold-100 px-[14px] py-[12px]">
              <Icon name="lock-simple" size={18} className="mt-[2px] text-gold-700" />
              <p className="text-[13px] text-brown-700">
                Nieodwracalne — wpisy z dziś zostaną zablokowane. Rozliczyć może każda z Was, ale tylko raz.
              </p>
            </div>
            <div className="mt-6">
              <Button
                variant="gold"
                size="lg"
                fullWidth
                icon="lock-simple"
                disabled={zatwierdzam || platnosci.length === 0}
                onClick={zatwierdz}
              >
                {zatwierdzam ? 'Rozliczam…' : 'Zatwierdź dzień'}
              </Button>
            </div>
          </>
        )}
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
