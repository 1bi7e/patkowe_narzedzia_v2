-- ----------------------------------------------------------------------------
-- Bramka logowania — dostęp tylko dla zalogowanych
-- ----------------------------------------------------------------------------
-- Aplikacja stoi pod publicznym adresem, a klucz publishable jest — jak w
-- każdej aplikacji frontendowej — wkompilowany w bundle, który pobiera każdy
-- odwiedzający. Dopóki polityki obejmowały rolę anon, znajomość samego adresu
-- wystarczała, żeby czytać i zapisywać finanse salonu.
--
-- Od teraz klient loguje się na wspólne konto salonu (Supabase Auth), więc
-- dostęp ma wyłącznie rola authenticated. Ta migracja zastępuje adnotację z
-- §8 RLS w 20260715120000_init_schema.sql („Aplikacja nie ma auth — klient
-- działa jako anon"), która od tego momentu jest nieaktualna.
--
-- Wybór profilu (Patrycja/Agata) pozostaje tym, czym był — kontekstem wpisu,
-- nie autoryzacją. Obie stylistki dzielą jedno konto i widzą u siebie wszystko,
-- więc kolumna stylistka nadal jest „na słowo" i RLS jej nie rozstrzyga.
--
-- ⚠️ Ta migracja jest skuteczna TYLKO razem z wyłączeniem publicznej
-- rejestracji w panelu Supabase (Authentication → Sign In / Providers →
-- „Allow new users to sign up" = OFF). Z włączoną rejestracją każdy zrobiłby
-- signUp() publicznym kluczem i sam zostałby rolą authenticated.

-- ----------------------------------------------------------------------------
-- §1 Polityki: anon traci dostęp, authenticated zachowuje dotychczasowy
-- ----------------------------------------------------------------------------
-- alter policy ... to authenticated zmienia wyłącznie adresata polityki —
-- warunki using/with check zostają dokładnie takie, jak w init_schema.

alter policy payments_select on public.payments to authenticated;
alter policy payments_insert on public.payments to authenticated;
alter policy payments_update on public.payments to authenticated;
alter policy payments_delete on public.payments to authenticated;

alter policy costs_select on public.costs to authenticated;
alter policy costs_insert on public.costs to authenticated;
alter policy costs_update on public.costs to authenticated;
alter policy costs_delete on public.costs to authenticated;

alter policy cost_payments_select on public.cost_payments to authenticated;
alter policy cost_payments_insert on public.cost_payments to authenticated;
alter policy cost_payments_update on public.cost_payments to authenticated;
alter policy cost_payments_delete on public.cost_payments to authenticated;

alter policy day_settlements_select on public.day_settlements to authenticated;

-- ----------------------------------------------------------------------------
-- §2 RPC: odebranie wykonania roli anon
-- ----------------------------------------------------------------------------
-- Krytyczne i nieoczywiste: obie funkcje są SECURITY DEFINER, więc działają z
-- prawami właściciela i omijają polityki z §1. Samo zamknięcie polityk by nie
-- wystarczyło — anon dalej rozliczałby dni przez RPC.

revoke execute on function public.rozlicz_dni(date[], public.stylistka, jsonb, jsonb) from anon;
revoke execute on function public.rozlicz_dzien(date, public.stylistka, integer, integer, jsonb) from anon;

-- Widok costs_coverage nie wymaga zmian: ma security_invoker = true, więc
-- dziedziczy RLS z costs i zamyka się razem z §1.
