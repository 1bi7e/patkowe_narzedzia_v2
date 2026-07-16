-- ============================================================================
-- Realtime dla kosztów — dołącza tabele bazowe kosztów do publikacji
-- supabase_realtime, żeby zmiana pokrycia (zwrot gotówką lub przypisanie kart
-- przy rozliczeniu) natychmiast docierała do drugiej stylistki w aplikacji.
--
-- Widoku `costs_coverage` nie da się subskrybować wprost — klient słucha tabel
-- `costs` i `cost_payments`, a po zdarzeniu odświeża widok (useKoszty).
--
-- Idempotentne: dokłada każdą tabelę tylko jeśli jeszcze nie należy do
-- publikacji, więc bezpiecznie współistnieje z ręcznym włączeniem replikacji
-- w panelu Supabase (Database → Publications). Zastępuje dawną uwagę z init.
-- ============================================================================

do $$
declare
  t text;
  tabele text[] := array['payments', 'day_settlements', 'costs', 'cost_payments'];
begin
  -- Na czystym Postgresie bez Supabase publikacja może nie istnieć — pomiń wtedy.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'Publikacja supabase_realtime nie istnieje — pomijam.';
    return;
  end if;

  foreach t in array tabele loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
