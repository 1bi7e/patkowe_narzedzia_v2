import { AmountDisplay } from './AmountDisplay'
import { Awatar } from './Awatar'
import { Badge } from './Badge'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'
import { formatZlote } from '../lib/format'
import { TRYB_LABEL } from '../lib/koszty'
import type {
  Grosze,
  MetodaPlatnosci,
  StatusPokrycia,
  Stylistka,
  TrybPodzialu,
} from '../types'

/** Wspólna oprawa karty: kremowa powierzchnia, różowe obramowanie, złoty cień. */
const CARD = 'bg-cream-25 border border-rose-200 rounded-md shadow-satin-sm'

type PaymentProps = {
  variant: 'payment'
  stylistka: Stylistka
  klient: string
  metoda: MetodaPlatnosci
  grosze: Grosze
  /** Dzień rozliczony — wpis zablokowany (opacity + kłódka). */
  locked?: boolean
  onEdit?: () => void
}

type CostProps = {
  variant: 'cost'
  nazwa: string
  grosze: Grosze
  tryb: TrybPodzialu
  status?: StatusPokrycia | null
  pokryteGrosze?: Grosze
  caloscGrosze?: Grosze
}

export type EntryCardProps = PaymentProps | CostProps

export function EntryCard(props: EntryCardProps) {
  return props.variant === 'payment' ? <PaymentEntry {...props} /> : <CostEntry {...props} />
}

function PaymentEntry({ stylistka, klient, metoda, grosze, locked = false, onEdit }: PaymentProps) {
  const naKarte = metoda === 'card'
  return (
    <div
      className={[
        'flex items-center gap-[11px] px-[14px] py-[12px]',
        CARD,
        locked ? 'opacity-[0.55]' : '',
      ].join(' ')}
    >
      <Awatar stylistka={stylistka} />
      <span className="flex-1 text-[15px]">{klient}</span>
      <Badge tone={naKarte ? 'rose' : 'gold'}>{naKarte ? 'karta' : 'gotówka'}</Badge>
      <span className="min-w-[64px] text-right text-[15px] font-medium">{formatZlote(grosze)} zł</span>
      {locked ? (
        <Icon name="lock-simple" weight="fill" size={16} className="text-brown-400" />
      ) : (
        <button type="button" onClick={onEdit} aria-label="Edytuj płatność" className="flex">
          <Icon name="pencil-simple" size={16} className="text-brown-400" />
        </button>
      )}
    </div>
  )
}

function CostEntry({ nazwa, grosze, tryb, status, pokryteGrosze, caloscGrosze }: CostProps) {
  const coverageText =
    status && pokryteGrosze != null && caloscGrosze != null
      ? `pokryte ${formatZlote(pokryteGrosze)} z ${formatZlote(caloscGrosze)} zł`
      : null

  return (
    <div className={['flex flex-col gap-[9px] px-[15px] py-[14px]', CARD].join(' ')}>
      <div className="flex items-center justify-between gap-[10px]">
        <span className="text-[15px] font-medium">{nazwa}</span>
        <AmountDisplay grosze={grosze} size="sm" />
      </div>
      <div className="flex flex-wrap items-center gap-[8px]">
        <Badge tone="cream">{TRYB_LABEL[tryb]}</Badge>
        {status ? (
          <StatusBadge status={status} />
        ) : (
          <Badge tone="cream" icon="minus-circle">
            Bez rozliczenia
          </Badge>
        )}
        {coverageText && <span className="text-[12px] text-brown-400">{coverageText}</span>}
      </div>
    </div>
  )
}
