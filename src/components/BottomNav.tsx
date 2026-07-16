import { Icon } from './Icon'
import type { IconName } from './Icon'

export type NavTab = 'rozliczenia' | 'finanse'

type BottomNavProps = {
  active: NavTab
  onNavigate?: (tab: NavTab) => void
  /** Środkowy FAB — otwiera arkusz „Dodaj płatność". */
  onAdd?: () => void
}

/** Dolna nawigacja: 2 zakładki + uniesiony złoty FAB pośrodku. */
export function BottomNav({ active, onNavigate, onAdd }: BottomNavProps) {
  return (
    <nav
      className="flex items-center border-t border-rose-200 bg-[rgba(251,246,236,0.88)] px-0 pt-[10px] backdrop-blur-[10px]"
      style={{ paddingBottom: 'calc(4px + env(safe-area-inset-bottom))' }}
    >
      <NavSlot
        label="Rozliczenia"
        icon="house"
        active={active === 'rozliczenia'}
        onClick={() => onNavigate?.('rozliczenia')}
      />

      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={onAdd}
          aria-label="Dodaj płatność"
          className="-mt-[14px] flex h-[56px] w-[56px] items-center justify-center rounded-pill border-[3px] border-cream-25 bg-[image:var(--gradient-satin-gold)] shadow-satin transition-transform duration-[160ms] ease-satin active:scale-[0.96]"
        >
          <Icon name="plus" size={26} className="text-brown-800" />
        </button>
      </div>

      <NavSlot
        label="Finanse"
        icon="coins"
        active={active === 'finanse'}
        onClick={() => onNavigate?.('finanse')}
      />
    </nav>
  )
}

function NavSlot({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: IconName
  active: boolean
  onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-1 flex-col items-center gap-[3px]">
      <Icon
        name={icon}
        weight={active ? 'fill' : 'light'}
        size={23}
        className={active ? 'text-gold-600' : 'text-brown-400'}
      />
      <span
        className={[
          'text-[10px] uppercase tracking-[0.1em]',
          active ? 'font-medium text-brown-800' : 'font-light text-brown-400',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  )
}
