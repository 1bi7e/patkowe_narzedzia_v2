import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Awatar, Button, Icon, Input } from '../components'
import type { ToastTone } from '../components'
import { formatDzienNaglowek } from '../lib/dzien'
import { formatZlote, groszeNaPole, parseZloteNaGrosze } from '../lib/format'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import {
  maksPrzypisania,
  sumaDniaZPodsumowania,
  type NierozliczonyDzien,
  type PrzypisanieKart,
} from '../lib/nierozliczone'
import { rozliczDni } from '../lib/rozliczenia'
import { useOnline } from '../lib/useOnline'
import type { CostCoverage, Stylistka } from '../types'

const KOMUNIKAT_OFFLINE = 'Jesteś offline — rozliczenie wróci z połączeniem.'

/** Co Agata robi ze swoimi kartami: bierze gotówkę czy przypisuje na koszt (Sposób 2). */
type Decyzja = 'gotowka' | 'koszt'

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
 * Pokazuje sumy kart per dzień, a dla kart Agaty jawny wybór: odbiera je gotówką
 * czy przypisuje na niepokryte koszty (Sposób 2) — do wysokości swoich kart z tych
 * dni. Po zatwierdzeniu pokrycie kosztów aktualizuje się u obu stylistek (realtime).
 */
export function RozliczScreen({ dni, koszty, stylistka, onOdswiez, onZamknij, onZatwierdzanie, onToast }: RozliczScreenProps) {
  const online = useOnline()
  const [zatwierdzam, setZatwierdzam] = useState(false)
  const [decyzja, setDecyzja] = useState<Decyzja>('gotowka')
  // Klucz obecny ⟺ koszt wybrany. Wartość to surowy tekst pola i MOŻE być pusta —
  // wybrany koszt z wyczyszczoną kwotą to 0 gr, nie „odznaczony". Odznaczenie usuwa
  // klucz, nigdy nie zapisuje ''. (Osobny Set byłby drugim źródłem prawdy: rozjazd
  // wpuściłby osieroconą kwotę do sumy przy akcji nieodwracalnej.)
  const [kwotyPrzypisan, setKwotyPrzypisan] = useState<Record<string, string>>({})
  const wiele = dni.length > 1
  const jaAgata = stylistka === 'agata'
  const razemKarty = dni.reduce((s, d) => s + d.sumy.patrycja.karta + d.sumy.agata.karta, 0)

  // Świeże dane tuż po wejściu — trigger bazy waliduje sumy kart per dzień.
  useEffect(() => {
    void onOdswiez()
  }, [onOdswiez])

  // Sposób 2: budżet = karty Agaty z wybranych dni; cel = koszty z niepokrytym saldem
  // (pozostalo > 0 wyklucza też „tylko moja", którego pozostalo_grosze jest null).
  const budzetAgaty = dni.reduce((s, d) => s + d.sumy.agata.karta, 0)
  const niepokryte = koszty.filter((k) => k.tryb !== 'only_mine' && (k.pozostalo_grosze ?? 0) > 0)

  const pozycje = niepokryte.map((k) => {
    const wybrany = k.id in kwotyPrzypisan
    const tekst = kwotyPrzypisan[k.id] ?? ''
    // Niewybrany koszt NIGDY nie jest niepoprawny — 0, nie -1.
    const grosze = wybrany ? (parseZloteNaGrosze(tekst, { zeroOk: true }) ?? -1) : 0
    return { koszt: k, wybrany, tekst, grosze, pozostalo: k.pozostalo_grosze ?? 0 }
  })

  const pokazDecyzje = budzetAgaty > 0 && niepokryte.length > 0
  const pokazInfoBrakKosztow = budzetAgaty > 0 && niepokryte.length === 0
  // Gdy nie ma czego decydować, gałąź kosztowa musi zniknąć także logicznie: inaczej
  // realtime (Patrycja pokrywa koszt w trakcie) opróżnia `niepokryte` przy decyzji
  // „koszt" i `brakDecyzjiKosztowej` blokuje przycisk bez widocznej przyczyny.
  const decyzjaEfektywna: Decyzja = pokazDecyzje ? decyzja : 'gotowka'

  // Jedna bramka, z której wynika reszta: przy „gotowka" aktywne = [] ⟹ suma 0,
  // zero błędów kwot, doOdbioruGotowka = całe karty Agaty. Bez rozsianych ifów.
  const aktywne = decyzjaEfektywna === 'koszt' ? pozycje.filter((p) => p.wybrany) : []
  const sumaPrzypisan = aktywne.reduce((s, p) => s + Math.max(0, p.grosze), 0)
  const doOdbioruGotowka = budzetAgaty - sumaPrzypisan
  const jakisNiepoprawny = aktywne.some((p) => p.grosze < 0 || p.grosze > p.pozostalo)
  const przekroczonyBudzet = sumaPrzypisan > budzetAgaty
  // Bez tego „koszt" z sumą 0 wysyła przypisania: [] — czyli po cichu wykonuje gałąź
  // gotówkową pod etykietą przypisania, nieodwracalnie. Suma, nie liczba wybranych:
  // pokrywa też wybrany koszt z wyczyszczonym polem i wpisane „0".
  const brakDecyzjiKosztowej = decyzjaEfektywna === 'koszt' && sumaPrzypisan === 0

  const blokada =
    zatwierdzam ||
    !online ||
    dni.length === 0 ||
    jakisNiepoprawny ||
    przekroczonyBudzet ||
    brakDecyzjiKosztowej

  /** Wybór/odznaczenie kosztu. Prefill liczony z `prev`, nie z renderu — dwa szybkie
   *  tapnięcia w jednym batchu nie policzą maksa z tego samego stanu. */
  function przelaczKoszt(k: CostCoverage) {
    setKwotyPrzypisan((prev) => {
      if (k.id in prev) {
        const { [k.id]: _pominiete, ...reszta } = prev
        return reszta
      }
      return { ...prev, [k.id]: groszeNaPole(maksPrzypisania(k, niepokryte, prev, budzetAgaty)) }
    })
  }

  async function zatwierdz() {
    // Re-check: online mógł się przełączyć między renderem a tapnięciem.
    if (!online) {
      onToast('error', KOMUNIKAT_OFFLINE)
      return
    }
    // Przy decyzji „gotowka" aktywne = [] ⟹ przypisania = []. Filtr > 0 lustrzanie
    // odbija sprawdzenie RPC (kwota_grosze > 0) — nie wysyłamy wiersza, który baza odrzuci.
    const przypisania: PrzypisanieKart[] = aktywne
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

        {pokazInfoBrakKosztow && (
          <p className="mt-6 text-[13px] text-brown-600">
            {jaAgata
              ? `Wszystkie wspólne koszty są pokryte — Twoje ${formatZlote(budzetAgaty)} zł z kart odbierasz gotówką.`
              : `Wszystkie wspólne koszty są pokryte — Agata odbiera swoje ${formatZlote(budzetAgaty)} zł z kart gotówką.`}
          </p>
        )}

        {pokazDecyzje && (
          <section className="mt-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold-600">
              {jaAgata ? 'Twoja decyzja' : 'Decyzja Agaty'}
            </p>
            <h2 className="mt-1 font-serif text-[21px] font-medium leading-tight text-brown-800">
              {jaAgata
                ? `Co zrobić z Twoimi ${formatZlote(budzetAgaty)} zł z kart?`
                : `Co zrobić z ${formatZlote(budzetAgaty)} zł z kart Agaty?`}
            </h2>

            <div role="radiogroup" className="mt-4 flex flex-col gap-3">
              <OpcjaDecyzji
                zaznaczona={decyzja === 'gotowka'}
                onClick={() => setDecyzja('gotowka')}
                etykieta={jaAgata ? 'Odbieram całość gotówką' : 'Agata odbiera całość gotówką'}
                kwota={`${formatZlote(budzetAgaty)} zł`}
              />

              <OpcjaDecyzji
                zaznaczona={decyzja === 'koszt'}
                onClick={() => setDecyzja('koszt')}
                etykieta={jaAgata ? 'Przypisuję na wspólny koszt' : 'Agata przypisuje na wspólny koszt'}
              >
                <p className="text-[12.5px] text-brown-500">
                  {jaAgata
                    ? 'Przypisanie jest finalne — tych kart nie odbierzesz już gotówką.'
                    : 'Przypisanie jest finalne — Agata nie odbierze już tych kart gotówką.'}
                </p>

                <p className="mt-4 text-[10.5px] font-medium uppercase tracking-[0.16em] text-brown-400">
                  Wybierz koszt do pokrycia
                </p>

                <div className="mt-2 flex flex-col gap-2">
                  {pozycje.map((p) => (
                    <WierszKosztu
                      key={p.koszt.id}
                      nazwa={p.koszt.nazwa}
                      pozostalo={p.pozostalo}
                      wybrany={p.wybrany}
                      onClick={() => przelaczKoszt(p.koszt)}
                    />
                  ))}
                </div>

                {aktywne.length > 0 && (
                  <div className="mt-4 flex flex-col gap-4">
                    {aktywne.map((p) => {
                      const maks = maksPrzypisania(p.koszt, niepokryte, kwotyPrzypisan, budzetAgaty)
                      const err =
                        p.grosze < 0
                          ? 'Niepoprawna kwota'
                          : p.grosze > p.pozostalo
                            ? `Maks. ${formatZlote(p.pozostalo)} zł`
                            : undefined
                      return (
                        <Input
                          key={p.koszt.id}
                          // Przy jednym koszcie label jak w hi-fi; przy wielu każde pole
                          // musi się przedstawić nazwą, bo „Kwota przypisania" ×3 nie mówi nic.
                          label={aktywne.length === 1 ? 'Kwota przypisania' : p.koszt.nazwa}
                          placeholder="0"
                          hint={err ? undefined : `maks. ${formatZlote(maks)} zł`}
                          error={err}
                          value={p.tekst}
                          onChange={(e) =>
                            setKwotyPrzypisan((prev) => ({ ...prev, [p.koszt.id]: e.target.value }))
                          }
                        />
                      )
                    })}
                  </div>
                )}

                <div className="mt-4 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-[13px] text-brown-600">
                    {jaAgata ? 'Zostaje do odebrania gotówką' : 'Zostaje Agacie do odebrania gotówką'}
                  </span>
                  <span
                    className={[
                      'font-serif text-[17px] font-medium tabular-nums',
                      przekroczonyBudzet ? 'text-error-500' : 'text-brown-800',
                    ].join(' ')}
                  >
                    {formatZlote(Math.max(0, doOdbioruGotowka))} zł
                  </span>
                </div>

                {przekroczonyBudzet && (
                  <p className="mt-2 text-[13px] text-error-500">
                    {jaAgata
                      ? `Przypisania przekraczają Twoje karty z ${wiele ? 'tych dni' : 'tego dnia'}.`
                      : `Przypisania przekraczają karty Agaty z ${wiele ? 'tych dni' : 'tego dnia'}.`}
                  </p>
                )}
                {brakDecyzjiKosztowej && (
                  <p className="mt-2 text-[13px] text-brown-500">
                    Wybierz koszt i wpisz kwotę większą niż zero.
                  </p>
                )}
              </OpcjaDecyzji>
            </div>
          </section>
        )}

        <div className="mt-6 flex items-start gap-[10px] rounded-md border border-gold-300 bg-gold-100 px-[14px] py-[12px]">
          <Icon name="lock-simple" size={18} className="mt-[2px] text-gold-700" />
          <p className="text-[13px] text-brown-700">
            Nieodwracalne — wpisy z {wiele ? 'tych dni' : 'tego dnia'} zostaną zablokowane. Rozliczyć
            może każda z Was, ale tylko raz.
          </p>
        </div>
        {!online && <p className="mt-4 text-[13px] text-brown-500">{KOMUNIKAT_OFFLINE}</p>}
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
    <div className="flex items-center gap-[10px]">
      <Awatar stylistka={stylistka} size={26} />
      <span className="flex-1 text-[15px] text-brown-700">{IMIE_STYLISTKI[stylistka]}</span>
      <span className="text-[16px] font-medium text-brown-800 tabular-nums">{formatZlote(grosze)} zł</span>
    </div>
  )
}

