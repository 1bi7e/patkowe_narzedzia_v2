-- ============================================================================
-- Salon — schemat początkowy
-- Tabele: payments, costs, cost_payments, day_settlements
--
-- Zasady wymuszane NA POZIOMIE BAZY (nie tylko w UI):
--   * kwoty zawsze w groszach jako integer, nigdy float
--   * rozliczenie dnia jest nieodwracalne — wpisy z locked = true są
--     nieedytowalne (triggery + RLS)
--   * dzień z istniejącym rozliczeniem nie przyjmuje nowych płatności
--   * przypisania kart (zrodlo = 'card_assignment') powstają wyłącznie przez
--     RPC rozlicz_dzien i są nieedytowalne; zwroty gotówkowe można poprawiać
--   * status pokrycia kosztu jest wyliczany (widok costs_coverage),
--     nie przechowywany
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1 Enumy
-- ----------------------------------------------------------------------------

create type public.stylistka as enum ('patrycja', 'agata');
create type public.metoda_platnosci as enum ('cash', 'card');
create type public.tryb_podzialu as enum ('fifty_fifty', 'only_mine', 'custom');
create type public.zrodlo_zwrotu as enum ('cash', 'card_assignment');

-- ----------------------------------------------------------------------------
-- §2 Funkcje pomocnicze
-- ----------------------------------------------------------------------------

-- Dzień kalendarzowy w strefie salonu (Europe/Warsaw) — jedyna definicja
-- „dnia" używana przy rozliczeniach.
-- UWAGA: świadomie IMMUTABLE, choć formalnie AT TIME ZONE jest STABLE
-- (zmiana danych tzdata mogłaby przesunąć wynik) — wymagane, by użyć funkcji
-- w indeksie; dla Europe/Warsaw bezpieczne.
create function public.warsaw_date(ts timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select (ts at time zone 'Europe/Warsaw')::date
$$;

-- Blokada advisory na dzień (na czas transakcji) — serializuje wyścig między
-- dodawaniem/przenoszeniem płatności a rozliczaniem tego samego dnia.
create function public.zablokuj_dzien(d date)
returns void
language sql
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('rozliczenie_dnia:' || d::text, 0))
$$;

-- ----------------------------------------------------------------------------
-- §3 Tabele
-- ----------------------------------------------------------------------------

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  klientka      text not null check (btrim(klientka) <> ''),
  kwota_grosze  integer not null check (kwota_grosze > 0),
  metoda        public.metoda_platnosci not null,
  stylistka     public.stylistka not null,
  data          timestamptz not null default now(),
  locked        boolean not null default false,
  created_at    timestamptz not null default now()
);

comment on table public.payments is
  'Płatności klientek. Wpis należy do zalogowanej stylistki; metoda to gotówka LUB karta, nigdy mix. Po rozliczeniu dnia locked = true — wpis nieedytowalny (egzekwowane triggerami).';

create table public.costs (
  id                     uuid primary key default gen_random_uuid(),
  nazwa                  text not null check (btrim(nazwa) <> ''),
  kwota_grosze           integer not null check (kwota_grosze > 0),
  tryb                   public.tryb_podzialu not null,
  kwota_patrycja_grosze  integer not null check (kwota_patrycja_grosze >= 0),
  kwota_agata_grosze     integer not null check (kwota_agata_grosze >= 0),
  -- Data kosztu = kiedy koszt wystąpił (nie kiedy wpisano) — wpis retro dozwolony.
  data                   date not null default public.warsaw_date(now()),
  stylistka_dodajaca     public.stylistka not null,
  created_at             timestamptz not null default now(),

  -- Części zawsze sumują się do kwoty łącznej (formuła zarobku netto musi się zgadzać).
  constraint costs_podzial_suma
    check (kwota_patrycja_grosze + kwota_agata_grosze = kwota_grosze),
  -- „Tylko moja": całość po jednej stronie (druga = 0).
  constraint costs_only_mine_jedna_strona
    check (tryb <> 'only_mine' or kwota_patrycja_grosze = 0 or kwota_agata_grosze = 0),
  -- 50/50: różnica części to najwyżej 1 grosz (nieparzysta kwota łączna).
  constraint costs_fifty_fifty_rowny_podzial
    check (tryb <> 'fifty_fifty' or abs(kwota_patrycja_grosze - kwota_agata_grosze) <= 1)
);

