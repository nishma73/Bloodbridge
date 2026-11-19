import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { BLOOD_GROUPS } from '../lib/blood'
import { Alert, PhoneField, SelectField, TextField } from '../components/ui'
import { validateIndianPhoneNumber } from '../lib/validation'
import Logo from '../components/Logo'

const DEFAULT_COORDS = { latitude: 12.9716, longitude: 77.5946 } // Bengaluru centre

const emptyForm = {
  email: '',
  password: '',
  confirm: '',
  phone: '',
  city: '',
  latitude: DEFAULT_COORDS.latitude,
  longitude: DEFAULT_COORDS.longitude,
  // donor
  name: '',
  bloodGroup: 'O+',
  available: true,
  // hospital
  hospitalName: '',
  registrationNumber: '',
  contactPerson: '',
  address: '',
}

export default function Register() {
  const [params] = useSearchParams()
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [role, setRole] = useState(params.get('role') === 'hospital' ? 'hospital' : 'donor')
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handlePhoneChange = (event) => {
    setForm((f) => ({ ...f, phone: event.target.value }))
    // Never validate mid-entry: clear any stale message and wait for blur/submit.
    if (phoneError) setPhoneError('')
  }

  const handlePhoneBlur = () => {
    if (!form.phone || form.phone.trim() === '') {
      setPhoneError('Phone number is required.')
      return
    }
    const check = validateIndianPhoneNumber(form.phone)
    setPhoneError(check.isValid ? '' : check.error)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5)),
        }))
        toast.success('Location captured.')
      },
      () => toast.error('Could not access your location. Please enter coordinates manually.'),
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    // 1. Validate Phone Number
    const phoneCheck = validateIndianPhoneNumber(form.phone)
    if (!phoneCheck.isValid) {
      setPhoneError(phoneCheck.error)
      // Focus phone input element
      const phoneInput = document.getElementById('phone')
      if (phoneInput) phoneInput.focus()
      return
    }
    setPhoneError('')

    // 2. Validate Password
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }

    const base = {
      email: form.email.trim(),
      password: form.password,
      phone: phoneCheck.formatted, // Stored as "+91 <10 digits>"
      city: form.city.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    }

    const profile =
      role === 'donor'
        ? {
            ...base,
            name: form.name.trim(),
            bloodGroup: form.bloodGroup,
            available: form.available,
          }
        : {
            ...base,
            hospitalName: form.hospitalName.trim(),
            registrationNumber: form.registrationNumber.trim(),
            contactPerson: form.contactPerson.trim(),
            address: form.address.trim(),
          }

    setBusy(true)
    try {
      await register({ ...profile, role })
      toast.success('Account created! Complete your profile any time.')
      navigate(role === 'donor' ? '/donor' : '/hospital', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 text-center">
        <Logo className="justify-center" />
        <h1 className="mt-4 text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Join as a donor or register your hospital. Verified profiles can take part in matching.
        </p>
      </div>

      <div className="card overflow-hidden">
        {/* Role toggle */}
        <div className="border-b border-black/5 p-3">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-blush/70 p-1" role="group" aria-label="Account type">
            {[
              { key: 'donor', label: 'I am a donor' },
              { key: 'hospital', label: 'I am a hospital' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRole(option.key)}
                className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${
                  role === option.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-heading hover:bg-white/70'
                }`}
                aria-pressed={role === option.key}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <Alert tone="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {role === 'donor' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="name"
                  label="Full name"
                  required
                  variant="embedded"
                  value={form.name}
                  onChange={update('name')}
                  placeholder="Aarav Sharma"
                />
                <SelectField
                  id="bloodGroup"
                  label="Blood group"
                  required
                  variant="embedded"
                  value={form.bloodGroup}
                  onChange={update('bloodGroup')}
                >
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
                  variant="embedded"
                  value={form.hospitalName}
                  onChange={update('hospitalName')}
                  placeholder="Sunrise Multispeciality Hospital"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="registrationNumber"
                    label="Registration number"
                    variant="embedded"
                    value={form.registrationNumber}
                    onChange={update('registrationNumber')}
                    placeholder="KA-HOSP-0000"
                  />
                  <TextField
                    id="contactPerson"
                    label="Contact person"
                    variant="embedded"
                    value={form.contactPerson}
                    onChange={update('contactPerson')}
                    placeholder="Dr. Priya Menon"
                  />
                </div>
                <TextField
                  id="address"
                  label="Hospital address"
                  variant="embedded"
                  value={form.address}
                  onChange={update('address')}
                  placeholder="12 MG Road, Bengaluru"
                />
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="email"
                type="email"
                label="Email address"
                required
                variant="embedded"
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
              />
              <PhoneField
                id="phone"
                label="Phone number"
                required
                variant="embedded"
                value={form.phone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                error={phoneError}
                hint="Enter 10-digit mobile number"
                placeholder="98765 43210"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="password"
                type="password"
                label="Password"
                required
                variant="embedded"
                autoComplete="new-password"
                hint="At least 6 characters."
                value={form.password}
                onChange={update('password')}
              />
              <TextField
                id="confirm"
                type="password"
                label="Confirm password"
                required
                variant="embedded"
                autoComplete="new-password"
                value={form.confirm}
                onChange={update('confirm')}
              />
            </div>

            {/* Location */}
            <div className="space-y-4 border-t border-black/5 pt-5">
              <div>
                <h3 className="text-sm font-semibold text-heading">Location</h3>
                <p className="mt-0.5 text-xs text-gray-400">
                  Coordinates power the radius-based donor search. Defaults to Bengaluru if unchanged.
                </p>
              </div>
              <TextField
                id="city"
                label={role === 'donor' ? 'Area / city' : 'City'}
                variant="embedded"
                value={form.city}
                onChange={update('city')}
                placeholder="Koramangala, Bengaluru"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="latitude"
                  type="number"
                  step="0.00001"
                  label="Latitude"
                  variant="embedded"
                  value={form.latitude}
                  onChange={update('latitude')}
                />
                <TextField
                  id="longitude"
                  type="number"
                  step="0.00001"
                  label="Longitude"
                  variant="embedded"
                  value={form.longitude}
                  onChange={update('longitude')}
                />
              </div>
              <button type="button" onClick={useMyLocation} className="btn-outline">
                📍 Use my current location
              </button>
            </div>

            {role === 'donor' && (
              <label className="flex items-center gap-3 border-t border-black/5 pt-5">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={update('available')}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-ink">
                  I am currently available to donate blood.
                </span>
              </label>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="link">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
