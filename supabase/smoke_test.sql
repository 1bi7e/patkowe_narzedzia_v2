-- ============================================================================
-- Salon — smoke-test schematu (NIE jest migracją — nie wrzucać do migrations/)
--
-- Uruchom w Supabase SQL editorze (lub psql) PO zaaplikowaniu migracji.
-- Wszystko dzieje się w dwóch blokach DO, z których każdy kończy się
-- celowym wyjątkiem „SMOKE_TEST_ROLLBACK" — dzięki temu żadne dane testowe
-- nie zostają w bazie. Wynik czytaj z komunikatów NOTICE:
--   * każdy test wypisuje „OK (n): …"
--   * błąd zaczynający się od „FAIL:" oznacza, że zabezpieczenie nie zadziałało
--   * końcowy wyjątek SMOKE_TEST_ROLLBACK = wszystkie testy przeszły
--
-- Daty testowe są w roku 2001, żeby nie zderzyć się z prawdziwymi
-- rozliczeniami (dzień 2001-01-05 na pewno nie był rozliczony).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Blok 1: triggery (działa jako właściciel tabel — RLS pominięte,
-- testujemy wyłącznie zabezpieczenia triggerowe i constrainty)
-- ----------------------------------------------------------------------------

do $$
declare
  v_cost_5050    uuid;
  v_cost_only    uuid;
  v_cost_custom  uuid;
  v_settlement   uuid;
  v_platnosc     uuid;
  v_platnosc2    uuid;
  v_zwrot_karta  uuid;
  v_zwrot_cash   uuid;
  v_status       text;
  v_pokryte      integer;
  v_ile          integer;
