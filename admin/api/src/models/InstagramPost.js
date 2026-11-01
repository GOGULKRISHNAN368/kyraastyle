import mongoose from 'mongoose';

const instagramPostSchema = new mongoose.Schema({
  fileName: { type: String, required: true, trim: true, maxlength: 160 },
  originalName: { type: String, default: '', trim: true, maxlength: 255 },
  mimeType: { type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] },
  position: { type: Number, default: 0, min: 0 },
}, { timestamps: true, collection: 'admin_instagram_posts', autoIndex: false });

export default mongoose.models.AdminInstagramPost || mongoose.model('AdminInstagramPost', instagramPostSchema);
