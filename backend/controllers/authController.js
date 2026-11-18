const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const HospitalProfile = require('../models/HospitalProfile');

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'bloodbridge_jwt_secret_production_key_change_in_real_deployment_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const formatUserResponse = async (user, token = null) => {
  const base = {
    uid: user._id.toString(),
    _id: user._id.toString(),
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isReported: user.isReported,
    createdAt: user.createdAt,
  };

  if (token) {
    base.token = token;
  }

  if (user.role === 'donor') {
    const profile = await DonorProfile.findOne({ user: user._id });
    if (profile) {
      return {
        ...base,
        name: profile.name,
        fullName: profile.name,
        bloodGroup: profile.bloodGroup,
        phone: profile.phone,
        city: profile.city,
        address: profile.address,
        latitude: profile.latitude,
        longitude: profile.longitude,
        available: profile.available,
        verified: profile.verified,
        age: profile.age,
        gender: profile.gender,
        lastDonationDate: profile.lastDonationDate,
        eligibility: profile.eligibility,
        donationCount: profile.donationCount,
      };
    }
  } else if (user.role === 'hospital') {
    const profile = await HospitalProfile.findOne({ user: user._id });
    if (profile) {
      return {
        ...base,
        hospitalName: profile.hospitalName,
        registrationNumber: profile.registrationNumber,
        contactPerson: profile.contactPerson,
        phone: profile.phone,
        city: profile.city,
        address: profile.address,
        latitude: profile.latitude,
        longitude: profile.longitude,
        verified: profile.verified,
        verifiedAt: profile.verifiedAt,
      };
    }
  } else if (user.role === 'admin') {
    return {
      ...base,
      name: 'Administrator',
      verified: true,
    };
  }

  return base;
};

// @desc    Register new user (donor, hospital, admin)
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const {
      email,
      password,
      role = 'donor',
      phone,
      city,
      address,
      latitude,
      longitude,
      // Donor fields
      name,
      fullName,
      bloodGroup = 'O+',
      available = true,
      age = 25,
      gender = 'prefer_not_to_say',
      // Hospital fields
      hospitalName,
      registrationNumber,
      contactPerson,
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Normalize phone number to standard "+91 XXXXXXXXXX"
    const phoneDigits = String(phone || '').replace(/^\+91\s*/, '').replace(/\D/g, '').slice(0, 10);
    const normalizedPhone = phoneDigits ? `+91 ${phoneDigits}` : (phone || '');

    // Create Base User
    const user = await User.create({
      email: normalizedEmail,
      password,
      role,
    });

    // Create Role-specific Profile
    if (role === 'donor') {
      await DonorProfile.create({
        user: user._id,
        name: (name || fullName || 'Anonymous Donor').trim(),
        bloodGroup,
        phone: normalizedPhone,
        city: (city || 'Bengaluru').trim(),
        address: address || '',
        latitude: Number(latitude) || 12.9716,
        longitude: Number(longitude) || 77.5946,
        available: available !== false,
        age: Number(age) || 25,
        gender: gender || 'prefer_not_to_say',
        verified: false,
      });
    } else if (role === 'hospital') {
      await HospitalProfile.create({
        user: user._id,
        hospitalName: (hospitalName || 'General Hospital').trim(),
        registrationNumber: (registrationNumber || 'HOSP-PENDING').trim(),
        contactPerson: (contactPerson || 'Hospital Admin').trim(),
        phone: normalizedPhone,
        city: (city || 'Bengaluru').trim(),
        address: address || '',
        latitude: Number(latitude) || 12.9716,
        longitude: Number(longitude) || 77.5946,
        verified: false, // Requires admin verification
      });
    }

    const token = generateToken(user._id);
    const userPayload = await formatUserResponse(user, token);

    res.status(201).json({
      success: true,
      message: 'Account successfully registered.',
      token,
      user: userPayload,
      ...userPayload, // Spread for immediate top-level access compatibility
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact support.',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    const userPayload = await formatUserResponse(user, token);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: userPayload,
      ...userPayload,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user & profile
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const userPayload = await formatUserResponse(req.user);
    res.status(200).json({
      success: true,
      user: userPayload,
      ...userPayload,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user (clears client session)
// @route   POST /api/auth/logout
const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  formatUserResponse,
};
