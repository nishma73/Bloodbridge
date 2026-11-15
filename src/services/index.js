// ---------------------------------------------------------------------------
// Service layer entry point.
//
// Defaults to the functional Node.js / Express / MongoDB REST API adapter.
// Gracefully preserves Firebase or Mock fallback if explicitly configured.
// ---------------------------------------------------------------------------
import { isFirebaseConfigured } from '../config/firebase'
import { mockAdapter } from './mockAdapter'
import { apiAdapter } from './apiAdapter'

// By default, connect to our live Express/MongoDB backend
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

let adapterPromise
function resolveAdapter() {
  if (!adapterPromise) {
    if (USE_MOCK) {
      adapterPromise = Promise.resolve(mockAdapter)
    } else if (isFirebaseConfigured) {
      adapterPromise = import('./firebaseAdapter').then((mod) => mod.firebaseAdapter)
    } else {
      adapterPromise = Promise.resolve(apiAdapter)
    }
  }
  return adapterPromise
}

/** Build a lazy, adapter-agnostic method. */
const call = (namespace, method) => (...args) =>
  resolveAdapter().then((adapter) => {
    if (!adapter[namespace] || typeof adapter[namespace][method] !== 'function') {
      throw new Error(`Method ${namespace}.${method} is not implemented on the active adapter.`);
    }
    return adapter[namespace][method](...args);
  })

export const usingFirebase = isFirebaseConfigured
export const usingMock = USE_MOCK

export const service = {
  kind: USE_MOCK ? 'mock' : isFirebaseConfigured ? 'firebase' : 'api',

  auth: {
    register: call('auth', 'register'),
    login: call('auth', 'login'),
    logout: call('auth', 'logout'),
    getCurrentUser: call('auth', 'getCurrentUser'),
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

  admin: {
    getStats: call('admin', 'getStats'),
    listDonors: call('admin', 'listDonors'),
    listHospitals: call('admin', 'listHospitals'),
    verifyHospital: call('admin', 'verifyHospital'),
    listRequests: call('admin', 'listRequests'),
    updateUserStatus: call('admin', 'updateUserStatus'),
  },

  reset: () => resolveAdapter().then((adapter) => adapter.reset()),
}
