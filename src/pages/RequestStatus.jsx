import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { service } from '../services'
import { timeAgo, formatDate } from '../lib/constants'
import { BloodBadge, StatusBadge, UrgencyBadge } from '../components/Badges'
import { Alert, EmptyState, PageHeader, PageLoader } from '../components/ui'

const FLOW = ['pending', 'sent', 'accepted', 'completed']
const FLOW_LABELS = {
  pending: 'Request created',
  sent: 'Requests sent to donors',
  accepted: 'Donor accepted',
  completed: 'Donation completed',
}

export default function RequestStatus() {
  const { id } = useParams()
  const toast = useToast()

  const [request, setRequest] = useState(null)
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [req, res] = await Promise.all([
        service.requests.get(id),
        service.responses.listForRequest(id),
      ])
      setRequest(req)
      setResponses(res)
    } catch (err) {
      toast.error(err.message || 'Could not load the request.')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    load()
  }, [load])

  const currentStep = useMemo(() => {
    if (!request) return 0
    if (request.status === 'cancelled' || request.status === 'declined') {
      return request.status === 'declined' ? 2 : 0
    }
    const index = FLOW.indexOf(request.status)
    return index === -1 ? 0 : index
  }, [request])

  const summary = useMemo(
    () => ({
      total: responses.length,
      awaiting: responses.filter((r) => r.status === 'sent').length,
      accepted: responses.filter((r) => r.status === 'accepted').length,
      declined: responses.filter((r) => r.status === 'declined').length,
      completed: responses.filter((r) => r.status === 'completed').length,
    }),
    [responses],
  )

  const markCompleted = async (response) => {
    setBusy(true)
    try {
      await service.responses.markCompleted(response.id)
      toast.success('Donation marked as completed. Thank you!')
      await load()
    } catch (err) {
      toast.error(err.message || 'Could not update the donation.')
    } finally {
      setBusy(false)
    }
  }

  const cancelRequest = async () => {
    setBusy(true)
    try {
      await service.requests.update(request.id, { status: 'cancelled' })
      toast.info('Request cancelled.')
      await load()
    } catch (err) {
      toast.error(err.message || 'Could not cancel the request.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader label="Loading request status…" />

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

  const terminal = ['completed', 'cancelled'].includes(request.status)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Request status"
        subtitle={`Tracking a ${request.bloodGroup} request for ${request.units} unit(s).`}
        actions={
          <>
            <Link to="/hospital" className="btn-outline">
              Back
            </Link>
            {!terminal && (
              <Link to={`/hospital/requests/${request.id}/donors`} className="btn-primary">
                Find more donors
              </Link>
            )}
          </>
        }
      />

      {/* Summary */}
      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <BloodBadge group={request.bloodGroup} className="text-sm" />
            <UrgencyBadge level={request.urgency} />
            <StatusBadge status={request.status} />
          </div>
          <span className="text-sm text-gray-500">Posted {timeAgo(request.createdAt)}</span>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Units needed', value: request.units },
            { label: 'Location', value: request.city || '—' },
            { label: 'Search radius', value: `${request.radiusKm || '—'} km` },
            { label: 'Needed by', value: request.requiredBy ? formatDate(request.requiredBy) : '—' },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-xs uppercase tracking-wide text-gray-500">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>

        {request.notes && (
          <p className="mt-4 rounded-lg bg-blush px-3 py-2 text-sm text-gray-600">{request.notes}</p>
        )}
      </div>

      {/* Progress timeline */}
      <div className="card mb-5 p-5">
        <h2 className="section-title mb-4">Progress</h2>
        <ol className="grid gap-3 sm:grid-cols-4">
          {FLOW.map((step, index) => {
            const done = index <= currentStep && !(request.status === 'cancelled')
            const active = index === currentStep
            return (
              <li key={step} className="flex items-center gap-3 sm:flex-col sm:items-start">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    done ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className={`text-sm ${active ? 'font-semibold text-heading' : 'text-gray-500'}`}>
                  {FLOW_LABELS[step]}
                </span>
              </li>
            )
          })}
        </ol>

        {request.status === 'cancelled' && (
          <Alert tone="error" className="mt-4">
            This request was cancelled.
          </Alert>
        )}
        {request.status === 'declined' && (
          <Alert tone="warning" className="mt-4">
            All contacted donors declined this request. Try widening the radius or contacting more donors.
          </Alert>
        )}
      </div>

      {/* Response counts */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Sent', value: summary.total },
          { label: 'Awaiting', value: summary.awaiting },
          { label: 'Accepted', value: summary.accepted },
          { label: 'Declined', value: summary.declined },
          { label: 'Completed', value: summary.completed },
        ].map((item) => (
          <div key={item.label} className="card p-3 text-center">
            <p className="text-xl font-bold text-heading">{item.value}</p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Donor responses */}
      <section>
        <h2 className="section-title mb-3">Donor responses</h2>
        {responses.length === 0 ? (
          <EmptyState
            icon="📨"
            title="No donors contacted yet"
            message="Find compatible donors and send them a donation request."
            action={
              <Link to={`/hospital/requests/${request.id}/donors`} className="btn-primary">
                Find donors
              </Link>
            }
          />
        ) : (
          <div className="card divide-y divide-black/5">
            {responses.map((response) => (
              <div
                key={response.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <BloodBadge group={response.donorBloodGroup} />
                  <div>
                    <p className="text-sm font-semibold text-heading">{response.donorName}</p>
                    <p className="text-xs text-gray-500">
                      {response.donorPhone || 'No phone'} · sent {timeAgo(response.createdAt)}
                    </p>
                    {response.message && (
                      <p className="mt-1 text-xs italic text-gray-500">“{response.message}”</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={response.status} />
                  {response.status === 'accepted' && (
                    <button
                      type="button"
                      className="btn-success"
                      onClick={() => markCompleted(response)}
                      disabled={busy}
                    >
                      Mark completed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {!terminal && (
        <div className="mt-8 flex justify-end">
          <button type="button" className="btn-danger" onClick={cancelRequest} disabled={busy}>
            Cancel request
          </button>
        </div>
      )}
    </div>
  )
}
