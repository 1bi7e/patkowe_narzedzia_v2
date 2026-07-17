/**
 * Typ `Database` dla klienta Supabase — ręcznie odwzorowany ze schematu
 * `supabase/migrations/20260715120000_init_schema.sql`.
 *
 * Po podpięciu projektu Supabase można go wygenerować automatycznie:
 *   npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts
 * Uwaga: generator oznacza WSZYSTKIE kolumny widoków jako nullable (Postgres
 * nie śledzi nullowalności widoków) — ręczna wersja poniżej jest precyzyjniejsza
 * dla `costs_coverage`.
 *
 * Kwoty (`*_grosze`) to zawsze całkowite grosze — nigdy float.
 * Daty/timestampy przychodzą z Supabase jako stringi ISO.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      payments: {
        Row: {
          id: string
          klientka: string
          kwota_grosze: number
          metoda: Database['public']['Enums']['metoda_platnosci']
          stylistka: Database['public']['Enums']['stylistka']
          data: string
          locked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          klientka: string
          kwota_grosze: number
          metoda: Database['public']['Enums']['metoda_platnosci']
          stylistka: Database['public']['Enums']['stylistka']
          data?: string
          locked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          klientka?: string
          kwota_grosze?: number
          metoda?: Database['public']['Enums']['metoda_platnosci']
          stylistka?: Database['public']['Enums']['stylistka']
          data?: string
          locked?: boolean
          created_at?: string
        }
        Relationships: []
      }
      costs: {
        Row: {
          id: string
          nazwa: string
          kwota_grosze: number
          tryb: Database['public']['Enums']['tryb_podzialu']
          kwota_patrycja_grosze: number
          kwota_agata_grosze: number
          data: string
          stylistka_dodajaca: Database['public']['Enums']['stylistka']
          created_at: string
        }
        Insert: {
          id?: string
          nazwa: string
          kwota_grosze: number
          tryb: Database['public']['Enums']['tryb_podzialu']
          kwota_patrycja_grosze: number
          kwota_agata_grosze: number
          data?: string
          stylistka_dodajaca: Database['public']['Enums']['stylistka']
          created_at?: string
        }
        Update: {
          id?: string
          nazwa?: string
          kwota_grosze?: number
          tryb?: Database['public']['Enums']['tryb_podzialu']
          kwota_patrycja_grosze?: number
          kwota_agata_grosze?: number
          data?: string
          stylistka_dodajaca?: Database['public']['Enums']['stylistka']
          created_at?: string
        }
        Relationships: []
      }
      cost_payments: {
        Row: {
          id: string
          cost_id: string
          kwota_grosze: number
          zrodlo: Database['public']['Enums']['zrodlo_zwrotu']
          data: string
          settlement_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cost_id: string
          kwota_grosze: number
          zrodlo: Database['public']['Enums']['zrodlo_zwrotu']
          data?: string
          settlement_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cost_id?: string
          kwota_grosze?: number
          zrodlo?: Database['public']['Enums']['zrodlo_zwrotu']
          data?: string
          settlement_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cost_payments_cost_id_fkey'
            columns: ['cost_id']
            isOneToOne: false
            referencedRelation: 'costs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cost_payments_settlement_id_fkey'
            columns: ['settlement_id']
            isOneToOne: false
            referencedRelation: 'day_settlements'
            referencedColumns: ['id']
          },
        ]
      }
      day_settlements: {
        Row: {
          id: string
          data: string
          suma_kart_patrycja_grosze: number
          suma_kart_agata_grosze: number
          zatwierdzila: Database['public']['Enums']['stylistka']
          created_at: string
          /** Gotówka, którą Patrycja jest winna Agacie za ten dzień (karty Agaty − przypisania). */
          gotowka_dla_agaty_grosze: number
          /** Czy Patrycja przekazała już Agacie tę gotówkę. */
          gotowka_oddana: boolean
          gotowka_oddana_at: string | null
          gotowka_oddana_przez: Database['public']['Enums']['stylistka'] | null
        }
        Insert: {
          id?: string
          data: string
          suma_kart_patrycja_grosze: number
          suma_kart_agata_grosze: number
          zatwierdzila: Database['public']['Enums']['stylistka']
          created_at?: string
          gotowka_dla_agaty_grosze?: number
          gotowka_oddana?: boolean
          gotowka_oddana_at?: string | null
          gotowka_oddana_przez?: Database['public']['Enums']['stylistka'] | null
        }
        Update: {
          id?: string
          data?: string
          suma_kart_patrycja_grosze?: number
          suma_kart_agata_grosze?: number
          zatwierdzila?: Database['public']['Enums']['stylistka']
          created_at?: string
          gotowka_dla_agaty_grosze?: number
          gotowka_oddana?: boolean
          gotowka_oddana_at?: string | null
          gotowka_oddana_przez?: Database['public']['Enums']['stylistka'] | null
        }
        Relationships: []
      }
    }
    Views: {
      costs_coverage: {
        Row: {
          id: string
          nazwa: string
          kwota_grosze: number
          tryb: Database['public']['Enums']['tryb_podzialu']
          kwota_patrycja_grosze: number
          kwota_agata_grosze: number
          data: string
          stylistka_dodajaca: Database['public']['Enums']['stylistka']
          created_at: string
          /** NULL dla trybu only_mine (brak rozliczenia między stylistkami). */
          pokryte_grosze: number | null
          /** NULL dla trybu only_mine. */
          pozostalo_grosze: number | null
          /** NULL dla trybu only_mine. */
          status_pokrycia: 'niepokryty' | 'czesciowo_pokryty' | 'pokryty' | null
        }
        Relationships: []
      }
    }
    Functions: {
      rozlicz_dzien: {
        Args: {
          p_data: string
          p_zatwierdzila: Database['public']['Enums']['stylistka']
          p_suma_kart_patrycja_grosze: number
          p_suma_kart_agata_grosze: number
          /** Tablica: [{ cost_id: uuid, kwota_grosze: liczba > 0 }, ...] */
          p_przypisania?: Json
        }
        Returns: string
      }
      /** Atomowe rozliczenie wielu dni naraz — zwraca id utworzonych rozliczeń. */
      rozlicz_dni: {
        Args: {
          /** Dni do rozliczenia — niepuste, bez duplikatów. */
          p_daty: string[]
          p_zatwierdzila: Database['public']['Enums']['stylistka']
          /** Sumy KART per dzień: [{ data: 'YYYY-MM-DD', patrycja_grosze: number, agata_grosze: number }, ...] — po jednym wpisie na każdy dzień z p_daty. */
          p_sumy: Json
          /** Tablica: [{ cost_id: uuid, kwota_grosze: liczba > 0 }, ...] — przypisania kart Agaty na koszty. */
          p_przypisania?: Json
        }
        Returns: string[]
      }
      /** Cofa rozliczenie jednego dnia (usuwa przypisania, odblokowuje płatności, kasuje rozliczenie). */
      cofnij_rozliczenie: {
        Args: {
          p_settlement_id: string
        }
        Returns: undefined
      }
      /** Odhacza przekazanie Agacie gotówki z rozliczenia (gotowka_oddana + kto). */
      oznacz_gotowke_oddana: {
        Args: {
          p_settlement_id: string
          p_oddana: boolean
          p_przez: Database['public']['Enums']['stylistka']
        }
        Returns: undefined
      }
    }
    Enums: {
      stylistka: 'patrycja' | 'agata'
      metoda_platnosci: 'cash' | 'card'
      tryb_podzialu: 'fifty_fifty' | 'only_mine' | 'custom'
      zrodlo_zwrotu: 'cash' | 'card_assignment'
    }
    CompositeTypes: Record<string, never>
  }
}
