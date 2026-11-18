const HospitalProfile = require('../models/HospitalProfile');

const formatHospitalOutput = (profile) => {
  const obj = profile.toObject ? profile.toObject() : profile;
  const uid = obj.user ? (obj.user._id || obj.user).toString() : '';
  const email = (obj.user && obj.user.email) || '';

  return {
    ...obj,
    uid,
    id: obj._id.toString(),
    email,
  };
};

// @desc    Get hospital profile
// @route   GET /api/hospitals/profile/:id?
const getProfile = async (req, res, next) => {
  try {
    const targetUserId = req.params.id || req.user._id;

    const profile = await HospitalProfile.findOne({ user: targetUserId }).populate('user', 'email isActive isReported');
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Hospital profile not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: formatHospitalOutput(profile),
      ...formatHospitalOutput(profile),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update hospital profile
// @route   PUT /api/hospitals/profile/:id?
const updateProfile = async (req, res, next) => {
  try {
    const targetUserId = req.params.id || req.user._id;

    // Authorization check
    if (req.user.role !== 'admin' && req.user._id.toString() !== targetUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this hospital profile.',
      });
    }

    const allowed = [
      'hospitalName',
      'registrationNumber',
      'contactPerson',
      'phone',
      'city',
      'address',
      'latitude',
      'longitude',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
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

    let profile = await HospitalProfile.findOne({ user: targetUserId });
    if (!profile) {
      profile = new HospitalProfile({
        user: targetUserId,
        hospitalName: req.body.hospitalName || 'Hospital',
        registrationNumber: req.body.registrationNumber || 'HOSP-DEFAULT',
        contactPerson: req.body.contactPerson || 'Admin',
        phone: req.body.phone || '',
        city: req.body.city || 'Bengaluru',
        address: req.body.address || '',
      });
    }

    Object.assign(profile, updates);
    await profile.save();

    const populated = await HospitalProfile.findById(profile._id).populate('user', 'email');

    res.status(200).json({
      success: true,
      message: 'Hospital profile updated successfully.',
      data: formatHospitalOutput(populated),
      ...formatHospitalOutput(populated),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List all hospitals (directory)
// @route   GET /api/hospitals
const listHospitals = async (req, res, next) => {
  try {
    const { verifiedOnly, city, search } = req.query;
    const query = {};

    if (verifiedOnly === 'true') {
      query.verified = true;
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    let list = await HospitalProfile.find(query).populate('user', 'email isActive isReported');
    list = list.filter((h) => h.user && h.user.isActive && !h.user.isReported);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (h) =>
          (h.hospitalName || '').toLowerCase().includes(q) ||
          (h.city || '').toLowerCase().includes(q)
      );
    }

    const formatted = list.map(formatHospitalOutput);

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
  listHospitals,
};
