import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { service } from '../services'
import { compatibleDonorGroups } from '../lib/blood'
import { matchDonors } from '../lib/matching'
import { formatDistance } from '../lib/geo'
import { timeAgo } from '../lib/constants'
import {
  AvailabilityBadge,
  BloodBadge,
  StatusBadge,
  UrgencyBadge,
  VerifiedBadge,
} from '../components/Badges'
import {
  Alert,
  EmptyState,
  Modal,
  PageHeader,
  PageLoader,
  TextAreaField,
  TextField,
} from '../components/ui'

export default function MatchingDonors() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [request, setRequest] = useState(null)
  const [donors, setDonors] = useState([])
  const [existing, setExisting] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(() => new Set())
  const [search, setSearch] = useState('')
  const [radiusKm, setRadiusKm] = useState(25)
  const [availableOnly, setAvailableOnly] = useState(true)
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [req, allDonors, responses] = await Promise.all([
        service.requests.get(id),
        service.profiles.listDonors(),
        service.responses.listForRequest(id),
      ])
      setRequest(req)
      setRadiusKm(req?.radiusKm ?? 25)
      setDonors(allDonors)
      setExisting(responses)
    } catch (err) {
      toast.error(err.message || 'Could not load matching donors.')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    load()
  }, [load])

  const invitedIds = useMemo(() => new Set(existing.map((r) => r.donorId)), [existing])

  const matched = useMemo(() => {
    if (!request) return []
    const rows = matchDonors(donors, request, {
      radiusKm: Number(radiusKm),
      availableOnly,
      verifiedOnly,
    })
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(
      (d) =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.city || '').toLowerCase().includes(q) ||
        (d.bloodGroup || '').toLowerCase().includes(q),
    )
  }, [donors, request, radiusKm, availableOnly, verifiedOnly, search])

  const toggle = (donorId) => {
    if (invitedIds.has(donorId)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(donorId)) next.delete(donorId)
      else next.add(donorId)
      return next
    })
  }

  const sendRequests = async () => {
    const ids = [...selected]
    if (ids.length === 0) return
    setBusy(true)
    try {
      await service.responses.sendToDonors(request.id, ids, message)
      toast.success(`Request sent to ${ids.length} donor${ids.length > 1 ? 's' : ''}.`)
      setComposeOpen(false)
      setSelected(new Set())
      setMessage('')
      navigate(`/hospital/requests/${request.id}`)
    } catch (err) {
      toast.error(err.message || 'Could not send requests.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader label="Finding compatible donors…" />

  if (!request) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          icon="🔍"
          title="Request not found"
          message="This blood request may have been removed."
          action={
            <Link to="/hospital" className="btn-primary">
              Back to dashboard
            </Link>
          }
        />
      </div>
    )
  }

  const compatibleGroups = compatibleDonorGroups(request.bloodGroup)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28">
      <PageHeader
        title="Matching donors"
        subtitle={`Compatible, available donors for a ${request.bloodGroup} request of ${request.units} unit(s).`}
        actions={
          <Link to={`/hospital/requests/${request.id}`} className="btn-outline">
            Track request
          </Link>
        }
      />

      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <BloodBadge group={request.bloodGroup} className="text-sm" />
        <UrgencyBadge level={request.urgency} />
        <StatusBadge status={request.status} />
        <span className="text-sm text-gray-500">
          {request.city} · posted {timeAgo(request.createdAt)}
        </span>
      </div>

      {/* Filters */}
      <div className="card mb-5 p-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <TextField
            id="search"
            label="Search"
            placeholder="Name, area or blood group"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div>
            <label className="label" htmlFor="radius">
              Search radius: {radiusKm} km
            </label>
            <input
              id="radius"
              type="range"
              min="5"
              max="100"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
              className="mt-2 w-full accent-primary"
            />
          </div>
          <label className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">Available only</span>
          </label>
          <label className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">Verified only</span>
          </label>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Matching blood groups for {request.bloodGroup}: {compatibleGroups.join(', ')}. Preliminary
          matching only — confirm clinically before transfusion.
        </p>
      </div>

      {existing.length > 0 && (
        <Alert tone="info" className="mb-5">
          {existing.length} donor{existing.length > 1 ? 's have' : ' has'} already been contacted for
          this request.
        </Alert>
      )}

      {matched.length === 0 ? (
        <EmptyState
          icon="🧭"
          title="No compatible donors found"
          message="Try widening the search radius or turning off the availability and verification filters."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matched.map((donor) => {
            const invited = invitedIds.has(donor.id || donor.uid)
            const isSelected = selected.has(donor.id || donor.uid)
            const donorId = donor.id || donor.uid
            return (
              <button
                key={donorId}
                type="button"
                onClick={() => toggle(donorId)}
                disabled={invited}
                className={`card p-4 text-left transition ${
                  invited
                    ? 'cursor-not-allowed opacity-70'
                    : isSelected
                      ? 'ring-2 ring-primary'
                      : 'hover:shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <BloodBadge group={donor.bloodGroup} className="text-sm" />
                    <div>
                      <p className="font-semibold text-heading">{donor.name}</p>
                      <p className="text-xs text-gray-500">{donor.city || 'Location unknown'}</p>
                    </div>
                  </div>
                  {!invited && (
                    <span
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                        isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300'
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <AvailabilityBadge available={donor.available} />
                  <VerifiedBadge verified={donor.verified} />
                </div>

                <dl className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <div>
                    <dt className="sr-only">Distance</dt>
                    <dd>{formatDistance(donor.distanceKm)} away</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Phone</dt>
                    <dd>{donor.phone || '—'}</dd>
                  </div>
                </dl>

                {invited && (
                  <p className="mt-3 text-xs font-medium text-primary-dark">Request already sent</p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-heading">{selected.size}</span> donor
            {selected.size === 1 ? '' : 's'} selected
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setSelected(new Set(matched.map((d) => d.id || d.uid).filter((v) => !invitedIds.has(v))))}
              disabled={matched.length === 0}
            >
              Select all
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setComposeOpen(true)}
              disabled={selected.size === 0}
            >
              Send donation request{selected.size === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title={`Send request to ${selected.size} donor${selected.size === 1 ? '' : 's'}`}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setComposeOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={sendRequests} disabled={busy}>
              {busy ? 'Sending…' : 'Send requests'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Each selected donor will be notified and can accept or decline. You can add an optional
          message.
        </p>
        <div className="mt-3">
          <TextAreaField
            id="requestMessage"
            label="Message (optional)"
            placeholder="Please contact the blood bank desk on arrival."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}
