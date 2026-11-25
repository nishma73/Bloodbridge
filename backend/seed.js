// ---------------------------------------------------------------------------
// Seed script: demo donor, demo hospital and an admin user
// Run:  node seed.js   (after setting a real MONGODB_URI in backend/.env)
// ---------------------------------------------------------------------------
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./src/models/User')

async function main() {
  if (
    !process.env.MONGODB_URI ||
    process.env.MONGODB_URI.includes('<USERNAME>')
  ) {
    throw new Error(
      'Set a real MONGODB_URI in backend/.env before running the seed script.',
    )
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })

const demoPasswordHash = 'password123'
const adminPasswordHash = 'AdminBloodBridge!2026'  

  const users = [
    {
      email: 'demo-donor@bloodbridge.example',
      password: demoPasswordHash,
      role: 'donor',
      name: 'Demo Donor',
      bloodGroup: 'O+',
      phone: '+91 90000 00000',
      city: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
      available: true,
      verified: true,
    },
    {
      email: 'demo-hospital@bloodbridge.example',
      password: demoPasswordHash,
      role: 'hospital',
      hospitalName: 'Demo City Hospital',
      name: 'Demo City Hospital',
      phone: '+91 90000 00001',
      city: 'Bengaluru',
      latitude: 12.9352,
      longitude: 77.6245,
      verified: true,
    },
    {
      email: 'admin@bloodbridge.example',
      password: adminPasswordHash,
      role: 'admin',
      name: 'BloodBridge Admin',
      verified: true,
    },
  ]

  for (const data of users) {
    let user = await User.findOne({ email: data.email })
    if (!user) {
      await User.create(data)
      console.log('[seed] created', data.email, '(', data.role, ')')
    } else {
      console.log('[seed] exists ', data.email)
    }
  }

  await mongoose.disconnect()
  console.log('[seed] complete')
}

main().catch((err) => {
  console.error('[seed] error:', err.message)
  process.exit(1)
})
