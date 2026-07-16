-- ============================================================================
-- Salon — rozliczanie wielu dni naraz (atomowo)
--
-- Kontekst: ekran „Rozliczenia" pokazuje WSZYSTKIE nierozliczone dni (nie tylko
-- dziś) i pozwala zaznaczyć kilka z nich, by rozliczyć je jedną akcją. Schemat
-- już wspierał rozliczanie dowolnego dnia (RPC przyjmowała datę, triggery liczą
-- per-dzień); brakowało jedynie wariantu atomowego dla WIELU dni.
--
-- Świadome rozszerzenie ponad specyfikację/design (jednodniowe „Dziś") — patrz
-- CLAUDE.md. „Dzień nierozliczony" ⟺ payments.locked = false; ten plik nie
-- zmienia tabel/triggerów, dokłada tylko funkcję rozlicz_dni i przełącza
-- rozlicz_dzien na delegację do niej (żeby nie duplikować logiki).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- rozlicz_dni: atomowe, nieodwracalne rozliczenie WIELU dni w jednej transakcji.
--
--   p_daty:        dni do rozliczenia (niepuste, bez duplikatów)
--   p_sumy:        [{"data":"YYYY-MM-DD","patrycja_grosze":int,"agata_grosze":int}, ...]
--                  — po jednym wpisie na każdy dzień z p_daty (sumy KART dnia;
--                    walidowane per dzień przez trigger day_settlements)
--   p_przypisania: [{"cost_id":"<uuid>","kwota_grosze":int}, ...] — przypisania
--                  kart Agaty na koszty (Sposób 2); limit = ŁĄCZNE karty Agaty
--                  ze wszystkich rozliczanych dni. Wszystkie przypisania wpinane
--                  są w JEDNO reprezentacyjne rozliczenie = dzień max(p_daty)
--                  (brak constraintu wiążącego kwotę przypisania z konkretnym
--                  rozliczeniem; fn_cost_payments_walidacja i tak pilnuje limitu
--                  należności Agaty na danym koszcie).
--
-- Zwraca id utworzonych rozliczeń (rosnąco wg daty).
-- ----------------------------------------------------------------------------
create function public.rozlicz_dni(
  p_daty date[],
  p_zatwierdzila public.stylistka,
  p_sumy jsonb,
  p_przypisania jsonb default '[]'::jsonb
)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids             uuid[] := array[]::uuid[];
  v_settlement_id   uuid;
  v_rep_id          uuid;      -- reprezentacyjne rozliczenie (dzień max) dla przypisań
  v_rep_data        date;
  v_suma_kart_agaty bigint;
  v_suma_przypisan  bigint;
  v_pat             integer;
  v_aga             integer;
  d                 date;
  r                 record;
begin
  -- ── Walidacja wejścia ─────────────────────────────────────────────────────
  if p_daty is null or array_length(p_daty, 1) is null then
    raise exception 'p_daty musi zawierać co najmniej jeden dzień';
  end if;
  if array_length(p_daty, 1) <> (select count(distinct x) from unnest(p_daty) as x) then
    raise exception 'p_daty zawiera zduplikowane dni';
  end if;
  if p_sumy is null or jsonb_typeof(p_sumy) <> 'array' then
    raise exception 'p_sumy musi być tablicą JSON';
  end if;
  if jsonb_array_length(p_sumy) <> array_length(p_daty, 1) then
    raise exception 'p_sumy musi podać sumy kart dla dokładnie tych dni, co p_daty';
  end if;
  if p_przypisania is null or jsonb_typeof(p_przypisania) <> 'array' then
    raise exception 'p_przypisania musi być tablicą JSON';
  end if;

  v_rep_data := (select max(x) from unnest(p_daty) as x);

  -- Łączne karty Agaty z podanych sum — podstawa limitu przypisań.
  select coalesce(sum((el ->> 'agata_grosze')::bigint), 0)
  into v_suma_kart_agaty
  from jsonb_array_elements(p_sumy) el;

  select coalesce(sum((el ->> 'kwota_grosze')::bigint), 0)
  into v_suma_przypisan
  from jsonb_array_elements(p_przypisania) el;

  if v_suma_przypisan > v_suma_kart_agaty then
    raise exception 'Suma przypisań (% gr) przekracza łączne karty Agaty z rozliczanych dni (% gr)',
      v_suma_przypisan, v_suma_kart_agaty;
  end if;

  -- ── Rozliczenie każdego dnia (rosnąco) ────────────────────────────────────
  -- Każdy INSERT odpala istniejące triggery: walidację sum kart per dzień oraz
  -- blokadę wpisów. Całość w jednej funkcji = wszystko albo nic.
  for d in select x from unnest(p_daty) as x order by x
  loop
    v_pat := null;
    v_aga := null;
    select (el ->> 'patrycja_grosze')::integer,
           (el ->> 'agata_grosze')::integer
    into v_pat, v_aga
    from jsonb_array_elements(p_sumy) el
    where (el ->> 'data')::date = d;

    if not found or v_pat is null or v_aga is null then
      raise exception 'Brak sum kart dla dnia % w p_sumy', d;
    end if;

    insert into public.day_settlements
      (data, suma_kart_patrycja_grosze, suma_kart_agata_grosze, zatwierdzila)
    values
      (d, v_pat, v_aga, p_zatwierdzila)
    returning id into v_settlement_id;

    v_ids := v_ids || v_settlement_id;
    if d = v_rep_data then
      v_rep_id := v_settlement_id;
    end if;
  end loop;

  -- ── Przypisania kart Agaty na koszty (wpięte w rozliczenie dnia max) ───────
  for r in
    select (el ->> 'cost_id')::uuid          as cost_id,
           (el ->> 'kwota_grosze')::integer  as kwota_grosze
    from jsonb_array_elements(p_przypisania) el
  loop
    if r.cost_id is null or r.kwota_grosze is null or r.kwota_grosze <= 0 then
      raise exception 'Nieprawidłowe przypisanie: wymagane cost_id (uuid) i kwota_grosze > 0';
    end if;
    -- Trigger walidacji cost_payments odrzuci koszt only_mine i nadpłatę.
    insert into public.cost_payments (cost_id, kwota_grosze, zrodlo, data, settlement_id)
    values (r.cost_id, r.kwota_grosze, 'card_assignment', v_rep_data, v_rep_id);
  end loop;

  return v_ids;
end;
$$;

comment on function public.rozlicz_dni is
  'Atomowe, nieodwracalne rozliczenie wielu dni naraz (jeden wiersz day_settlements na dzień). Opcjonalne przypisania kart Agaty na koszty wpinane w rozliczenie dnia max; limit = łączne karty Agaty z rozliczanych dni.';

revoke execute on function public.rozlicz_dni(date[], public.stylistka, jsonb, jsonb) from public;
grant execute on function public.rozlicz_dni(date[], public.stylistka, jsonb, jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- rozlicz_dzien: wariant jednodniowy → delegacja do rozlicz_dni.
-- Zostawiamy istniejącą sygnaturę (obecny ekran wciąż jej używa); logika żyje
-- teraz w jednym miejscu. Grant/komentarz zachowują się przy CREATE OR REPLACE.
-- ----------------------------------------------------------------------------
create or replace function public.rozlicz_dzien(
  p_data date,
  p_zatwierdzila public.stylistka,
  p_suma_kart_patrycja_grosze integer,
  p_suma_kart_agata_grosze integer,
  p_przypisania jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  v_ids := public.rozlicz_dni(
    array[p_data],
    p_zatwierdzila,
    jsonb_build_array(jsonb_build_object(
      'data', p_data,
      'patrycja_grosze', p_suma_kart_patrycja_grosze,
      'agata_grosze', p_suma_kart_agata_grosze
    )),
    p_przypisania
  );
  return v_ids[1];
end;
$$;

comment on function public.rozlicz_dzien is
  'Rozliczenie jednego dnia — cienka delegacja do rozlicz_dni (patrz migracja 20260716120000). Zachowane dla zgodności; logika w rozlicz_dni.';
