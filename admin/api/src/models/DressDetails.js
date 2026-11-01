import mongoose from 'mongoose';

const sizeStockSchema = new mongoose.Schema({
  size: { type: String, required: true, enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] },
  available: { type: Boolean, default: false },
  quantity: { type: Number, min: 0, default: 0 },
}, { _id: false });

const galleryImageSchema = new mongoose.Schema({
  cloudinaryId: { type: String, required: true, maxlength: 255 },
  width: { type: Number, min: 1, default: 800 },
  height: { type: Number, min: 0, default: 0 },
}, { _id: false });

const dressDetailsSchema = new mongoose.Schema({
  oldPrice: { type: Number, min: 0, default: null },
  sizes: { type: [sizeStockSchema], default: [] },
  images: { type: [galleryImageSchema], default: [] },
  isNewArrival: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  isCuratedLook: { type: Boolean, default: false },
}, {
  collection: 'admin_dress_details',
  timestamps: true,
  autoIndex: false,
});

export default mongoose.models.DressDetails || mongoose.model('DressDetails', dressDetailsSchema);
