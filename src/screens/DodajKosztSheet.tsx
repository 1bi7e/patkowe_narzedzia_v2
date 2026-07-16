import { useState } from 'react'
import { Button, Input, Sheet } from '../components'
import { parseZloteNaGrosze } from '../lib/format'
import { podzialKosztu } from '../lib/koszty'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import { supabase } from '../lib/supabase'
import type { Grosze, Stylistka, TrybPodzialu } from '../types'

type DodajKosztSheetProps = {
  open: boolean
  onClose: () => void
  /** Zalogowany profil — koszt przypisuje się do niego (stylistka_dodajaca). */
  stylistka: Stylistka
  /** Wywoływane po udanym zapisie (odświeżenie listy kosztów). */
  onZapisano: () => void
}

/** Data 'YYYY-MM-DD' dla dziś (czas lokalny) — wartość dla <input type="date">. */
function dzisLokalnie(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const OPIS_TRYBU: Record<TrybPodzialu, string> = {
  fifty_fifty: 'Dzielimy po połowie — Agata jest winna połowę Patrycji.',
  only_mine: 'Tylko Twój koszt — bez rozliczenia między Wami.',
  custom: 'Wpisz ręcznie część każdej z Was (suma = kwota łączna).',
}

/** Arkusz „Nowy koszt" — trzy tryby podziału; stylistka_dodajaca auto z profilu. */
export function DodajKosztSheet({ open, onClose, stylistka, onZapisano }: DodajKosztSheetProps) {
  const [nazwa, setNazwa] = useState('')
  const [kwota, setKwota] = useState('')
  const [tryb, setTryb] = useState<TrybPodzialu>('fifty_fifty')
  const [czescP, setCzescP] = useState('')
  const [czescA, setCzescA] = useState('')
  const [dataEdycja, setDataEdycja] = useState(false)
  const [dataLokalna, setDataLokalna] = useState('')
  const [blad, setBlad] = useState<string | null>(null)
  const [zapisuje, setZapisuje] = useState(false)

  function zamknij() {
    setNazwa('')
    setKwota('')
    setTryb('fifty_fifty')
    setCzescP('')
    setCzescA('')
    setDataEdycja(false)
    setDataLokalna('')
    setBlad(null)
    setZapisuje(false)
    onClose()
  }

  function przelaczDate() {
    setDataEdycja((wl) => {
      if (!wl) setDataLokalna(dzisLokalnie())
      return !wl
    })
  }

  async function zapisz() {
    const nazwaT = nazwa.trim()
    const grosze = parseZloteNaGrosze(kwota)
    if (!nazwaT) {
      setBlad('Podaj nazwę kosztu.')
      return
    }
    if (grosze === null) {
      setBlad('Podaj poprawną kwotę większą od zera.')
      return
    }

    let czescPatrycjaGrosze: Grosze | undefined
    let czescAgataGrosze: Grosze | undefined
    if (tryb === 'custom') {
      const cp = parseZloteNaGrosze(czescP, { zeroOk: true })
      const ca = parseZloteNaGrosze(czescA, { zeroOk: true })
      if (cp === null || ca === null) {
        setBlad('Podaj poprawne części podziału.')
        return
      }
      czescPatrycjaGrosze = cp
      czescAgataGrosze = ca
    }

    const podzial = podzialKosztu({
      tryb,
      kwotaGrosze: grosze,
      stylistkaDodajaca: stylistka,
      czescPatrycjaGrosze,
      czescAgataGrosze,
    })
    if (!podzial.ok) {
      setBlad(podzial.blad)
      return
    }

    setZapisuje(true)
    setBlad(null)
    const { error } = await supabase.from('costs').insert({
      nazwa: nazwaT,
      kwota_grosze: grosze,
      tryb,
      kwota_patrycja_grosze: podzial.kwota_patrycja_grosze,
      kwota_agata_grosze: podzial.kwota_agata_grosze,
      stylistka_dodajaca: stylistka,
      // Pominięcie `data` → baza ustawia dzisiejszą dobę warszawską.
      ...(dataEdycja && dataLokalna ? { data: dataLokalna } : {}),
    })

    if (error) {
      setZapisuje(false)
      setBlad(error.message)
      return
    }
    onZapisano()
    zamknij()
  }

  return (
    <Sheet open={open} onClose={zamknij} title="Nowy koszt">
      <div className="flex flex-col gap-4">
        <Input
          label="Nazwa"
          placeholder="np. Czynsz, materiały…"
          value={nazwa}
          onChange={(e) => setNazwa(e.target.value)}
        />
        <Input
          label="Kwota"
          placeholder="np. 1200"
          hint="Pełna kwota kosztu w złotych."
          value={kwota}
          onChange={(e) => setKwota(e.target.value)}
        />

        <div>
          <span className="mb-[7px] block text-[12px] font-medium uppercase tracking-[0.1em] text-brown-600">
            Podział
          </span>
          <SegmentTrybu tryb={tryb} onChange={setTryb} />
          <p className="mt-[7px] text-[12.5px] text-brown-400">{OPIS_TRYBU[tryb]}</p>
        </div>

        {tryb === 'custom' && (
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label={IMIE_STYLISTKI.patrycja}
                placeholder="0"
                value={czescP}
                onChange={(e) => setCzescP(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                label={IMIE_STYLISTKI.agata}
                placeholder="0"
                value={czescA}
                onChange={(e) => setCzescA(e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <div className="mb-[7px] flex items-center justify-between">
            <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-brown-600">
              Data kosztu
            </span>
            <button
              type="button"
              onClick={przelaczDate}
              className="text-[12px] font-medium tracking-[0.04em] text-gold-600"
            >
              {dataEdycja ? 'ustaw dziś' : 'zmień'}
            </button>
          </div>
          {dataEdycja ? (
            <Input
              type="date"
              value={dataLokalna}
              onChange={(e) => setDataLokalna(e.target.value)}
            />
          ) : (
            <p className="text-[13px] text-brown-500">Dziś (automatycznie)</p>
          )}
        </div>

        <div className="flex items-center gap-[11px] rounded-md border border-rose-200 bg-cream-50 px-[14px] py-[10px]">
          <Awatar stylistka={stylistka} />
          <span className="text-[13px] text-brown-600">
            Dodaje {IMIE_STYLISTKI[stylistka]} — <span className="text-brown-400">auto</span>
          </span>
        </div>

        {blad && <p className="text-[13px] text-error-500">{blad}</p>}

        <Button variant="dark" size="lg" fullWidth disabled={zapisuje} onClick={zapisz}>
          {zapisuje ? 'Zapisuję…' : 'Zapisz koszt'}
        </Button>
      </div>
    </Sheet>
  )
}

function SegmentTrybu({
  tryb,
  onChange,
}: {
  tryb: TrybPodzialu
  onChange: (t: TrybPodzialu) => void
}) {
  const opcje: { value: TrybPodzialu; label: string }[] = [
    { value: 'fifty_fifty', label: '50/50' },
    { value: 'only_mine', label: 'Tylko moja' },
    { value: 'custom', label: 'Własny' },
  ]
  return (
    <div className="flex w-full gap-[4px] rounded-pill bg-rose-100 p-[5px]">
      {opcje.map((o) => {
        const aktywna = tryb === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={[
              'flex-1 rounded-pill py-[9px] text-[12px] font-medium uppercase tracking-[0.03em] transition-all duration-[160ms] ease-satin',
              aktywna
                ? 'border border-gold-300 bg-cream-25 text-brown-800 shadow-satin-sm'
                : 'border border-transparent text-brown-500',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Awatar({ stylistka }: { stylistka: Stylistka }) {
  const isP = stylistka === 'patrycja'
  return (
    <span
      className={[
        'inline-flex h-[28px] w-[28px] items-center justify-center rounded-pill border font-serif text-[14px] italic text-brown-700',
        isP ? 'bg-gold-100 border-gold-300' : 'bg-rose-100 border-rose-300',
      ].join(' ')}
    >
      {isP ? 'P' : 'A'}
    </span>
  )
}
