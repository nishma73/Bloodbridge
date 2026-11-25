// ---------------------------------------------------------------------------
// MongoDB Atlas connection (Mongoose)
// ---------------------------------------------------------------------------
const mongoose = require('mongoose')

let listenersAttached = false

const attachConnectionListeners = () => {
  if (listenersAttached) return
  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB Atlas connected')
  })
  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message)
  })
  mongoose.connection.on('disconnected', () => {
    console.log('[db] MongoDB disconnected')
  })
  listenersAttached = true
}

const connectDB = async () => {
  attachConnectionListeners()

  if (!process.env.MONGODB_URI) {
    const errorMsg = 'MONGODB_URI environment variable is missing in backend/.env'
    console.error(`[db] Fatal error: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })

    console.log(`[db] Successfully connected to database: ${mongoose.connection.name || 'bloodbridge'}`)
    return mongoose.connection
  } catch (err) {
    console.error('[db] MongoDB Atlas connection failed:', err.message)
    throw err
  }
}

module.exports = { connectDB }
