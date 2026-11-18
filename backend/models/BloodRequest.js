const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },
    patientName: {
      type: String,
      trim: true,
      default: 'Emergency / Ward Patient',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: [true, 'Required blood group is mandatory'],
      index: true,
    },
    units: {
      type: Number,
      required: [true, 'Required units is mandatory'],
      min: [1, 'At least 1 unit is required'],
      default: 1,
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
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
    contactPhone: {
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
    radiusKm: {
      type: Number,
      default: 25,
      min: 1,
      max: 500,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    requiredBy: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'active', 'accepted', 'declined', 'completed', 'fulfilled', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

bloodRequestSchema.index({ status: 1, bloodGroup: 1, city: 1 });
bloodRequestSchema.index({ hospital: 1, createdAt: -1 });

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);
module.exports = BloodRequest;
