const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const HospitalProfile = require('../models/HospitalProfile');
const BloodRequest = require('../models/BloodRequest');
const DonationResponse = require('../models/DonationResponse');

// @desc    Get aggregate platform statistics
// @route   GET /api/admin/stats
const getPlatformStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalDonors,
      totalHospitals,
      verifiedHospitals,
      pendingHospitals,
      activeRequests,
      completedRequests,
      totalResponses,
      acceptedResponses,
      reportedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'hospital' }),
      HospitalProfile.countDocuments({ verified: true }),
      HospitalProfile.countDocuments({ verified: false }),
      BloodRequest.countDocuments({ status: { $in: ['pending', 'sent', 'active', 'accepted'] } }),
      BloodRequest.countDocuments({ status: { $in: ['completed', 'fulfilled'] } }),
      DonationResponse.countDocuments(),
      DonationResponse.countDocuments({ status: { $in: ['accepted', 'completed'] } }),
      User.countDocuments({ isReported: true }),
    ]);

    // Calculate total units requested across platform
    const unitsAggregation = await BloodRequest.aggregate([
      { $group: { _id: null, totalUnits: { $sum: '$units' } } },
    ]);
    const totalUnitsRequested = unitsAggregation[0]?.totalUnits || 0;

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalDonors,
        totalHospitals,
        verifiedHospitals,
        pendingHospitals,
        activeRequests,
        completedRequests,
        totalUnitsRequested,
        totalResponses,
        acceptedResponses,
        reportedUsers,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List all registered donors (Admin)
// @route   GET /api/admin/donors
const listAllDonors = async (req, res, next) => {
  try {
    const donors = await DonorProfile.find()
      .populate('user', 'email isActive isReported createdAt lastLogin')
      .sort({ createdAt: -1 });

    const formatted = donors.map((d) => {
      const obj = d.toObject();
      return {
        ...obj,
        id: obj._id.toString(),
        uid: obj.user ? obj.user._id.toString() : '',
        email: obj.user ? obj.user.email : '',
        isActive: obj.user ? obj.user.isActive : true,
        isReported: obj.user ? obj.user.isReported : false,
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      donors: formatted,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List all registered hospitals (Admin)
// @route   GET /api/admin/hospitals
const listAllHospitals = async (req, res, next) => {
  try {
    const hospitals = await HospitalProfile.find()
      .populate('user', 'email isActive isReported createdAt lastLogin')
      .populate('verifiedBy', 'email')
      .sort({ createdAt: -1 });

    const formatted = hospitals.map((h) => {
      const obj = h.toObject();
      return {
        ...obj,
        id: obj._id.toString(),
        uid: obj.user ? obj.user._id.toString() : '',
        email: obj.user ? obj.user.email : '',
        isActive: obj.user ? obj.user.isActive : true,
        isReported: obj.user ? obj.user.isReported : false,
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      hospitals: formatted,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve or reject hospital verification
// @route   PUT /api/admin/hospitals/:id/verify
const verifyHospital = async (req, res, next) => {
  try {
    const { verified, notes = '' } = req.body;

    const hospital = await HospitalProfile.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital profile not found.',
      });
    }

    hospital.verified = Boolean(verified);
    hospital.verificationNotes = notes.trim();
    hospital.verifiedAt = verified ? new Date() : null;
    hospital.verifiedBy = verified ? req.user._id : null;

    await hospital.save();

    res.status(200).json({
      success: true,
      message: `Hospital verification ${verified ? 'approved' : 'rejected'}.`,
      hospital,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List all blood requests (Admin)
// @route   GET /api/admin/requests
const listAllRequests = async (req, res, next) => {
  try {
    const requests = await BloodRequest.find()
      .populate('hospital', 'email')
      .sort({ createdAt: -1 });

    const formatted = requests.map((r) => {
      const obj = r.toObject();
      return {
        ...obj,
        id: obj._id.toString(),
        hospitalId: obj.hospital ? (obj.hospital._id || obj.hospital).toString() : '',
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      requests: formatted,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Manage user status (suspend, activate, toggle report)
// @route   PATCH /api/admin/users/:id/status
const manageUserStatus = async (req, res, next) => {
  try {
    const { isActive, isReported } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }
    if (isReported !== undefined) {
      user.isReported = Boolean(isReported);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User status successfully updated.',
      user: {
        uid: user._id.toString(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isReported: user.isReported,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPlatformStats,
  listAllDonors,
  listAllHospitals,
  verifyHospital,
  listAllRequests,
  manageUserStatus,
};
