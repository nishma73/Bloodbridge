// ---------------------------------------------------------------------------
// Donor response routes
//   POST   /responses/send
//   GET    /responses/request/:requestId
//   GET    /responses/donor/:donorId
//   POST   /responses/:responseId/respond
//   POST   /responses/:responseId/complete
// ---------------------------------------------------------------------------
const express = require('express')
const BloodRequest = require('../models/BloodRequest')
const DonorResponse = require('../models/DonorResponse')
const Notification = require('../models/Notification')
const User = require('../models/User')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

const publicResponse = (response) => {
  const obj = response.toObject ? response.toObject() : response
  delete obj.__v
  obj.uid = obj._id ? obj._id.toString() : obj.uid
  obj.id = obj.uid
  return obj
}

// ----- Send responses to donors --------------------------------------------

router.post('/send', authenticate, requireRole('hospital'), async (req, res, next) => {
  try {
    const { requestId, donorIds, message = '' } = req.body

    if (!requestId || !Array.isArray(donorIds) || donorIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'requestId and donorIds are required',
      })
    }

    const request = await BloodRequest.findById(requestId)
    if (!request) {
      return res.status(404).json({ error: 'Not found', message: 'Blood request not found' })
    }

    const isOwner = req.user._id.toString() === request.hospitalId.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the requesting hospital can send responses',
      })
    }

    const created = []
    for (const donorId of donorIds) {
      const donor = await User.findById(donorId)
      if (!donor || donor.role !== 'donor') continue

      const already = await DonorResponse.findOne({ requestId, donorId })
      if (already) continue

      const response = await DonorResponse.create({
        requestId,
        donorId,
        hospitalId: request.hospitalId,
        donorName: donor.name,
        donorBloodGroup: donor.bloodGroup,
        donorPhone: donor.phone,
        hospitalName: request.hospitalName,
        requestBloodGroup: request.bloodGroup,
        status: 'sent',
        message,
      })
      created.push(response)

      await Notification.create({
        userId: donorId,
        title: 'New donation request',
        body: `${request.hospitalName} needs ${request.bloodGroup} blood${
          request.urgency === 'high' ? ' urgently' : ''
        }.`,
        link: '/donor',
      })
    }

    if (created.length) {
      request.status = 'sent'
      request.updatedAt = new Date()
      await request.save()
    }

    res.json({ data: created.map(publicResponse) })
  } catch (err) {
    next(err)
  }
})

// ----- Lists ---------------------------------------------------------------

router.get('/request/:requestId', authenticate, async (req, res, next) => {
  try {
    const responses = await DonorResponse.find({ requestId: req.params.requestId })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ data: responses.map(publicResponse) })
  } catch (err) {
    next(err)
  }
})

router.get('/donor/:donorId', authenticate, async (req, res, next) => {
  try {
    const responses = await DonorResponse.find({ donorId: req.params.donorId })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ data: responses.map(publicResponse) })
  } catch (err) {
    next(err)
  }
})

// ----- Respond / complete --------------------------------------------------

router.post('/:responseId/respond', authenticate, async (req, res, next) => {
  try {
    const { status, message = '' } = req.body
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'status must be accepted or declined',
      })
    }

    const response = await DonorResponse.findById(req.params.responseId)
    if (!response) {
      return res.status(404).json({ error: 'Not found', message: 'Response not found' })
    }
    if (response.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the donor can respond to this request',
      })
    }

    response.status = status
    response.message = message
    response.respondedAt = new Date()
    await response.save()

    const request = await BloodRequest.findById(response.requestId)
    if (request) {
      if (status === 'accepted') {
        request.status = 'accepted'
      } else if (status === 'declined') {
        const responses = await DonorResponse.find({ requestId: request._id })
        const allDeclined = responses.every((r) => r.status === 'declined')
        if (allDeclined) request.status = 'declined'
      }
      request.updatedAt = new Date()
      await request.save()
    }

    await Notification.create({
      userId: response.hospitalId,
      title: `Donor ${status} your request`,
      body: `${response.donorName} (${response.donorBloodGroup}) ${status} the request for ${response.requestBloodGroup} blood.`,
      link: '/hospital',
    })

    res.json({ data: publicResponse(response) })
  } catch (err) {
    next(err)
  }
})

router.post('/:responseId/complete', authenticate, async (req, res, next) => {
  try {
    const response = await DonorResponse.findById(req.params.responseId)
    if (!response) {
      return res.status(404).json({ error: 'Not found', message: 'Response not found' })
    }

    const isOwner = req.user._id.toString() === response.hospitalId.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the hospital can complete this response',
      })
    }

    response.status = 'completed'
    response.respondedAt = new Date()
    await response.save()

    const request = await BloodRequest.findById(response.requestId)
    if (request) {
      request.status = 'completed'
      request.updatedAt = new Date()
      await request.save()
    }

    await Notification.create({
      userId: response.donorId,
      title: 'Donation confirmed',
      body: `${response.hospitalName} marked your donation as completed. Thank you!`,
      link: '/donor',
    })

    res.json({ data: publicResponse(response) })
  } catch (err) {
    next(err)
  }
})

module.exports = router
