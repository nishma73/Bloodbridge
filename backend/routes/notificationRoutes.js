const express = require('express');
const router = express.Router();
const {
  listForUser,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', listForUser);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

module.exports = router;
