// ---------------------------------------------------------------------------
// Firebase adapter — real Auth + Firestore implementation.
// It exposes the exact same interface as the mock adapter so it can be swapped
// in transparently (see src/services/index.js).
//
// Firestore collections
//   users            { uid, role, email, ...profile }
//   bloodRequests    { id, hospitalId, bloodGroup, units, urgency, status, ... }
//   donorResponses   { id, requestId, donorId, status, ... }
//   notifications    { id, userId, title, body, read, link, createdAt }
// ---------------------------------------------------------------------------
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from '../config/firebase'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const usersCol = () => collection(db, 'users')
const requestsCol = () => collection(db, 'bloodRequests')
const responsesCol = () => collection(db, 'donorResponses')
const notificationsCol = () => collection(db, 'notifications')

const nowIso = () => new Date().toISOString()

const docsToArray = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))

async function fetchProfile(uidValue) {
  if (!uidValue) return null
  const snap = await getDoc(doc(db, 'users', uidValue))
  return snap.exists() ? snap.data() : null
}

export const firebaseAdapter = {
  kind: 'firebase',

  auth: {
    async register({ email, password, role, ...profile }) {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const record = {
        uid: cred.user.uid,
        role,
        email: String(email).trim().toLowerCase(),
        verified: false,
        createdAt: nowIso(),
        ...profile,
      }
      await setDoc(doc(db, 'users', cred.user.uid), record)
      return record
    },

    async login(email, password) {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      return fetchProfile(cred.user.uid)
    },

    async logout() {
      await signOut(auth)
      return true
    },

    async getCurrentUser() {
      return fetchProfile(auth.currentUser?.uid)
    },

    onAuthChange(cb) {
      return onAuthStateChanged(auth, async (user) => {
        cb(user ? await fetchProfile(user.uid) : null)
      })
    },
  },

  profiles: {
    async get(uidValue) {
      return fetchProfile(uidValue)
    },

    async update(uidValue, patch) {
      await updateDoc(doc(db, 'users', uidValue), patch)
      return fetchProfile(uidValue)
    },

    async setAvailability(uidValue, available) {
      return this.update(uidValue, { available })
    },

    async listDonors(filters = {}) {
      const { bloodGroup, availableOnly, verifiedOnly, search } = filters
      const snap = await getDocs(query(usersCol(), where('role', '==', 'donor')))
      let donors = docsToArray(snap)
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
      return donors
    },
  },

  requests: {
    async create(data) {
      const record = {
        status: 'pending',
        createdAt: nowIso(),
        ...data,
      }
      const ref = await addDoc(requestsCol(), record)
      return { id: ref.id, ...record }
    },

    async listForHospital(hospitalId) {
      const snap = await getDocs(
        query(requestsCol(), where('hospitalId', '==', hospitalId)),
      )
      return docsToArray(snap).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      )
    },

    /** All requests that are still open (not completed or cancelled). */
    async listOpen() {
      const snap = await getDocs(requestsCol())
      return docsToArray(snap)
        .filter((r) => !['completed', 'cancelled'].includes(r.status))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    },

    async get(id) {
      const snap = await getDoc(doc(db, 'bloodRequests', id))
      return snap.exists() ? { id: snap.id, ...snap.data() } : null
    },

    async update(id, patch) {
      await updateDoc(doc(db, 'bloodRequests', id), patch)
      return this.get(id)
    },

    async remove(id) {
      await deleteDoc(doc(db, 'bloodRequests', id))
      return true
    },
  },

  responses: {
    async sendToDonors(requestId, donorIds, message = '') {
      const requestSnap = await getDoc(doc(db, 'bloodRequests', requestId))
      if (!requestSnap.exists()) throw new Error('Request not found.')
      const request = { id: requestSnap.id, ...requestSnap.data() }

      const existingSnap = await getDocs(
        query(responsesCol(), where('requestId', '==', requestId)),
      )
      const existingDonorIds = new Set(docsToArray(existingSnap).map((r) => r.donorId))

      const created = []
      const batch = writeBatch(db)

      for (const donorId of donorIds) {
        if (existingDonorIds.has(donorId)) continue
        const donor = await fetchProfile(donorId)
        if (!donor) continue

        const responseRef = doc(responsesCol())
        const response = {
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
          createdAt: nowIso(),
          respondedAt: null,
        }
        batch.set(responseRef, response)
        created.push({ id: responseRef.id, ...response })

        const noteRef = doc(notificationsCol())
        batch.set(noteRef, {
          userId: donorId,
          title: 'New donation request',
          body: `${request.hospitalName} needs ${request.bloodGroup} blood${
            request.urgency === 'high' ? ' urgently' : ''
          }.`,
          read: false,
          link: '/donor',
          createdAt: nowIso(),
        })
      }

      if (created.length) {
        batch.update(doc(db, 'bloodRequests', requestId), {
          status: 'sent',
          updatedAt: nowIso(),
        })
        await batch.commit()
      }

      return created
    },

    async listForRequest(requestId) {
      const snap = await getDocs(query(responsesCol(), where('requestId', '==', requestId)))
      return docsToArray(snap).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      )
    },

    async listForDonor(donorId) {
      const snap = await getDocs(query(responsesCol(), where('donorId', '==', donorId)))
      return docsToArray(snap).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      )
    },

    async respond(responseId, status, message = '') {
      const ref = doc(db, 'donorResponses', responseId)
      await updateDoc(ref, { status, message, respondedAt: nowIso() })
      const snap = await getDoc(ref)
      const response = { id: snap.id, ...snap.data() }

      const siblings = await this.listForRequest(response.requestId)
      const requestPatch = { updatedAt: nowIso() }
      if (status === 'accepted') requestPatch.status = 'accepted'
      else if (status === 'declined' && siblings.every((r) => r.status === 'declined')) {
        requestPatch.status = 'declined'
      }
      await updateDoc(doc(db, 'bloodRequests', response.requestId), requestPatch)

      await addDoc(notificationsCol(), {
        userId: response.hospitalId,
        title: `Donor ${status} your request`,
        body: `${response.donorName} (${response.donorBloodGroup}) ${status} the request for ${response.requestBloodGroup} blood.`,
        read: false,
        link: '/hospital',
        createdAt: nowIso(),
      })

      return response
    },

    async markCompleted(responseId) {
      const ref = doc(db, 'donorResponses', responseId)
      await updateDoc(ref, { status: 'completed', respondedAt: nowIso() })
      const snap = await getDoc(ref)
      const response = { id: snap.id, ...snap.data() }

      await updateDoc(doc(db, 'bloodRequests', response.requestId), {
        status: 'completed',
        updatedAt: nowIso(),
      })

      await addDoc(notificationsCol(), {
        userId: response.donorId,
        title: 'Donation confirmed',
        body: `${response.hospitalName} marked your donation as completed. Thank you!`,
        read: false,
        link: '/donor',
        createdAt: nowIso(),
      })

      return response
    },
  },

  notifications: {
    async listForUser(userId) {
      const snap = await getDocs(query(notificationsCol(), where('userId', '==', userId)))
      return docsToArray(snap).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      )
    },

    async markRead(id) {
      await updateDoc(doc(db, 'notifications', id), { read: true })
      return true
    },

    async markAllRead(userId) {
      const snap = await getDocs(query(notificationsCol(), where('userId', '==', userId)))
      const batch = writeBatch(db)
      snap.docs.forEach((d) => batch.update(d.ref, { read: true }))
      await batch.commit()
      return true
    },
  },

  async reset() {
    // Firebase data is not wiped from the client for safety.
    return true
  },
}
