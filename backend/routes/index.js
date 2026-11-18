const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const donorRoutes = require('./donorRoutes');
const hospitalRoutes = require('./hospitalRoutes');
const requestRoutes = require('./requestRoutes');
const responseRoutes = require('./responseRoutes');
const adminRoutes = require('./adminRoutes');
const notificationRoutes = require('./notificationRoutes');

router.use('/auth', authRoutes);
router.use('/donors', donorRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/requests', requestRoutes);
router.use('/responses', responseRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'BloodBridge API Server',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
