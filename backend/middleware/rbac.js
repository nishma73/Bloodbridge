const HospitalProfile = require('../models/HospitalProfile');

/**
 * Middleware to restrict access to specific roles.
 * @param  {...string} roles Allowed roles ('donor', 'hospital', 'admin')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized for this resource. Required role(s): ${roles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware ensuring a hospital has received verification from an administrator.
 */
const requireVerifiedHospital = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'hospital') {
      return res.status(403).json({
        success: false,
        message: 'Access restricted to hospital accounts.',
      });
    }

    const hospitalProfile = await HospitalProfile.findOne({ user: req.user._id });
    if (!hospitalProfile || !hospitalProfile.verified) {
      return res.status(403).json({
        success: false,
        message: 'Your hospital account is awaiting administrative verification. Blood request creation and direct matching are enabled once verified.',
        isAwaitingVerification: true,
      });
    }

    req.hospitalProfile = hospitalProfile;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  authorizeRoles,
  requireVerifiedHospital,
};
