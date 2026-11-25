// ---------------------------------------------------------------------------
// Centralized error handler - all errors finish as JSON
// ---------------------------------------------------------------------------
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500
  let error = err.error || 'Internal server error'
  let message = err.message || 'Internal server error'

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    status = 400
    error = 'Validation error'
    message = 'Invalid request data'
    const details = {}
    for (const [field, fieldErr] of Object.entries(err.errors)) {
      details[field] = fieldErr.message
    }
    return res.status(status).json({ error, message, details })
  }

  // Mongoose CastError (invalid ObjectId, wrong type, etc.)
  if (err.name === 'CastError') {
    status = 400
    error = 'Invalid ID'
    message = `Invalid ${err.path || 'value'}`
    return res.status(status).json({ error, message })
  }

  // Duplicate key (unique email, etc.)
  if (err.code === 11000) {
    status = 409
    error = 'Conflict'
    message = 'A record with this value already exists'
    return res.status(status).json({ error, message })
  }

  res.status(status).json({ error, message })
}

module.exports = errorHandler
