// ---------------------------------------------------------------------------
// Notification model - per-user notifications
// ---------------------------------------------------------------------------
const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    body: { type: String, required: [true, 'Body is required'], trim: true },
    read: { type: Boolean, default: false },
    link: { type: String, trim: true },
  },
  { timestamps: true },
)

notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, read: 1 })

module.exports = mongoose.model('Notification', notificationSchema)
