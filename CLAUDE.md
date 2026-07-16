# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A mobile-first PWA ("Salon") for two nail stylists (Patrycja and Agata) sharing one salon and one card terminal, to track payments and settle shared costs. Scale: exactly 2 users, 1 salon — prefer simplicity over scalability in every decision. All project documents and UI copy are in **Polish** — keep it that way.

- [aplikacja-salon-specyfikacja.md](aplikacja-salon-specyfikacja.md) — the product spec and single source of truth for business logic (untracked in git, but present locally)
- [aplikacja-design/](aplikacja-design/) — the design (`*.dc.html` design-canvas files, open in a browser) and the exported design system (also untracked — keep it out of git). **`Canvas.dc.html` is the final design** (screens 1–8, hi-fi); the old `Wireframes - Salon.dc.html` was removed as obsolete — don't reintroduce it as a reference.

## Commands

- `npm run dev` — dev server
- `npm run build` — type-check (`tsc -b`) + production build + service-worker generation
- `npm run lint` — oxlint
- `npm run preview` — serve the production build (the service worker only exists in the build, so PWA behavior must be tested here, not in dev)
- `npm test` — run unit tests once (Vitest, `node` env); `npm run test:watch` — watch mode

Tests are Vitest, colocated as `src/**/*.test.ts` (pure logic only — no jsdom). See [vitest.config.ts](vitest.config.ts).

## Stack and code layout

React 19 + Vite + TypeScript (strict) + Tailwind CSS v4 + vite-plugin-pwa + Supabase (PostgreSQL + Realtime; schema in `supabase/migrations/`, typed client in [src/lib/supabase.ts](src/lib/supabase.ts), env vars per [.env.example](.env.example)). Planned but **not yet added**: Vercel for hosting. "Login" is a profile picker (Patrycja/Agata) stored in localStorage — no passwords, it's context, not auth.

- `src/screens/` — full screens (spec §Ekrany aplikacji); `src/components/` — shared UI; `src/lib/` — logic/helpers; `src/types/` — domain types
- PWA manifest and Workbox config live in [vite.config.ts](vite.config.ts); iPhone standalone meta tags (safe-area, `viewport-fit=cover`) in [index.html](index.html) and [src/index.css](src/index.css); icons in `public/` (placeholder almond-arch design)
- Tailwind v4 is configured CSS-first in [src/index.css](src/index.css): the default palette is **wiped** (`--color-*: initial`) and replaced with brand tokens only (`rose-*`, `gold-*`, `cream-*`, `brown-*`, `success-*`, `error-*`). Cold grays/white/black utilities intentionally don't exist — don't re-add them. Fonts: `font-serif` = Cormorant Garamond (headings), `font-sans` = Jost (body/UI).

## Core domain rules (violating these breaks the product)

- **Money is integer grosze, never float** (see `Grosze` in [src/types/index.ts](src/types/index.ts)). The net-earnings formula must always balance.
- **Day settlement is irreversible.** Once a day is settled (`day_settlements`), its payment entries lock. Enforce this in the database (constraint / RLS), not just in the UI.
- **The „Rozliczenia" screen shows *all unsettled days*, not just today** — grouped by day (oldest first), with today's date in the header. A payment is unsettled ⟺ `locked = false` (settlement locks a day's entries and a settled day rejects new ones), so the read model needs no schema change — see [src/lib/nierozliczone.ts](src/lib/nierozliczone.ts) + [src/lib/useNierozliczone.ts](src/lib/useNierozliczone.ts). One settlement action may cover **several selected unsettled days atomically**: with ≥2 unsettled days the screen shows per-day checkboxes (default unchecked, to protect the in-progress day); the settle screen ([src/screens/RozliczScreen.tsx](src/screens/RozliczScreen.tsx)) calls RPC `rozlicz_dni` (one `day_settlements` row per day, all-or-nothing; `rozlicz_dzien` delegates to it). ⚠️ This **deliberately extends** the spec/design, which describe a single-day „Dziś" view — do not "fix" it back to today-only. Screen files: [src/screens/RozliczeniaScreen.tsx](src/screens/RozliczeniaScreen.tsx) (was `DzisScreen`), tab „Rozliczenia" in [src/components/BottomNav.tsx](src/components/BottomNav.tsx). Card assignment to a cost at settlement (Sposób 2) is now implemented: the settle screen shows an "Przypisz karty na koszt" section (uncovered costs, capped at Agata's card takings for the selected days) and passes the collected `PrzypisanieKart[]` to `rozlicz_dni`.
- **A payment belongs to the logged-in stylist** — there is no manual "whose client" picker. Method is cash **or** card, never mixed.
- **Costs have three split modes:** 50/50 (auto-split, Agata owes Patrycja half), "tylko moja" (own cost only, no inter-stylist settlement and no coverage status), and "własny podział" (manual per-stylist amounts). Only modes with inter-stylist settlement carry a coverage status (niepokryty / częściowo pokryty / pokryty).
- **Card assignment is a repayment mechanism, not income transfer.** At day settlement Agata may assign her card takings to an uncovered cost instead of handing cash to Patrycja. Assigned cards still count as Agata's revenue in the earnings formula; the assignment is final — no separate confirmation step (Patrycja just sees it in-app).
- **Cost date is when the cost occurred**, not when it was entered — retroactive entry is allowed.
- **Either stylist can settle the day alone**; both see all data — nothing is hidden per-user.
- Offline: cached reads only; writes require a connection (deliberate — avoids sync conflicts).

Data model sketch (spec §Model danych): `payments`, `costs`, `cost_payments`, `day_settlements`.

## Design system — "Patkowe Cudeńka"

Located at `aplikacja-design/_ds/patkowe-cude-ka-design-system-f47375f8-14c4-44f6-a372-b235e5a9f88a/`. Read its `readme.md` before doing any UI work. The brand color tokens are already mapped into Tailwind; reference component patterns (Button, Card, Dialog, Toast, etc.) live in `_ds_bundle.js` / `_ds_manifest.json`.

Hard constraints:
- **No cold grays, no pure white `#FFF`, no black `#000`** — warm brown `brown-800` replaces black, and only as text color (no dark surfaces). Page background `cream-50`, cards `cream-25`.
- Gold (`gold-*`) is an accent: max ~1 gold element per section. Shadows are gold-tinted, never gray.
- Icons: Phosphor Light only — **no emoji** in UI.
- Copy addresses the user as „Ty" (capitalized), warm boutique tone, sentence case (uppercase + letter-spacing only for labels/buttons/overlines). Section heading canon: gold uppercase overline → serif heading with an italic accent → gold hairline rule → light lead.
- No logo exists — the wordmark is set typographically („Patkowe *Cudeńka*"); never draw a logo.
 - "Kwoty zawsze w groszach jako integer, nigdy float"
- "Wpisy z locked=true są nieedytowalne — egzekwowane w bazie"
- "Mobile first, testuj na viewport iPhone"

WAŻNE! W razie wszelkich wątpliwości zawsze zadawaj pytania!