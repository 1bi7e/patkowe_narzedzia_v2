import type { Grosze, MetodaPlatnosci, Payment, Stylistka } from '../types'

/** Suma płatności daną metodą dla wskazanej stylistki (grosze integer). */
function sumujMetoda(platnosci: Payment[], stylistka: Stylistka, metoda: MetodaPlatnosci): Grosze {
  return platnosci.reduce(
    (suma, p) => (p.stylistka === stylistka && p.metoda === metoda ? suma + p.kwota_grosze : suma),
    0,
  )
}

/** Suma płatności kartą danej stylistki — podstawa rozliczenia dnia. */
export function sumujKarty(platnosci: Payment[], stylistka: Stylistka): Grosze {
  return sumujMetoda(platnosci, stylistka, 'card')
}

/** Suma płatności gotówką danej stylistki. */
export function sumujGotowke(platnosci: Payment[], stylistka: Stylistka): Grosze {
  return sumujMetoda(platnosci, stylistka, 'cash')
}

export type PodsumowanieStylistki = { karta: Grosze; gotowka: Grosze }
export type PodsumowanieDnia = Record<Stylistka, PodsumowanieStylistki>

/** Sumy kart i gotówki obu stylistek dla podanej listy płatności. */
export function podsumujDzien(platnosci: Payment[]): PodsumowanieDnia {
  return {
    patrycja: {
      karta: sumujKarty(platnosci, 'patrycja'),
      gotowka: sumujGotowke(platnosci, 'patrycja'),
    },
    agata: {
      karta: sumujKarty(platnosci, 'agata'),
      gotowka: sumujGotowke(platnosci, 'agata'),
    },
  }
}