comment on table public.costs is
  'Koszty salonu. Patrycja opłaca koszty wspólne z góry; kwota_agata_grosze to należność Agaty wobec Patrycji (dla trybów fifty_fifty i custom). Tryb only_mine nie podlega rozliczeniu między stylistkami.';

create table public.day_settlements (
  id                         uuid primary key default gen_random_uuid(),
  data                       date not null unique,
  suma_kart_patrycja_grosze  integer not null check (suma_kart_patrycja_grosze >= 0),
  suma_kart_agata_grosze     integer not null check (suma_kart_agata_grosze >= 0),
  zatwierdzila               public.stylistka not null,
  created_at                 timestamptz not null default now()
);

comment on table public.day_settlements is
  'Rozliczenia dni — NIEODWRACALNE. Jedno na dzień; blokuje wszystkie płatności tego dnia. Tworzone wyłącznie przez RPC rozlicz_dzien (brak polityki INSERT).';

create table public.cost_payments (
  id             uuid primary key default gen_random_uuid(),
  cost_id        uuid not null references public.costs (id) on delete restrict,
  kwota_grosze   integer not null check (kwota_grosze > 0),
  zrodlo         public.zrodlo_zwrotu not null,
  data           date not null default public.warsaw_date(now()),
  settlement_id  uuid references public.day_settlements (id) on delete restrict,
  created_at     timestamptz not null default now(),

  -- Przypisanie kart zawsze wskazuje rozliczenie dnia; zwrot gotówkowy nigdy.
  constraint cost_payments_zrodlo_settlement
    check ((zrodlo = 'card_assignment') = (settlement_id is not null))
);

comment on table public.cost_payments is
  'Zwroty Agaty na koszty: gotówka („Otrzymałam X zł", edytowalne) lub przypisanie kart przy rozliczeniu dnia (finalne, bez potwierdzania — nieedytowalne).';

-- ----------------------------------------------------------------------------
-- §4 Indeksy
-- ----------------------------------------------------------------------------

create index idx_payments_dzien on public.payments (public.warsaw_date(data));
create index idx_cost_payments_cost on public.cost_payments (cost_id);
create index idx_cost_payments_settlement on public.cost_payments (settlement_id);

-- ----------------------------------------------------------------------------
-- §5 Triggery
-- ----------------------------------------------------------------------------

-- payments: walidacja przy INSERT/UPDATE — dzień nie może być już rozliczony,
-- locked zmienia tylko rozliczenie dnia.
create function public.fn_payments_walidacja()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  d_new date := public.warsaw_date(new.data);
  d_old date;
begin
  -- Aktualizacja wykonywana z wnętrza innego triggera (blokowanie wpisów przy
  -- rozliczeniu dnia) — pomijamy walidację; klient nigdy nie działa na tej głębokości.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Advisory lock zamyka wyścig: płatność dodawana równolegle z rozliczeniem
  -- tego samego dnia musiałaby przejść lub poczekać — nigdy prześlizgnąć się obok.
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

create trigger trg_payments_walidacja
  before insert or update on public.payments
  for each row execute function public.fn_payments_walidacja();

-- payments: wpisy zablokowane po rozliczeniu są nieedytowalne i nieusuwalne.
create function public.fn_payments_chron_zablokowane()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.locked then
    raise exception 'Wpis jest zablokowany — dzień % został rozliczony', public.warsaw_date(old.data);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_payments_chron_zablokowane
  before update or delete on public.payments
  for each row execute function public.fn_payments_chron_zablokowane();

