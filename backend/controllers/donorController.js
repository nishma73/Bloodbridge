const DonorProfile = require('../models/DonorProfile');
const User = require('../models/User');

// Helper to format donor record for frontend consistency
const formatDonorOutput = (profile, user = null) => {
  const donorObj = profile.toObject ? profile.toObject() : profile;
  const uid = donorObj.user ? (donorObj.user._id || donorObj.user).toString() : '';
  const email = (user && user.email) || (donorObj.user && donorObj.user.email) || '';

  return {
    ...donorObj,
    uid,
    id: donorObj._id.toString(),
    email,
  };
};

// @desc    Get donor profile by user id (or current logged in donor)
// @route   GET /api/donors/profile/:id?
const getProfile = async (req, res, next) => {
  try {
    const targetUserId = req.params.id || req.user._id;

    const profile = await DonorProfile.findOne({ user: targetUserId }).populate('user', 'email isActive isReported');
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: formatDonorOutput(profile),
      ...formatDonorOutput(profile),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update donor profile
// @route   PUT /api/donors/profile/:id?
const updateProfile = async (req, res, next) => {
  try {
    const targetUserId = req.params.id || req.user._id;

    // Authorization check: non-admins can only update their own profile
    if (req.user.role !== 'admin' && req.user._id.toString() !== targetUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this profile.',
      });
    }

    const allowedFields = [
      'name',
      'fullName',
      'bloodGroup',
      'phone',
      'city',
      'address',
      'latitude',
      'longitude',
      'available',
      'age',
      'gender',
      'lastDonationDate',
      'eligibility',
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        if (key === 'fullName') updates.name = req.body[key];
        else updates[key] = req.body[key];
      }
    }

    if (updates.phone !== undefined) {
      const raw = String(updates.phone || '').trim();
      const afterCode = raw.replace(/^\+91\s*/, '');
      const digitsOnly = afterCode.replace(/\D/g, '');
      if (/\D/.test(afterCode.replace(/[\s\-]/g, '')) || digitsOnly.length !== 10 || !/^[6-9]/.test(digitsOnly)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.',
        });
      }
      updates.phone = `+91 ${digitsOnly}`;
    }

    let profile = await DonorProfile.findOne({ user: targetUserId });
    if (!profile) {
      // Auto-create if not exists yet
      profile = new DonorProfile({
        user: targetUserId,
        name: req.body.name || 'Anonymous Donor',
        bloodGroup: req.body.bloodGroup || 'O+',
        phone: req.body.phone || '',
        city: req.body.city || 'Bengaluru',
      });
    }

    Object.assign(profile, updates);
    await profile.save();

    const populated = await DonorProfile.findById(profile._id).populate('user', 'email');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: formatDonorOutput(populated),
      ...formatDonorOutput(populated),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Set donor availability
// @route   PATCH /api/donors/availability
const setAvailability = async (req, res, next) => {
  try {
    const { available } = req.body;
    if (available === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Availability boolean flag is required.',
      });
    }

    const profile = await DonorProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found.',
      });
    }

    profile.available = Boolean(available);
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Availability updated to ${profile.available ? 'available' : 'unavailable'}.`,
      available: profile.available,
      data: formatDonorOutput(profile),
      ...formatDonorOutput(profile),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List donor profiles with search and filters
// @route   GET /api/donors
const listDonors = async (req, res, next) => {
  try {
    const { bloodGroup, availableOnly, verifiedOnly, search, city } = req.query;

    const query = {};

    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }
    if (availableOnly === 'true' || availableOnly === true) {
      query.available = true;
    }
    if (verifiedOnly === 'true' || verifiedOnly === true) {
      query.verified = true;
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    let donors = await DonorProfile.find(query).populate('user', 'email isActive isReported');

    // Filter out inactive or reported users
    donors = donors.filter((d) => d.user && d.user.isActive && !d.user.isReported);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      donors = donors.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(q) ||
          (d.city || '').toLowerCase().includes(q) ||
          (d.bloodGroup || '').toLowerCase().includes(q)
      );
    }

    const formatted = donors.map((d) => formatDonorOutput(d));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  setAvailability,
  listDonors,
};
