# Blood Bridge

Connecting hospitals with compatible, available blood donors — quickly and safely.

Blood Bridge is a React front end for a blood-donation coordination platform. Hospitals create
blood requests, the app matches compatible donors by blood group, availability, verification and
geographic radius, and donors accept or decline requests from their dashboard.

> **Medical disclaimer:** Compatibility matching in Blood Bridge is *preliminary* and for
> coordination only. Actual transfusion decisions must always be confirmed by qualified hospital
> professionals through proper blood grouping, antibody screening and crossmatching.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| UI library | React 18 |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Routing | React Router 6 |
| Backend | Firebase Authentication + Firestore |
| Demo fallback | localStorage mock adapter |

The app runs in **demo mode** out of the box (no Firebase account needed). Add Firebase credentials
to `.env` and it switches to the real backend automatically.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # production build into dist/
npm run preview      # preview the production build
```

### Demo logins

Demo mode is backed by an in-browser database seeded with sample donors, a hospital, requests and
responses. Every demo account uses the password `password123`.

| Role | Email |
| --- | --- |
| Hospital | `hospital@example.com` |
| Donor (O-) | `aarav@example.com` |
| Donor (O+) | `diya@example.com` |
| Donor (A+) | `vivaan@example.com` |

Use **Profile → Reset demo data** to restore the seeded state at any time.

---

## Connecting Firebase (production)

1. Create a Firebase project and enable **Authentication → Email/Password**.
2. Create a **Firestore** database.
3. Copy `.env.example` to `.env` and fill in your web app config:

   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

4. Restart the dev server. As soon as `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID` are
   present, the app uses Firebase instead of the mock.

### Firestore collections

| Collection | Purpose |
| --- | --- |
| `users` | Donor and hospital profiles (`role`, `bloodGroup`, `available`, `verified`, location…) |
| `bloodRequests` | Blood requests with group, units, urgency and status |
| `donorResponses` | Requests sent to donors and their responses |
| `notifications` | Per-user notifications |

### Suggested security rules (starting point)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    match /bloodRequests/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
    match /donorResponses/{id} {
      allow read, write: if request.auth != null;
    }
    match /notifications/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Tighten these rules before any real deployment (for example, restrict response updates to the
matching donor or hospital).

---

## Application pages

| Route | Page | Access |
| --- | --- | --- |
| `/` | Home — intro, features, how it works, CTAs | Public |
| `/register` | Registration (donor or hospital) | Public |
| `/login` | Login with role-based redirect | Public |
| `/donor` | Donor dashboard — availability, requests, history | Donor |
| `/hospital` | Hospital dashboard — requests, responses, stats | Hospital |
| `/hospital/requests/new` | Create blood request | Hospital |
| `/hospital/requests/:id/donors` | Matching donors with filters | Hospital |
| `/hospital/requests/:id` | Request status tracking | Hospital |
| `/profile` | Edit profile + demo reset | Authenticated |
| `*` | 404 | Public |

---

## How matching works

1. A hospital submits a request (blood group, units, location, urgency, radius).
2. `src/lib/blood.js` computes the **compatible donor groups** for the requested group.
3. `src/lib/matching.js` filters donors by compatibility, availability, verification and
   Haversine distance within the request radius, then sorts nearest-first.
4. The hospital selects donors and sends requests.
5. Donors accept or decline; the request status flows
   `pending → sent → accepted → completed` (or `declined` / `cancelled`).

### Blood-group compatibility (red cells)

| Donor | Can donate to |
| --- | --- |
| O- | Everyone (universal donor) |
| O+ | O+, A+, B+, AB+ |
| A- | A-, A+, AB-, AB+ |
| A+ | A+, AB+ |
| B- | B-, B+, AB-, AB+ |
| B+ | B+, AB+ |
| AB- | AB-, AB+ |
| AB+ | AB+ (universal recipient) |

---

## Design system

| Element | Colour |
| --- | --- |
| Navbar | Deep Red `#7F1D1D` |
| Primary buttons | Bright Red `#DC2626` |
| Page background | Blush White `#FFF5F7` |
| Dashboard cards | Pure White `#FFFFFF` |
| Headings | Dark Maroon `#4C0519` |
| Alerts | Soft Pink `#FDE8EE` |
| Main text | `#1F2937` |

These are defined once in `tailwind.config.js` as `navbar`, `primary`, `blush`, `card`, `heading`,
`alert` and `ink`, then reused through the component classes in `src/index.css`.

---

## Project structure

```
src/
  components/      Navbar, Footer, badges, shared UI primitives
  config/          Firebase env config (SDK-free)
  context/         AuthContext, ToastContext
  lib/             blood compatibility, matching, geo, constants
  pages/           One file per route
  services/        index (adapter selector), mockAdapter, firebaseAdapter, seed
```

The service layer exposes a single interface (`auth`, `profiles`, `requests`, `responses`,
`notifications`). Both adapters implement it, so screens never depend on a specific backend.

---

## Roadmap (from the design document)

Implemented: registration/login, donor & hospital dashboards, blood request form, donor matching,
accept/decline, request tracking, availability toggle, notifications, location-based radius search,
verified-profile filtering, responsive layout.

Next: Google Maps integration, admin verification workflow, email/SMS/push notifications, and
Firebase security-rule hardening.
