import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 120, default: '' },
  link: { type: String, trim: true, maxlength: 2048, default: '' },
  desktopCloudinaryId: { type: String, required: true, trim: true, maxlength: 255 },
  desktopWidth: { type: Number, required: true, min: 1 },
  desktopHeight: { type: Number, required: true, min: 1 },
  mobileCloudinaryId: { type: String, required: true, trim: true, maxlength: 255 },
  mobileWidth: { type: Number, required: true, min: 1 },
  mobileHeight: { type: Number, required: true, min: 1 },
  position: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, collection: 'admin_banners', autoIndex: false });

export default mongoose.models.AdminBanner || mongoose.model('AdminBanner', bannerSchema);
