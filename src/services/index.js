// ---------------------------------------------------------------------------
// Service layer entry point.
//
// Chooses the Firebase adapter when credentials are present, otherwise the
// localStorage mock adapter. The Firebase adapter (and the firebase SDK) is
// loaded lazily so demo mode never downloads it.
//
// Every screen imports `service` from here and calls it as if it were a plain
// object; each call resolves the correct adapter on first use.
// ---------------------------------------------------------------------------
import { isFirebaseConfigured } from '../config/firebase'
import { mockAdapter } from './mockAdapter'

let adapterPromise
function resolveAdapter() {
  if (!adapterPromise) {
    adapterPromise = isFirebaseConfigured
      ? import('./firebaseAdapter').then((mod) => mod.firebaseAdapter)
      : Promise.resolve(mockAdapter)
  }
  return adapterPromise
}

/** Build a lazy, adapter-agnostic method. */
const call = (namespace, method) => (...args) =>
  resolveAdapter().then((adapter) => adapter[namespace][method](...args))

export const usingFirebase = isFirebaseConfigured

export const service = {
  kind: isFirebaseConfigured ? 'firebase' : 'mock',

  auth: {
    register: call('auth', 'register'),
    login: call('auth', 'login'),
    logout: call('auth', 'logout'),
    getCurrentUser: call('auth', 'getCurrentUser'),
    // Returns an unsubscribe function synchronously, even though the adapter
    // resolves asynchronously.
    onAuthChange(callback) {
      let cancelled = false
      let unsubscribe = () => {}
      resolveAdapter().then((adapter) => {
        if (cancelled) return
        const result = adapter.auth.onAuthChange(callback)
        if (typeof result === 'function') unsubscribe = result
      })
      return () => {
        cancelled = true
        unsubscribe()
      }
    },
  },

  profiles: {
    get: call('profiles', 'get'),
    update: call('profiles', 'update'),
    setAvailability: call('profiles', 'setAvailability'),
    listDonors: call('profiles', 'listDonors'),
  },

  requests: {
    create: call('requests', 'create'),
    listForHospital: call('requests', 'listForHospital'),
    listOpen: call('requests', 'listOpen'),
    get: call('requests', 'get'),
    update: call('requests', 'update'),
    remove: call('requests', 'remove'),
  },

  responses: {
    sendToDonors: call('responses', 'sendToDonors'),
    listForRequest: call('responses', 'listForRequest'),
    listForDonor: call('responses', 'listForDonor'),
    respond: call('responses', 'respond'),
    markCompleted: call('responses', 'markCompleted'),
  },

  notifications: {
    listForUser: call('notifications', 'listForUser'),
    markRead: call('notifications', 'markRead'),
    markAllRead: call('notifications', 'markAllRead'),
  },

  reset: () => resolveAdapter().then((adapter) => adapter.reset()),
}