-- day_settlements: przy INSERT sumy kart muszą zgadzać się z faktycznymi
-- wpisami dnia (integralność + wykrycie nieświeżych danych w UI).
create function public.fn_day_settlements_walidacja()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_pat integer;
  v_aga integer;
begin
  perform public.zablokuj_dzien(new.data);

  select
    coalesce(sum(kwota_grosze) filter (where stylistka = 'patrycja'), 0),
    coalesce(sum(kwota_grosze) filter (where stylistka = 'agata'), 0)
  into v_pat, v_aga
  from public.payments
  where metoda = 'card' and public.warsaw_date(data) = new.data;

  if v_pat <> new.suma_kart_patrycja_grosze or v_aga <> new.suma_kart_agata_grosze then
    raise exception 'Sumy kart nie zgadzają się z wpisami dnia % (faktycznie: Patrycja % gr, Agata % gr) — odśwież podsumowanie',
      new.data, v_pat, v_aga;
  end if;

  return new;
end;
$$;

create trigger trg_day_settlements_walidacja
  before insert on public.day_settlements
  for each row execute function public.fn_day_settlements_walidacja();

-- day_settlements: po INSERT blokuje wszystkie płatności rozliczonego dnia.
-- SECURITY DEFINER: działa jako właściciel tabel, więc omija politykę RLS
-- payments (with check (not locked)), która odrzuciłaby ustawienie locked = true.
create function public.fn_day_settlements_zablokuj_payments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments
  set locked = true
  where public.warsaw_date(data) = new.data
    and not locked;
  return null;
end;
$$;

create trigger trg_day_settlements_zablokuj_payments
  after insert on public.day_settlements
  for each row execute function public.fn_day_settlements_zablokuj_payments();

-- day_settlements: rozliczenie dnia jest nieodwracalne — zero UPDATE/DELETE.
-- (Świadoma decyzja: awaryjna korekta wymaga ręcznego zdjęcia triggera w SQL editorze.)
create function public.fn_day_settlements_nieodwracalne()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Rozliczenie dnia jest nieodwracalne — nie można go zmienić ani usunąć';
end;
$$;

create trigger trg_day_settlements_nieodwracalne
  before update or delete on public.day_settlements
  for each row execute function public.fn_day_settlements_nieodwracalne();

-- costs: po pierwszym zwrocie kwoty i tryb są zamrożone (nazwa i data — edytowalne).
create function public.fn_costs_chron_po_zwrotach()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.kwota_grosze <> old.kwota_grosze
      or new.kwota_patrycja_grosze <> old.kwota_patrycja_grosze
      or new.kwota_agata_grosze <> old.kwota_agata_grosze
      or new.tryb <> old.tryb)
     and exists (select 1 from public.cost_payments cp where cp.cost_id = old.id) then
    raise exception 'Koszt ma już zwroty — nie można zmienić kwot ani trybu podziału';
  end if;
  return new;
end;
$$;

create trigger trg_costs_chron_po_zwrotach
  before update on public.costs
  for each row execute function public.fn_costs_chron_po_zwrotach();

-- cost_payments: zwrot tylko na koszt z rozliczeniem między stylistkami
-- i nigdy ponad należność Agaty.
create function public.fn_cost_payments_walidacja()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tryb          public.tryb_podzialu;
  v_udzial_agaty  integer;
  v_pokryte       bigint;
begin
  -- FOR UPDATE serializuje równoległe zwroty na ten sam koszt — inaczej dwa
  -- wpisy naraz mogłyby obejść limit pokrycia.
  select tryb, kwota_agata_grosze
  into v_tryb, v_udzial_agaty
  from public.costs
  where id = new.cost_id
  for update;

  if v_tryb = 'only_mine' then
    raise exception 'Koszt w trybie „tylko moja" nie podlega rozliczeniu między stylistkami';
  end if;

  select coalesce(sum(kwota_grosze), 0)
  into v_pokryte
  from public.cost_payments
  where cost_id = new.cost_id and id <> new.id;

  if v_pokryte + new.kwota_grosze > v_udzial_agaty then
    raise exception 'Zwrot % gr przekracza pozostałą do pokrycia część Agaty (% gr)',
      new.kwota_grosze, v_udzial_agaty - v_pokryte;
  end if;

  return new;
