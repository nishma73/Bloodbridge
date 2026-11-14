import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { service } from '../services'
import { timeAgo } from '../lib/constants'

export default function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const containerRef = useRef(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      setItems(await service.notifications.listForUser(user.uid))
    } catch {
      /* notifications are non-critical */
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    function handleClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!user) return null

  const unread = items.filter((n) => !n.read).length

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next) await load()
  }

  const markAllRead = async () => {
    await service.notifications.markAllRead(user.uid)
    await load()
  }

  const openItem = async (note) => {
    if (!note.read) {
      await service.notifications.markRead(note.id)
      await load()
    }
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-lg p-2 text-white/90 transition hover:bg-white/10"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white ring-2 ring-navbar">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-black/5 bg-card text-ink shadow-card">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-2.5">
            <p className="text-sm font-semibold text-heading">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-primary-dark hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-500">You have no notifications yet.</p>
            )}
            {items.map((note) => (
              <Link
                key={note.id}
                to={note.link || '#'}
                onClick={() => openItem(note)}
                className={`block border-b border-black/5 px-4 py-3 text-sm transition hover:bg-blush ${
                  note.read ? '' : 'bg-alert/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-heading">{note.title}</p>
                  <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(note.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-gray-600">{note.body}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
