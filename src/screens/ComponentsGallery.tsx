import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AmountDisplay,
  Badge,
  BottomNav,
  Button,
  EntryCard,
  Input,
  StatusBadge,
} from '../components'
import type { BadgeTone, NavTab } from '../components'

/** Sekcja galerii w kanonie nagłówka DS: overline → serif z akcentem → hairline → treść. */
function Section({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string
  title: string
  accent?: string
  children: ReactNode
}) {
  return (
    <section className="mt-14 first:mt-0">
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-gold-600">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-h2 font-medium text-brown-800">
        {title}
        {accent && <span className="italic text-rose-500">{accent}</span>}
      </h2>
      <div className="mt-3 h-px w-24 bg-linear-to-r from-gold-400 to-transparent" />
      <div className="mt-7 flex flex-col gap-8">{children}</div>
    </section>
  )
}

/** Podpis grupy przykładów. */
function DemoLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-brown-400">{children}</p>
  )
}

const ALL_TONES: BadgeTone[] = ['rose', 'gold', 'cream', 'success', 'error', 'dark']

export function ComponentsGallery() {
  const [activeTab, setActiveTab] = useState<NavTab>('rozliczenia')

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-6 pt-12 pb-36">
      {/* Nagłówek strony */}
      <header>
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-gold-600">
          Patkowe Cudeńka
        </p>
        <h1 className="mt-2 font-serif text-h1 font-medium text-brown-800">
          Komponenty<span className="italic text-rose-500">.</span>
        </h1>
        <div className="mt-3 h-px w-24 bg-linear-to-r from-gold-400 to-transparent" />
        <p className="mt-4 font-light text-brown-600">
          Galeria bazowych komponentów do weryfikacji wizualnej względem handoff bundle.
        </p>
      </header>

      {/* Button */}
      <Section eyebrow="Akcje" title="Przycisk" accent=".">
        <div>
          <DemoLabel>Warianty</DemoLabel>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="gold">Złoty</Button>
            <Button variant="rose">Różany</Button>
            <Button variant="outline">Obrys</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="dark">Ciemny</Button>
          </div>
        </div>

        <div>
          <DemoLabel>Rozmiary</DemoLabel>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Mały</Button>
            <Button size="md">Średni</Button>
            <Button size="lg">Duży</Button>
          </div>
        </div>

        <div>
          <DemoLabel>Z ikoną</DemoLabel>
          <div className="flex flex-wrap items-center gap-3">
            <Button icon="plus">Dodaj koszt</Button>
            <Button variant="outline" iconRight="arrow-right">
              Rozlicz dzień
            </Button>
            <Button variant="dark" iconRight="check">
              Zapisz
            </Button>
          </div>
        </div>

        <div>
          <DemoLabel>Stany</DemoLabel>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>Nieaktywny</Button>
              <Button variant="outline" disabled iconRight="lock-simple">
                Zablokowany
              </Button>
            </div>
            <Button size="lg" fullWidth iconRight="arrow-right">
              Pełna szerokość
            </Button>
          </div>
        </div>
      </Section>

      {/* Input */}
      <Section eyebrow="Formularze" title="Pole" accent=" tekstowe">
        <Input label="Nazwa kosztu" placeholder="np. Materiały" />
        <Input label="Klientka" icon="user" placeholder="Imię klientki" />
        <Input label="Kwota" type="number" placeholder="0" hint="Wpisz kwotę w złotych." />
        <Input label="E-mail" error="Podaj poprawny adres e-mail." placeholder="ty@salon.pl" />
        <Input label="Notatka" rows={3} placeholder="Dodatkowe informacje…" />
      </Section>

      {/* AmountDisplay */}
      <Section eyebrow="Kwoty" title="Duża" accent=" kwota">
        <div className="rounded-md border border-rose-200 bg-cream-25 px-5 py-6 text-center shadow-satin-sm">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-brown-400">Kwota</p>
          <AmountDisplay grosze={15000} size="xl" caret />
        </div>
        <div className="flex flex-col gap-5">
          <div>
            <DemoLabel>Zarobek netto (lg)</DemoLabel>
            <AmountDisplay grosze={352000} size="lg" />
          </div>
          <div>
            <DemoLabel>Kwota łączna (md)</DemoLabel>
            <AmountDisplay grosze={240000} size="md" />
          </div>
          <div>
            <DemoLabel>Na karcie kosztu (sm)</DemoLabel>
            <AmountDisplay grosze={38000} size="sm" />
          </div>
          <div>
            <DemoLabel>Odliczenie oraz grosze</DemoLabel>
            <div className="flex items-baseline gap-6">
              <AmountDisplay grosze={120000} size="md" deduction />
              <AmountDisplay grosze={15050} size="md" />
            </div>
          </div>
        </div>
      </Section>

      {/* StatusBadge + Badge */}
      <Section eyebrow="Statusy" title="Status" accent=" pokrycia">
        <div>
          <DemoLabel>StatusBadge</DemoLabel>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status="niepokryty" />
            <StatusBadge status="czesciowo_pokryty" />
            <StatusBadge status="pokryty" />
          </div>
        </div>
        <div>
          <DemoLabel>Badge — wszystkie tony</DemoLabel>
          <div className="flex flex-wrap items-center gap-3">
            {ALL_TONES.map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <DemoLabel>Badge — z ikoną (metoda, tryb)</DemoLabel>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="rose">karta</Badge>
            <Badge tone="gold">gotówka</Badge>
            <Badge tone="cream">50/50</Badge>
            <Badge tone="cream" icon="minus-circle">
              Bez rozliczenia
            </Badge>
          </div>
        </div>
      </Section>

      {/* EntryCard */}
      <Section eyebrow="Wpisy" title="Karta" accent=" wpisu">
        <div>
          <DemoLabel>Płatności (P/A, karta/gotówka, zablokowana)</DemoLabel>
          <div className="flex flex-col gap-3">
            <EntryCard variant="payment" stylistka="patrycja" klient="Kasia" metoda="card" grosze={15000} />
            <EntryCard variant="payment" stylistka="agata" klient="Ola" metoda="cash" grosze={22000} />
            <EntryCard
              variant="payment"
              stylistka="patrycja"
              klient="Marta"
              metoda="card"
              grosze={18000}
              locked
            />
          </div>
        </div>
        <div>
          <DemoLabel>Koszty (tryby i statusy pokrycia)</DemoLabel>
          <div className="flex flex-col gap-3">
            <EntryCard
              variant="cost"
              nazwa="Materiały"
              grosze={14000}
              tryb="fifty_fifty"
              status="niepokryty"
              pokryteGrosze={0}
              caloscGrosze={7000}
            />
            <EntryCard
              variant="cost"
              nazwa="Reklama"
              grosze={120000}
              tryb="custom"
              status="czesciowo_pokryty"
              pokryteGrosze={50000}
              caloscGrosze={120000}
            />
            <EntryCard
              variant="cost"
              nazwa="Czynsz"
              grosze={240000}
              tryb="fifty_fifty"
              status="pokryty"
              pokryteGrosze={120000}
              caloscGrosze={120000}
            />
            <EntryCard variant="cost" nazwa="Lakiery (moje)" grosze={38000} tryb="only_mine" status={null} />
          </div>
        </div>
      </Section>

      {/* BottomNav */}
      <Section eyebrow="Nawigacja" title="Dolna" accent=" nawigacja">
        <p className="text-[13px] font-light text-brown-600">
          Normalnie przypięta do dołu ekranu (widoczna niżej). Poniżej podgląd obu stanów:
        </p>
        <div className="overflow-hidden rounded-lg border border-rose-200 shadow-satin-sm">
          <BottomNav active="rozliczenia" />
        </div>
        <div className="overflow-hidden rounded-lg border border-rose-200 shadow-satin-sm">
          <BottomNav active="finanse" />
        </div>
      </Section>

      {/* Realna, przypięta dolna nawigacja — interaktywna */}
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md">
        <BottomNav active={activeTab} onNavigate={setActiveTab} />
      </div>
    </main>
  )
}
