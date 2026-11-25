// ---------------------------------------------------------------------------
// User model - donors, hospitals and administrators
// ---------------------------------------------------------------------------
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
]
const ROLES = ['donor', 'hospital', 'admin']

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: ROLES,
      required: [true, 'Role is required'],
    },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    bloodGroup: { type: String, enum: BLOOD_GROUPS },
    available: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isReported: { type: Boolean, default: false },
    hospitalName: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    address: { type: String, trim: true },
    verificationNotes: { type: String, trim: true },
  },
  { timestamps: true },
)

// Indexes for lookups used by the API
userSchema.index({ role: 1, bloodGroup: 1, available: 1, verified: 1 })

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return

  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Strip sensitive fields and expose a stable `uid` for the frontend service layer
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.__v
  obj.uid = obj._id ? obj._id.toString() : obj.uid
  return obj
}

module.exports = mongoose.model('User', userSchema)
