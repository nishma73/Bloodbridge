// ---------------------------------------------------------------------------
// Notification routes
//   GET    /notifications          (for the authenticated user)
//   PATCH  /notifications/:id/read
//   PATCH  /notifications/read-all
// ---------------------------------------------------------------------------
const express = require('express')
const Notification = require('../models/Notification')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

router.get('/', authenticate, async (req, res, next) => {
  try {
    const notes = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean()
    res.json({
      data: notes.map((n) => ({ ...n, id: n._id.toString() })),
    })
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const note = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true },
    )
    if (!note) {
      return res.status(404).json({ error: 'Not found', message: 'Notification not found' })
    }
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true },
    )
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router
