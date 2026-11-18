const BloodRequest = require('../models/BloodRequest');
const DonationResponse = require('../models/DonationResponse');
const HospitalProfile = require('../models/HospitalProfile');
const { findMatchingDonors } = require('../services/matchingService');

const formatRequestOutput = (reqDoc) => {
  const obj = reqDoc.toObject ? reqDoc.toObject() : reqDoc;
  const hospitalId = obj.hospital ? (obj.hospital._id || obj.hospital).toString() : '';

  return {
    ...obj,
    id: obj._id.toString(),
    hospitalId,
  };
};

// @desc    Create a new blood request
// @route   POST /api/requests
const createRequest = async (req, res, next) => {
  try {
    const {
      bloodGroup,
      units,
      urgency = 'medium',
      city,
      address,
      latitude,
      longitude,
      radiusKm = 25,
      notes = '',
      requiredBy,
      patientName = 'Emergency Patient',
      contactPhone,
      hospitalName,
    } = req.body;

    const hospitalUserId = req.user._id;

    // Get hospital profile details
    const hospitalProfile = await HospitalProfile.findOne({ user: hospitalUserId });
    const resolvedHospitalName =
      hospitalName || (hospitalProfile && hospitalProfile.hospitalName) || 'General Hospital';
    const resolvedCity =
      city || (hospitalProfile && hospitalProfile.city) || 'Bengaluru';
    const resolvedLat =
      Number(latitude) || (hospitalProfile && hospitalProfile.latitude) || 12.9716;
    const resolvedLon =
      Number(longitude) || (hospitalProfile && hospitalProfile.longitude) || 77.5946;
    const resolvedPhone =
      contactPhone || (hospitalProfile && hospitalProfile.phone) || '';

    const newRequest = await BloodRequest.create({
      hospital: hospitalUserId,
      hospitalName: resolvedHospitalName,
      patientName: patientName.trim(),
      bloodGroup,
      units: Number(units) || 1,
      urgency,
      city: resolvedCity.trim(),
      address: address || (hospitalProfile && hospitalProfile.address) || '',
      contactPhone: resolvedPhone,
      latitude: resolvedLat,
      longitude: resolvedLon,
      radiusKm: Number(radiusKm) || 25,
      notes: notes.trim(),
      requiredBy: requiredBy ? new Date(requiredBy) : null,
      status: 'pending',
    });

    const formatted = formatRequestOutput(newRequest);

    res.status(201).json({
      success: true,
      message: 'Blood request created successfully.',
      data: formatted,
      ...formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List blood requests created by a hospital
// @route   GET /api/requests/hospital/:hospitalId?
const listHospitalRequests = async (req, res, next) => {
  try {
    const targetHospitalId = req.params.hospitalId || req.user._id;

    const requests = await BloodRequest.find({ hospital: targetHospitalId })
      .sort({ createdAt: -1 });

    const formatted = requests.map(formatRequestOutput);

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List open blood requests (accessible to donors and hospitals)
// @route   GET /api/requests/open
const listOpenRequests = async (req, res, next) => {
  try {
    const requests = await BloodRequest.find({
      status: { $nin: ['completed', 'fulfilled', 'cancelled'] },
    }).sort({ createdAt: -1 });

    const formatted = requests.map(formatRequestOutput);

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single blood request by ID
// @route   GET /api/requests/:id
const getRequestById = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found.',
      });
    }

    const formatted = formatRequestOutput(request);

    res.status(200).json({
      success: true,
      data: formatted,
      ...formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update blood request (status, units, notes, etc.)
// @route   PUT /api/requests/:id
const updateRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found.',
      });
    }

    // Authorization: only hospital who created it or admin can update
    if (
      req.user.role !== 'admin' &&
      request.hospital.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this request.',
      });
    }

    const allowed = [
      'status',
      'units',
      'urgency',
      'notes',
      'patientName',
      'requiredBy',
      'radiusKm',
      'contactPhone',
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        request[key] = req.body[key];
      }
    }

    await request.save();
    const formatted = formatRequestOutput(request);

    res.status(200).json({
      success: true,
      message: 'Request updated successfully.',
      data: formatted,
      ...formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete blood request and related responses
// @route   DELETE /api/requests/:id
const deleteRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found.',
      });
    }

    if (
      req.user.role !== 'admin' &&
      request.hospital.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this request.',
      });
    }

    await BloodRequest.findByIdAndDelete(req.params.id);
    await DonationResponse.deleteMany({ requestId: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Blood request removed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Find matching donors for a specific blood request
// @route   GET /api/requests/:id/matching-donors
const getMatchingDonorsForRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found.',
      });
    }

    const { radiusKm, availableOnly, verifiedOnly, search } = req.query;

    const matchResults = await findMatchingDonors({
      bloodGroup: request.bloodGroup,
      city: request.city,
      latitude: request.latitude,
      longitude: request.longitude,
      radiusKm: radiusKm ? Number(radiusKm) : request.radiusKm,
      availableOnly: availableOnly === 'true',
      verifiedOnly: verifiedOnly === 'true',
      search: search || '',
    });

    res.status(200).json({
      success: true,
      request: formatRequestOutput(request),
      ...matchResults,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRequest,
  listHospitalRequests,
  listOpenRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  getMatchingDonorsForRequest,
};
