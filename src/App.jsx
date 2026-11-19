import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import BloodFlow from './components/BloodFlow'
import ProtectedRoute from './components/ProtectedRoute'
import { PageLoader } from './components/ui'
import { useAuth } from './context/AuthContext'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import DonorDashboard from './pages/DonorDashboard'
import HospitalDashboard from './pages/HospitalDashboard'
import CreateRequest from './pages/CreateRequest'
import MatchingDonors from './pages/MatchingDonors'
import RequestStatus from './pages/RequestStatus'
import AdminDashboard from './pages/AdminDashboard'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

/** Smoothly honours in-page anchors such as /#how-it-works. */
function ScrollToHash() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) return undefined
    const frame = window.requestAnimationFrame(() => {
      try {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch {
        // Ignore invalid selectors supplied in the URL.
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pathname, hash])
  return null
}

/** Sends an authenticated user to the dashboard that matches their role. */
function DashboardRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader label="Loading…" />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to={user.role === 'donor' ? '/donor' : '/hospital'} replace />
}

export default function App() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <ScrollToTop />
      <ScrollToHash />
      <BloodFlow />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<DashboardRedirect />} />

          <Route
            path="/donor"
            element={
              <ProtectedRoute role="donor">
                <DonorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hospital"
            element={
              <ProtectedRoute role="hospital">
                <HospitalDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/requests/new"
            element={
              <ProtectedRoute role="hospital">
                <CreateRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/requests/:id"
            element={
              <ProtectedRoute role="hospital">
                <RequestStatus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/requests/:id/donors"
            element={
              <ProtectedRoute role="hospital">
                <MatchingDonors />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
