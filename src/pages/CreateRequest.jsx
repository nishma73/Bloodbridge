import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { service } from '../services'
import { BLOOD_GROUPS, compatibleDonorGroups } from '../lib/blood'
import { URGENCY_LEVELS, URGENCY_META } from '../lib/constants'
import { Alert, PageHeader, SelectField, TextAreaField, TextField } from '../components/ui'

const URGENCY_COPY = {
  low: 'Routine — stock replenishment or elective procedures.',
  medium: 'Needed soon — scheduled surgery or a stable patient.',
  high: 'Emergency — critical patient requiring immediate attention.',
}

export default function CreateRequest() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    bloodGroup: 'O+',
    units: 1,
    urgency: 'medium',
    city: user.city || '',
    latitude: user.latitude ?? 12.9716,
    longitude: user.longitude ?? 77.5946,
    radiusKm: 25,
    requiredBy: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const compatible = useMemo(
    () => compatibleDonorGroups(form.bloodGroup),
    [form.bloodGroup],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const units = Number(form.units)
    if (!units || units < 1) {
      setError('Please enter at least 1 unit.')
      return
    }

    setBusy(true)
    try {
      const created = await service.requests.create({
        hospitalId: user.uid,
        hospitalName: user.hospitalName || 'Hospital',
        bloodGroup: form.bloodGroup,
        units,
        urgency: form.urgency,
        city: form.city.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radiusKm: Number(form.radiusKm) || 25,
        notes: form.notes.trim(),
        requiredBy: form.requiredBy ? new Date(form.requiredBy).toISOString() : null,
      })
      toast.success('Blood request created. Matching donors are ready to review.')
      navigate(`/hospital/requests/${created.id}/donors`)
    } catch (err) {
      setError(err.message || 'Could not create the request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Create a blood request"
        subtitle="Provide the details below. The matching engine will surface compatible, available donors."
      />

      <div className="card p-6">
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              id="bloodGroup"
              label="Required blood group"
              required
              value={form.bloodGroup}
              onChange={update('bloodGroup')}
            >
              {BLOOD_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </SelectField>
            <TextField
              id="units"
              type="number"
              min="1"
              label="Number of units"
              required
              value={form.units}
              onChange={update('units')}
            />
            <SelectField
              id="urgency"
              label="Urgency level"
              required
              value={form.urgency}
              onChange={update('urgency')}
            >
              {URGENCY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {URGENCY_META[level].label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className={`rounded-xl border px-4 py-3 text-sm ${URGENCY_META[form.urgency].className}`}>
            {URGENCY_COPY[form.urgency]}
          </div>

          <Alert tone="info">
            <strong>Compatible donor groups for {form.bloodGroup}:</strong>{' '}
            {compatible.join(', ')}
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="city"
              label="Hospital location"
              value={form.city}
              onChange={update('city')}
              placeholder="MG Road, Bengaluru"
            />
            <TextField
              id="requiredBy"
              type="datetime-local"
              label="Needed by (optional)"
              value={form.requiredBy}
              onChange={update('requiredBy')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              id="latitude"
              type="number"
              step="0.00001"
              label="Latitude"
              value={form.latitude}
              onChange={update('latitude')}
            />
            <TextField
              id="longitude"
              type="number"
              step="0.00001"
              label="Longitude"
              value={form.longitude}
              onChange={update('longitude')}
            />
            <TextField
              id="radiusKm"
              type="number"
              min="1"
              label="Search radius (km)"
              hint="How far to look for donors."
              value={form.radiusKm}
              onChange={update('radiusKm')}
            />
          </div>

          <TextAreaField
            id="notes"
            label="Additional requirements"
            placeholder="e.g. Trauma case in ICU. Platelet-friendly donors preferred."
            value={form.notes}
            onChange={update('notes')}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => navigate('/hospital')}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create request & find donors'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
