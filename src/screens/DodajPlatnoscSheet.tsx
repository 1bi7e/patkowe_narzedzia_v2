import { useState } from 'react'
import { Awatar, Button, Input, Segment, Sheet } from '../components'
import { parseZloteNaGrosze } from '../lib/format'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import { supabase } from '../lib/supabase'
import type { MetodaPlatnosci, Stylistka } from '../types'

type DodajPlatnoscSheetProps = {
  open: boolean
  onClose: () => void
  /** Zalogowany profil — płatność przypisuje się do niego automatycznie. */
  stylistka: Stylistka
  /** Wywoływane po udanym zapisie (odświeżenie listy dnia). */
  onZapisano: () => void
}

/** Wartość dla <input type="datetime-local"> odpowiadająca „teraz" (czas lokalny). */
function terazLokalnie(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Arkusz „Nowa płatność" — stylistka auto z profilu, metoda gotówka albo karta. */
export function DodajPlatnoscSheet({ open, onClose, stylistka, onZapisano }: DodajPlatnoscSheetProps) {
  const [klientka, setKlientka] = useState('')
  const [kwota, setKwota] = useState('')
  const [metoda, setMetoda] = useState<MetodaPlatnosci>('card')
  const [dataEdycja, setDataEdycja] = useState(false)
  const [dataLokalna, setDataLokalna] = useState('')
  const [blad, setBlad] = useState<string | null>(null)
  const [zapisuje, setZapisuje] = useState(false)

  function zamknij() {
    setKlientka('')
    setKwota('')
    setMetoda('card')
    setDataEdycja(false)
    setDataLokalna('')
    setBlad(null)
    setZapisuje(false)
    onClose()
  }

  function przelaczDate() {
    setDataEdycja((wl) => {
      if (!wl) setDataLokalna(terazLokalnie())
      return !wl
    })
  }

  async function zapisz() {
    const nazwa = klientka.trim()
    const grosze = parseZloteNaGrosze(kwota)
    if (!nazwa) {
      setBlad('Podaj imię lub pseudonim klientki.')
      return
    }
    if (grosze === null) {
      setBlad('Podaj poprawną kwotę większą od zera.')
      return
    }

    setZapisuje(true)
    setBlad(null)
    const { error } = await supabase.from('payments').insert({
      klientka: nazwa,
      kwota_grosze: grosze,
      metoda,
      stylistka,
      // Pominięcie `data` → baza ustawia now(). Edycja wysyła wybraną chwilę.
      ...(dataEdycja && dataLokalna ? { data: new Date(dataLokalna).toISOString() } : {}),
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
    <Sheet open={open} onClose={zamknij} title="Nowa płatność">
      <div className="flex flex-col gap-4">
        <Input
          label="Klientka"
          icon="user"
          placeholder="imię / pseudonim…"
          value={klientka}
          onChange={(e) => setKlientka(e.target.value)}
        />
        <Input
          label="Kwota"
          placeholder="np. 150"
          hint="Pełna kwota usługi w złotych."
          value={kwota}
          onChange={(e) => setKwota(e.target.value)}
        />

        <div>
          <span className="mb-[7px] block text-[12px] font-medium uppercase tracking-[0.1em] text-brown-600">
            Metoda — zawsze jedna
          </span>
          <Segment<MetodaPlatnosci>
            wartosc={metoda}
            onChange={setMetoda}
            opcje={[
              { value: 'cash', label: 'Gotówka' },
              { value: 'card', label: 'Karta' },
            ]}
          />
        </div>

        <div>
          <div className="mb-[7px] flex items-center justify-between">
            <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-brown-600">Data</span>
            <button
              type="button"
              onClick={przelaczDate}
              className="text-[12px] font-medium tracking-[0.04em] text-gold-600"
            >
              {dataEdycja ? 'ustaw teraz' : 'zmień'}
            </button>
          </div>
          {dataEdycja ? (
            <Input
              type="datetime-local"
              value={dataLokalna}
              onChange={(e) => setDataLokalna(e.target.value)}
            />
          ) : (
            <p className="text-[13px] text-brown-500">Teraz (automatycznie)</p>
          )}
        </div>

        <div className="flex items-center gap-[11px] rounded-md border border-rose-200 bg-cream-50 px-[14px] py-[10px]">
          <Awatar stylistka={stylistka} />
          <span className="text-[13px] text-brown-600">
            {IMIE_STYLISTKI[stylistka]} — <span className="text-brown-400">auto</span>
          </span>
        </div>

        {blad && <p className="text-[13px] text-error-500">{blad}</p>}

        <Button variant="dark" size="lg" fullWidth disabled={zapisuje} onClick={zapisz}>
          {zapisuje ? 'Zapisuję…' : 'Zapisz płatność'}
        </Button>
      </div>
    </Sheet>
  )
}

