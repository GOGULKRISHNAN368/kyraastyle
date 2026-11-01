import mongoose from 'mongoose';

const adminLeadSchema = new mongoose.Schema({
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  phone: { type: String, trim: true, maxlength: 24, default: '' },
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date, default: null },
}, {
  timestamps: true,
  collection: 'admin_leads',
  autoIndex: false,
});

export default mongoose.models.AdminLead || mongoose.model('AdminLead', adminLeadSchema);
