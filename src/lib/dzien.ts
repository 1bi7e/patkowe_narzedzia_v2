/**
 * Pomocniki „dnia" w strefie Europe/Warsaw. Doba rozliczeniowa liczy się wg
 * kalendarza warszawskiego (tak jak `warsaw_date` w bazie), nie wg UTC.
 */

/** Data kalendarzowa w strefie Europe/Warsaw jako 'YYYY-MM-DD'. */
export function dataWarszawa(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  // 'en-CA' formatuje datę w układzie ISO 'YYYY-MM-DD'.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** Offset Europe/Warsaw względem UTC (w ms) dla danej chwili. */
function offsetWarszawaMs(chwila: Date): number {
  const jakoWarszawa = new Date(chwila.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }))
  const jakoUTC = new Date(chwila.toLocaleString('en-US', { timeZone: 'UTC' }))
  return jakoWarszawa.getTime() - jakoUTC.getTime()
}

/**
 * Zakres UTC (ISO) odpowiadający całej dobie warszawskiej danej daty
 * 'YYYY-MM-DD' — do zapytań po kolumnie timestamptz. Półotwarty: [od, do).
 */
export function zakresDniaUTC(data: string): { od: string; do: string } {
  const [y, m, d] = data.split('-').map(Number)
  const polnocUTC = Date.UTC(y, m - 1, d, 0, 0, 0)
  const offset = offsetWarszawaMs(new Date(polnocUTC))
  const od = new Date(polnocUTC - offset)
  const koniec = new Date(od.getTime() + 24 * 60 * 60 * 1000)
  return { od: od.toISOString(), do: koniec.toISOString() }
}

/** Nagłówek daty w polskiej konwencji, np. „ŚRODA · 15 LIPCA". */
export function formatDzienNaglowek(data: string): string {
  const [y, m, d] = data.split('-').map(Number)
  const dzien = new Date(Date.UTC(y, m - 1, d))
  const dzienTygodnia = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(dzien)
  const dzienMiesiaca = new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(dzien)
  return `${dzienTygodnia} · ${dzienMiesiaca}`.toUpperCase()
}
