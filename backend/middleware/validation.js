const { body, validationResult } = require('express-validator');
const { BLOOD_GROUPS } = require('../utils/bloodCompatibility');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map((err) => err.msg).join('. '),
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Validates an Indian mobile number.
 * Accepts format "+91 XXXXXXXXXX", "+91XXXXXXXXXX", or "XXXXXXXXXX" where X is a 10-digit number starting with 6-9.
 */
const validateIndianPhoneField = (field = 'phone') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((value) => {
      const raw = String(value || '').trim();
      // Remove +91 prefix and formatting characters (spaces, hyphens)
      const afterCode = raw.replace(/^\+91\s*/, '');
      const digitsOnly = afterCode.replace(/\D/g, '');

      // Check for non-numeric characters (alphabets, symbols)
      if (/\D/.test(afterCode.replace(/[\s\-]/g, ''))) {
        throw new Error('Phone number can only contain numeric digits after the country code.');
      }

      // Check length: exactly 10 digits
      if (digitsOnly.length < 10) {
        throw new Error(`Phone number must be exactly 10 digits (currently ${digitsOnly.length}/10).`);
      }
      if (digitsOnly.length > 10) {
        throw new Error('Phone number cannot exceed 10 digits.');
      }

      // Indian mobile numbers start with 6, 7, 8, or 9
      if (!/^[6-9]/.test(digitsOnly)) {
        throw new Error('Indian mobile number must start with 6, 7, 8, or 9.');
      }

      return true;
    });

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['donor', 'hospital', 'admin'])
    .withMessage('Role must be donor, hospital, or admin'),
  validateIndianPhoneField('phone'),
  body('city')
    .notEmpty()
    .withMessage('City is required'),
  validateRequest,
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateRequest,
];

const bloodRequestValidation = [
  body('bloodGroup')
    .isIn(BLOOD_GROUPS)
    .withMessage(`Blood group must be one of: ${BLOOD_GROUPS.join(', ')}`),
  body('units')
    .isInt({ min: 1, max: 100 })
    .withMessage('Units must be an integer between 1 and 100'),
  body('urgency')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Urgency must be low, medium, or high'),
  body('city')
    .notEmpty()
    .withMessage('City is required'),
  validateRequest,
];

module.exports = {
  validateRequest,
  validateIndianPhoneField,
  registerValidation,
  loginValidation,
  bloodRequestValidation,
};
