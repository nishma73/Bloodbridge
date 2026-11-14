import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { service, usingFirebase } from '../services'
import { BLOOD_GROUPS } from '../lib/blood'
import { AvailabilityBadge, VerifiedBadge } from '../components/Badges'
import { Alert, PageHeader, SelectField, TextField } from '../components/ui'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState(user)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setForm(user)
  }, [user])

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const patch =
        user.role === 'donor'
          ? {
              name: form.name,
              bloodGroup: form.bloodGroup,
              phone: form.phone,
              city: form.city,
              latitude: Number(form.latitude),
              longitude: Number(form.longitude),
              available: form.available,
            }
          : {
              hospitalName: form.hospitalName,
              registrationNumber: form.registrationNumber,
              contactPerson: form.contactPerson,
              phone: form.phone,
              city: form.city,
              address: form.address,
              latitude: Number(form.latitude),
              longitude: Number(form.longitude),
            }
      await updateProfile(patch)
      toast.success('Profile updated.')
    } catch (err) {
      toast.error(err.message || 'Could not update your profile.')
    } finally {
      setBusy(false)
    }
  }

  const resetDemo = async () => {
    await service.reset()
    toast.info('Demo data reset. Reloading…')
    setTimeout(() => window.location.assign('/'), 600)
  }

  if (!form) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title="Your profile"
        subtitle="Keep your details accurate so matching works for you."
        actions={
          <Link to={user.role === 'donor' ? '/donor' : '/hospital'} className="btn-outline">
            Back to dashboard
          </Link>
        }
      />

      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <VerifiedBadge verified={user.verified} />
        {user.role === 'donor' && <AvailabilityBadge available={user.available} />}
        <span className="badge border-slate-200 bg-slate-50 text-slate-600">
          {user.role === 'donor' ? 'Donor' : 'Hospital'}
        </span>
        <span className="ml-auto text-sm text-gray-500">{user.email}</span>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {user.role === 'donor' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="name" label="Full name" required value={form.name || ''} onChange={update('name')} />
              <SelectField id="bloodGroup" label="Blood group" required value={form.bloodGroup || 'O+'} onChange={update('bloodGroup')}>
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </SelectField>
            </div>
          ) : (
            <>
              <TextField
                id="hospitalName"
                label="Hospital name"
                required
                value={form.hospitalName || ''}
                onChange={update('hospitalName')}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="registrationNumber"
                  label="Registration number"
                  value={form.registrationNumber || ''}
                  onChange={update('registrationNumber')}
                />
                <TextField
                  id="contactPerson"
                  label="Contact person"
                  value={form.contactPerson || ''}
                  onChange={update('contactPerson')}
                />
              </div>
              <TextField id="address" label="Address" value={form.address || ''} onChange={update('address')} />
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="phone" label="Phone number" value={form.phone || ''} onChange={update('phone')} />
            <TextField id="city" label="City / area" value={form.city || ''} onChange={update('city')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="latitude"
              type="number"
              step="0.00001"
              label="Latitude"
              value={form.latitude ?? ''}
              onChange={update('latitude')}
            />
            <TextField
              id="longitude"
              type="number"
              step="0.00001"
              label="Longitude"
              value={form.longitude ?? ''}
              onChange={update('longitude')}
            />
          </div>

          {user.role === 'donor' && (
            <label className="flex items-center gap-3 rounded-xl border border-black/5 bg-blush/60 p-4">
              <input
                type="checkbox"
                checked={Boolean(form.available)}
                onChange={update('available')}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">I am currently available to donate blood.</span>
            </label>
          )}

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      <Alert tone="info" className="mt-5">
        Profile verification is handled by Blood Bridge administrators. Only verified profiles are
        eligible for full matching.
      </Alert>

      {!usingFirebase && (
        <div className="card mt-5 p-5">
          <h3 className="text-base font-semibold">Demo controls</h3>
          <p className="mt-1 text-sm text-gray-500">
            You are running on the in-browser demo database. Reset it to restore the seeded donors,
            hospitals and requests.
          </p>
          <button type="button" className="btn-danger mt-3" onClick={resetDemo}>
            Reset demo data
          </button>
        </div>
      )}
    </div>
  )
}
