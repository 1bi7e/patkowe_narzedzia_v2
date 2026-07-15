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
 * Parsuje kwotę w złotych z pola tekstowego na grosze (integer). Akceptuje
 * przecinek i kropkę dziesiętną oraz spacje jako separator tysięcy; maksymalnie
 * dwa miejsca po przecinku. Zwraca null dla wejść niepoprawnych lub ≤ 0.
 * Liczymy na całkowitych (bez floata) — grosze zawsze muszą się bilansować.
 */
export function parseZloteNaGrosze(tekst: string): Grosze | null {
  const oczyszczony = tekst.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(oczyszczony)) return null
  const [calosc, ulamek = ''] = oczyszczony.split('.')
  const grosze = Number(calosc) * 100 + Number((ulamek + '00').slice(0, 2))
  return grosze > 0 ? grosze : null
}
