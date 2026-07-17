import { useEffect, useState } from 'react'
import { Awatar, Button, Input, Segment, Sheet } from '../components'
import { groszeNaPole, parseZloteNaGrosze } from '../lib/format'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import { supabase } from '../lib/supabase'
import { useOnline } from '../lib/useOnline'
import type { MetodaPlatnosci, Payment, Stylistka } from '../types'

type DodajPlatnoscSheetProps = {
  open: boolean
  onClose: () => void
  /** Zalogowany profil — nowa płatność przypisuje się do niego automatycznie. */
  stylistka: Stylistka
  /** Gdy podane → tryb edycji istniejącego wpisu (zamiast dodawania). */
  platnosc?: Payment | null
  /** Wywoływane po udanym zapisie (dodaniu lub edycji). */
  onZapisano: () => void
  /** Wywoływane po usunięciu wpisu (tylko tryb edycji). */
  onUsunieto?: () => void
}

const KOMUNIKAT_OFFLINE = 'Jesteś offline — zapis wróci z połączeniem.'

/** Wartość dla <input type="datetime-local"> odpowiadająca „teraz" (czas lokalny). */
function terazLokalnie(): string {
  return dataNaPoleLokalne(new Date())
}

/** Date → 'YYYY-MM-DDTHH:mm' w czasie lokalnym (dla <input type="datetime-local">). */
function dataNaPoleLokalne(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * Arkusz płatności — dodawanie lub edycja. W trybie dodawania stylistka bierze
 * się z profilu, metoda to gotówka albo karta. W trybie edycji (prop `platnosc`)
 * pola są prefillowane, a zapis robi UPDATE; dostępne jest też usunięcie wpisu
 * (baza wpuszcza edycję/usunięcie tylko dla niezablokowanych — po rozliczeniu dnia
 * wpis i tak jest nieedytowalny).
 */
export function DodajPlatnoscSheet({ open, onClose, stylistka, platnosc, onZapisano, onUsunieto }: DodajPlatnoscSheetProps) {
  const online = useOnline()
  const trybEdycji = !!platnosc

  const [klientka, setKlientka] = useState('')
  const [kwota, setKwota] = useState('')
  const [metoda, setMetoda] = useState<MetodaPlatnosci>('card')
  const [dataEdycja, setDataEdycja] = useState(false)
  const [dataLokalna, setDataLokalna] = useState('')
  const [blad, setBlad] = useState<string | null>(null)
  const [zapisuje, setZapisuje] = useState(false)
  const [potwierdzUsun, setPotwierdzUsun] = useState(false)
  const [usuwa, setUsuwa] = useState(false)

  // Prefill przy otwarciu w trybie edycji; tryb dodawania startuje z pustych pól
  // (reset robi `zamknij`, więc przy ponownym otwarciu są już czyste).
  useEffect(() => {
    if (!open || !platnosc) return
    setKlientka(platnosc.klientka)
    setKwota(groszeNaPole(platnosc.kwota_grosze))
    setMetoda(platnosc.metoda)
    setDataLokalna(dataNaPoleLokalne(new Date(platnosc.data)))
    setDataEdycja(true)
    setBlad(null)
    setPotwierdzUsun(false)
  }, [open, platnosc])

  function zamknij() {
    setKlientka('')
    setKwota('')
    setMetoda('card')
    setDataEdycja(false)
    setDataLokalna('')
    setBlad(null)
    setZapisuje(false)
    setPotwierdzUsun(false)
    setUsuwa(false)
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
    if (trybEdycji && !dataLokalna) {
      setBlad('Podaj datę płatności.')
      return
    }
    if (!online) {
      setBlad(KOMUNIKAT_OFFLINE)
      return
    }

    setZapisuje(true)
    setBlad(null)

    // Edycja wysyła zawsze wybraną chwilę; dodawanie tylko gdy zmieniono datę
    // (inaczej baza ustawia now()).
    const dataPole = dataEdycja && dataLokalna ? { data: new Date(dataLokalna).toISOString() } : {}

    const { error } = trybEdycji
      ? await supabase
          .from('payments')
          .update({ klientka: nazwa, kwota_grosze: grosze, metoda, ...dataPole })
          .eq('id', platnosc.id)
      : await supabase.from('payments').insert({
          klientka: nazwa,
          kwota_grosze: grosze,
          metoda,
          stylistka,
          ...dataPole,
        })

    if (error) {
      setZapisuje(false)
      setBlad(error.message)
      return
    }
    onZapisano()
    zamknij()
  }

  async function usun() {
    if (!platnosc) return
    if (!online) {
      setBlad(KOMUNIKAT_OFFLINE)
      return
    }
    setUsuwa(true)
    setBlad(null)
    const { error } = await supabase.from('payments').delete().eq('id', platnosc.id)
    if (error) {
      setUsuwa(false)
      setBlad(error.message)
      return
    }
    onUsunieto?.()
    zamknij()
  }

  const zajety = zapisuje || usuwa

  return (
    <Sheet open={open} onClose={zamknij} title={trybEdycji ? 'Edytuj płatność' : 'Nowa płatność'}>
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
            {!trybEdycji && (
              <button
                type="button"
                onClick={przelaczDate}
                className="text-[12px] font-medium tracking-[0.04em] text-gold-600"
              >
                {dataEdycja ? 'ustaw teraz' : 'zmień'}
              </button>
            )}
          </div>
          {trybEdycji || dataEdycja ? (
            <Input
              type="datetime-local"
              value={dataLokalna}
              onChange={(e) => setDataLokalna(e.target.value)}
            />
          ) : (
            <p className="text-[13px] text-brown-500">Teraz (automatycznie)</p>
          )}
        </div>

        {!trybEdycji && (
          <div className="flex items-center gap-[11px] rounded-md border border-rose-200 bg-cream-50 px-[14px] py-[10px]">
            <Awatar stylistka={stylistka} />
            <span className="text-[13px] text-brown-600">
              {IMIE_STYLISTKI[stylistka]} — <span className="text-brown-400">auto</span>
            </span>
          </div>
        )}

        {blad && <p className="text-[13px] text-error-500">{blad}</p>}
        {!online && !blad && <p className="text-[13px] text-brown-500">{KOMUNIKAT_OFFLINE}</p>}

        <Button variant="dark" size="lg" fullWidth disabled={zajety || !online} onClick={zapisz}>
          {zapisuje ? 'Zapisuję…' : trybEdycji ? 'Zapisz zmiany' : 'Zapisz płatność'}
        </Button>

        {trybEdycji &&
          (potwierdzUsun ? (
            <div className="flex flex-col gap-2">
              <p className="text-center text-[13px] text-brown-600">Na pewno usunąć ten wpis?</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Button
                    variant="outline"
                    size="md"
                    fullWidth
                    disabled={zajety}
                    onClick={() => setPotwierdzUsun(false)}
                  >
                    Anuluj
                  </Button>
                </div>
                <div className="flex-1">
                  <Button variant="dark" size="md" fullWidth disabled={zajety || !online} onClick={usun}>
                    {usuwa ? 'Usuwam…' : 'Tak, usuń'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPotwierdzUsun(true)}
              className="mx-auto text-[13px] font-medium tracking-[0.04em] text-error-500"
            >
              Usuń płatność
            </button>
          ))}
      </div>
    </Sheet>
  )
}
