// ---------------------------------------------------------------------------
// Auth routes: POST /auth/register, /auth/login, /auth/logout, GET /auth/me
// ---------------------------------------------------------------------------
const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { authenticate } = require('../middleware/auth')
const { validate, required, minLength, isOneOf, email } = require('../utils/validate')

const router = express.Router()

const signToken = (user) =>
  jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  )

const publicUser = (user) => {
  const obj = user.toJSON ? user.toJSON() : user
  return obj
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const errors = validate(req.body, {
      email: [required(), email()],
      password: [required(), minLength(6)],
      role: [required(), isOneOf(['donor', 'hospital'], 'Role must be donor or hospital')],
    })
    if (Object.keys(errors).length) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid registration data',
        details: errors,
      })
    }

    const { email, password, role, ...profile } = req.body
    const normalizedEmail = String(email).trim().toLowerCase()

    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email already exists',
      })
    }

    if (role === 'hospital' && !profile.name && profile.hospitalName) {
      profile.name = profile.hospitalName
    }

    const user = await User.create({
      email: normalizedEmail,
      password,
      role,
      ...profile,
    })
    const token = signToken(user)

    return res.status(201).json({ user: publicUser(user), token })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const errors = validate(req.body, {
      email: [required(), email()],
      password: [required()],
    })
    if (Object.keys(errors).length) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid login data',
        details: errors,
      })
    }

    const normalizedEmail = String(req.body.email).trim().toLowerCase()
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      })
    }

    const match = await user.comparePassword(req.body.password)
    if (!match) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      })
    }
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is deactivated',
      })
    }

    const token = signToken(user)
    return res.json({ user: publicUser(user), token })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/logout (stateless; client clears its token)
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out' })
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: publicUser(req.user) })
})

module.exports = router
