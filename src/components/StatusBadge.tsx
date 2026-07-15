import { Badge } from './Badge'
import type { BadgeTone } from './Badge'
import type { IconName } from './Icon'
import type { StatusPokrycia } from '../types'

/**
 * Status pokrycia kosztu jako Badge — mapowanie tonów/ikon wg hi-fi Canvas
 * (autorytatywne): niepokryty → terracotta, częściowo → złoto, pokryty → oliwka.
 */
const STATUSY: Record<StatusPokrycia, { tone: BadgeTone; icon: IconName; label: string }> = {
  niepokryty: { tone: 'error', icon: 'hourglass-medium', label: 'Niepokryty' },
  czesciowo_pokryty: { tone: 'gold', icon: 'circle-half', label: 'Częściowo' },
  pokryty: { tone: 'success', icon: 'check-circle', label: 'Pokryty' },
}

export function StatusBadge({ status }: { status: StatusPokrycia }) {
  const { tone, icon, label } = STATUSY[status]
  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  )
}
