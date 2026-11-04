import mongoose from 'mongoose';

const detailsSchema = new mongoose.Schema({
  fabric: { type: String, trim: true, maxlength: 500 },
  care: { type: String, trim: true, maxlength: 2000 },
  notes: { type: String, trim: true, maxlength: 5000 },
}, { _id: false });

const sizeSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 24 },
  stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
}, { _id: false });

const imageSchema = new mongoose.Schema({
  publicId: { type: String, required: true, trim: true, maxlength: 255 },
  width: { type: Number, min: 1, default: 800 },
  height: { type: Number, min: 0, default: 0 },
  alt: { type: String, trim: true, maxlength: 500, default: '' },
  position: { type: Number, min: 0, default: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, index: true },
  section: { type: String, trim: true, default: '', index: true },
  position: { type: Number, default: 0 },
  cloudinaryId: { type: String, required: true, trim: true, unique: true },
  imageUrl: { type: String, default: '' },
  width: { type: Number, default: 800 },
  height: { type: Number, default: 0 },
  alt: { type: String, default: '' },
  price: { type: Number, min: 0, default: null },
  link: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  slug: { type: String, trim: true },
  subtitle: { type: String, trim: true, maxlength: 500, default: '' },
  description: { type: String, default: '' },
  details: { type: detailsSchema, default: () => ({}) },
  occasion: { type: [String], default: [] },
  mrp: { type: Number, min: 0, default: null },
  sizes: { type: [sizeSchema], default: [] },
  hasSizes: { type: Boolean, default: false },
  stock: { type: Number, min: 0, validate: Number.isInteger, default: 0 },
  images: { type: [imageSchema], default: [] },
  isNewArrival: { type: Boolean, default: false },
  mergedInto: { type: mongoose.Schema.Types.ObjectId, default: undefined },
  tags: { type: [String], default: [] },
  // Retained for existing storefront placement controls.
  isBestSeller: { type: Boolean, default: false },
  isCuratedLook: { type: Boolean, default: false },
  isEditorsPick: { type: Boolean, default: false },
  isOccasionPick: { type: Boolean, default: false },
  isLuxeCollection: { type: Boolean, default: false },
}, {
  timestamps: true,
  collection: 'products',
  autoIndex: false,
});

// Index creation is performed explicitly by the guarded migration script.
// autoIndex:false prevents Mongoose from changing existing indexes at startup.
productSchema.index({ slug: 1 }, { unique: true, sparse: true });
productSchema.index({ isNewArrival: 1 });
productSchema.index({ price: 1 });

productSchema.pre('validate', function recomputeSizedStock() {
  if (this.hasSizes) this.stock = (this.sizes || []).reduce((total, size) => total + Number(size.stock || 0), 0);
});

export default mongoose.models.Product || mongoose.model('Product', productSchema);
