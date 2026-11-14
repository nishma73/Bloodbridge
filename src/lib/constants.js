// Shared UI constants and small formatting helpers.

export const URGENCY_LEVELS = ['low', 'medium', 'high']

export const URGENCY_META = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-700 border-slate-200', rank: 1 },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-800 border-amber-200', rank: 2 },
  high: { label: 'High', className: 'bg-primary/10 text-primary-dark border-primary/30', rank: 3 },
}

export const REQUEST_STATUSES = [
  'pending',
  'sent',
  'accepted',
  'declined',
  'completed',
  'cancelled',
]

export const STATUS_META = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  sent: { label: 'Sent', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  accepted: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  declined: { label: 'Declined', className: 'bg-rose-100 text-rose-800 border-rose-200' },
  completed: { label: 'Completed', className: 'bg-violet-100 text-violet-800 border-violet-200' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-200 text-slate-600 border-slate-300' },
}

export const RESPONSE_STATUSES = ['sent', 'accepted', 'declined', 'completed']

export const ROLES = { DONOR: 'donor', HOSPITAL: 'hospital' }

/** Relative time like "3h ago", falling back to a short date. */
export function timeAgo(iso) {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hrs = Math.round(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}
