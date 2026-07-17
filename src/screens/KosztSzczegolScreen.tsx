import { useCallback, useEffect, useState } from 'react'
import { AmountDisplay, Badge, Button, Icon, Input, Sheet, StatusBadge } from '../components'
import type { ToastTone } from '../components'
import { formatZlote, parseZloteNaGrosze } from '../lib/format'
import { pozostaloDoPokrycia, statusPokrycia, sumaZwrotow, TRYB_LABEL } from '../lib/koszty'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import { supabase } from '../lib/supabase'
import { useOnline } from '../lib/useOnline'
import type { CostCoverage, CostPayment } from '../types'

const KOMUNIKAT_OFFLINE = 'Jesteś offline — zapis wróci z połączeniem.'

type KosztSzczegolScreenProps = {
  koszt: CostCoverage
  onZamknij: () => void
  /** Po zapisaniu zwrotu — odśwież listę kosztów w powłoce. */
  onZmiana: () => void
  onToast: (tone: ToastTone, tekst: string) => void
}

/** Krótka data 'YYYY-MM-DD' → np. „15 lipca". */
function formatData(data: string): string {
  const [y, m, d] = data.split('-').map(Number)
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  )
}

/**
 * Szczegół kosztu (overlay): status pokrycia, historia zwrotów i akcja
 * „Otrzymałam X zł" (zwrot gotówką). Pokrycie liczymy lokalnie z pobranych
 * zwrotów (te same czyste funkcje co widok costs_coverage) — dzięki temu po
 * zapisaniu zwrotu widok jest natychmiast spójny.
 */