type OpcjaDecyzjiProps = {
  zaznaczona: boolean
  onClick: () => void
  etykieta: string
  /** Kwota po prawej stronie (opcja „gotówką"). */
  kwota?: string
  /** Treść rozwijana pod etykietą, gdy opcja jest zaznaczona. */
  children?: ReactNode
}

/** Radio jako karta — rozwija `children` po zaznaczeniu (wzór z hi-fi, ekran 4). */
function OpcjaDecyzji({ zaznaczona, onClick, etykieta, kwota, children }: OpcjaDecyzjiProps) {
  return (
    <div
      role="radio"
      aria-checked={zaznaczona}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onClick()
        }
      }}
      className={[
        'cursor-pointer rounded-md border p-4 transition-colors duration-[140ms] ease-satin',
        zaznaczona ? 'border-rose-300 bg-rose-50 shadow-satin-sm' : 'border-rose-200 bg-cream-25',
      ].join(' ')}
    >
      <div className="flex items-center gap-[13px]">
        <span
          className={[
            'flex size-[22px] shrink-0 items-center justify-center rounded-pill border-2',
            zaznaczona ? 'border-gold-500 bg-gold-500' : 'border-rose-300',
          ].join(' ')}
        >
          {zaznaczona && <span className="size-[8px] rounded-pill bg-cream-25" />}
        </span>
        <span className="flex-1 text-[15px] font-medium text-brown-800">{etykieta}</span>
        {kwota && (
          <span className="font-serif text-[19px] font-medium text-brown-800 tabular-nums">{kwota}</span>
        )}
      </div>
      {zaznaczona && children && <div className="ml-[35px] mt-[15px]">{children}</div>}
    </div>
  )
}

