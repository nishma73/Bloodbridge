const DonationResponse = require('../models/DonationResponse');
const BloodRequest = require('../models/BloodRequest');
const DonorProfile = require('../models/DonorProfile');
const HospitalProfile = require('../models/HospitalProfile');
const {
  notifyDonorsOfRequest,
  notifyHospitalOfDonorResponse,
  notifyDonorOfCompletion,
} = require('../services/notificationService');

const formatResponseOutput = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    id: obj._id.toString(),
    requestId: (obj.requestId._id || obj.requestId).toString(),
    donorId: (obj.donorId._id || obj.donorId).toString(),
    hospitalId: (obj.hospitalId._id || obj.hospitalId).toString(),
  };
};

// @desc    Hospital sends donation requests to selected donors
// @route   POST /api/responses/send
const sendToDonors = async (req, res, next) => {
  try {
    const { requestId, donorIds, message = '' } = req.body;

    if (!requestId || !Array.isArray(donorIds) || donorIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'requestId and an array of donorIds are required.',
      });
    }

    const bloodRequest = await BloodRequest.findById(requestId);
    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found.',
      });
    }

    // Verify hospital owns this request
    if (
      req.user.role !== 'admin' &&
      bloodRequest.hospital.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send invitations for this request.',
      });
    }

    const createdResponses = [];
    const validDonorUserIds = [];

    for (const donorId of donorIds) {
      // Check if response already exists
      const existing = await DonationResponse.findOne({
        requestId: bloodRequest._id,
        donorId,
      });

      if (existing) continue;

      // Find donor details
      const donor = await DonorProfile.findOne({ user: donorId });
      if (!donor) continue;

      const responseDoc = await DonationResponse.create({
        requestId: bloodRequest._id,
        donorId,
        hospitalId: bloodRequest.hospital,
        requestBloodGroup: bloodRequest.bloodGroup,
        hospitalName: bloodRequest.hospitalName,
        donorName: donor.name,
        donorBloodGroup: donor.bloodGroup,
        donorPhone: donor.phone,
        status: 'sent',
        message: message.trim(),
      });

      createdResponses.push(formatResponseOutput(responseDoc));
      validDonorUserIds.push(donorId);
    }

    if (createdResponses.length > 0) {
      // Update request status to sent/active
      bloodRequest.status = 'sent';
      await bloodRequest.save();

      // Trigger notifications to donors
      await notifyDonorsOfRequest(validDonorUserIds, bloodRequest);
    }

    res.status(201).json({
      success: true,
      message: `Requests dispatched to ${createdResponses.length} donor(s).`,
      count: createdResponses.length,
      data: createdResponses,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List responses for a specific blood request
// @route   GET /api/responses/request/:requestId
const listForRequest = async (req, res, next) => {
  try {
    const responses = await DonationResponse.find({
      requestId: req.params.requestId,
    }).sort({ createdAt: -1 });

    const formatted = responses.map(formatResponseOutput);

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List requests sent to a donor
// @route   GET /api/responses/donor/:donorId?
const listForDonor = async (req, res, next) => {
  try {
    const donorId = req.params.donorId || req.user._id;

    const responses = await DonationResponse.find({
      donorId,
    }).sort({ createdAt: -1 });

    const formatted = responses.map(formatResponseOutput);

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Donor responds to request (accepts or declines)
// @route   POST /api/responses/:id/respond
const respondToRequest = async (req, res, next) => {
  try {
    const { status, message = '' } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'accepted' or 'declined'.",
      });
    }

    const response = await DonationResponse.findById(req.params.id);
    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Donation response record not found.',
      });
    }

    // Verify donor ownership
    if (
      req.user.role !== 'admin' &&
      response.donorId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this request.',
      });
    }

    response.status = status;
    response.message = message.trim();
    response.respondedAt = new Date();
    await response.save();

    // Update parent blood request
    const bloodRequest = await BloodRequest.findById(response.requestId);
    if (bloodRequest) {
      if (status === 'accepted') {
        bloodRequest.status = 'accepted';
      } else if (status === 'declined') {
        const remaining = await DonationResponse.find({
          requestId: bloodRequest._id,
        });
        const allDeclined = remaining.every((r) => r.status === 'declined');
        if (allDeclined) {
          bloodRequest.status = 'declined';
        }
      }
      await bloodRequest.save();
    }

    // Notify the hospital
    await notifyHospitalOfDonorResponse({
      hospitalUserId: response.hospitalId,
      donorName: response.donorName,
      bloodGroup: response.donorBloodGroup,
      status,
      requestBloodGroup: response.requestBloodGroup,
    });

    const formatted = formatResponseOutput(response);

    res.status(200).json({
      success: true,
      message: `You have successfully ${status} the blood request.`,
      data: formatted,
      ...formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Hospital marks donation completed
// @route   POST /api/responses/:id/complete
const markCompleted = async (req, res, next) => {
  try {
    const response = await DonationResponse.findById(req.params.id);
    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Donation record not found.',
      });
    }

    // Verify hospital ownership
    if (
      req.user.role !== 'admin' &&
      response.hospitalId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this donation completed.',
      });
    }

    response.status = 'completed';
    response.completedAt = new Date();
    await response.save();

    // Update blood request status
    const bloodRequest = await BloodRequest.findById(response.requestId);
    if (bloodRequest) {
      bloodRequest.status = 'completed';
      await bloodRequest.save();
    }

    // Update donor profile stats
    const donor = await DonorProfile.findOne({ user: response.donorId });
    if (donor) {
      donor.lastDonationDate = new Date();
      donor.donationCount = (donor.donationCount || 0) + 1;
      await donor.save();
    }

    // Notify donor of completion & gratitude
    await notifyDonorOfCompletion({
      donorUserId: response.donorId,
      hospitalName: response.hospitalName,
    });

    const formatted = formatResponseOutput(response);

    res.status(200).json({
      success: true,
      message: 'Donation marked as completed successfully.',
      data: formatted,
      ...formatted,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendToDonors,
  listForRequest,
  listForDonor,
  respondToRequest,
  markCompleted,
};
