// ---------------------------------------------------------------------------
// BloodRequest model - hospital blood requests
// ---------------------------------------------------------------------------
const mongoose = require('mongoose')

const STATUSES = ['pending', 'sent', 'accepted', 'declined', 'completed', 'cancelled']
const URGENCY_LEVELS = ['low', 'medium', 'high']
const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
]

const bloodRequestSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hospitalName: { type: String, trim: true },
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: [true, 'Blood group is required'],
    },
    unitsRequired: {
      type: Number,
      required: [true, 'Units required is required'],
      min: [1, 'Units must be at least 1'],
    },
    city: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    searchRadiusKm: { type: Number },
    urgency: {
      type: String,
      enum: URGENCY_LEVELS,
      default: 'medium',
    },
    requiredBy: { type: Date },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
  },
  { timestamps: true },
)

bloodRequestSchema.index({ hospitalId: 1, createdAt: -1 })
bloodRequestSchema.index({ status: 1, bloodGroup: 1 })

module.exports = mongoose.model('BloodRequest', bloodRequestSchema)
