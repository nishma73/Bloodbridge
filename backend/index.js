// ---------------------------------------------------------------------------
// BloodBridge backend - Express + MongoDB Atlas (Mongoose)
// ---------------------------------------------------------------------------
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const { connectDB } = require('./src/config/db')
const errorHandler = require('./src/middleware/errorHandler')

const authRoutes = require('./src/routes/auth')
const usersRoutes = require('./src/routes/users')
const requestsRoutes = require('./src/routes/requests')
const responsesRoutes = require('./src/routes/responses')
const notificationsRoutes = require('./src/routes/notifications')
const adminRoutes = require('./src/routes/admin')

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  const ready = mongoose.connection.readyState
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
  const isConnected = ready === 1
  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'ok' : 'degraded',
    db: states[ready] || 'unknown',
    database: isConnected ? mongoose.connection.name : undefined,
    time: new Date().toISOString(),
  })
})

// Authentication endpoints: available at both /api/auth/* and /api/* for compatibility
app.use('/api/auth', authRoutes)
app.use('/api', authRoutes)

// User profile endpoints: /api/donors/*, /api/hospitals/*
app.use('/api', usersRoutes)

// Blood request endpoints: /api/requests/*
app.use('/api/requests', requestsRoutes)

// Donor response endpoints: /api/responses/*
app.use('/api/responses', responsesRoutes)

// Notification endpoints: /api/notifications/*
app.use('/api/notifications', notificationsRoutes)

// Admin management endpoints: /api/admin/* (protected by authenticate + requireRole('admin'))
app.use('/api/admin', adminRoutes)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found', message: 'API route not found' })
})

app.use(errorHandler)

const PORT = Number(process.env.PORT) || 5000

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] BloodBridge backend listening on http://localhost:${PORT}`)
      console.log(`[server] API base: http://localhost:${PORT}/api`)
    })
  })
  .catch((err) => {
    console.error('[server] Fatal: Database connection could not be established:', err.message)
    process.exit(1)
  })

process.on('unhandledRejection', (err) => {
  console.error('[server] unhandled rejection:', err.message)
})
