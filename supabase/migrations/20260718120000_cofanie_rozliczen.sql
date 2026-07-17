-- ============================================================================
-- Salon — cofanie rozliczenia + zapis gotówki do oddania Agacie
--
-- Dwie powiązane zmiany:
--   1. Rozliczenie dnia przestaje być NIEODWRACALNE bez wyjątków — dochodzi
--      kontrolowana ścieżka cofania (RPC cofnij_rozliczenie). Nadal nie da się
--      go ruszyć „z ręki": mutację przepuszczają triggery WYŁĄCZNIE, gdy ustawiona
--      jest flaga transakcyjna app.korekta_rozliczenia, którą ustawiają tylko nasze
--      SECURITY DEFINER RPC. PostgREST daje każdemu żądaniu osobną transakcję, więc
--      klient nie ustawi flagi i nie wykona obok niej własnego DML (jak przy
--      istniejącym bypassie pg_trigger_depth() > 1 w fn_payments_walidacja).
--   2. Przy rozliczeniu zapisujemy, ile GOTÓWKI Patrycja jest winna Agacie
--      (jej karty z terminala minus to, co Agata przypisała na koszty) + znacznik
--      „oddana", który Patrycja odhacza po przekazaniu gotówki.
--
-- Przy okazji rozlicz_dni przestaje zlepiać przypisania kart w jednym
-- „reprezentacyjnym" dniu (max daty) — rozdziela je na FAKTYCZNE dni wg budżetu
-- kart Agaty, żeby cofnięcie pojedynczego dnia zdejmowało tylko jego przypisania.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1 Rozszerzenie day_settlements: gotówka do oddania Agacie + znacznik oddania
-- ----------------------------------------------------------------------------

alter table public.day_settlements
  add column if not exists gotowka_dla_agaty_grosze integer not null default 0
    check (gotowka_dla_agaty_grosze >= 0),
  add column if not exists gotowka_oddana        boolean not null default false,
  add column if not exists gotowka_oddana_at     timestamptz,
  add column if not exists gotowka_oddana_przez  public.stylistka;

comment on column public.day_settlements.gotowka_dla_agaty_grosze is
  'Gotówka, którą Patrycja jest winna Agacie za ten dzień = karty Agaty − przypisania kart na koszty. Snapshot z chwili rozliczenia (przypisania są nieedytowalne, więc nie dryfuje).';
comment on column public.day_settlements.gotowka_oddana is
  'Czy Patrycja przekazała już Agacie gotówkę z tego rozliczenia (odhaczane w apce).';

-- Backfill istniejących rozliczeń: karty Agaty minus jej przypisania tego
-- rozliczenia. greatest(0, …) chroni stare rozliczenia wielodniowe, gdzie
-- przypisania były zlepione na dniu max (best-effort dla danych historycznych).
--
-- UWAGA: ten UPDATE odpala trigger nieodwracalności (na tym etapie jeszcze STARY,
-- twardo blokujący — podmieniamy go w §3). Na bazie z istniejącymi rozliczeniami
-- (produkcja) rzuciłby „nieodwracalne"; na pustej (staging) problem nie występował.
-- Dlatego wyłączamy trigger wyłącznie na czas backfillu i od razu włączamy z powrotem.
alter table public.day_settlements disable trigger trg_day_settlements_nieodwracalne;
update public.day_settlements ds
set gotowka_dla_agaty_grosze = greatest(0, ds.suma_kart_agata_grosze - coalesce((
  select sum(cp.kwota_grosze)
  from public.cost_payments cp
  where cp.settlement_id = ds.id and cp.zrodlo = 'card_assignment'
), 0));
alter table public.day_settlements enable trigger trg_day_settlements_nieodwracalne;

-- ----------------------------------------------------------------------------
-- §2 Flaga korekty — jedyna furtka dla triggerów ochronnych
-- ----------------------------------------------------------------------------
-- Ustawiana wyłącznie przez SECURITY DEFINER RPC (cofnij_rozliczenie,
-- oznacz_gotowke_oddana) przez set_config(..., true) = tylko na czas transakcji.

