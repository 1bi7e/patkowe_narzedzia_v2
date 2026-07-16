import { useEffect, useState } from 'react'
import { Button, Icon, Input } from '../components'
import type { ToastTone } from '../components'
import { formatDzienNaglowek } from '../lib/dzien'
import { formatZlote, parseZloteNaGrosze } from '../lib/format'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import { sumaDniaZPodsumowania, type NierozliczonyDzien, type PrzypisanieKart } from '../lib/nierozliczone'
import { rozliczDni } from '../lib/rozliczenia'
import type { CostCoverage, Stylistka } from '../types'

type RozliczScreenProps = {
  /** Dni do rozliczenia (≥1) — snapshot z ekranu Rozliczenia. */
  dni: NierozliczonyDzien[]
  /** Koszty z pokryciem — do przypisania kart Agaty (Sposób 2). */
  koszty: CostCoverage[]
  stylistka: Stylistka
  /** Odświeżenie stanu nadrzędnego (sumy muszą zgadzać się z bazą). */
  onOdswiez: () => Promise<void>
  onZamknij: () => void
  /** Wołane w chwili startu zatwierdzania — powłoka wycisza echo realtime własnego przypisania. */
  onZatwierdzanie: () => void
  onToast: (tone: ToastTone, tekst: string) => void
}

/**
 * Zatwierdzenie rozliczenia — jeden lub wiele dni naraz (atomowo, RPC rozlicz_dni).
 * Pokazuje sumy kart per dzień. Sposób 2: Agata może przypisać swoje karty na
 * niepokryte koszty (zamiast oddać gotówkę) — do wysokości swoich kart z tych dni;
 * po zatwierdzeniu pokrycie kosztów aktualizuje się u obu stylistek (realtime).
 */
export function RozliczScreen({ dni, koszty, stylistka, onOdswiez, onZamknij, onZatwierdzanie, onToast }: RozliczScreenProps) {
  const [zatwierdzam, setZatwierdzam] = useState(false)
  const [kwotyPrzypisan, setKwotyPrzypisan] = useState<Record<string, string>>({})
  const wiele = dni.length > 1
  const razemKarty = dni.reduce((s, d) => s + d.sumy.patrycja.karta + d.sumy.agata.karta, 0)

  // Świeże dane tuż po wejściu — trigger bazy waliduje sumy kart per dzień.
  useEffect(() => {
    void onOdswiez()
  }, [onOdswiez])

  // Sposób 2: budżet = karty Agaty z wybranych dni; cel = koszty z niepokrytym saldem
  // (pozostalo > 0 wyklucza też „tylko moja", którego pozostalo_grosze jest null).
  const budzetAgaty = dni.reduce((s, d) => s + d.sumy.agata.karta, 0)
  const niepokryte = koszty.filter((k) => k.tryb !== 'only_mine' && (k.pozostalo_grosze ?? 0) > 0)
  // grosze: puste pole i „0" = 0 (pomiń), tekst niepoprawny = -1 (blokuje zatwierdzenie).
  const pozycje = niepokryte.map((k) => {
    const tekst = kwotyPrzypisan[k.id] ?? ''
    const grosze = parseZloteNaGrosze(tekst, { zeroOk: true }) ?? -1
    const pozostalo = k.pozostalo_grosze ?? 0
    return { koszt: k, tekst, grosze, pozostalo }
  })
  const sumaPrzypisan = pozycje.reduce((s, p) => s + Math.max(0, p.grosze), 0)
  const pozostalyBudzet = budzetAgaty - sumaPrzypisan
  const jakisNiepoprawny = pozycje.some((p) => p.grosze < 0 || p.grosze > p.pozostalo)
  const przekroczonyBudzet = sumaPrzypisan > budzetAgaty
  const pokazPrzypisania = budzetAgaty > 0 && niepokryte.length > 0
  const blokada = zatwierdzam || dni.length === 0 || jakisNiepoprawny || przekroczonyBudzet

  async function zatwierdz() {
    const przypisania: PrzypisanieKart[] = pozycje
      .filter((p) => p.grosze > 0)
      .map((p) => ({ cost_id: p.koszt.id, kwota_grosze: p.grosze }))

    // Wycisz echo realtime naszego własnego przypisania (przed pierwszym await).
    onZatwierdzanie()
    setZatwierdzam(true)
    const wynik = await rozliczDni(
      dni.map((d) => sumaDniaZPodsumowania(d.data, d.sumy)),
      stylistka,
      przypisania,
    )

    if (!wynik.ok) {
      setZatwierdzam(false)
      await onOdswiez()
      if (wynik.powod === 'sumy_rozne') {
        onToast('error', 'Sumy kart się zmieniły — odświeżono. Otwórz rozliczenie ponownie.')
        onZamknij()
      } else if (wynik.powod === 'juz_rozliczony') {
        onToast('error', 'Ten dzień został już rozliczony — odświeżono.')
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

        {pokazPrzypisania && (
          <section className="mt-6 rounded-md border border-rose-200 bg-cream-25 p-5 shadow-satin-sm">
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold-600">
              Przypisz karty na koszt
            </p>
            <p className="mt-2 text-[13px] text-brown-600">
              Karty Agaty mogą pokryć jej dług zamiast gotówki. Przypisanie jest finalne.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              {pozycje.map((p) => {
                const err =
                  p.grosze < 0
                    ? 'Niepoprawna kwota'
                    : p.grosze > p.pozostalo
                      ? `Maks. ${formatZlote(p.pozostalo)} zł`
                      : undefined
                return (
                  <Input
                    key={p.koszt.id}
                    label={p.koszt.nazwa}
                    placeholder="0"
                    hint={err ? undefined : `pozostało ${formatZlote(p.pozostalo)} zł`}
                    error={err}
                    value={p.tekst}
                    onChange={(e) =>
                      setKwotyPrzypisan((prev) => ({ ...prev, [p.koszt.id]: e.target.value }))
                    }
                  />
                )
              })}
            </div>

            <div className="mt-4 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[13px] uppercase tracking-[0.08em] text-brown-500">
                Pozostały budżet kart Agaty
              </span>
              <span
                className={[
                  'text-[16px] font-medium tabular-nums',
                  przekroczonyBudzet ? 'text-error-500' : 'text-brown-800',
                ].join(' ')}
              >
                {formatZlote(Math.max(0, pozostalyBudzet))} zł
              </span>
            </div>
            {przekroczonyBudzet && (
              <p className="mt-2 text-[13px] text-error-500">
                Przypisania przekraczają karty Agaty z tych dni.
              </p>
            )}
          </section>
        )}

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
            disabled={blokada}
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
