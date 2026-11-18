# BloodBridge Backend REST API

A secure, high-performance Node.js / Express / MongoDB backend for **BloodBridge** — connecting blood donors, hospitals, and blood banks.

---

## Architecture Overview

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Stateless JSON Web Tokens (JWT) + bcryptjs password hashing
- **Security**: Helmet headers, CORS policies, express-validator sanitization, Role-Based Access Control (RBAC)
- **Matching Engine**: Medical-grade red-cell ABO/Rh compatibility lookup with multi-tier geographic and availability ranking
- **Embedded Database Fallback**: Includes `mongodb-memory-server` fallback for zero-config evaluation / demonstrations if a local MongoDB service is not running.

---

## Role-Based Access Control (RBAC)

The system enforces three distinct user roles:

| Role | Permissions & Privileges |
| :--- | :--- |
| **Donor** | Manage donor profile, toggle availability, view open compatible blood requests, respond (accept/decline) to hospital invitations, view donation history. |
| **Hospital** | Manage hospital profile, create & edit blood requests, review matching donors, dispatch requests, mark donations as completed, track response statuses. *(Subject to Administrator verification)* |
| **Administrator** | Full platform oversight: approve/revoke hospital verification, view platform statistics, inspect registered donors & hospitals, monitor blood requests, moderate reported accounts. |

---

## ABO & Rh(D) Red-Cell Compatibility Matrix

The donor matching algorithm evaluates packed Red Blood Cell (RBC) compatibility rather than simply matching identical blood groups:

| Donor RBC Group | Compatible Recipient Groups | Clinical Classification |
| :---: | :--- | :--- |
| **O-** | O-, O+, A-, A+, B-, B+, AB-, AB+ | **Universal Red-Cell Donor** |
| **O+** | O+, A+, B+, AB+ | Compatible with all Rh-positive groups |
| **A-** | A-, A+, AB-, AB+ | Compatible with A and AB recipients |
| **A+** | A+, AB+ | Compatible with A+ and AB+ recipients |
| **B-** | B-, B+, AB-, AB+ | Compatible with B and AB recipients |
| **B+** | B+, AB+ | Compatible with B+ and AB+ recipients |
| **AB-** | AB-, AB+ | Compatible with AB recipients |
| **AB+** | AB+ | Recipient is **Universal RBC Recipient** |

### Prioritization Algorithm:
1. **Compatible Blood Groups**: Identified using the RBC compatibility matrix.
2. **Same City & Proximity**: Donors in the same city or within the request radius receive top score weighting using the Haversine distance formula.
3. **Availability**: Available donors (`available: true`) are prioritized over unavailable donors.
4. **Eligibility**: Donors must be aged 18–70 and adhere to the minimum 56-day whole blood donation recovery interval.

> **Medical Disclaimer:** Compatibility matching in BloodBridge is preliminary and for coordination only. Actual transfusion safety must always be confirmed by qualified hospital laboratory professionals through proper ABO/Rh blood grouping, irregular antibody screening, and major/minor crossmatching.

---

## API Endpoints Reference

### 1. Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new user (donor, hospital, admin).
- `POST /api/auth/login` - Authenticate with email/password and obtain JWT.
- `GET /api/auth/me` - Retrieve current logged-in user and profile. *(Protected)*
- `POST /api/auth/logout` - Invalidate client session. *(Protected)*

### 2. Donors (`/api/donors`)
- `GET /api/donors` - List donors with query filters (`bloodGroup`, `city`, `availableOnly`, `verifiedOnly`, `search`).
- `GET /api/donors/profile/:id?` - View donor profile. *(Protected)*
- `PUT /api/donors/profile/:id?` - Update donor profile. *(Protected)*
- `PATCH /api/donors/availability` - Toggle donor availability status. *(Protected: Donor/Admin)*

### 3. Hospitals (`/api/hospitals`)
- `GET /api/hospitals` - List registered hospitals directory.
- `GET /api/hospitals/profile/:id?` - View hospital profile. *(Protected)*
- `PUT /api/hospitals/profile/:id?` - Update hospital profile. *(Protected)*

### 4. Blood Requests (`/api/requests`)
- `GET /api/requests/open` - List open blood requests across all facilities.
- `GET /api/requests/hospital/:hospitalId?` - List requests created by a specific hospital. *(Protected)*
- `GET /api/requests/:id` - Get specific blood request details.
- `GET /api/requests/:id/matching-donors` - Execute matching engine for a blood request. *(Protected: Hospital/Admin)*
- `POST /api/requests` - Create a new blood request. *(Protected: Hospital/Admin)*
- `PUT /api/requests/:id` - Update request details or status. *(Protected: Hospital/Admin)*
- `DELETE /api/requests/:id` - Remove blood request. *(Protected: Hospital/Admin)*

### 5. Donation Responses (`/api/responses`)
- `POST /api/responses/send` - Hospital dispatches requests to selected donors. *(Protected: Hospital/Admin)*
- `GET /api/responses/request/:requestId` - List responses received for a request. *(Protected)*
- `GET /api/responses/donor/:donorId?` - List requests sent to a donor. *(Protected)*
- `POST /api/responses/:id/respond` - Donor accepts or declines request. *(Protected: Donor/Admin)*
- `POST /api/responses/:id/complete` - Hospital marks donation completed. *(Protected: Hospital/Admin)*

### 6. Administration (`/api/admin`)
- `GET /api/admin/stats` - Platform statistics (users, hospitals, donors, requests, donations). *(Protected: Admin)*
- `GET /api/admin/donors` - Full donor registry. *(Protected: Admin)*
- `GET /api/admin/hospitals` - Full hospital registry with verification statuses. *(Protected: Admin)*
- `PUT /api/admin/hospitals/:id/verify` - Approve or revoke hospital verification. *(Protected: Admin)*
- `GET /api/admin/requests` - Platform-wide blood requests log. *(Protected: Admin)*
- `PATCH /api/admin/users/:id/status` - Suspend/reactivate user or toggle report flag. *(Protected: Admin)*

### 7. Notifications (`/api/notifications`)
- `GET /api/notifications` - Retrieve user notifications. *(Protected)*
- `PATCH /api/notifications/:id/read` - Mark single notification as read. *(Protected)*
- `PATCH /api/notifications/read-all` - Mark all notifications as read. *(Protected)*

---

## Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment (`.env`)
Create a `.env` file from `.env.example`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/bloodbridge
JWT_SECRET=bloodbridge_jwt_secret_production_key_change_in_real_deployment_2026
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```
*Note: If no local MongoDB service is running, the backend automatically starts an embedded MongoDB instance for seamless local demonstration.*

### 3. Seed Sample Data (Optional)
```bash
npm run seed
```
Pre-seeded demo credentials (Password: `password123` for all):
- **Admin**: `admin@bloodbridge.org`
- **Hospital (Verified)**: `hospital@example.com`
- **Hospital (Pending Verification)**: `metro@example.com`
- **Donor (O- Universal)**: `aarav@example.com`
- **Donor (O+)**: `diya@example.com`
- **Donor (A+)**: `vivaan@example.com`

### 4. Run Development Server
```bash
npm run dev
# Server listening on http://localhost:5000
```

### 5. Run Automated Tests
```bash
npm test
# Executes 12 comprehensive unit and integration tests
```
