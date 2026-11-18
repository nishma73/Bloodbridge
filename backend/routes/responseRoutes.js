const express = require('express');
const router = express.Router();
const {
  sendToDonors,
  listForRequest,
  listForDonor,
  respondToRequest,
  markCompleted,
} = require('../controllers/responseController');
const { verifyToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.post('/send', verifyToken, authorizeRoles('hospital', 'admin'), sendToDonors);
router.get('/request/:requestId', verifyToken, listForRequest);
router.get('/donor/:donorId?', verifyToken, listForDonor);
router.post('/:id/respond', verifyToken, authorizeRoles('donor', 'admin'), respondToRequest);
router.post('/:id/complete', verifyToken, authorizeRoles('hospital', 'admin'), markCompleted);

module.exports = router;
