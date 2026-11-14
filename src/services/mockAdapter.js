// ---------------------------------------------------------------------------
// Mock adapter — a fully working in-browser implementation backed by
// localStorage. It mirrors the Firebase adapter's interface exactly, so the
// rest of the app never needs to know which backend is active.
// ---------------------------------------------------------------------------
import { createSeed } from './seed'

const DB_KEY = 'blood-bridge-db-v1'
const SESSION_KEY = 'blood-bridge-session-v1'

const uid = (prefix) =>
  `${prefix}-${(crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2)}`

const sanitize = (user) => {
  if (!user) return null
  const { password, ...safe } = user
  return safe
}

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore corrupted storage */
  }
  const seeded = createSeed()
  localStorage.setItem(DB_KEY, JSON.stringify(seeded))
  return seeded
}

let db = null
const listeners = new Set()

function getDb() {
  if (!db) db = loadDb()
  return db
}

function persist() {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function emit() {
  const user = getCurrentUser()
  listeners.forEach((cb) => cb(user))
}

function delay(value) {
  // Small artificial latency keeps loading states visible & realistic.
  return new Promise((resolve) => setTimeout(() => resolve(value), 180))
}

function getCurrentUser() {
  const sessionUid = localStorage.getItem(SESSION_KEY)
  if (!sessionUid) return null
  const user = getDb().users.find((u) => u.uid === sessionUid)
  return sanitize(user) || null
}

function publicUser(user) {
  return sanitize(user)
}

export const mockAdapter = {
  kind: 'mock',

  // ----- Authentication ----------------------------------------------------
  auth: {
    async register({ email, password, role, ...profile }) {
      const database = getDb()
      const normalized = String(email || '').trim().toLowerCase()
      if (!normalized || !password) throw new Error('Email and password are required.')
      if (database.users.some((u) => u.email.toLowerCase() === normalized)) {
        throw new Error('An account with this email already exists.')
      }
      const user = {
        uid: uid(role === 'hospital' ? 'hospital' : 'donor'),
        role,
        email: normalized,
        password,
        verified: false,
        createdAt: new Date().toISOString(),
        ...profile,
      }
      database.users.push(user)
      persist()
      localStorage.setItem(SESSION_KEY, user.uid)
      const safe = publicUser(user)
      emit()
      return delay(safe)
    },

    async login(email, password) {
      const database = getDb()
      const normalized = String(email || '').trim().toLowerCase()
      const user = database.users.find((u) => u.email.toLowerCase() === normalized)
      if (!user || user.password !== password) {
        throw new Error('Invalid email or password.')
      }
      localStorage.setItem(SESSION_KEY, user.uid)
      const safe = publicUser(user)
      emit()
      return delay(safe)
    },

    async logout() {
      localStorage.removeItem(SESSION_KEY)
      emit()
      return delay(true)
    },

    async getCurrentUser() {
      return getCurrentUser()
    },

    onAuthChange(cb) {
      listeners.add(cb)
      // fire once with the current state
      cb(getCurrentUser())
      return () => listeners.delete(cb)
    },
  },

  // ----- Profiles ----------------------------------------------------------
  profiles: {
    async get(uidValue) {
      const user = getDb().users.find((u) => u.uid === uidValue)
      return delay(publicUser(user))
    },

    async update(uidValue, patch) {
      const database = getDb()
      const user = database.users.find((u) => u.uid === uidValue)
      if (!user) throw new Error('Profile not found.')
      Object.assign(user, patch)
      persist()
      return delay(publicUser(user))
    },

    async setAvailability(uidValue, available) {
      return this.update(uidValue, { available })
    },

    /**
     * List donor profiles. `filters` may include:
     * bloodGroup, availableOnly, verifiedOnly, search
     */
    async listDonors(filters = {}) {
      const { bloodGroup, availableOnly, verifiedOnly, search } = filters
      let donors = getDb().users.filter((u) => u.role === 'donor')
      if (bloodGroup) donors = donors.filter((d) => d.bloodGroup === bloodGroup)
      if (availableOnly) donors = donors.filter((d) => d.available)
      if (verifiedOnly) donors = donors.filter((d) => d.verified)
      if (search) {
        const q = search.toLowerCase()
        donors = donors.filter(
          (d) =>
            (d.name || '').toLowerCase().includes(q) ||
            (d.city || '').toLowerCase().includes(q) ||
            (d.bloodGroup || '').toLowerCase().includes(q),
        )
      }
      return delay(donors.map(publicUser))
    },
  },

  // ----- Blood requests ----------------------------------------------------
  requests: {
    async create(data) {
      const database = getDb()
      const request = {
        id: uid('req'),
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...data,
      }
      database.requests.unshift(request)
      persist()
      return delay(request)
    },

    async listForHospital(hospitalId) {
      const rows = getDb()
        .requests.filter((r) => r.hospitalId === hospitalId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return delay(rows)
    },

    /** All requests that are still open (not completed or cancelled). */
    async listOpen() {
      const rows = getDb()
        .requests.filter((r) => !['completed', 'cancelled'].includes(r.status))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return delay(rows)
    },

    async get(id) {
      return delay(getDb().requests.find((r) => r.id === id) || null)
    },

    async update(id, patch) {
      const database = getDb()
      const request = database.requests.find((r) => r.id === id)
      if (!request) throw new Error('Request not found.')
      Object.assign(request, patch)
      persist()
      return delay(request)
    },

    async remove(id) {
      const database = getDb()
      database.requests = database.requests.filter((r) => r.id !== id)
      database.responses = database.responses.filter((r) => r.requestId !== id)
      persist()
      return delay(true)
    },
  },

  // ----- Donor responses ---------------------------------------------------
  responses: {
    async sendToDonors(requestId, donorIds, message = '') {
      const database = getDb()
      const request = database.requests.find((r) => r.id === requestId)
      if (!request) throw new Error('Request not found.')
      const created = []
      donorIds.forEach((donorId) => {
        const donor = database.users.find((u) => u.uid === donorId)
        if (!donor) return
        const already = database.responses.find(
          (r) => r.requestId === requestId && r.donorId === donorId,
        )
        if (already) return
        const response = {
          id: uid('res'),
          requestId,
          requestBloodGroup: request.bloodGroup,
          hospitalId: request.hospitalId,
          hospitalName: request.hospitalName,
          donorId,
          donorName: donor.name,
          donorBloodGroup: donor.bloodGroup,
          donorPhone: donor.phone,
          status: 'sent',
          message,
          createdAt: new Date().toISOString(),
          respondedAt: null,
        }
        database.responses.push(response)
        created.push(response)
        database.notifications.unshift({
          id: uid('note'),
          userId: donorId,
          title: 'New donation request',
          body: `${request.hospitalName} needs ${request.bloodGroup} blood${
            request.urgency === 'high' ? ' urgently' : ''
          }.`,
          read: false,
          link: '/donor',
          createdAt: new Date().toISOString(),
        })
      })
      if (created.length) {
        request.status = 'sent'
        request.updatedAt = new Date().toISOString()
      }
      persist()
      return delay(created)
    },

    async listForRequest(requestId) {
      const rows = getDb()
        .responses.filter((r) => r.requestId === requestId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return delay(rows)
    },

    async listForDonor(donorId) {
      const rows = getDb()
        .responses.filter((r) => r.donorId === donorId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return delay(rows)
    },

    async respond(responseId, status, message = '') {
      const database = getDb()
      const response = database.responses.find((r) => r.id === responseId)
      if (!response) throw new Error('Response not found.')
      response.status = status
      response.message = message
      response.respondedAt = new Date().toISOString()
      persist()

      const request = database.requests.find((r) => r.id === response.requestId)
      if (request) {
        if (status === 'accepted') {
          const anyAccepted = database.responses.some(
            (r) => r.requestId === request.id && r.status === 'accepted',
          )
          if (anyAccepted) request.status = 'accepted'
        } else if (status === 'declined') {
          const allDeclined = database.responses
            .filter((r) => r.requestId === request.id)
            .every((r) => r.status === 'declined')
          if (allDeclined) request.status = 'declined'
        }
        request.updatedAt = new Date().toISOString()
      }

      // Notify the hospital
      database.notifications.unshift({
        id: uid('note'),
        userId: response.hospitalId,
        title: `Donor ${status} your request`,
        body: `${response.donorName} (${response.donorBloodGroup}) ${status} the request for ${response.requestBloodGroup} blood.`,
        read: false,
        link: '/hospital',
        createdAt: new Date().toISOString(),
      })

      persist()
      return delay(response)
    },

    async markCompleted(responseId) {
      const database = getDb()
      const response = database.responses.find((r) => r.id === responseId)
      if (!response) throw new Error('Response not found.')
      response.status = 'completed'
      response.respondedAt = new Date().toISOString()

      const request = database.requests.find((r) => r.id === response.requestId)
      if (request) {
        request.status = 'completed'
        request.updatedAt = new Date().toISOString()
      }

      database.notifications.unshift({
        id: uid('note'),
        userId: response.donorId,
        title: 'Donation confirmed',
        body: `${response.hospitalName} marked your donation as completed. Thank you!`,
        read: false,
        link: '/donor',
        createdAt: new Date().toISOString(),
      })

      persist()
      return delay(response)
    },
  },

  // ----- Notifications -----------------------------------------------------
  notifications: {
    async listForUser(userId) {
      const rows = getDb()
        .notifications.filter((n) => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return delay(rows)
    },

    async markRead(id) {
      const database = getDb()
      const note = database.notifications.find((n) => n.id === id)
      if (note) {
        note.read = true
        persist()
      }
      return delay(true)
    },

    async markAllRead(userId) {
      const database = getDb()
      database.notifications.forEach((n) => {
        if (n.userId === userId) n.read = true
      })
      persist()
      return delay(true)
    },
  },

  /** Reset the demo database back to its seeded state. */
  async reset() {
    localStorage.removeItem(DB_KEY)
    db = null
    emit()
    return delay(true)
  },
}
