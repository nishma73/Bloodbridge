// ---------------------------------------------------------------------------
// BloodBridge Live Integration & Audit Verification Test Script
// Tests live backend at http://localhost:5000 against MongoDB Atlas
// ---------------------------------------------------------------------------
const API_URL = 'http://localhost:5000/api'

const results = []
function record(title, passed, note = '') {
  results.push({ title, passed, note })
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${title}${note ? ` - ${note}` : ''}`)
}

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, ok: res.ok, data }
}

async function main() {
  console.log('===============================================================')
  console.log('Running BloodBridge Live Backend & MongoDB Atlas Audit Tests')
  console.log('===============================================================')

  const ts = Date.now()
  let donorToken = null
  let donorId = null
  let donorEmail = `audit.donor.${ts}@bloodbridge.test`
  let donorPassword = 'ValidPassword123!'

  let hospitalToken = null
  let hospitalId = null
  let hospitalEmail = `audit.hospital.${ts}@bloodbridge.test`
  let hospitalPassword = 'HospitalPassword123!'

  let bloodRequestId = null

  // 1. MongoDB Atlas connection & Health Endpoint
  console.log('\n--- 1 & 2. MongoDB Atlas Connection & Health Endpoint ---')
  const health = await request('/health')
  const healthPassed =
    health.status === 200 &&
    health.data &&
    health.data.status === 'ok' &&
    health.data.db === 'connected'
  record('1. MongoDB Atlas connection', healthPassed, `Ready state: ${health.data?.db}`)
  record('2. Database health endpoint (/api/health)', healthPassed, `Status: ${health.status}, Response: ${JSON.stringify(health.data)}`)

  // 3. Donor registration
  console.log('\n--- 3. Donor Registration ---')
  const donorReg = await request('/auth/register', {
    method: 'POST',
    body: {
      email: donorEmail,
      password: donorPassword,
      role: 'donor',
      name: 'Audit Live Donor',
      bloodGroup: 'O+',
      phone: '+91 99887 76655',
      city: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
      available: true,
    },
  })
  const donorUser = donorReg.data?.user
  donorToken = donorReg.data?.token
  donorId = donorUser?.uid || donorUser?.id
  const donorRegPassed =
    donorReg.status === 201 &&
    donorUser &&
    donorUser.email === donorEmail &&
    donorUser.role === 'donor' &&
    donorUser.bloodGroup === 'O+' &&
    !donorUser.password &&
    !donorUser.__v &&
    typeof donorToken === 'string'
  record('3. Donor registration (/api/auth/register)', donorRegPassed, `Status: ${donorReg.status}, UID: ${donorId}`)

  // 4. Hospital registration
  console.log('\n--- 4. Hospital Registration ---')
  const hospitalReg = await request('/auth/register', {
    method: 'POST',
    body: {
      email: hospitalEmail,
      password: hospitalPassword,
      role: 'hospital',
      hospitalName: 'Apollo City Hospital',
      registrationNumber: 'KA-HOSP-AUDIT-2026',
      contactPerson: 'Dr. Anita Desai',
      phone: '+91 88776 65544',
      address: 'Jayanagar 4th Block, Bengaluru',
      city: 'Bengaluru',
      latitude: 12.9299,
      longitude: 77.5824,
    },
  })
  const hospitalUser = hospitalReg.data?.user
  hospitalToken = hospitalReg.data?.token
  hospitalId = hospitalUser?.uid || hospitalUser?.id
  const hospitalRegPassed =
    hospitalReg.status === 201 &&
    hospitalUser &&
    hospitalUser.email === hospitalEmail &&
    hospitalUser.role === 'hospital' &&
    hospitalUser.hospitalName === 'Apollo City Hospital' &&
    !hospitalUser.password &&
    typeof hospitalToken === 'string'
  record('4. Hospital registration (/api/auth/register)', hospitalRegPassed, `Status: ${hospitalReg.status}, UID: ${hospitalId}`)

  // 5. Duplicate email rejection
  console.log('\n--- 5. Duplicate Email Rejection ---')
  const dupReg = await request('/auth/register', {
    method: 'POST',
    body: {
      email: donorEmail.toUpperCase(), // Test case normalization and uniqueness
      password: 'SomeOtherPassword123!',
      role: 'donor',
    },
  })
  const dupPassed = dupReg.status === 409
  record('5. Duplicate email rejection (HTTP 409)', dupPassed, `Status: ${dupReg.status}, Message: ${dupReg.data?.message}`)

  // 6. Login with correct credentials
  console.log('\n--- 6. Login with Correct Credentials ---')
  const loginSuccess = await request('/auth/login', {
    method: 'POST',
    body: { email: donorEmail, password: donorPassword },
  })
  const loginUser = loginSuccess.data?.user
  const loginToken = loginSuccess.data?.token
  const loginPassed =
    loginSuccess.status === 200 &&
    loginUser &&
    loginUser.email === donorEmail &&
    !loginUser.password &&
    typeof loginToken === 'string'
  record('6. Login with correct credentials (/api/auth/login)', loginPassed, `Status: ${loginSuccess.status}, Token returned`)

  // 7. Login with incorrect credentials
  console.log('\n--- 7. Login with Incorrect Credentials ---')
  const badPass = await request('/auth/login', {
    method: 'POST',
    body: { email: donorEmail, password: 'WrongPassword' },
  })
  const badEmail = await request('/auth/login', {
    method: 'POST',
    body: { email: 'nonexistent.user@bloodbridge.test', password: 'SomePassword' },
  })
  const badLoginPassed = badPass.status === 401 && badEmail.status === 401
  record('7. Login with incorrect credentials (HTTP 401)', badLoginPassed, `Wrong pass: ${badPass.status}, Nonexistent email: ${badEmail.status}`)

  // 8. Access to /api/auth/me without a token
  console.log('\n--- 8. Access /api/auth/me without a Token ---')
  const noToken = await request('/auth/me')
  const noTokenPassed =
    noToken.status === 401 &&
    noToken.data?.message?.includes('Missing or invalid Authorization header')
  record('8. Access to /api/auth/me without a token returns 401', noTokenPassed, `Status: ${noToken.status}, Message: ${noToken.data?.message}`)

  // 9. Access to /api/auth/me with a valid token
  console.log('\n--- 9. Access /api/auth/me with a Valid Token ---')
  const validMe = await request('/auth/me', {
    headers: { Authorization: `Bearer ${donorToken}` },
  })
  const validMePassed =
    validMe.status === 200 &&
    validMe.data?.user &&
    validMe.data.user.email === donorEmail &&
    (validMe.data.user.uid === donorId || validMe.data.user.id === donorId) &&
    !validMe.data.user.password
  record('9. Access to /api/auth/me with a valid token returns 200', validMePassed, `Status: ${validMe.status}, Email: ${validMe.data?.user?.email}`)

  // 10. Session restoration simulation
  console.log('\n--- 10. Session Restoration using Stored Token ---')
  const restoreMe = await request('/auth/me', {
    headers: { Authorization: `Bearer ${hospitalToken}` },
  })
  const restorePassed =
    restoreMe.status === 200 &&
    restoreMe.data?.user &&
    restoreMe.data.user.email === hospitalEmail &&
    restoreMe.data.user.role === 'hospital'
  record('10. Session restoration after refresh (validates token against DB)', restorePassed, `Hospital: ${restoreMe.data?.user?.hospitalName}`)

  // 11. Logout
  console.log('\n--- 11. Logout ---')
  const logout = await request('/auth/logout', { method: 'POST' })
  const logoutPassed = logout.status === 200 && logout.data?.success === true
  record('11. Logout endpoint (/api/auth/logout)', logoutPassed, `Status: ${logout.status}, Message: ${logout.data?.message}`)

  // 12. Creation and retrieval of a blood request
  console.log('\n--- 12. Creation and Retrieval of Blood Request ---')
  const createReq = await request('/requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hospitalToken}` },
    body: {
      bloodGroup: 'O+',
      unitsRequired: 3,
      urgency: 'high',
      city: 'Bengaluru',
      latitude: 12.9299,
      longitude: 77.5824,
      searchRadiusKm: 15,
    },
  })
  const createdData = createReq.data?.data
  bloodRequestId = createdData?.id || createdData?._id
  const createPassed =
    createReq.status === 201 &&
    createdData &&
    createdData.bloodGroup === 'O+' &&
    createdData.unitsRequired === 3 &&
    createdData.status === 'pending' &&
    !!bloodRequestId
  record('12a. Blood request creation (POST /api/requests)', createPassed, `Status: ${createReq.status}, Request ID: ${bloodRequestId}`)

  // Retrieve request by ID
  const getReq = await request(`/requests/${bloodRequestId}`, {
    headers: { Authorization: `Bearer ${hospitalToken}` },
  })
  const getReqData = getReq.data?.data
  const getReqPassed =
    getReq.status === 200 &&
    getReqData &&
    (getReqData.id === bloodRequestId || getReqData._id === bloodRequestId) &&
    getReqData.bloodGroup === 'O+'
  record('12b. Blood request retrieval by ID (GET /api/requests/:id)', getReqPassed, `Status: ${getReq.status}, Blood Group: ${getReqData?.bloodGroup}`)

  // Retrieve open requests
  const openReqs = await request('/requests/open')
  const openList = openReqs.data?.data || []
  const openPassed =
    openReqs.status === 200 &&
    Array.isArray(openList) &&
    openList.some((r) => r.id === bloodRequestId || r._id === bloodRequestId)
  record('12c. Blood request present in open requests (GET /api/requests/open)', openPassed, `Open requests count: ${openList.length}`)

  // Matching donors query
  const matchRes = await request(`/requests/${bloodRequestId}/matching-donors`, {
    headers: { Authorization: `Bearer ${hospitalToken}` },
  })
  const matches = Array.isArray(matchRes.data) ? matchRes.data : matchRes.data?.data || []
  const matchPassed = matchRes.status === 200 && Array.isArray(matches)
  record('12d. Matching donors query for request (GET /api/requests/:id/matching-donors)', matchPassed, `Matches found: ${matches.length}`)

  console.log('\n===============================================================')
  console.log('SUMMARY OF RESULTS (Steps 1 to 12):')
  const allPassed = results.every((r) => r.passed)
  console.log(`Passed: ${results.filter((r) => r.passed).length} / ${results.length}`)
  console.log(`Status: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}`)
  console.log('===============================================================')

  if (!allPassed) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
