import type { Database } from './database'

export type { Database, Json } from './database'

/** Wiersz tabeli z bazy — skrót do Database['public']['Tables'][...]['Row']. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Jedyne dwie użytkowniczki aplikacji — wybór profilu zamiast logowania. */
export type Stylistka = Database['public']['Enums']['stylistka']

/** Wszystkie kwoty w aplikacji trzymamy w groszach (integer, nigdy float). */
export type Grosze = number

/** Metoda płatności klientki — zawsze jedna, nigdy mix. */
export type MetodaPlatnosci = Database['public']['Enums']['metoda_platnosci']

/** Tryb podziału kosztu: 50/50, tylko moja, własny podział. */
export type TrybPodzialu = Database['public']['Enums']['tryb_podzialu']

/** Źródło zwrotu na koszt: gotówka lub przypisanie kart przy rozliczeniu dnia. */
export type ZrodloZwrotu = Database['public']['Enums']['zrodlo_zwrotu']

/**
 * Status pokrycia kosztu — tylko dla trybów z rozliczeniem między stylistkami
 * (fifty_fifty, custom); koszty „tylko moja" nie mają statusu.
 */
export type StatusPokrycia = 'niepokryty' | 'czesciowo_pokryty' | 'pokryty'

/** Płatność klientki. Po rozliczeniu dnia locked = true — wpis nieedytowalny. */
export type Payment = Tables<'payments'>

/** Koszt salonu. kwota_agata_grosze = należność Agaty wobec Patrycji. */
export type Cost = Tables<'costs'>

/** Zwrot Agaty na koszt (gotówka lub przypisanie kart). */
export type CostPayment = Tables<'cost_payments'>

/** Nieodwracalne rozliczenie dnia — jedno na dzień. */
export type DaySettlement = Tables<'day_settlements'>

/** Koszt z wyliczonym pokryciem (widok costs_coverage). */
export type CostCoverage = Database['public']['Views']['costs_coverage']['Row']