create or replace function public.w_trakcie_korekty()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('app.korekta_rozliczenia', true), '') = 'on'
$$;

-- ----------------------------------------------------------------------------
-- §3 Triggery ochronne — przepuszczają mutację tylko pod flagą korekty
-- ----------------------------------------------------------------------------
-- Ciała identyczne jak w 20260715120000_init_schema.sql; dokładany jest wyłącznie
-- warunek w_trakcie_korekty(). Bez flagi zachowują dotychczasową twardą blokadę.

-- day_settlements: nieodwracalne, chyba że trwa kontrolowana korekta.
create or replace function public.fn_day_settlements_nieodwracalne()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.w_trakcie_korekty() then
    if tg_op = 'DELETE' then
      return old;   -- cofnij_rozliczenie
    end if;
    return new;     -- oznacz_gotowke_oddana
  end if;
  raise exception 'Rozliczenie dnia jest nieodwracalne — nie można go zmienić ani usunąć';
end;
$$;

-- payments: walidacja INSERT/UPDATE — pod flagą korekty pomijamy ją w całości
-- (jak przy zagnieżdżonym blokowaniu wpisów), by pozwolić na locked = false.
create or replace function public.fn_payments_walidacja()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  d_new date := public.warsaw_date(new.data);
  d_old date;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Kontrolowane odblokowanie przy cofaniu rozliczenia — pomijamy walidację
  -- (dzień jest jeszcze rozliczony w chwili odblokowania wpisów).
  if public.w_trakcie_korekty() then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    d_old := public.warsaw_date(old.data);
    perform public.zablokuj_dzien(least(d_old, d_new));
    if d_old <> d_new then
      perform public.zablokuj_dzien(greatest(d_old, d_new));
    end if;
  else
    perform public.zablokuj_dzien(d_new);
  end if;

  if exists (select 1 from public.day_settlements ds where ds.data = d_new) then
    raise exception 'Dzień % jest już rozliczony — nie można dodać ani przenieść płatności', d_new;
  end if;

  if tg_op = 'INSERT' then
    new.locked := false;
  elsif new.locked is distinct from old.locked then
    raise exception 'Pole locked może zmienić wyłącznie rozliczenie dnia';
  end if;

  return new;
end;
$$;

-- payments: zablokowane wpisy nieedytowalne, chyba że trwa cofanie rozliczenia.
create or replace function public.fn_payments_chron_zablokowane()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.locked and not public.w_trakcie_korekty() then
    raise exception 'Wpis jest zablokowany — dzień % został rozliczony', public.warsaw_date(old.data);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- cost_payments: przypisania kart nieedytowalne, chyba że trwa cofanie rozliczenia
-- (wtedy RPC je usuwa razem z rozliczeniem).
create or replace function public.fn_cost_payments_chron_przypisania()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.zrodlo = 'card_assignment' and not public.w_trakcie_korekty() then
    raise exception 'Przypisanie kart z rozliczenia dnia jest nieedytowalne';
  end if;
  if tg_op = 'UPDATE' and new.zrodlo = 'card_assignment' then
    raise exception 'Zwrotu gotówkowego nie można zamienić na przypisanie kart';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- §4 rozlicz_dni — przypisania kart per FAKTYCZNY dzień + zapis gotówki Agaty
