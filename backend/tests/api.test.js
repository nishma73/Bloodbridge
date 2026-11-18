process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_12345';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../server');
const { connectDB, disconnectDB } = require('../config/db');
const { seedDatabase } = require('../utils/seedData');

test.before(async () => {
  await connectDB();
  await seedDatabase();
});

test.after(async () => {
  await disconnectDB();
});

test('GET /api/health returns 200 and online status', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'online');
});

test('POST /api/auth/login logs in seeded hospital and returns token', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hospital@example.com', password: 'password123' });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token);
  assert.equal(res.body.role, 'hospital');
});

test('POST /api/auth/login logs in seeded donor (Aarav, O-)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'aarav@example.com', password: 'password123' });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.role, 'donor');
  assert.equal(res.body.bloodGroup, 'O-');
});

test('POST /api/auth/login logs in administrator', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@bloodbridge.org', password: 'password123' });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.role, 'admin');
});

test('POST /api/auth/register registers new donor with hashed password', async () => {
  const uniqueEmail = `testdonor_${Date.now()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: uniqueEmail,
      password: 'mypassword123',
      role: 'donor',
      name: 'Test New Donor',
      bloodGroup: 'B+',
      phone: '+91 99999 11111',
      city: 'Bengaluru',
      age: 26,
      gender: 'male',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token);
  assert.equal(res.body.bloodGroup, 'B+');
});

test('POST /api/auth/register rejects phone number containing alphabets or special characters', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `invalid_phone_alpha_${Date.now()}@example.com`,
      password: 'password123',
      role: 'donor',
      name: 'Invalid Phone Donor',
      bloodGroup: 'O+',
      phone: '98765abcde',
      city: 'Bengaluru',
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /only contain numeric digits/i);
});

test('POST /api/auth/register rejects phone number with fewer than 10 digits', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `short_phone_${Date.now()}@example.com`,
      password: 'password123',
      role: 'donor',
      name: 'Short Phone Donor',
      bloodGroup: 'O+',
      phone: '98765',
      city: 'Bengaluru',
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /must be exactly 10 digits/i);
});

test('POST /api/auth/register rejects phone number with more than 10 digits', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `long_phone_${Date.now()}@example.com`,
      password: 'password123',
      role: 'donor',
      name: 'Long Phone Donor',
      bloodGroup: 'O+',
      phone: '9876543210123',
      city: 'Bengaluru',
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /cannot exceed 10 digits/i);
});

test('POST /api/auth/register rejects Indian phone number not starting with 6, 7, 8, or 9', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `bad_prefix_${Date.now()}@example.com`,
      password: 'password123',
      role: 'donor',
      name: 'Bad Prefix Donor',
      bloodGroup: 'O+',
      phone: '1234567890',
      city: 'Bengaluru',
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /start with 6, 7, 8, or 9/i);
});

test('POST /api/auth/register accepts hospital registration with valid 10-digit phone', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `hospital_valid_${Date.now()}@example.com`,
      password: 'password123',
      role: 'hospital',
      hospitalName: 'Care Life Hospital',
      registrationNumber: 'KA-HOSP-7788',
      contactPerson: 'Dr. John Doe',
      address: '12 MG Road, Bengaluru',
      phone: '+91 9876543210',
      city: 'Bengaluru',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.phone, '+91 9876543210');
});

test('Admin can view platform statistics and verify unverified hospital', async () => {
  // 1. Login as Admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@bloodbridge.org', password: 'password123' });
  const adminToken = adminRes.body.token;

  // 2. Fetch Stats
  const statsRes = await request(app)
    .get('/api/admin/stats')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(statsRes.status, 200);
  assert.ok(statsRes.body.stats.totalUsers > 0);

  // 3. List Hospitals
  const hospListRes = await request(app)
    .get('/api/admin/hospitals')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(hospListRes.status, 200);

  const pendingHospital = hospListRes.body.hospitals.find((h) => h.verified === false);
  assert.ok(pendingHospital, 'Should have at least one unverified hospital in seed data');

  // 4. Verify Hospital
  const verifyRes = await request(app)
    .put(`/api/admin/hospitals/${pendingHospital._id}/verify`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ verified: true, notes: 'Hospital license verified by admin.' });

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.hospital.verified, true);
});

test('Hospital can create a blood request and find matching donors', async () => {
  // 1. Hospital login
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hospital@example.com', password: 'password123' });
  const hospitalToken = loginRes.body.token;

  // 2. Create blood request for A+ blood
  const createReqRes = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${hospitalToken}`)
    .send({
      bloodGroup: 'A+',
      units: 2,
      urgency: 'high',
      city: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
      radiusKm: 30,
      notes: 'Urgent surgery requirement',
    });

  assert.equal(createReqRes.status, 201);
  const requestId = createReqRes.body.id;
  assert.ok(requestId);

  // 3. Match donors for this request
  const matchRes = await request(app)
    .get(`/api/requests/${requestId}/matching-donors?availableOnly=true`)
    .set('Authorization', `Bearer ${hospitalToken}`);

  assert.equal(matchRes.status, 200);
  assert.ok(Array.isArray(matchRes.body.matches));
  assert.ok(matchRes.body.matches.length > 0);
  assert.ok(matchRes.body.disclaimer.includes('transfusion'));

  // Compatible donors for A+ include: O-, O+, A-, A+
  const allowedGroups = ['O-', 'O+', 'A-', 'A+'];
  matchRes.body.matches.forEach((donor) => {
    assert.ok(
      allowedGroups.includes(donor.bloodGroup),
      `Matched donor ${donor.name} has group ${donor.bloodGroup} which should be compatible with A+`
    );
  });
});

test('End-to-end request dispatch, donor response, and completion', async () => {
  // Hospital login
  const hospLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hospital@example.com', password: 'password123' });
  const hospToken = hospLogin.body.token;

  // Donor login (Aarav, O-)
  const donorLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'aarav@example.com', password: 'password123' });
  const donorToken = donorLogin.body.token;
  const donorId = donorLogin.body.uid;

  // 1. Hospital creates request for O-
  const reqRes = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${hospToken}`)
    .send({
      bloodGroup: 'O-',
      units: 1,
      urgency: 'high',
      city: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
    });
  const reqId = reqRes.body.id;

  // 2. Hospital sends request to Aarav
  const sendRes = await request(app)
    .post('/api/responses/send')
    .set('Authorization', `Bearer ${hospToken}`)
    .send({
      requestId: reqId,
      donorIds: [donorId],
      message: 'Urgent emergency ICU request',
    });
  assert.equal(sendRes.status, 201);
  const responseId = sendRes.body.data[0].id;

  // 3. Donor accepts request
  const acceptRes = await request(app)
    .post(`/api/responses/${responseId}/respond`)
    .set('Authorization', `Bearer ${donorToken}`)
    .send({ status: 'accepted', message: 'I can come in 1 hour' });
  assert.equal(acceptRes.status, 200);
  assert.equal(acceptRes.body.status, 'accepted');

  // 4. Hospital marks completed
  const completeRes = await request(app)
    .post(`/api/responses/${responseId}/complete`)
    .set('Authorization', `Bearer ${hospToken}`);
  assert.equal(completeRes.status, 200);
  assert.equal(completeRes.body.status, 'completed');
});
