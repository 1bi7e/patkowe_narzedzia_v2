-- ----------------------------------------------------------------------------
-- Domknięcie roli anon na RPC korekt rozliczenia (cofnij / oznacz gotówkę)
-- ----------------------------------------------------------------------------
-- Poprawka luki: cofnij_rozliczenie i oznacz_gotowke_oddana (SECURITY DEFINER,
-- dodane w 20260718120000_cofanie_rozliczen.sql) dawały się wywołać rolą anon —
-- czyli samym kluczem publishable z publicznego bundla, bez logowania.
--
-- Źródło: na tym projekcie nowa funkcja w schemacie public dostaje BEZPOŚREDNI
-- grant EXECUTE dla anon (domyślne przywileje Supabase). Dlatego samo
-- `revoke ... from public` w migracji cofania nie zamknęło anon — trzeba jawnie
-- `revoke ... from anon`, dokładnie jak zrobił to auth_gate (§2) dla rozlicz_dni
-- i rozlicz_dzien. Migracja cofania ten krok pominęła; tu go uzupełniamy.
--
-- Krytyczne i nieoczywiste (jak w auth_gate): obie funkcje są SECURITY DEFINER,
-- więc działają z prawami właściciela i omijają RLS — samo zamknięcie polityk
-- na day_settlements by nie wystarczyło. Grant dla authenticated pozostaje.
--
-- Idempotentna: revoke na już odebranym uprawnieniu to no-op, więc nakłada się
-- bez błędu także na bazy, gdzie poprawkę zastosowano wcześniej ręcznie.
-- ----------------------------------------------------------------------------

revoke execute on function public.cofnij_rozliczenie(uuid) from anon;
revoke execute on function public.oznacz_gotowke_oddana(uuid, boolean, public.stylistka) from anon;
