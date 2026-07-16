export type SegmentOpcja<T extends string> = { value: T; label: string }

/**
 * Segmentowany „pill": pozioma lista wzajemnie wykluczających się opcji na
 * różowym torze. Dwa warianty aktywnego stanu:
 * - `zloto` — złoty gradient (pod-zakładki Finanse),
 * - `krem` — kremowa powierzchnia w złotej obwódce (metoda płatności, tryb podziału).
 */
export function Segment<T extends string>({
  opcje,
  wartosc,
  onChange,
  wariant = 'krem',
}: {
  opcje: SegmentOpcja<T>[]
  wartosc: T
  onChange: (v: T) => void
  wariant?: 'zloto' | 'krem'
}) {
  return (
    <div className="flex w-full gap-[4px] rounded-pill bg-rose-100 p-[5px]">
      {opcje.map((o) => {
        const aktywna = wartosc === o.value
        const styl = aktywna
          ? wariant === 'zloto'
            ? 'bg-[image:var(--gradient-satin-gold)] text-brown-800 shadow-satin-sm'
            : 'border border-gold-300 bg-cream-25 text-brown-800 shadow-satin-sm'
          : wariant === 'zloto'
            ? 'text-brown-500'
            : 'border border-transparent text-brown-500'
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={[
              'flex-1 rounded-pill py-[9px] text-[12px] font-medium uppercase tracking-[0.03em] transition-all duration-[160ms] ease-satin',
              styl,
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