-- ----------------------------------------------------------------------------
-- Zmiana wobec 20260716120000: zamiast zlepiać wszystkie przypisania w dniu max,
-- rozdzielamy płaską listę p_przypisania na dni wg budżetu kart Agaty (najstarszy
-- dzień pierwszy). Każdy plasterek trafia jako osobny cost_payment do rozliczenia
-- swojego dnia, a rozliczenie dnia zapamiętuje gotowka_dla_agaty_grosze =
-- karty Agaty tego dnia − przypisane z tego dnia.
create or replace function public.rozlicz_dni(
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
  v_suma_kart_agaty bigint;
  v_suma_przypisan  bigint;
  n                 integer;
  i                 integer;
  d                 date;
  v_pat             integer;
  v_aga             integer;
  k                 integer;
  take              integer;
  r                 record;

  arr_data     date[];      -- dni rosnąco
  arr_pat      integer[];   -- karty Patrycji per dzień
  arr_aga      integer[];   -- karty Agaty per dzień (budżet przypisań)
  arr_assigned integer[];   -- przypisane z danego dnia
  arr_rem      integer[];   -- pozostały budżet Agaty per dzień (podczas rozdziału)
  arr_id       uuid[] := array[]::uuid[];  -- id rozliczenia per dzień (rosnąco)

  sl_idx   integer[] := array[]::integer[];  -- plasterki: indeks dnia
  sl_cost  uuid[]    := array[]::uuid[];      --            koszt
  sl_kwota integer[] := array[]::integer[];   --            kwota
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

  n := array_length(p_daty, 1);
  select array_agg(x order by x) into arr_data from unnest(p_daty) as x;

  arr_pat      := array_fill(0, array[n]);
  arr_aga      := array_fill(0, array[n]);
  arr_assigned := array_fill(0, array[n]);
  arr_rem      := array_fill(0, array[n]);

  -- Sumy kart per dzień z p_sumy (w kolejności rosnącej po dacie).
  for i in 1..n loop
    d := arr_data[i];
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
    arr_pat[i]  := v_pat;
    arr_aga[i]  := v_aga;
    arr_rem[i]  := v_aga;
  end loop;

  -- Łączne karty Agaty = limit przypisań.
  select coalesce(sum(x), 0) into v_suma_kart_agaty from unnest(arr_aga) as x;
  select coalesce(sum((el ->> 'kwota_grosze')::bigint), 0)
  into v_suma_przypisan
  from jsonb_array_elements(p_przypisania) el;

  if v_suma_przypisan > v_suma_kart_agaty then
    raise exception 'Suma przypisań (% gr) przekracza łączne karty Agaty z rozliczanych dni (% gr)',
      v_suma_przypisan, v_suma_kart_agaty;
  end if;

  -- ── Rozdział przypisań na dni (najstarszy budżet pierwszy) ────────────────
  for r in
    select (el ->> 'cost_id')::uuid          as cost_id,
           (el ->> 'kwota_grosze')::integer  as kwota_grosze
    from jsonb_array_elements(p_przypisania) el
  loop
    if r.cost_id is null or r.kwota_grosze is null or r.kwota_grosze <= 0 then
      raise exception 'Nieprawidłowe przypisanie: wymagane cost_id (uuid) i kwota_grosze > 0';
    end if;
    k := r.kwota_grosze;
    for i in 1..n loop
      exit when k <= 0;
      take := least(k, arr_rem[i]);
      if take > 0 then
        sl_idx      := sl_idx || i;
        sl_cost     := sl_cost || r.cost_id;
        sl_kwota    := sl_kwota || take;
        arr_rem[i]  := arr_rem[i] - take;
        arr_assigned[i] := arr_assigned[i] + take;
        k := k - take;
      end if;
    end loop;
    if k > 0 then
      -- Nie powinno wystąpić (limit łączny sprawdzony wyżej) — asekuracja.
      raise exception 'Nie udało się rozdzielić przypisania na dni (brak budżetu kart Agaty)';
    end if;
  end loop;

  -- ── Rozliczenia dni (rosnąco) — każdy INSERT odpala walidację sum i blokadę ─
  for i in 1..n loop
    insert into public.day_settlements
      (data, suma_kart_patrycja_grosze, suma_kart_agata_grosze, zatwierdzila,
       gotowka_dla_agaty_grosze)
    values
      (arr_data[i], arr_pat[i], arr_aga[i], p_zatwierdzila,
       arr_aga[i] - arr_assigned[i])
    returning id into v_settlement_id;

    v_ids := v_ids || v_settlement_id;
    arr_id := arr_id || v_settlement_id;
  end loop;

  -- ── Plasterki przypisań → cost_payments rozliczenia właściwego dnia ────────
  if array_length(sl_idx, 1) is not null then
    for i in 1..array_length(sl_idx, 1) loop
      -- Trigger walidacji cost_payments odrzuci koszt only_mine i nadpłatę należności.
      insert into public.cost_payments (cost_id, kwota_grosze, zrodlo, data, settlement_id)
      values (sl_cost[i], sl_kwota[i], 'card_assignment', arr_data[sl_idx[i]], arr_id[sl_idx[i]]);
    end loop;
  end if;

  return v_ids;
end;
$$;

comment on function public.rozlicz_dni is
  'Atomowe, odwracalne (RPC cofnij_rozliczenie) rozliczenie wielu dni. Przypisania kart Agaty rozdzielane na faktyczne dni wg budżetu kart (najstarszy pierwszy); każdy dzień zapisuje gotowka_dla_agaty_grosze = karty Agaty − przypisane z tego dnia.';

-- ----------------------------------------------------------------------------
-- §5 RPC: cofnięcie rozliczenia jednego dnia
-- ----------------------------------------------------------------------------
-- Zdejmuje przypisania kart tego rozliczenia, odblokowuje płatności dnia i usuwa
-- wiersz rozliczenia — wszystko w jednej transakcji, pod flagą korekty. Kolejność
-- wymuszona przez FK cost_payments.settlement_id (on delete restrict).
create or replace function public.cofnij_rozliczenie(p_settlement_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data date;
begin
  select data into v_data from public.day_settlements where id = p_settlement_id;
  if not found then
    raise exception 'Rozliczenie nie istnieje (mogło zostać już cofnięte)';
  end if;

  perform public.zablokuj_dzien(v_data);
  perform set_config('app.korekta_rozliczenia', 'on', true);

  delete from public.cost_payments where settlement_id = p_settlement_id;

  update public.payments
  set locked = false
  where public.warsaw_date(data) = v_data and locked;

  delete from public.day_settlements where id = p_settlement_id;

  -- Zamykamy furtkę zaraz po korekcie — w produkcji każde żądanie PostgREST to
  -- osobna transakcja, ale reset chroni przed wyciekiem flagi, gdyby kiedyś kilka
  -- operacji dzieliło jedną transakcję.
  perform set_config('app.korekta_rozliczenia', 'off', true);
end;
$$;

comment on function public.cofnij_rozliczenie is
  'Cofa rozliczenie jednego dnia: usuwa jego przypisania kart, odblokowuje płatności dnia i kasuje wiersz rozliczenia. Kontrolowana korekta pod flagą app.korekta_rozliczenia.';

revoke execute on function public.cofnij_rozliczenie(uuid) from public;
grant execute on function public.cofnij_rozliczenie(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- §6 RPC: odhaczenie „gotówka oddana"
-- ----------------------------------------------------------------------------
create or replace function public.oznacz_gotowke_oddana(
  p_settlement_id uuid,
  p_oddana boolean,
  p_przez public.stylistka
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.korekta_rozliczenia', 'on', true);

  update public.day_settlements
  set gotowka_oddana       = p_oddana,
      gotowka_oddana_at    = case when p_oddana then now() else null end,
      gotowka_oddana_przez = case when p_oddana then p_przez else null end
  where id = p_settlement_id;

  if not found then
    raise exception 'Rozliczenie nie istnieje';
  end if;

  perform set_config('app.korekta_rozliczenia', 'off', true);
end;
$$;

comment on function public.oznacz_gotowke_oddana is
  'Ustawia znacznik przekazania Agacie gotówki z rozliczenia (gotowka_oddana + kto/kiedy). Kontrolowana zmiana pod flagą app.korekta_rozliczenia — jedyny dozwolony UPDATE na day_settlements.';

revoke execute on function public.oznacz_gotowke_oddana(uuid, boolean, public.stylistka) from public;
grant execute on function public.oznacz_gotowke_oddana(uuid, boolean, public.stylistka) to authenticated;

-- ----------------------------------------------------------------------------
-- Realtime: day_settlements/cost_payments/payments są już w publikacji
-- supabase_realtime (patrz init_schema §Uwaga) — cofnięcie i odhaczenie
-- „oddana" docierają do drugiego telefonu bez dodatkowej konfiguracji.
-- ----------------------------------------------------------------------------
