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
