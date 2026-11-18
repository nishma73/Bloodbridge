const mongoose = require('mongoose');

const donorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: [true, 'Blood group is required'],
      index: true,
    },
    age: {
      type: Number,
      min: [18, 'Donors must be at least 18 years old'],
      max: [70, 'Maximum donor age is 70 years'],
      default: 25,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    latitude: {
      type: Number,
      default: 12.9716, // Bengaluru center fallback
    },
    longitude: {
      type: Number,
      default: 77.5946,
    },
    available: {
      type: Boolean,
      default: true,
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastDonationDate: {
      type: Date,
      default: null,
    },
    eligibility: {
      isEligible: {
        type: Boolean,
        default: true,
      },
      weightKg: {
        type: Number,
        default: 55,
      },
      hasChronicConditions: {
        type: Boolean,
        default: false,
      },
      canDonateAfter: {
        type: Date,
        default: null,
      },
      notes: {
        type: String,
        default: '',
      },
    },
    donationCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-performance donor searches
donorProfileSchema.index({ bloodGroup: 1, available: 1, city: 1 });
donorProfileSchema.index({ bloodGroup: 1, available: 1, verified: 1 });

const DonorProfile = mongoose.model('DonorProfile', donorProfileSchema);
module.exports = DonorProfile;
