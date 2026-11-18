const mongoose = require('mongoose');

const donationResponseSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
      index: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['sent', 'accepted', 'declined', 'completed', 'cancelled'],
      default: 'sent',
      index: true,
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    requestBloodGroup: {
      type: String,
      default: '',
    },
    hospitalName: {
      type: String,
      default: '',
    },
    donorName: {
      type: String,
      default: '',
    },
    donorBloodGroup: {
      type: String,
      default: '',
    },
    donorPhone: {
      type: String,
      default: '',
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate invite to same donor for same request
donationResponseSchema.index({ requestId: 1, donorId: 1 }, { unique: true });
donationResponseSchema.index({ donorId: 1, createdAt: -1 });
donationResponseSchema.index({ hospitalId: 1, createdAt: -1 });

const DonationResponse = mongoose.model('DonationResponse', donationResponseSchema);
module.exports = DonationResponse;