export function KosztSzczegolScreen({ koszt, onZamknij, onZmiana, onToast }: KosztSzczegolScreenProps) {
  const online = useOnline()
  const [zwroty, setZwroty] = useState<CostPayment[]>([])
  const [ladowanie, setLadowanie] = useState(true)
  const [blad, setBlad] = useState<string | null>(null)

  const [zwrotOtwarty, setZwrotOtwarty] = useState(false)
  const [kwotaZwrotu, setKwotaZwrotu] = useState('')
  const [bladZwrotu, setBladZwrotu] = useState<string | null>(null)
  const [zapisujeZwrot, setZapisujeZwrot] = useState(false)

  const wczytajZwroty = useCallback(async () => {
    const { data, error } = await supabase
      .from('cost_payments')
      .select('*')
      .eq('cost_id', koszt.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setBlad(error.message)
      setLadowanie(false)
      return
    }
    setZwroty(data ?? [])
    setBlad(null)
    setLadowanie(false)
  }, [koszt.id])

  // Odśwież też, gdy pokrycie zmieni się zdalnie (np. przypisanie kart Agaty).
  useEffect(() => {
    setLadowanie(true)
    void wczytajZwroty()
  }, [wczytajZwroty, koszt.pokryte_grosze])

  const pokryte = sumaZwrotow(zwroty)
  const status = statusPokrycia(koszt.tryb, koszt.kwota_agata_grosze, pokryte)
  const pozostalo = pozostaloDoPokrycia(koszt.tryb, koszt.kwota_agata_grosze, pokryte)
  const mozeZwrot = koszt.tryb !== 'only_mine' && pozostalo != null && pozostalo > 0

  function zamknijZwrot() {
    setZwrotOtwarty(false)
    setKwotaZwrotu('')
    setBladZwrotu(null)
    setZapisujeZwrot(false)
  }

  async function zapiszZwrot() {
    const grosze = parseZloteNaGrosze(kwotaZwrotu)
    if (grosze === null) {
      setBladZwrotu('Podaj poprawną kwotę większą od zera.')
      return
    }
    if (pozostalo != null && grosze > pozostalo) {
      setBladZwrotu(`Maksymalnie ${formatZlote(pozostalo)} zł do pokrycia.`)
      return
    }
    if (!online) {
      setBladZwrotu(KOMUNIKAT_OFFLINE)
      return
    }

    setZapisujeZwrot(true)
    setBladZwrotu(null)
    const { error } = await supabase
      .from('cost_payments')
      .insert({ cost_id: koszt.id, kwota_grosze: grosze, zrodlo: 'cash' })

    if (error) {
      setZapisujeZwrot(false)
      setBladZwrotu(error.message)
      return
    }
    // onZmiana odświeża pokrycie w powłoce → zmiana koszt.pokryte_grosze przeładuje
    // listę zwrotów przez efekt (jeden fetch, bez dublowania).
    onZmiana()
    onToast('success', 'Zapisano zwrot gotówką.')
    zamknijZwrot()
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

        <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.16em] text-gold-600">
          {formatData(koszt.data)}
        </p>
        <h1 className="mt-1 font-serif text-h2 font-medium text-brown-800">
          {koszt.nazwa}
          <span className="italic text-rose-500">.</span>
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <AmountDisplay grosze={koszt.kwota_grosze} size="lg" />
          <Badge tone="cream">{TRYB_LABEL[koszt.tryb]}</Badge>
        </div>

        {/* Pokrycie */}
        <section className="mt-8 rounded-md border border-rose-200 bg-cream-25 p-5 shadow-satin-sm">
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold-600">
            Pokrycie
          </p>
          {koszt.tryb === 'only_mine' ? (
            <p className="mt-4 text-[14px] text-brown-600">
              Tylko koszt {IMIE_STYLISTKI[koszt.stylistka_dodajaca]} — bez rozliczenia między Wami.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {status && <StatusBadge status={status} />}
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-brown-500">Pokryte</span>
                <span className="text-[16px] font-medium text-brown-800 tabular-nums">
                  {formatZlote(pokryte)} z {formatZlote(koszt.kwota_agata_grosze)} zł
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-brown-500">Pozostało</span>
                <span className="text-[16px] font-medium text-brown-800 tabular-nums">
                  {formatZlote(pozostalo ?? 0)} zł
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Historia zwrotów — tylko koszty z rozliczeniem („tylko moja" ich nie ma) */}
        {koszt.tryb !== 'only_mine' && (
          <section className="mt-6">
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold-600">
            Historia zwrotów
          </p>
          <div className="mt-2 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />
          {ladowanie ? (
            <p className="mt-6 py-4 text-center font-light text-brown-400">Wczytuję…</p>
          ) : blad ? (
            <p className="mt-4 text-[13px] text-error-500">Nie udało się wczytać: {blad}</p>
          ) : zwroty.length === 0 ? (
            <p className="mt-6 py-4 text-center font-light text-brown-400">
              Brak zwrotów — Agata jeszcze nic nie oddała.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {zwroty.map((z) => (
                <WierszZwrotu key={z.id} zwrot={z} />
              ))}
            </ul>
          )}
          </section>
        )}

        {mozeZwrot && (
          <div className="mt-8">
            <Button variant="gold" size="lg" fullWidth icon="check-circle" onClick={() => setZwrotOtwarty(true)}>
              Otrzymałam zwrot
            </Button>
          </div>
        )}
      </div>

      <Sheet open={zwrotOtwarty} onClose={zamknijZwrot} title="Zwrot gotówką">
        <div className="flex flex-col gap-4">
          <Input
            label="Ile otrzymałaś?"
            placeholder="np. 100"
            hint={pozostalo != null ? `Maks. ${formatZlote(pozostalo)} zł do pokrycia.` : undefined}
            value={kwotaZwrotu}
            onChange={(e) => setKwotaZwrotu(e.target.value)}
          />
          {bladZwrotu && <p className="text-[13px] text-error-500">{bladZwrotu}</p>}
          {!online && !bladZwrotu && <p className="text-[13px] text-brown-500">{KOMUNIKAT_OFFLINE}</p>}
          <Button variant="dark" size="lg" fullWidth disabled={zapisujeZwrot || !online} onClick={zapiszZwrot}>
            {zapisujeZwrot ? 'Zapisuję…' : 'Zapisz zwrot'}
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

function WierszZwrotu({ zwrot }: { zwrot: CostPayment }) {
  const karta = zwrot.zrodlo === 'card_assignment'
  return (
    <li className="flex items-center gap-[11px] rounded-md border border-rose-200 bg-cream-25 px-[14px] py-[11px] shadow-satin-sm">
      <Icon
        name={karta ? 'lock-simple' : 'coins'}
        size={17}
        className={karta ? 'text-brown-400' : 'text-gold-600'}
      />
      <div className="flex-1">
        <p className="text-[14px] text-brown-800">{karta ? 'Przypisana karta' : 'Gotówka'}</p>
        <p className="text-[11.5px] text-brown-400">
          {formatData(zwrot.data)}
          {karta && ' · finalne'}
        </p>
      </div>
      <span className="text-[15px] font-medium text-brown-800 tabular-nums">
        + {formatZlote(zwrot.kwota_grosze)} zł
      </span>
    </li>
  )
}
