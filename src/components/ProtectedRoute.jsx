import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './ui'

/**
 * Guards a route. `role` optionally restricts access to 'donor' or 'hospital'.
 */
export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader label="Checking your session…" />

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (role && user.role !== role) {
    const fallback = user.role === 'donor' ? '/donor' : '/hospital'
    return <Navigate to={fallback} replace />
  }

  return children
}
