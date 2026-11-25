// ---------------------------------------------------------------------------
// DonorResponse model - requests sent to donors and their responses
// ---------------------------------------------------------------------------
const mongoose = require('mongoose')

const RESPONSE_STATUSES = ['sent', 'accepted', 'declined', 'completed']

const donorResponseSchema = new mongoose.Schema(
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
    donorName: { type: String, trim: true },
    donorBloodGroup: { type: String },
    donorPhone: { type: String, trim: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hospitalName: { type: String, trim: true },
    requestBloodGroup: { type: String },
    status: {
      type: String,
      enum: RESPONSE_STATUSES,
      default: 'sent',
    },
    message: { type: String, trim: true, default: '' },
    respondedAt: { type: Date },
  },
  { timestamps: true },
)

donorResponseSchema.index({ requestId: 1, donorId: 1 }, { unique: true })
donorResponseSchema.index({ donorId: 1, createdAt: -1 })

module.exports = mongoose.model('DonorResponse', donorResponseSchema)
