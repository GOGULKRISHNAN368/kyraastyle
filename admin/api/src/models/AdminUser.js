import mongoose from 'mongoose';

const adminUserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['owner', 'manager', 'staff'], default: 'staff', required: true },
  isActive: { type: Boolean, default: true, required: true },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('AdminUser', adminUserSchema);
