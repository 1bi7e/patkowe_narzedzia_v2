import { useId, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

type InputProps = {
  label?: string
  hint?: string
  error?: string
  /** Ikona wiodąca (tylko pole jednowierszowe). */
  icon?: IconName
  type?: string
  placeholder?: string
  /** Podanie `rows` renderuje `<textarea>` (zaokrąglenie md zamiast pill). */
  rows?: number
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  /** Np. „current-password" — bez tego iOS nie zaproponuje zapisania hasła. */
  autoComplete?: string
}

export function Input({ label, hint, error, icon, type = 'text', placeholder, rows, value, onChange, autoComplete }: InputProps) {
  const [focus, setFocus] = useState(false)
  const id = useId()

  const borderColor = error
    ? 'var(--color-error-500)'
    : focus
      ? 'var(--color-gold-400)'
      : 'var(--color-rose-200)'

  const field: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--color-cream-25)',
    border: `1px solid ${borderColor}`,
    borderRadius: rows ? 16 : 999,
    padding: rows ? '14px 18px' : icon ? '12px 18px 12px 46px' : '12px 20px',
    fontFamily: 'var(--font-sans)',
    // ≥ 16px — poniżej iOS Safari zoomuje przy focusie na polu.
    fontSize: 16,
    color: 'var(--color-brown-800)',
    outline: 'none',
    boxShadow: focus ? 'var(--ring-gold)' : 'none',
    transition: 'border-color var(--dur-fast) var(--ease-satin), box-shadow var(--dur-fast) var(--ease-satin)',
  }

  return (
    <label htmlFor={id} className="block">
      {label && (
        <span
          className={[
            'mb-[7px] block text-[12px] font-medium uppercase tracking-[0.1em]',
            error ? 'text-error-700' : 'text-brown-600',
          ].join(' ')}
        >
          {label}
        </span>
      )}

      <span className="relative block">
        {icon && !rows && (
          <span
            className={[
              'pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-[17px]',
              focus ? 'text-gold-500' : 'text-brown-400',
            ].join(' ')}
          >
            <Icon name={icon} size={17} />
          </span>
        )}

        {rows ? (
          <textarea
            id={id}
            rows={rows}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            style={field}
          />
        ) : (
          <input
            id={id}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            value={value}
            onChange={onChange}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            style={field}
          />
        )}
      </span>

      {(error || hint) && (
        <span
          className={['mt-[6px] block text-[12.5px]', error ? 'text-error-500' : 'text-brown-400'].join(' ')}
        >
          {error ?? hint}
        </span>
      )}
    </label>
  )
}
