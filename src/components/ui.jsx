// Small reusable UI primitives shared across pages.

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
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
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
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone] || tones.default}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
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
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  )
}

export function TextField({ label, hint, error, required, id, ...props }) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <input id={id} className="input" {...props} />
    </Field>
  )
}

export function SelectField({ label, hint, error, required, id, children, ...props }) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <select id={id} className="input" {...props}>
        {children}
      </select>
    </Field>
  )
}

export function TextAreaField({ label, hint, error, required, id, ...props }) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <textarea id={id} className="input min-h-[90px] resize-y" {...props} />
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
