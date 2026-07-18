import { useState } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

export type NavTab = 'rozliczenia' | 'finanse'

type BottomNavProps = {
  active: NavTab
  onNavigate?: (tab: NavTab) => void
  /** FAB → wybór „Płatność" z mini-menu nad przyciskiem. */
  onDodajPlatnosc?: () => void
  /** FAB → wybór „Koszt" z mini-menu nad przyciskiem. */
  onDodajKoszt?: () => void
}

/** Dolna nawigacja: 2 zakładki + uniesiony złoty FAB z wyborem płatność/koszt. */
export function BottomNav({ active, onNavigate, onDodajPlatnosc, onDodajKoszt }: BottomNavProps) {
  const [menu, setMenu] = useState(false)

  function wybierz(akcja?: () => void) {
    setMenu(false)
    akcja?.()
  }

  return (
    <nav
      className="flex items-center border-t border-rose-200 bg-[rgba(245,236,217,0.88)] px-0 pt-[10px] backdrop-blur-[10px]"
      style={{ paddingBottom: 'calc(4px + env(safe-area-inset-bottom))' }}
    >
      <NavSlot
        label="Rozliczenia"
        icon="house"
        active={active === 'rozliczenia'}
        onClick={() => onNavigate?.('rozliczenia')}
      />

      <div className="relative flex flex-1 justify-center">
        {menu && (
          <>
            <button
              type="button"
              aria-label="Zamknij menu"
              onClick={() => setMenu(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div className="absolute bottom-full left-1/2 z-20 mb-7 flex -translate-x-1/2 flex-col gap-[10px]">
              <MenuAkcja icon="user" label="Płatność" onClick={() => wybierz(onDodajPlatnosc)} />
              <MenuAkcja icon="coins" label="Koszt" onClick={() => wybierz(onDodajKoszt)} />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setMenu((o) => !o)}
          aria-label="Dodaj"
          aria-expanded={menu}
          className="relative z-20 -mt-[14px] flex h-[56px] w-[56px] items-center justify-center rounded-pill border-[3px] border-cream-25 bg-[image:var(--gradient-satin-gold)] shadow-satin transition-transform duration-[160ms] ease-satin active:scale-[0.96]"
        >
          <Icon
            name="plus"
            size={26}
            className={['text-brown-800 transition-transform duration-[160ms] ease-satin', menu ? 'rotate-45' : ''].join(' ')}
          />
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

function MenuAkcja({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[9px] rounded-pill border border-rose-200 bg-cream-25 px-[18px] py-[11px] whitespace-nowrap shadow-satin-lg transition-transform duration-[140ms] ease-satin active:scale-[0.97]"
    >
      <Icon name={icon} size={18} className="text-gold-600" />
      <span className="text-[13.5px] font-medium text-brown-800">{label}</span>
    </button>
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
          active ? 'font-medium text-gold-700' : 'font-light text-brown-400',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  )
}
