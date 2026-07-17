import type { Grosze } from '../types'

/**
 * Formatuje kwotę w groszach na zapis złotowy w polskiej konwencji:
 * spacja jako separator tysięcy, przecinek dziesiętny. Grosze pokazujemy
 * tylko gdy są niezerowe (350000 → „3 500", 15050 → „150,50"). Bez sufiksu „zł".
 */
export function formatZlote(grosze: Grosze): string {
  const maZlotowki = grosze % 100 !== 0
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: maZlotowki ? 2 : 0,
    maximumFractionDigits: 2,
    // Wymuszamy spację co tysiąc także dla 4 cyfr (pl-PL domyślnie grupuje od 10 000).
    useGrouping: 'always',
  }).format(grosze / 100)
}

/**
 * Grosze → wartość edytowalna w polu kwoty (bez separatora tysięcy, przecinek).
 * `parseZloteNaGrosze` przyjęłoby też surowy `formatZlote` (separator pl-PL to NBSP,
 * a `\s` go łapie) — separator zdejmujemy dla UX: w polu tekstowym jest niewidzialny,
 * ale realny przy backspace i wychodzi na zewnątrz przy kopiowaniu.
 */
export function groszeNaPole(grosze: Grosze): string {
  return formatZlote(grosze).replace(/\s/g, '')
}

/** Opcje parsowania kwoty. */
type OpcjeParsowania = {
  /**
   * Gdy true — puste pole oraz „0" znaczą 0 groszy (nie null). Do pól, w których
   * zero jest poprawne i oznacza „nic" (opcjonalna część podziału, przypisanie
   * kart). Domyślnie false: zero i pusty tekst są niepoprawne (główne pole kwoty).
   */
  zeroOk?: boolean
}

/**
 * Parsuje kwotę w złotych z pola tekstowego na grosze (integer). Akceptuje
 * przecinek i kropkę dziesiętną oraz spacje jako separator tysięcy; maksymalnie
 * dwa miejsca po przecinku. Zwraca null dla wejść niepoprawnych lub — bez
 * `zeroOk` — dla ≤ 0. Liczymy na całkowitych (bez floata) — grosze zawsze muszą
 * się bilansować.
 */
export function parseZloteNaGrosze(tekst: string, opcje: OpcjeParsowania = {}): Grosze | null {
  const oczyszczony = tekst.trim().replace(/\s/g, '').replace(',', '.')
  if (oczyszczony === '') return opcje.zeroOk ? 0 : null
  if (!/^\d+(\.\d{1,2})?$/.test(oczyszczony)) return null
  const [calosc, ulamek = ''] = oczyszczony.split('.')
  const grosze = Number(calosc) * 100 + Number((ulamek + '00').slice(0, 2))
  if (grosze > 0) return grosze
  return opcje.zeroOk ? 0 : null
}
