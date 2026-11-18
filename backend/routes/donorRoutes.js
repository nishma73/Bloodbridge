const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  setAvailability,
  listDonors,
} = require('../controllers/donorController');
const { verifyToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// Public or authenticated list donors (filters by group, availability, etc.)
router.get('/', listDonors);

// Protected profile routes
router.get('/profile', verifyToken, getProfile);
router.get('/profile/:id', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/profile/:id', verifyToken, updateProfile);
router.patch('/availability', verifyToken, authorizeRoles('donor', 'admin'), setAvailability);

module.exports = router;
