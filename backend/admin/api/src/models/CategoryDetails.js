import mongoose from 'mongoose';

const categoryDetailsSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 2000 },
  cloudinaryId: { type: String, default: '', maxlength: 255 },
  width: { type: Number, min: 1, default: 600 },
  height: { type: Number, min: 0, default: 0 },
}, {
  collection: 'admin_category_details',
  timestamps: true,
  autoIndex: false,
});

export default mongoose.models.CategoryDetails || mongoose.model('CategoryDetails', categoryDetailsSchema);
