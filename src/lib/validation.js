/**
 * Validation utilities for BloodBridge.
 */

/**
 * Extracts numeric digits from an Indian phone number string, stripping +91 country code and non-digits.
 * @param {string} phone
 * @returns {string} up to 10 digits
 */
export function cleanPhoneDigits(phone) {
  if (!phone) return ''
  const str = String(phone).trim()
  const withoutCode = str.replace(/^\+91\s*/, '')
  return withoutCode.replace(/\D/g, '').slice(0, 10)
}

/**
 * Formats a 10-digit number with standard Indian international prefix "+91 ".
 * @param {string} digits
 * @returns {string}
 */
export function formatIndianPhoneNumber(digits) {
  const clean = cleanPhoneDigits(digits)
  return clean ? `+91 ${clean}` : ''
}

/**
 * Validates an Indian mobile phone number.
 * Criteria:
 * - Must not be empty.
 * - Must contain only digits.
 * - Must have exactly 10 digits after +91.
 * - Must start with 6, 7, 8, or 9 (standard DoT allocation for Indian mobile networks).
 * 
 * @param {string} phone
 * @returns {{ isValid: boolean, error: string, digits: string, formatted: string }}
 */
export function validateIndianPhoneNumber(phone) {
  if (!phone || String(phone).trim() === '') {
    return {
      isValid: false,
      error: 'Phone number is required.',
      digits: '',
      formatted: '',
    }
  }

  const raw = String(phone).trim()
  // Strip leading +91
  const afterCode = raw.replace(/^\+91\s*/, '')
  const digitsOnly = afterCode.replace(/\D/g, '')

  // If there were non-digit characters in afterCode
  if (/\D/.test(afterCode.replace(/[\s\-]/g, ''))) {
    return {
      isValid: false,
      error: 'Phone number can only contain numeric digits.',
      digits: digitsOnly,
      formatted: digitsOnly ? `+91 ${digitsOnly}` : '',
    }
  }

  if (digitsOnly.length === 0) {
    return {
      isValid: false,
      error: 'Phone number is required.',
      digits: '',
      formatted: '',
    }
  }

  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      error: `Phone number must be exactly 10 digits (currently ${digitsOnly.length}/10).`,
      digits: digitsOnly,
      formatted: `+91 ${digitsOnly}`,
    }
  }

  if (digitsOnly.length > 10) {
    return {
      isValid: false,
      error: 'Phone number cannot exceed 10 digits.',
      digits: digitsOnly.slice(0, 10),
      formatted: `+91 ${digitsOnly.slice(0, 10)}`,
    }
  }

  if (!/^[6-9]/.test(digitsOnly)) {
    return {
      isValid: false,
      error: 'Indian mobile number must start with 6, 7, 8, or 9.',
      digits: digitsOnly,
      formatted: `+91 ${digitsOnly}`,
    }
  }

  return {
    isValid: true,
    error: '',
    digits: digitsOnly,
    formatted: `+91 ${digitsOnly}`,
  }
}
