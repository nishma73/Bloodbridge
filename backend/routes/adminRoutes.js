const express = require('express');
const router = express.Router();
const {
  getPlatformStats,
  listAllDonors,
  listAllHospitals,
  verifyHospital,
  listAllRequests,
  manageUserStatus,
} = require('../controllers/adminController');
const { verifyToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(authorizeRoles('admin'));

router.get('/stats', getPlatformStats);
router.get('/donors', listAllDonors);
router.get('/hospitals', listAllHospitals);
router.put('/hospitals/:id/verify', verifyHospital);
router.get('/requests', listAllRequests);
router.patch('/users/:id/status', manageUserStatus);

module.exports = router;
