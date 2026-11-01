import mongoose from 'mongoose';

const adminAnnouncementSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 500 },
}, { timestamps: true, collection: 'admin_announcements', autoIndex: false });

export default mongoose.models.AdminAnnouncement || mongoose.model('AdminAnnouncement', adminAnnouncementSchema);