end;
$$;

create trigger trg_cost_payments_walidacja
  before insert or update on public.cost_payments
  for each row execute function public.fn_cost_payments_walidacja();

-- cost_payments: przypisania kart należą do nieodwracalnego rozliczenia dnia —
-- nieedytowalne; zwroty gotówkowe można poprawiać i usuwać.
create function public.fn_cost_payments_chron_przypisania()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.zrodlo = 'card_assignment' then
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

create trigger trg_cost_payments_chron_przypisania
  before update or delete on public.cost_payments
  for each row execute function public.fn_cost_payments_chron_przypisania();

-- ----------------------------------------------------------------------------
-- §6 Widok: koszty z wyliczonym pokryciem
-- ----------------------------------------------------------------------------

-- security_invoker: widok respektuje RLS tabel bazowych (inaczej działałby
-- z uprawnieniami właściciela i omijał polityki).
create view public.costs_coverage
with (security_invoker = true) as
select
  c.*,
  case when c.tryb = 'only_mine' then null
       else coalesce(cp.suma, 0) end as pokryte_grosze,
  case when c.tryb = 'only_mine' then null
       else c.kwota_agata_grosze - coalesce(cp.suma, 0) end as pozostalo_grosze,
  case when c.tryb = 'only_mine' then null
       when coalesce(cp.suma, 0) >= c.kwota_agata_grosze then 'pokryty'
       when coalesce(cp.suma, 0) > 0 then 'czesciowo_pokryty'
       else 'niepokryty' end as status_pokrycia
from public.costs c
left join (
  select cost_id, sum(kwota_grosze)::integer as suma
  from public.cost_payments
  group by cost_id
) cp on cp.cost_id = c.id;

comment on view public.costs_coverage is
  'Koszty ze statusem pokrycia wyliczonym z cost_payments (niepokryty / czesciowo_pokryty / pokryty; NULL dla trybu only_mine — brak rozliczenia między stylistkami).';

-- ----------------------------------------------------------------------------
-- §7 RPC: atomowe rozliczenie dnia
-- ----------------------------------------------------------------------------

