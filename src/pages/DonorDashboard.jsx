import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { service } from '../services'
import { isCompatible } from '../lib/blood'
import { distanceKm, formatDistance } from '../lib/geo'
import { timeAgo } from '../lib/constants'
import { AvailabilityBadge, BloodBadge, StatusBadge, UrgencyBadge, VerifiedBadge } from '../components/Badges'
import { Alert, EmptyState, Modal, PageHeader, PageLoader, Stat, TextAreaField } from '../components/ui'

export default function DonorDashboard() {
  const { user, updateProfile } = useAuth()
  const toast = useToast()

  const [responses, setResponses] = useState([])
  const [openRequests, setOpenRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [declineTarget, setDeclineTarget] = useState(null)
  const [declineMessage, setDeclineMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, reqs] = await Promise.all([
        service.responses.listForDonor(user.uid),
        service.requests.listOpen(),
      ])
      setResponses(res)
      setOpenRequests(reqs)
    } catch (err) {
      toast.error(err.message || 'Could not load your dashboard.')
    } finally {
      setLoading(false)
    }
  }, [user.uid, toast])

  useEffect(() => {
    load()
  }, [load])

  const pending = useMemo(() => responses.filter((r) => r.status === 'sent'), [responses])
  const history = useMemo(() => responses.filter((r) => r.status !== 'sent'), [responses])
  const completedCount = useMemo(
    () => responses.filter((r) => r.status === 'completed').length,
    [responses],
  )

  const respondedIds = useMemo(() => new Set(responses.map((r) => r.requestId)), [responses])

  const nearby = useMemo(() => {
    if (!user.bloodGroup) return []
    return openRequests
      .filter((r) => isCompatible(user.bloodGroup, r.bloodGroup) && !respondedIds.has(r.id))
      .map((r) => ({
        ...r,
        distanceKm: distanceKm(user.latitude, user.longitude, r.latitude, r.longitude),
      }))
      .filter((r) => r.distanceKm === null || r.radiusKm == null || r.distanceKm <= r.radiusKm)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  }, [openRequests, respondedIds, user])

  const toggleAvailability = async () => {
    try {
      await updateProfile({ available: !user.available })
      toast.success(!user.available ? 'You are now marked available.' : 'You are now marked unavailable.')
    } catch (err) {
      toast.error(err.message || 'Could not update availability.')
    }
  }

  const accept = async (response) => {
    setBusyId(response.id)
    try {
      await service.responses.respond(response.id, 'accepted')
      toast.success('Request accepted. The hospital can now see your response.')
      await load()
    } catch (err) {
      toast.error(err.message || 'Could not accept the request.')
    } finally {
      setBusyId(null)
    }
  }

  const confirmDecline = async () => {
    if (!declineTarget) return
    setBusyId(declineTarget.id)
    try {
      await service.responses.respond(declineTarget.id, 'declined', declineMessage)
      toast.info('Request declined.')
      setDeclineTarget(null)
      setDeclineMessage('')
      await load()
    } catch (err) {
      toast.error(err.message || 'Could not decline the request.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <PageLoader label="Loading your dashboard…" />

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title={`Hello, ${user.name?.split(' ')[0] || 'donor'} 👋`}
        subtitle="Manage your availability, respond to requests and review your donation history."
        actions={
          <Link to="/profile" className="btn-outline">
            Edit profile
          </Link>
        }
      />

      {/* Profile summary */}
      <div className="card mb-6 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary-dark">
              {user.bloodGroup || '—'}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{user.name}</h2>
                <VerifiedBadge verified={user.verified} />
              </div>
              <p className="mt-0.5 text-sm text-gray-500">
                {user.city || 'Location not set'} · {user.phone || 'No phone on file'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AvailabilityBadge available={user.available} />
            <button
              type="button"
              onClick={toggleAvailability}
              className={user.available ? 'btn-outline' : 'btn-success'}
            >
              {user.available ? 'Set unavailable' : 'Set available'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Requests awaiting you" value={pending.length} tone={pending.length ? 'danger' : 'default'} />
        <Stat label="Donations completed" value={completedCount} tone="success" />
        <Stat label="Total requests received" value={responses.length} />
      </div>

      {!user.verified && (
        <Alert tone="warning" className="mb-6">
          Your profile is pending verification. You can still respond to requests, but hospitals
          prioritise verified donors in matching.
        </Alert>
      )}

      {/* Pending requests */}
      <section className="mb-8">
        <h2 className="section-title mb-3">Requests for you</h2>
        {pending.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No pending requests"
            message="When a hospital sends you a donation request it will appear here for you to accept or decline."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((response) => (
              <div key={response.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-heading">{response.hospitalName}</h3>
                    <p className="mt-0.5 text-sm text-gray-500">Requested {timeAgo(response.createdAt)}</p>
                  </div>
                  <BloodBadge group={response.requestBloodGroup} />
                </div>
                {response.message && (
                  <p className="mt-3 rounded-lg bg-blush px-3 py-2 text-sm text-gray-600">
                    “{response.message}”
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => accept(response)}
                    disabled={busyId === response.id}
                    className="btn-success"
                  >
                    {busyId === response.id ? 'Saving…' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeclineTarget(response)}
                    disabled={busyId === response.id}
                    className="btn-danger"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Nearby compatible requests */}
      <section className="mb-8">
        <h2 className="section-title mb-1">Nearby blood requests</h2>
        <p className="mb-3 text-sm text-gray-500">
          Open requests your {user.bloodGroup} blood can help with, within the hospital's search radius.
        </p>
        {nearby.length === 0 ? (
          <EmptyState
            icon="🧭"
            title="No nearby compatible requests"
            message="There are no open requests matching your blood group and location right now."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.map((request) => (
              <div key={request.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <BloodBadge group={request.bloodGroup} />
                  <UrgencyBadge level={request.urgency} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-heading">{request.hospitalName}</h3>
                <p className="text-xs text-gray-500">{request.city}</p>
                <dl className="mt-3 space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <dt>Units needed</dt>
                    <dd className="font-medium text-ink">{request.units}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Distance</dt>
                    <dd className="font-medium text-ink">{formatDistance(request.distanceKm)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Posted</dt>
                    <dd className="font-medium text-ink">{timeAgo(request.createdAt)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="section-title mb-3">Donation history</h2>
        {history.length === 0 ? (
          <EmptyState
            icon="🗂️"
            title="No history yet"
            message="Your accepted, declined and completed donations will be listed here."
          />
        ) : (
          <div className="card divide-y divide-black/5">
            {history.map((response) => (
              <div key={response.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <BloodBadge group={response.requestBloodGroup} />
                  <div>
                    <p className="text-sm font-semibold text-heading">{response.hospitalName}</p>
                    <p className="text-xs text-gray-500">
                      Responded {response.respondedAt ? timeAgo(response.respondedAt) : '—'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={response.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(declineTarget)}
        onClose={() => setDeclineTarget(null)}
        title="Decline this request?"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setDeclineTarget(null)}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={confirmDecline} disabled={busyId}>
              {busyId ? 'Saving…' : 'Confirm decline'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Let {declineTarget?.hospitalName} know why (optional). This helps them find another donor.
        </p>
        <div className="mt-3">
          <TextAreaField
            id="declineMessage"
            placeholder="e.g. Out of town this week"
            value={declineMessage}
            onChange={(e) => setDeclineMessage(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}
