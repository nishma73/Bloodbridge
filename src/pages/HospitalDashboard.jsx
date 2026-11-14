import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { service } from '../services'
import { timeAgo } from '../lib/constants'
import { BloodBadge, StatusBadge, UrgencyBadge, VerifiedBadge } from '../components/Badges'
import { Alert, EmptyState, PageHeader, PageLoader, Stat } from '../components/ui'

export default function HospitalDashboard() {
  const { user } = useAuth()
  const toast = useToast()

  const [requests, setRequests] = useState([])
  const [responsesByRequest, setResponsesByRequest] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await service.requests.listForHospital(user.uid)
      const responseLists = await Promise.all(
        list.map((r) => service.responses.listForRequest(r.id)),
      )
      const map = {}
      list.forEach((r, index) => {
        map[r.id] = responseLists[index]
      })
      setRequests(list)
      setResponsesByRequest(map)
    } catch (err) {
      toast.error(err.message || 'Could not load your requests.')
    } finally {
      setLoading(false)
    }
  }, [user.uid, toast])

  useEffect(() => {
    load()
  }, [load])

  const allResponses = useMemo(
    () => Object.values(responsesByRequest).flat(),
    [responsesByRequest],
  )

  const active = useMemo(
    () => requests.filter((r) => !['completed', 'cancelled'].includes(r.status)),
    [requests],
  )
  const previous = useMemo(
    () => requests.filter((r) => ['completed', 'cancelled'].includes(r.status)),
    [requests],
  )

  const stats = useMemo(() => {
    const accepted = allResponses.filter((r) => ['accepted', 'completed'].includes(r.status)).length
    const units = requests.reduce((sum, r) => sum + (Number(r.units) || 0), 0)
    return { active: active.length, responses: allResponses.length, accepted, units }
  }, [allResponses, requests, active])

  const recentResponses = useMemo(
    () => allResponses.slice(0, 5),
    [allResponses],
  )

  const responseSummary = (requestId) => {
    const list = responsesByRequest[requestId] || []
    return {
      total: list.length,
      accepted: list.filter((r) => r.status === 'accepted').length,
      declined: list.filter((r) => r.status === 'declined').length,
      completed: list.filter((r) => r.status === 'completed').length,
      awaiting: list.filter((r) => r.status === 'sent').length,
    }
  }

  if (loading) return <PageLoader label="Loading your requests…" />

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title={user.hospitalName || 'Hospital dashboard'}
        subtitle={user.address || user.city || 'Manage blood requests and donor responses.'}
        actions={
          <>
            <Link to="/profile" className="btn-outline">
              Hospital profile
            </Link>
            <Link to="/hospital/requests/new" className="btn-primary">
              + New blood request
            </Link>
          </>
        }
      />

      <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <VerifiedBadge verified={user.verified} />
          {user.registrationNumber && (
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">
              Reg. {user.registrationNumber}
            </span>
          )}
          {user.contactPerson && (
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">
              Contact: {user.contactPerson}
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500">{user.phone || 'No phone on file'}</span>
      </div>

      {!user.verified && (
        <Alert tone="warning" className="mb-6">
          Your hospital profile is pending verification. Verified hospitals are prioritised and can
          take part in full matching.
        </Alert>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active requests" value={stats.active} tone={stats.active ? 'danger' : 'default'} />
        <Stat label="Donor responses" value={stats.responses} />
        <Stat label="Accepted donations" value={stats.accepted} tone="success" />
        <Stat label="Units requested" value={stats.units} />
      </div>

      {/* Active requests */}
      <section className="mb-8">
        <h2 className="section-title mb-3">Active requests</h2>
        {active.length === 0 ? (
          <EmptyState
            icon="🩸"
            title="No active requests"
            message="Create a blood request to find compatible donors near your hospital."
            action={
              <Link to="/hospital/requests/new" className="btn-primary">
                Create blood request
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {active.map((request) => {
              const summary = responseSummary(request.id)
              const urgent = request.urgency === 'high'
              return (
                <div
                  key={request.id}
                  className={`card p-5 ${urgent ? 'ring-2 ring-primary/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <BloodBadge group={request.bloodGroup} className="text-sm" />
                      <div>
                        <p className="text-sm font-semibold text-heading">
                          {request.units} unit{request.units > 1 ? 's' : ''} · {request.city}
                        </p>
                        <p className="text-xs text-gray-500">Posted {timeAgo(request.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={request.status} />
                      <UrgencyBadge level={request.urgency} />
                    </div>
                  </div>

                  {urgent && (
                    <p className="mt-3 rounded-lg bg-alert px-3 py-2 text-xs font-medium text-primary-dark">
                      ⚡ High urgency — prioritise donor outreach.
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Sent', value: summary.total },
                      { label: 'Awaiting', value: summary.awaiting },
                      { label: 'Accepted', value: summary.accepted },
                      { label: 'Declined', value: summary.declined },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-blush py-2">
                        <p className="text-lg font-bold text-heading">{item.value}</p>
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to={`/hospital/requests/${request.id}/donors`} className="btn-primary">
                      Find donors
                    </Link>
                    <Link to={`/hospital/requests/${request.id}`} className="btn-outline">
                      Track status
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent donor responses */}
      {recentResponses.length > 0 && (
        <section className="mb-8">
          <h2 className="section-title mb-3">Recent donor responses</h2>
          <div className="card divide-y divide-black/5">
            {recentResponses.map((response) => (
              <div key={response.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <BloodBadge group={response.donorBloodGroup} />
                  <div>
                    <p className="text-sm font-semibold text-heading">{response.donorName}</p>
                    <p className="text-xs text-gray-500">
                      For {response.requestBloodGroup} · {timeAgo(response.createdAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={response.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Previous requests */}
      <section>
        <h2 className="section-title mb-3">Previous requests</h2>
        {previous.length === 0 ? (
          <EmptyState icon="📚" title="No past requests" message="Completed and cancelled requests will appear here." />
        ) : (
          <div className="card divide-y divide-black/5">
            {previous.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <BloodBadge group={request.bloodGroup} />
                  <div>
                    <p className="text-sm font-semibold text-heading">
                      {request.units} unit{request.units > 1 ? 's' : ''} · {request.city}
                    </p>
                    <p className="text-xs text-gray-500">Posted {timeAgo(request.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={request.status} />
                  <Link to={`/hospital/requests/${request.id}`} className="link text-sm">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
