// ---------------------------------------------------------------------------
// Small, dependency-free request validation helper
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isEmail = (value) => EMAIL_REGEX.test(String(value))

/**
 * @param {object} body     request body
 * @param {object} rules    { field: [checkFn, ...] }
 *                         each checkFn returns null when valid, or an error message
 * @returns {object}        { field: message } for failing fields, {} when valid
 */
const validate = (body, rules) => {
  const errors = {}
  for (const [field, checks] of Object.entries(rules)) {
    for (const check of checks) {
      const message = check(body[field], body)
      if (message) {
        errors[field] = message
        break
      }
    }
  }
  return errors
}

const required = (message = 'Field is required') => (value) =>
  value === undefined || value === null || value === '' ? message : null

const minLength = (length, message) => (value) =>
  String(value).length < length ? (message || `Must be at least ${length} characters`) : null

const isOneOf = (values, message) => (value) =>
  !values.includes(value) ? (message || `Must be one of: ${values.join(', ')}`) : null

const email = (message) => (value) => (!isEmail(value) ? (message || 'Invalid email address') : null)

module.exports = { validate, required, minLength, isOneOf, email }
