// ---------------------------------------------------------------------------
// User profile routes
//   GET    /donors/profile/:id     (any profile)
//   GET    /hospitals/profile/:id  (hospital profiles)
//   PUT    /donors/profile/:id
//   PUT    /hospitals/profile/:id
//   PATCH  /donors/availability    (authenticated user)
//   GET    /donors                 (filtered public donor list)
// ---------------------------------------------------------------------------
const express = require('express')
const User = require('../models/User')
const { authenticate } = require('../middleware/auth')
const { validate, required } = require('../utils/validate')

const router = express.Router()

const DONOR_UPDATE_FIELDS = [
  'name', 'phone', 'city', 'latitude', 'longitude', 'bloodGroup', 'available',
]
const HOSPITAL_UPDATE_FIELDS = [
  'hospitalName', 'registrationNumber', 'contactPerson', 'address',
  'phone', 'city', 'latitude', 'longitude',
]

const publicUser = (user) => {
  const obj = user.toObject ? user.toObject() : user
  delete obj.password
  delete obj.__v
  obj.uid = obj._id ? obj._id.toString() : obj.uid
  obj.id = obj.uid
  return obj
}

// ----- Profile fetch -------------------------------------------------------

router.get('/donors/profile/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean()
    if (!user || !['donor', 'hospital', 'admin'].includes(user.role)) {
      return res.status(404).json({ error: 'Not found', message: 'Profile not found' })
    }
    res.json({ data: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

router.get('/hospitals/profile/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean()
    if (!user || user.role !== 'hospital') {
      return res.status(404).json({ error: 'Not found', message: 'Hospital profile not found' })
    }
    res.json({ data: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

// ----- Profile update ------------------------------------------------------

function updateProfile(req, res, next) {
  return User.findById(req.params.id)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: 'Not found', message: 'Profile not found' })
      }
      const isOwn = req.user && req.user._id.toString() === user._id.toString()
      const isAdmin = req.user && req.user.role === 'admin'
      if (!isOwn && !isAdmin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only update your own profile',
        })
      }

      const fields = user.role === 'hospital' ? HOSPITAL_UPDATE_FIELDS : DONOR_UPDATE_FIELDS
      const patch = {}
      for (const field of fields) {
        if (req.body[field] !== undefined) patch[field] = req.body[field]
      }
      if (patch.latitude !== undefined) patch.latitude = Number(patch.latitude)
      if (patch.longitude !== undefined) patch.longitude = Number(patch.longitude)

      Object.assign(user, patch)
      return user.save()
    })
    .then((user) => res.json({ data: publicUser(user) }))
    .catch(next)
}

router.put('/donors/profile/:id', authenticate, updateProfile)
router.put('/hospitals/profile/:id', authenticate, updateProfile)

// ----- Availability --------------------------------------------------------

router.patch('/donors/availability', authenticate, async (req, res, next) => {
  try {
    // Only donors can update availability
    if (req.user.role !== 'donor') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only donors can update their availability',
      })
    }

    const { available } = req.body

    if (typeof available !== 'boolean') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'available must be a boolean',
      })
    }

    req.user.available = available
    await req.user.save()

    res.json({ data: publicUser(req.user) })
  } catch (err) {
    next(err)
  }
})

// ----- Public donor list ---------------------------------------------------

router.get('/donors', async (req, res, next) => {
  try {
    const { bloodGroup, availableOnly, verifiedOnly, search, city } = req.query
    const filter = { role: 'donor', isActive: true }

    if (bloodGroup) filter.bloodGroup = bloodGroup
    if (availableOnly === 'true') filter.available = true
    if (verifiedOnly === 'true') filter.verified = true
    if (city) filter.city = new RegExp(String(city), 'i')

    const users = await User.find(filter)
      .select('-password')
      .lean()
      .sort({ createdAt: -1 })

    let donors = users.map(publicUser)

    if (search) {
      const q = String(search).toLowerCase()
      donors = donors.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(q) ||
          (d.city || '').toLowerCase().includes(q) ||
          (d.bloodGroup || '').toLowerCase().includes(q),
      )
    }

    res.json({ data: donors })
  } catch (err) {
    next(err)
  }
})

module.exports = router
