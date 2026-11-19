// Small reusable UI primitives shared across pages.
import Reveal from './Reveal'

export function Spinner({ className = '' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary ${className}`}
    />
  )
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-gray-500">
      <Spinner className="h-8 w-8" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <Reveal className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </Reveal>
  )
}

export function Stat({ label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'text-heading',
    danger: 'text-primary',
    success: 'text-emerald-600',
    muted: 'text-gray-500',
  }
  return (
    <Reveal className="card card-hover p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone] || tones.default}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </Reveal>
  )
}

export function EmptyState({ icon = '🩸', title, message, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-10 text-center">
      <span className="text-3xl" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {message && <p className="max-w-sm text-sm text-gray-500">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Field({ label, htmlFor, hint, error, required, children }) {
  return (
    <div>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label} {required && <span className="text-primary">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-rose-600 font-medium" id={htmlFor ? `${htmlFor}-error` : undefined}>
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  )
}

export function TextField({ label, hint, error, required, id, variant = 'default', ...props }) {
  const base = variant === 'embedded' ? 'input-embedded' : 'input'
  const invalid =
    variant === 'embedded'
      ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:bg-white focus:ring-rose-200'
      : 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <input id={id} className={`${base} ${error ? invalid : ''}`} {...props} />
    </Field>
  )
}

export function PhoneField({
  label = 'Phone number',
  id = 'phone',
  value = '',
  onChange,
  onBlur,
  error,
  hint,
  required,
  variant = 'default',
  placeholder = '98765 43210',
  disabled = false,
  ...props
}) {
  const embedded = variant === 'embedded'
  // Extract strictly up to 10 digits
  const extractDigits = (val) => {
    if (!val) return ''
    const str = String(val).trim()
    const withoutCode = str.replace(/^\+91\s*/, '')
    return withoutCode.replace(/\D/g, '').slice(0, 10)
  }

  const rawDigits = extractDigits(value)

  // Prevent typing of any non-numeric character
  const handleKeyDown = (e) => {
    const allowedNavigationKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Enter',
      'Home',
      'End',
    ]
    if (allowedNavigationKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
      return
    }
    // Block any non-digit key
    if (!/^\d$/.test(e.key)) {
      e.preventDefault()
    }
  }

  const handleInputChange = (e) => {
    let inputVal = e.target.value
    inputVal = inputVal.replace(/^\+91\s*/, '')
    // Filter strictly to numeric digits and max 10
    const digitsOnly = inputVal.replace(/\D/g, '').slice(0, 10)

    if (onChange) {
      const formatted = digitsOnly ? `+91 ${digitsOnly}` : ''
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          id,
          name: id,
          value: formatted,
          digits: digitsOnly,
        },
      }
      onChange(syntheticEvent, digitsOnly)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text') || ''
    let cleaned = pastedText.trim().replace(/^\+91\s*/, '')
    if (cleaned.startsWith('91') && cleaned.length > 10) {
      cleaned = cleaned.slice(2)
    }
    const digitsOnly = cleaned.replace(/\D/g, '').slice(0, 10)

    if (onChange) {
      const formatted = digitsOnly ? `+91 ${digitsOnly}` : ''
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          id,
          name: id,
          value: formatted,
          digits: digitsOnly,
        },
      }
      onChange(syntheticEvent, digitsOnly)
    }
  }

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <div
        className={`relative flex w-full items-center rounded-lg border transition ${
          error
            ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200 focus-within:bg-white'
            : embedded
              ? 'border-rose-100 bg-blush/60 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20'
              : 'border-gray-300 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
        } ${disabled ? 'cursor-not-allowed bg-gray-100 opacity-60' : ''}`}
      >
        {/* Country Code Prefix (+91) - Non-removable & Non-editable */}
        <span
          className={`flex select-none items-center gap-1.5 border-r px-3 py-2.5 text-sm font-semibold text-gray-700 shrink-0 ${
            embedded ? 'border-rose-100 bg-transparent' : 'rounded-l-lg border-gray-200 bg-slate-50'
          }`}
          title="Country code: India (+91)"
        >
          <span className="text-base leading-none" aria-hidden="true">🇮🇳</span>
          <span>+91</span>
        </span>

        {/* 10-digit mobile number input */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          value={rawDigits}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full rounded-r-lg border-0 bg-transparent px-3.5 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-0"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
      </div>
    </Field>
  )
}

export function SelectField({ label, hint, error, required, id, variant = 'default', children, ...props }) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <select
        id={id}
        className={`${variant === 'embedded' ? 'input-embedded' : 'input'} ${
          error
            ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:bg-white focus:ring-rose-200'
            : ''
        }`}
        {...props}
      >
        {children}
      </select>
    </Field>
  )
}

export function TextAreaField({ label, hint, error, required, id, variant = 'default', ...props }) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        className={`${variant === 'embedded' ? 'input-embedded' : 'input'} min-h-[90px] resize-y ${
          error
            ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:bg-white focus:ring-rose-200'
            : ''
        }`}
        {...props}
      />
    </Field>
  )
}

export function Alert({ tone = 'info', children, className = '' }) {
  const tones = {
    info: 'border-primary/20 bg-alert text-heading',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]} ${className}`}>
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="card relative z-10 w-full max-w-lg p-5">
        {title && <h3 className="mb-3 text-lg font-semibold">{title}</h3>}
        <div>{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
