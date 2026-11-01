import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  _id: { type: String },
  categories: { type: [String], default: [] },
}, {
  timestamps: true,
  collection: 'settings',
  autoIndex: false,
  versionKey: false,
});

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
