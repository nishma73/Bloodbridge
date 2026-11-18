const mongoose = require('mongoose');

const hospitalProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    hospitalName: {
      type: String,
      required: [true, 'Hospital / Blood bank name is required'],
      trim: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Official medical license/registration number is required'],
      trim: true,
      index: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
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
      default: 12.9716,
    },
    longitude: {
      type: Number,
      default: 77.5946,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verificationNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const HospitalProfile = mongoose.model('HospitalProfile', hospitalProfileSchema);
module.exports = HospitalProfile;