-- Jedyna droga rozliczenia dnia (supabase-js nie ma transakcji po stronie
-- klienta): wstawia rozliczenie, blokuje wpisy dnia (triggery) i zapisuje
-- przypisania kart Agaty na koszty — wszystko w jednej transakcji.
-- p_przypisania: [{"cost_id": "<uuid>", "kwota_grosze": <int>}, ...]
create function public.rozlicz_dzien(
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
  v_settlement_id  uuid;
  v_suma_przypisan bigint;
  r record;
begin
  if p_przypisania is null or jsonb_typeof(p_przypisania) <> 'array' then
    raise exception 'p_przypisania musi być tablicą JSON';
  end if;

  select coalesce(sum((el ->> 'kwota_grosze')::bigint), 0)
  into v_suma_przypisan
  from jsonb_array_elements(p_przypisania) el;

  -- Przypisać można najwyżej tyle, ile Agata utargowała kartami tego dnia.
  if v_suma_przypisan > p_suma_kart_agata_grosze then
    raise exception 'Suma przypisań (% gr) przekracza karty Agaty (% gr)',
      v_suma_przypisan, p_suma_kart_agata_grosze;
  end if;

  -- Trigger walidacji sprawdzi zgodność sum z wpisami dnia,
  -- trigger AFTER INSERT zablokuje płatności.
  insert into public.day_settlements
    (data, suma_kart_patrycja_grosze, suma_kart_agata_grosze, zatwierdzila)
  values
    (p_data, p_suma_kart_patrycja_grosze, p_suma_kart_agata_grosze, p_zatwierdzila)
  returning id into v_settlement_id;

  for r in
    select (el ->> 'cost_id')::uuid   as cost_id,
           (el ->> 'kwota_grosze')::integer as kwota_grosze
    from jsonb_array_elements(p_przypisania) el
  loop
    if r.cost_id is null or r.kwota_grosze is null or r.kwota_grosze <= 0 then
      raise exception 'Nieprawidłowe przypisanie: wymagane cost_id (uuid) i kwota_grosze > 0';
    end if;
    -- Trigger walidacji cost_payments odrzuci koszt only_mine i nadpłatę.
    insert into public.cost_payments (cost_id, kwota_grosze, zrodlo, data, settlement_id)
    values (r.cost_id, r.kwota_grosze, 'card_assignment', p_data, v_settlement_id);
  end loop;

  return v_settlement_id;
end;
$$;

comment on function public.rozlicz_dzien is
  'Atomowe, nieodwracalne rozliczenie dnia z opcjonalnym przypisaniem kart Agaty na koszty. Przypisanie jest finalne — bez osobnego potwierdzania.';

revoke execute on function public.rozlicz_dzien(date, public.stylistka, integer, integer, jsonb) from public;
grant execute on function public.rozlicz_dzien(date, public.stylistka, integer, integer, jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- §8 RLS
-- ----------------------------------------------------------------------------
-- Aplikacja nie ma auth (wybór profilu w localStorage) — klient działa jako
-- anon. Polityki gate'ują anon/authenticated; kolumna stylistka przy wpisach
-- jest z założenia „na słowo" (RLS nie odróżni dwóch profili bez auth).

alter table public.payments enable row level security;
alter table public.costs enable row level security;
alter table public.cost_payments enable row level security;
alter table public.day_settlements enable row level security;

-- payments: pełny dostęp do wpisów niezablokowanych.
create policy payments_select on public.payments
  for select to anon, authenticated using (true);
create policy payments_insert on public.payments
  for insert to anon, authenticated with check (not locked);
create policy payments_update on public.payments
  for update to anon, authenticated using (not locked) with check (not locked);
create policy payments_delete on public.payments
  for delete to anon, authenticated using (not locked);

-- costs: pełny CRUD — integralności pilnują triggery i FK (on delete restrict).
create policy costs_select on public.costs
  for select to anon, authenticated using (true);
create policy costs_insert on public.costs
  for insert to anon, authenticated with check (true);
create policy costs_update on public.costs
  for update to anon, authenticated using (true) with check (true);
create policy costs_delete on public.costs
  for delete to anon, authenticated using (true);

-- cost_payments: klient operuje tylko na zwrotach gotówkowych;
-- przypisania kart powstają wyłącznie przez RPC (SECURITY DEFINER).
create policy cost_payments_select on public.cost_payments
  for select to anon, authenticated using (true);
create policy cost_payments_insert on public.cost_payments
  for insert to anon, authenticated with check (zrodlo = 'cash');
create policy cost_payments_update on public.cost_payments
  for update to anon, authenticated using (zrodlo = 'cash') with check (zrodlo = 'cash');
create policy cost_payments_delete on public.cost_payments
  for delete to anon, authenticated using (zrodlo = 'cash');

-- day_settlements: tylko odczyt — INSERT wyłącznie przez RPC rozlicz_dzien
-- (brak polityki = odmowa), UPDATE/DELETE nigdy (nieodwracalność).
create policy day_settlements_select on public.day_settlements
  for select to anon, authenticated using (true);

-- ----------------------------------------------------------------------------
-- Uwaga (Realtime): żeby Patrycja od razu widziała przypisania Agaty, włącz
-- replikację tabel w panelu Supabase (Database → Publications →
-- supabase_realtime) dla: payments, cost_payments, day_settlements.
-- ----------------------------------------------------------------------------
