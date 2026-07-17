-- ============================================================================
-- Salon — dane testowe (seed) dla środowiska STAGING / Preview
--
-- To NIE jest migracja. Uruchamia się:
--   * automatycznie przy `supabase db reset` (config.toml: [db.seed]
--     sql_paths = ["./seed.sql"]), na świeżo odtworzonej bazie, ORAZ
--   * ręcznie w SQL editorze projektu staging (po zaaplikowaniu migracji).
--
-- ⚠️ Tylko dla bazy staging — nigdy nie uruchamiać na produkcji.
--
-- Cel: dać gotową piaskownicę do testów, włącznie z NIEODWRACALNYM
-- rozliczeniem dnia. Dlatego seed:
--   * wstawia płatności na DZISIEJSZY dzień salonu (Europe/Warsaw) — gotówka
--     i karta, obie stylistki — czyli jeden nierozliczony dzień gotowy do
--     rozliczenia na ekranie „Rozliczenia";
--   * wstawia trzy koszty pokrywające wszystkie tryby podziału (fifty_fifty,
--     only_mine, custom), z których fifty_fifty jest niepokryty — można na nim
--     przetestować przypisanie kart Agaty lub zwrot gotówką;
--   * NIE tworzy żadnego rozliczenia (day_settlements) — to zostawiamy do
--     ręcznego testu; rozliczenie jest nieodwracalne (trigger blokuje
--     UPDATE/DELETE), więc seed i tak nie mógłby go potem sprzątnąć.
--
-- Wszystkie wpisy mają prefiks „DEMO " w nazwie/kliencie, żeby dało się je
-- rozpoznać i wyczyścić. Kwoty są w GROSZACH jako integer (nigdy float).
--
-- Re-runnable: blok czyszczący poniżej usuwa poprzednie wpisy DEMO. Działa
-- dopóki dane DEMO nie zostały rozliczone. Po ręcznym rozliczeniu płatności
-- są locked (a przypisania kart nieusuwalne) — wtedy najczystszym resetem
-- piaskownicy jest `supabase db reset`, który odtwarza bazę od zera.
-- ============================================================================

-- ── Czyszczenie poprzednich danych DEMO ─────────────────────────────────────
-- Kolejność wymuszona przez FK cost_payments.cost_id → costs (on delete
-- restrict): najpierw zwroty, potem koszty; płatności niezależnie.
delete from public.cost_payments cp
using public.costs c
where cp.cost_id = c.id and c.nazwa like 'DEMO %';

delete from public.costs where nazwa like 'DEMO %';
delete from public.payments where klientka like 'DEMO %';

-- ── Płatności dzisiejszego dnia (nierozliczony dzień do testu) ───────────────
-- data = now(): trafia w dzisiejszy dzień salonu niezależnie od tego, kiedy
-- seed uruchomiono. Miks gotówka/karta i obie stylistki — pełny materiał do
-- rozliczenia (sumy kart per stylistka są walidowane przy rozliczeniu).
insert into public.payments (klientka, kwota_grosze, metoda, stylistka, data) values
  ('DEMO Ania',    15000, 'card', 'patrycja', now()),
  ('DEMO Basia',    8000, 'cash', 'patrycja', now()),
  ('DEMO Celina',  20000, 'card', 'agata',    now()),
  ('DEMO Dorota',  12000, 'cash', 'agata',    now());

-- ── Koszty: po jednym z każdego trybu podziału ──────────────────────────────
-- data = warsaw_date(now()): dzisiejszy dzień salonu.
insert into public.costs
  (nazwa, kwota_grosze, tryb, kwota_patrycja_grosze, kwota_agata_grosze, data, stylistka_dodajaca)
values
  -- 50/50: Agata jest winna Patrycji 60000 gr — niepokryty, gotowy do testu
  -- przypisania kart / zwrotu gotówką.
  ('DEMO Czynsz',         120000, 'fifty_fifty', 60000, 60000, public.warsaw_date(now()), 'patrycja'),
  -- „tylko moja": całość po stronie Agaty, bez rozliczenia między stylistkami.
  ('DEMO Farby Agaty',      8000, 'only_mine',       0,  8000, public.warsaw_date(now()), 'agata'),
  -- własny podział: należność Agaty = 10000 gr.
  ('DEMO Zamówienie mix',  30000, 'custom',      20000, 10000, public.warsaw_date(now()), 'patrycja');
