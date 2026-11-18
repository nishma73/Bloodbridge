const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  listHospitals,
} = require('../controllers/hospitalController');
const { verifyToken } = require('../middleware/auth');

router.get('/', listHospitals);
router.get('/profile', verifyToken, getProfile);
router.get('/profile/:id', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/profile/:id', verifyToken, updateProfile);

module.exports = router;
