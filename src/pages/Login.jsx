import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Alert, TextField } from '../components/ui'
import Logo from '../components/Logo'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await login(form.email.trim(), form.password)
      toast.success(`Welcome back, ${user.name || user.hospitalName || 'User'}!`)
      const fallback =
        user.role === 'donor' ? '/donor' : user.role === 'admin' ? '/admin' : '/hospital'
      navigate(redirectTo || fallback, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to log in.')
    } finally {
      setBusy(false)
    }
  }

  const fillDemo = (role) => {
    if (role === 'hospital') {
      setForm({ email: 'hospital@example.com', password: 'password123' })
    } else if (role === 'admin') {
      setForm({ email: 'admin@bloodbridge.org', password: 'password123' })
    } else {
      setForm({ email: 'aarav@example.com', password: 'password123' })
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <div className="mb-6 text-center">
        <Logo className="justify-center" />
        <h1 className="mt-4 text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Log in to continue to your dashboard.</p>
      </div>

      <div className="card p-6">
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            id="email"
            type="email"
            label="Email address"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
            required
          />
          <TextField
            id="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={update('password')}
            required
          />
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-primary/20 bg-alert p-4 text-sm">
          <p className="font-semibold text-heading">Quick demo logins</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => fillDemo('donor')} className="btn-outline text-xs">
              Donor demo
            </button>
            <button type="button" onClick={() => fillDemo('hospital')} className="btn-outline text-xs">
              Hospital demo
            </button>
            <button type="button" onClick={() => fillDemo('admin')} className="btn-outline text-xs">
              Admin demo
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500">
          New to Blood Bridge?{' '}
          <Link to="/register" className="link">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
