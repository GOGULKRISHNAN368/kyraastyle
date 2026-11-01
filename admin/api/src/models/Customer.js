import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, default: '', maxlength: 24 },
  passwordHash: { type: String, select: false },
  lastLoginAt: { type: Date, default: null },
}, {
  timestamps: true,
  collection: 'customers',
  autoIndex: false,
});

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);
