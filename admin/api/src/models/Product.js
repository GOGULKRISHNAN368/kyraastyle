import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  section: { type: String, trim: true, default: '' },
  position: { type: Number, default: 0 },
  cloudinaryId: { type: String, required: true, trim: true },
  width: { type: Number, default: 800 },
  height: { type: Number, default: 0 },
  imageUrl: { type: String, default: '' },
  alt: { type: String, default: '' },
  price: { type: Number, min: 0, default: null },
  description: { type: String, default: '' },
  link: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  collection: 'products',
  autoIndex: false,
});

export default mongoose.models.Product || mongoose.model('Product', productSchema);
