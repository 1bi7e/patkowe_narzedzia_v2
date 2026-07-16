/**
 * Model okresu dla sekcji Finanse (Podsumowanie / Historia). Granice okresu to
 * daty kalendarzowe w strefie Europe/Warsaw ('YYYY-MM-DD'), zakres domknięty
 * [od, do]. Płatności (kolumna timestamptz) filtruje się przez `zakresOkresuUTC`
 * z dzien.ts; koszty (kolumna date) — przez `czyWZakresie`.
 */

export type TypOkresu = 'ten_miesiac' | 'poprzedni' | 'wlasny'

/** Okres finansowy: od–do włącznie, daty warszawskie 'YYYY-MM-DD'. */
export type Okres = { typ: TypOkresu; od: string; do: string }

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Miesiąc warszawski względem dnia 'YYYY-MM-DD': przesunięcie 0 = bieżący,
 * -1 = poprzedni (z obsługą przełomu roku). Zwraca pierwszy i ostatni dzień.
 */
export function miesiacOkres(dzisYMD: string, przesuniecie: 0 | -1): Okres {
  const [y, m] = dzisYMD.split('-').map(Number)
  const idx = m - 1 + przesuniecie // 0-based, może być -1
  const rok = y + Math.floor(idx / 12)
  const mies = ((idx % 12) + 12) % 12 // 0-11
  const dniWMiesiacu = new Date(Date.UTC(rok, mies + 1, 0)).getUTCDate()
  const mm = pad(mies + 1)
  return {
    typ: przesuniecie === 0 ? 'ten_miesiac' : 'poprzedni',
    od: `${rok}-${mm}-01`,
    do: `${rok}-${mm}-${pad(dniWMiesiacu)}`,
  }
}

/** Okres własny z ręcznego zakresu dat. */
export function wlasnyOkres(od: string, do_: string): Okres {
  return { typ: 'wlasny', od, do: do_ }
}

/** Nazwa miesiąca z 'YYYY-MM-DD', np. „Lipiec 2026". */
function nazwaMiesiaca(ymd: string): string {
  const [y, m] = ymd.split('-').map(Number)
  const nazwa = new Intl.DateTimeFormat('pl-PL', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  )
  return `${nazwa.charAt(0).toUpperCase()}${nazwa.slice(1)} ${y}`
}

/** Krótka data 'YYYY-MM-DD' → np. „1 lip". */
function krotkaData(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  )
}

/** Etykieta okresu do nagłówka: miesiąc („Lipiec 2026") lub zakres („1 lip – 14 lip 2026"). */
export function nazwaOkresu(okres: Okres): string {
  if (okres.typ !== 'wlasny') return nazwaMiesiaca(okres.od)
  return `${krotkaData(okres.od)} – ${krotkaData(okres.do)} ${okres.do.slice(0, 4)}`
}

/** Czy data 'YYYY-MM-DD' mieści się w okresie (włącznie). Porównanie stringów = chronologiczne. */
export function czyWZakresie(dataYMD: string, okres: Okres): boolean {
  return dataYMD >= okres.od && dataYMD <= okres.do
}