begin
  -- ── Dane testowe ──────────────────────────────────────────────────────────
  insert into payments (klientka, kwota_grosze, metoda, stylistka, data) values
    ('TEST Ania',  15000, 'card', 'patrycja', timestamptz '2001-01-05 10:00+01'),
    ('TEST Beata', 20000, 'card', 'agata',    timestamptz '2001-01-05 11:00+01'),
    ('TEST Cela',  10000, 'cash', 'agata',    timestamptz '2001-01-05 12:00+01');

  insert into costs (nazwa, kwota_grosze, tryb, kwota_patrycja_grosze, kwota_agata_grosze, data, stylistka_dodajaca)
  values ('TEST czynsz', 100000, 'fifty_fifty', 50000, 50000, date '2001-01-01', 'patrycja')
  returning id into v_cost_5050;

  insert into costs (nazwa, kwota_grosze, tryb, kwota_patrycja_grosze, kwota_agata_grosze, data, stylistka_dodajaca)
  values ('TEST farby Agaty', 8000, 'only_mine', 0, 8000, date '2001-01-02', 'agata')
  returning id into v_cost_only;

  insert into costs (nazwa, kwota_grosze, tryb, kwota_patrycja_grosze, kwota_agata_grosze, data, stylistka_dodajaca)
  values ('TEST zamówienie mix', 30000, 'custom', 20000, 10000, date '2001-01-03', 'patrycja')
  returning id into v_cost_custom;

  -- ── 1. Rozliczenie z błędnymi sumami kart → odrzut ───────────────────────
  begin
    v_settlement := rozlicz_dzien(date '2001-01-05', 'agata', 15000, 99999);
    raise exception 'FAIL: rozliczenie z błędnymi sumami przeszło';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (1): błędne sumy kart odrzucone — %', sqlerrm;
  end;

  -- ── 2. Poprawne rozliczenie + przypisanie 200 zł kart Agaty na czynsz ─────
  v_settlement := rozlicz_dzien(
    date '2001-01-05', 'agata', 15000, 20000,
    jsonb_build_array(jsonb_build_object('cost_id', v_cost_5050, 'kwota_grosze', 20000))
  );
  raise notice 'OK (2): rozliczenie utworzone (%)', v_settlement;

  -- ── 3. Wszystkie wpisy dnia zablokowane ───────────────────────────────────
  select count(*) into v_ile
  from payments
  where warsaw_date(data) = date '2001-01-05' and not locked;
  if v_ile > 0 then
    raise exception 'FAIL: % wpisów dnia pozostało niezablokowanych', v_ile;
  end if;
  raise notice 'OK (3): wszystkie wpisy rozliczonego dnia mają locked = true';

  -- ── 4. Edycja zablokowanego wpisu → odrzut ────────────────────────────────
  select id into v_platnosc from payments where klientka = 'TEST Ania';
  begin
    update payments set kwota_grosze = 1 where id = v_platnosc;
    raise exception 'FAIL: edycja zablokowanego wpisu przeszła';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (4): edycja zablokowanego wpisu odrzucona — %', sqlerrm;
  end;

  -- ── 5. Usunięcie zablokowanego wpisu → odrzut ─────────────────────────────
  begin
    delete from payments where id = v_platnosc;
    raise exception 'FAIL: usunięcie zablokowanego wpisu przeszło';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (5): usunięcie zablokowanego wpisu odrzucone — %', sqlerrm;
  end;

  -- ── 6. Nowa płatność w rozliczonym dniu → odrzut ──────────────────────────
  begin
    insert into payments (klientka, kwota_grosze, metoda, stylistka, data)
    values ('TEST po rozliczeniu', 5000, 'cash', 'patrycja', timestamptz '2001-01-05 15:00+01');
    raise exception 'FAIL: płatność w rozliczonym dniu przeszła';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (6): płatność w rozliczonym dniu odrzucona — %', sqlerrm;
  end;

  -- ── 7. Ręczna zmiana locked na niezablokowanym wpisie → odrzut ────────────
  insert into payments (klientka, kwota_grosze, metoda, stylistka, data)
  values ('TEST inny dzień', 5000, 'cash', 'patrycja', timestamptz '2001-01-06 10:00+01')
  returning id into v_platnosc2;
  begin
    update payments set locked = true where id = v_platnosc2;
    raise exception 'FAIL: ręczne ustawienie locked przeszło';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (7): ręczna zmiana locked odrzucona — %', sqlerrm;
  end;

  -- ── 8. Przeniesienie wpisu na rozliczony dzień → odrzut ───────────────────
  begin
    update payments set data = timestamptz '2001-01-05 15:00+01' where id = v_platnosc2;
    raise exception 'FAIL: przeniesienie wpisu na rozliczony dzień przeszło';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (8): przeniesienie na rozliczony dzień odrzucone — %', sqlerrm;
  end;

  -- ── 9. UPDATE i DELETE rozliczenia → odrzut (nieodwracalność) ─────────────
  begin
    update day_settlements set suma_kart_agata_grosze = 0 where id = v_settlement;
    raise exception 'FAIL: edycja rozliczenia przeszła';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (9a): edycja rozliczenia odrzucona — %', sqlerrm;
  end;
  begin
    delete from day_settlements where id = v_settlement;
    raise exception 'FAIL: usunięcie rozliczenia przeszło';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (9b): usunięcie rozliczenia odrzucone — %', sqlerrm;
  end;

  -- ── 10. Zwrot na koszt „tylko moja" → odrzut ──────────────────────────────
  begin
    insert into cost_payments (cost_id, kwota_grosze, zrodlo, data)
    values (v_cost_only, 1000, 'cash', date '2001-01-06');
    raise exception 'FAIL: zwrot na koszt only_mine przeszedł';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (10): zwrot na koszt only_mine odrzucony — %', sqlerrm;
  end;

  -- ── 11. Nadpłata (pokryte 200 zł z 500 zł; próba +400 zł) → odrzut ────────
  begin
    insert into cost_payments (cost_id, kwota_grosze, zrodlo, data)
    values (v_cost_5050, 40000, 'cash', date '2001-01-06');
    raise exception 'FAIL: nadpłata przeszła';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (11): nadpłata odrzucona — %', sqlerrm;
  end;

  -- ── 12. Edycja/usunięcie przypisania kartowego → odrzut ───────────────────
  select id into v_zwrot_karta
  from cost_payments where settlement_id = v_settlement;
  begin
    update cost_payments set kwota_grosze = 1 where id = v_zwrot_karta;
    raise exception 'FAIL: edycja przypisania kartowego przeszła';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (12a): edycja przypisania kartowego odrzucona — %', sqlerrm;
  end;
  begin
    delete from cost_payments where id = v_zwrot_karta;
    raise exception 'FAIL: usunięcie przypisania kartowego przeszło';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (12b): usunięcie przypisania kartowego odrzucone — %', sqlerrm;
  end;

  -- ── 13. Zmiana kwot kosztu ze zwrotami → odrzut; zmiana nazwy → OK ────────
  begin
    update costs set kwota_grosze = 90000, kwota_patrycja_grosze = 45000, kwota_agata_grosze = 45000
    where id = v_cost_5050;
    raise exception 'FAIL: zmiana kwot kosztu ze zwrotami przeszła';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (13a): zmiana kwot kosztu ze zwrotami odrzucona — %', sqlerrm;
  end;
  update costs set nazwa = 'TEST czynsz (poprawiona nazwa)' where id = v_cost_5050;
  raise notice 'OK (13b): zmiana nazwy kosztu ze zwrotami dozwolona';

  -- ── 14. Status pokrycia po przypisaniu: częściowo pokryty ─────────────────
  select status_pokrycia, pokryte_grosze into v_status, v_pokryte
  from costs_coverage where id = v_cost_5050;
  if v_status <> 'czesciowo_pokryty' or v_pokryte <> 20000 then
    raise exception 'FAIL: oczekiwano czesciowo_pokryty/20000, jest %/%', v_status, v_pokryte;
  end if;
  raise notice 'OK (14): czynsz częściowo pokryty (200 zł z 500 zł)';

  -- ── 15. Zwrot gotówkowy jest edytowalny; po dopłacie status pokryty ───────
  insert into cost_payments (cost_id, kwota_grosze, zrodlo, data)
  values (v_cost_5050, 10000, 'cash', date '2001-01-06')
  returning id into v_zwrot_cash;
  update cost_payments set kwota_grosze = 30000 where id = v_zwrot_cash;
  select status_pokrycia into v_status from costs_coverage where id = v_cost_5050;
  if v_status <> 'pokryty' then
    raise exception 'FAIL: oczekiwano pokryty, jest %', v_status;
  end if;
  raise notice 'OK (15): zwrot gotówkowy edytowalny; czynsz w pełni pokryty';

  -- ── 16. Nadpłata przez edycję zwrotu gotówkowego → odrzut ─────────────────
  begin
    update cost_payments set kwota_grosze = 40000 where id = v_zwrot_cash;
    raise exception 'FAIL: nadpłata przez edycję zwrotu przeszła';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (16): nadpłata przez edycję zwrotu odrzucona — %', sqlerrm;
  end;

  -- ── 17. Pozostałe statusy: custom → niepokryty, only_mine → NULL ──────────
  select status_pokrycia into v_status from costs_coverage where id = v_cost_custom;
  if v_status <> 'niepokryty' then
    raise exception 'FAIL: koszt custom — oczekiwano niepokryty, jest %', v_status;
  end if;
  select status_pokrycia into v_status from costs_coverage where id = v_cost_only;
  if v_status is not null then
    raise exception 'FAIL: koszt only_mine — oczekiwano NULL, jest %', v_status;
  end if;
  raise notice 'OK (17): statusy niepokryty / NULL (only_mine) poprawne';

  -- Celowy wyjątek — wycofuje wszystkie dane testowe.
  raise exception 'SMOKE_TEST_ROLLBACK: wszystkie testy triggerów przeszły — dane testowe wycofane';
