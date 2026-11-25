// ---------------------------------------------------------------------------
// Blood request routes
//   POST   /requests
//   GET    /requests/hospital/:hospitalId
//   GET    /requests/open
//   GET    /requests/:id
//   PUT    /requests/:id
//   DELETE /requests/:id
//   GET    /requests/:id/matching-donors
// ---------------------------------------------------------------------------
const express = require('express')
const BloodRequest = require('../models/BloodRequest')
const DonorResponse = require('../models/DonorResponse')
const User = require('../models/User')
const { authenticate, requireRole } = require('../middleware/auth')
const { validate, required } = require('../utils/validate')

const router = express.Router()

const REQUEST_UPDATE_FIELDS = [
  'bloodGroup', 'unitsRequired', 'city', 'latitude', 'longitude',
  'searchRadiusKm', 'urgency', 'requiredBy', 'status',
]

// Donor -> recipients the donor can give to (red-cell compatibility).
// Mirrors src/lib/blood.js in the frontend.
const CAN_DONATE_TO = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
}

const haversineKm = (lat1, lon1, lat2, lon2) => {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || Number.isNaN(Number(v)))) {
    return null
  }
  const toRad = (deg) => (Number(deg) * Math.PI) / 180
  const R = 6371 // earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10
}

const publicRequest = (request) => {
  const obj = request.toObject ? request.toObject() : request
  delete obj.__v
  obj.id = obj._id ? obj._id.toString() : obj.id
  obj.uid = obj.id
  return obj
}

// ----- Create --------------------------------------------------------------

router.post('/', authenticate, requireRole('hospital'), async (req, res, next) => {
  try {
    const errors = validate(req.body, {
      bloodGroup: [required()],
      unitsRequired: [required()],
    })
    if (Object.keys(errors).length) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid request data',
        details: errors,
      })
    }

    const data = { ...req.body }
    data.hospitalId = req.user._id
    data.hospitalName = req.user.hospitalName || req.user.name || 'Hospital'
    if (data.unitsRequired !== undefined) data.unitsRequired = Number(data.unitsRequired)
    if (data.latitude !== undefined) data.latitude = Number(data.latitude)
    if (data.longitude !== undefined) data.longitude = Number(data.longitude)
    if (data.searchRadiusKm !== undefined) data.searchRadiusKm = Number(data.searchRadiusKm)

    const request = await BloodRequest.create(data)
    return res.status(201).json({ data: publicRequest(request) })
  } catch (err) {
    next(err)
  }
})

// ----- Read ----------------------------------------------------------------

router.get('/hospital/:hospitalId', authenticate, async (req, res, next) => {
  try {
    const requests = await BloodRequest.find({ hospitalId: req.params.hospitalId })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ data: requests.map(publicRequest) })
  } catch (err) {
    next(err)
  }
})

router.get('/open', async (_req, res, next) => {
  try {
    const requests = await BloodRequest.find({
      status: { $nin: ['completed', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ data: requests.map(publicRequest) })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id).lean()
    if (!request) {
      return res.status(404).json({ error: 'Not found', message: 'Blood request not found' })
    }
    res.json({ data: publicRequest(request) })
  } catch (err) {
    next(err)
  }
})

// ----- Update --------------------------------------------------------------

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
    if (!request) {
      return res.status(404).json({ error: 'Not found', message: 'Blood request not found' })
    }
    const isOwner = req.user._id.toString() === request.hospitalId.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own requests',
      })
    }

    const patch = {}
    for (const field of REQUEST_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) patch[field] = req.body[field]
    }
    if (patch.unitsRequired !== undefined) patch.unitsRequired = Number(patch.unitsRequired)
    if (patch.latitude !== undefined) patch.latitude = Number(patch.latitude)
    if (patch.longitude !== undefined) patch.longitude = Number(patch.longitude)
    if (patch.searchRadiusKm !== undefined) patch.searchRadiusKm = Number(patch.searchRadiusKm)

    Object.assign(request, patch)
    await request.save()
    res.json({ data: publicRequest(request) })
  } catch (err) {
    next(err)
  }
})

// ----- Delete --------------------------------------------------------------

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
    if (!request) {
      return res.status(404).json({ error: 'Not found', message: 'Blood request not found' })
    }
    const isOwner = req.user._id.toString() === request.hospitalId.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own requests',
      })
    }

    await BloodRequest.findByIdAndDelete(req.params.id)
    await DonorResponse.deleteMany({ requestId: req.params.id })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// ----- Matching donors -----------------------------------------------------

router.get('/:id/matching-donors', authenticate, async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id).lean()
    if (!request) {
      return res.status(404).json({ error: 'Not found', message: 'Blood request not found' })
    }

    const radiusKm =
      req.query.radiusKm != null
        ? Number(req.query.radiusKm)
        : request.searchRadiusKm != null
          ? Number(request.searchRadiusKm)
          : null
    const availableOnly = req.query.availableOnly !== 'false'
    const verifiedOnly = req.query.verifiedOnly !== 'false'
    const search = String(req.query.search || '').toLowerCase()

    const allowedGroups = Object.keys(CAN_DONATE_TO).filter(
      (g) => CAN_DONATE_TO[g].includes(request.bloodGroup),
    )

    const filter = { role: 'donor', isActive: true }
    if (allowedGroups.length) filter.bloodGroup = { $in: allowedGroups }
    if (availableOnly) filter.available = true
    if (verifiedOnly) filter.verified = true

    const donors = await User.find(filter).select('-password').lean()

    let results = donors.map((d) => ({
      ...publicUserHelper(d),
      distanceKm: haversineKm(request.latitude, request.longitude, d.latitude, d.longitude),
    }))

    results = results.filter(
      (d) => radiusKm == null || (d.distanceKm != null && d.distanceKm <= radiusKm),
    )

    if (search) {
      results = results.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(search) ||
          (d.city || '').toLowerCase().includes(search) ||
          (d.bloodGroup || '').toLowerCase().includes(search),
      )
    }

    results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    res.json(results)
  } catch (err) {
    next(err)
  }
})

function publicUserHelper(user) {
  const obj = { ...user }
  delete obj.password
  delete obj.__v
  obj.uid = obj._id ? obj._id.toString() : obj.uid
  delete obj._id
  return obj
}

module.exports = router
