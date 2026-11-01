import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema({
  category: { type: String, required: true, trim: true, maxlength: 100 },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, default: 'Unknown Dress', trim: true, maxlength: 200 },
  mediaType: { type: String, enum: ['image', 'video'], default: 'video' },
  assetPublicId: { type: String, required: true, trim: true, maxlength: 255 },
  mediaUrl: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  duration: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, collection: 'admin_reels', autoIndex: false });

export default mongoose.models.AdminReel || mongoose.model('AdminReel', reelSchema);
