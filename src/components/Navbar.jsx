import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, logout, isDonor, isHospital, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const dashboardPath = isDonor ? '/donor' : isHospital ? '/hospital' : isAdmin ? '/admin' : '/'

  const navLinkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/')
  }

  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-40 bg-navbar text-white shadow-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2" onClick={close}>
          <Logo textClass="text-white" />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <a href="/#how-it-works" className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white">
            How it works
          </a>
          {user && (
            <NavLink to={dashboardPath} className={navLinkClass}>
              {isAdmin ? 'Admin Console' : 'Dashboard'}
            </NavLink>
          )}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <NotificationBell />
              <span className="hidden max-w-[10rem] truncate text-sm text-white/80 lg:inline">
                {user.name || user.hospitalName || (isAdmin ? 'Admin' : 'User')}
              </span>
              {!isAdmin && (
                <Link to="/profile" className="btn-outline bg-white/10 text-white hover:bg-white/20">
                  Profile
                </Link>
              )}
              <button type="button" onClick={handleLogout} className="btn-ghost text-white hover:bg-white/10">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-white hover:bg-white/10">
                Login
              </Link>
              <Link to="/register" className="btn bg-primary text-white hover:bg-primary-dark">
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-1 md:hidden">
          {user && <NotificationBell />}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 hover:bg-white/10"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-white/10 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-3">
            <NavLink to="/" end className={navLinkClass} onClick={close}>
              Home
            </NavLink>
            {user && (
              <NavLink to={dashboardPath} className={navLinkClass} onClick={close}>
                {isAdmin ? 'Admin Console' : 'Dashboard'}
              </NavLink>
            )}
            {user ? (
              <>
                {!isAdmin && (
                  <NavLink to="/profile" className={navLinkClass} onClick={close}>
                    Profile
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium text-white/80 transition hover:bg-white/10"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass} onClick={close}>
                  Login
                </NavLink>
                <NavLink to="/register" className={navLinkClass} onClick={close}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
