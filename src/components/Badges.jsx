import { STATUS_META, URGENCY_META } from '../lib/constants'

export function BloodBadge({ group, className = '' }) {
  return (
    <span className={`badge border-primary/20 bg-primary/10 text-primary-dark ${className}`}>
      {group || '—'}
    </span>
  )
}

export function UrgencyBadge({ level = 'low' }) {
  const meta = URGENCY_META[level] || URGENCY_META.low
  return (
    <span className={`badge ${meta.className}`}>
      {level === 'high' && <span aria-hidden="true">⚡</span>}
      {meta.label} urgency
    </span>
  )
}

export function StatusBadge({ status = 'pending' }) {
  const meta = STATUS_META[status] || STATUS_META.pending
  return <span className={`badge ${meta.className}`}>{meta.label}</span>
}

export function VerifiedBadge({ verified }) {
  if (verified) {
    return (
      <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
        ✓ Verified
      </span>
    )
  }
  return (
    <span className="badge border-amber-200 bg-amber-50 text-amber-700">Pending verification</span>
  )
}

export function AvailabilityBadge({ available }) {
  return available ? (
    <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">● Available</span>
  ) : (
    <span className="badge border-slate-200 bg-slate-100 text-slate-600">○ Unavailable</span>
  )
}