end;
$$;

-- ----------------------------------------------------------------------------
-- Blok 2: RLS (przełącza rolę na anon — tak działa aplikacja bez auth)
-- ----------------------------------------------------------------------------

do $$
declare
  v_cost   uuid;
  v_zwrot  uuid;
begin
  -- Dane przygotowane jeszcze jako właściciel.
  insert into costs (nazwa, kwota_grosze, tryb, kwota_patrycja_grosze, kwota_agata_grosze, data, stylistka_dodajaca)
  values ('TEST RLS koszt', 10000, 'fifty_fifty', 5000, 5000, date '2001-01-10', 'patrycja')
  returning id into v_cost;

  -- Od teraz do końca bloku działamy jako anon (rola wraca po zakończeniu transakcji).
  perform set_config('role', 'anon', true);

  -- ── R1. anon dodaje płatność → musi przejść ───────────────────────────────
  insert into payments (klientka, kwota_grosze, metoda, stylistka)
  values ('TEST RLS klientka', 5000, 'cash', 'agata');
  raise notice 'OK (R1): anon może dodać płatność';

  -- ── R2. anon wstawia rozliczenie bezpośrednio (z pominięciem RPC) → odrzut ─
  begin
    insert into day_settlements (data, suma_kart_patrycja_grosze, suma_kart_agata_grosze, zatwierdzila)
    values (date '2001-01-10', 0, 0, 'agata');
    raise exception 'FAIL: anon wstawił rozliczenie bezpośrednio';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (R2): bezpośredni INSERT do day_settlements odrzucony — %', sqlerrm;
  end;

  -- ── R3. anon ustawia locked → odrzut ──────────────────────────────────────
  begin
    update payments set locked = true where klientka = 'TEST RLS klientka';
    raise exception 'FAIL: anon ustawił locked';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (R3): zmiana locked przez anon odrzucona — %', sqlerrm;
  end;

  -- ── R4. anon fabrykuje przypisanie kartowe → odrzut ───────────────────────
  -- (odrzuca RLS with check (zrodlo = 'cash'); constraint i FK to dalsze warstwy)
  begin
    insert into cost_payments (cost_id, kwota_grosze, zrodlo, data, settlement_id)
    values (v_cost, 1000, 'card_assignment', date '2001-01-10', gen_random_uuid());
    raise exception 'FAIL: anon wstawił przypisanie kartowe';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'OK (R4): sfabrykowane przypisanie kartowe odrzucone — %', sqlerrm;
  end;

  -- ── R5. anon dodaje i edytuje zwrot gotówkowy → musi przejść ──────────────
  insert into cost_payments (cost_id, kwota_grosze, zrodlo, data)
  values (v_cost, 2000, 'cash', date '2001-01-10')
  returning id into v_zwrot;
  update cost_payments set kwota_grosze = 3000 where id = v_zwrot;
  raise notice 'OK (R5): anon może dodać i poprawić zwrot gotówkowy';

  -- Celowy wyjątek — wycofuje wszystkie dane testowe.
  raise exception 'SMOKE_TEST_ROLLBACK: wszystkie testy RLS przeszły — dane testowe wycofane';
end;
$$;
