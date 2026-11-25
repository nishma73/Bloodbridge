// ---------------------------------------------------------------------------
// Admin routes (role: admin required)
//   GET    /admin/stats
//   GET    /admin/donors
//   GET    /admin/hospitals
//   PUT    /admin/hospitals/:id/verify
//   GET    /admin/requests
//   PATCH  /admin/users/:id/status
// ---------------------------------------------------------------------------
const express = require('express')
const User = require('../models/User')
const BloodRequest = require('../models/BloodRequest')
const DonorResponse = require('../models/DonorResponse')
const Notification = require('../models/Notification')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate, requireRole('admin'))

const publicUser = (user) => {
  const obj = user.toObject ? user.toObject() : user
  delete obj.password
  delete obj.__v
  obj.uid = obj._id ? obj._id.toString() : obj.uid
  obj.id = obj.uid
  return obj
}

// ----- Stats ---------------------------------------------------------------

router.get('/stats', async (_req, res, next) => {
  try {
    const [users, donors, hospitals, requests, responses, unread] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'donor' }),
        User.countDocuments({ role: 'hospital' }),
        BloodRequest.countDocuments(),
        DonorResponse.countDocuments(),
        Notification.countDocuments({ read: false }),
      ])

    const requestsByStatus = await BloodRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])

    res.json({
      stats: {
        users,
        donors,
        hospitals,
        requests,
        responses,
        unreadNotifications: unread,
        requestsByStatus,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ----- Lists ---------------------------------------------------------------

router.get('/donors', async (_req, res, next) => {
  try {
    const donors = await User.find({ role: 'donor' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean()
    res.json({ donors: donors.map(publicUser) })
  } catch (err) {
    next(err)
  }
})

router.get('/hospitals', async (_req, res, next) => {
  try {
    const hospitals = await User.find({ role: 'hospital' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean()
    res.json({ hospitals: hospitals.map(publicUser) })
  } catch (err) {
    next(err)
  }
})

router.get('/requests', async (_req, res, next) => {
  try {
    const requests = await BloodRequest.find()
      .sort({ createdAt: -1 })
      .lean()
    res.json({ requests: requests.map((r) => ({ ...r, id: r._id.toString(), uid: r._id.toString(), __v: undefined })) })
  } catch (err) {
    next(err)
  }
})

// ----- Verify hospital -----------------------------------------------------

router.put('/hospitals/:id/verify', async (req, res, next) => {
  try {
    const { verified, notes = '' } = req.body
    if (typeof verified !== 'boolean') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'verified must be a boolean',
      })
    }

    const hospital = await User.findById(req.params.id)
    if (!hospital || hospital.role !== 'hospital') {
      return res.status(404).json({ error: 'Not found', message: 'Hospital not found' })
    }

    hospital.verified = verified
    hospital.verificationNotes = notes
    await hospital.save()

    res.json({ hospital: publicUser(hospital) })
  } catch (err) {
    next(err)
  }
})

// ----- User status ---------------------------------------------------------

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { isActive, isReported } = req.body

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Not found', message: 'User not found' })
    }

    if (typeof isActive === 'boolean') user.isActive = isActive
    if (typeof isReported === 'boolean') user.isReported = isReported

    await user.save()
    res.json({ user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

module.exports = router