type WierszKosztuProps = {
  nazwa: string
  pozostalo: number
  wybrany: boolean
  onClick: () => void
}

/** Wiersz wyboru kosztu: ikona · nazwa · „brakuje X zł" · check-circle gdy wybrany. */
function WierszKosztu({ nazwa, pozostalo, wybrany, onClick }: WierszKosztuProps) {
  return (
    <button
      type="button"
      aria-pressed={wybrany}
      onClick={onClick}
      className={[
        'flex w-full items-center gap-[10px] rounded-sm border p-3 text-left transition-colors duration-[140ms] ease-satin',
        wybrany ? 'border-gold-400 bg-cream-25' : 'border-rose-200 bg-cream-50',
      ].join(' ')}
    >
      {/* `users` = koszt wspólny (jak w Podsumowaniu). `coins` znaczy tu gotówkę, `house` to zakładka. */}
      <Icon name="users" size={20} className="shrink-0 text-brown-400" />
      <span className="flex-1">
        <span className="block text-[14px] font-medium text-brown-800">{nazwa}</span>
        <span className="mt-[1px] flex items-center gap-[5px] text-[11.5px] text-brown-500">
          <Icon name="hourglass-medium" size={12} weight="fill" className="text-gold-600" />
          brakuje {formatZlote(pozostalo)} zł
        </span>
      </span>
      {wybrany && <Icon name="check-circle" size={21} weight="fill" className="shrink-0 text-gold-600" />}
    </button>
  )
}
