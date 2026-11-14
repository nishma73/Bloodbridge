// ---------------------------------------------------------------------------
// Firebase configuration (SDK-free).
//
// This module only reads environment variables so it can be imported by the
// service layer without pulling the Firebase SDK into the main bundle.
// The SDK itself is initialised inside services/firebaseAdapter.js, which is
// loaded lazily only when Firebase is actually configured.
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const forceMock = String(import.meta.env.VITE_USE_MOCK || '').toLowerCase() === 'true'

export const isFirebaseConfigured = Boolean(
  !forceMock && firebaseConfig.apiKey && firebaseConfig.projectId,
)
