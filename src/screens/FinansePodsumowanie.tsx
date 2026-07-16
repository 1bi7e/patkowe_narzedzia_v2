import { AmountDisplay, Awatar, Icon } from '../components'
import type { IconName } from '../components'
import { IMIE_STYLISTKI } from '../lib/stylistki'
import { zarobekNetto } from '../lib/zarobek'
import type { CostCoverage, Grosze, Payment, Stylistka } from '../types'

type FinansePodsumowanieProps = {
  /** Płatności okresu (wszystkie: locked i nie). */
  platnosci: Payment[]
  /** Koszty JUŻ zawężone do okresu (po dacie kosztu). */
  koszty: CostCoverage[]
  stylistka: Stylistka
  ladowanie: boolean
  blad: string | null
}

/** Pod-zakładka „Podsumowanie": zarobek netto zalogowanej stylistki za okres. */
export function FinansePodsumowanie({ platnosci, koszty, stylistka, ladowanie, blad }: FinansePodsumowanieProps) {
  const z = zarobekNetto(platnosci, koszty, stylistka)
  const druga = stylistka === 'patrycja' ? IMIE_STYLISTKI.agata : IMIE_STYLISTKI.patrycja

  if (blad) {
    return (
      <p className="mt-2 text-[13px] text-error-500">
        Nie udało się wczytać danych okresu: {blad}. Netto może być niepełne — odśwież.
      </p>
    )
  }

  return (
    <div>
      <section className="rounded-md border border-rose-200 bg-cream-25 p-6 shadow-satin">
        <div className="flex items-center gap-[10px]">
          <Awatar stylistka={stylistka} />
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-gold-600">
            Zalogowana · {IMIE_STYLISTKI[stylistka]}
          </p>
        </div>

        <p className="mt-5 text-[13px] text-brown-500">Twoje netto</p>
        <div className="mt-1">
          <AmountDisplay grosze={Math.abs(z.netto)} size="xl" deduction={z.netto < 0} />
        </div>

        <div className="mt-6 h-px w-full bg-linear-to-r from-gold-300 to-transparent" />

        <dl className="mt-5 flex flex-col gap-[14px]">
          <Wiersz icon="credit-card" label="karty" grosze={z.karty} />
          <Wiersz icon="coins" label="gotówka" grosze={z.gotowka} />
          <Wiersz icon="users" label="− ½ kosztów wspólnych" grosze={z.kosztyWspolne} deduction />
          <Wiersz icon="user" label="− koszty własne" grosze={z.kosztyWlasne} deduction />
        </dl>
      </section>

      <p className="mt-5 text-[13px] leading-relaxed text-brown-400">
        Widok pokazuje tylko Twoje rozliczenie — {druga} zobaczy tu swoje netto.
      </p>

      {ladowanie && <p className="mt-4 text-center text-[12px] font-light text-brown-400">Odświeżam…</p>}
    </div>
  )
}

function Wiersz({
  icon,
  label,
  grosze,
  deduction = false,
}: {
  icon: IconName
  label: string
  grosze: Grosze
  deduction?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-[9px] text-[14px] text-brown-600">
        <Icon name={icon} size={17} className={deduction ? 'text-rose-400' : 'text-brown-400'} />
        {label}
      </span>
      <AmountDisplay grosze={grosze} size="sm" deduction={deduction} />
    </div>
  )
}
