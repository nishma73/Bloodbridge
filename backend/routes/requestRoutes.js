const express = require('express');
const router = express.Router();
const {
  createRequest,
  listHospitalRequests,
  listOpenRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  getMatchingDonorsForRequest,
} = require('../controllers/requestController');
const { verifyToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { bloodRequestValidation } = require('../middleware/validation');

// Public or donor/hospital accessible open requests
router.get('/open', listOpenRequests);

// Hospital-specific requests
router.get('/hospital/:hospitalId?', verifyToken, listHospitalRequests);

// Specific request matching (before general /:id)
router.get('/:id/matching-donors', verifyToken, authorizeRoles('hospital', 'admin'), getMatchingDonorsForRequest);

// Specific request details
router.get('/:id', getRequestById);

// Create, update, delete
router.post('/', verifyToken, authorizeRoles('hospital', 'admin'), bloodRequestValidation, createRequest);
router.put('/:id', verifyToken, updateRequest);
router.delete('/:id', verifyToken, deleteRequest);

module.exports = router;
