import mongoose from 'mongoose';
import AdminAnnouncement from '../models/AdminAnnouncement.js';

export class AnnouncementError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export async function listAnnouncements() {
  return AdminAnnouncement.find().sort({ createdAt: -1 }).lean();
}

export async function createAnnouncement(input) {
  const text = typeof input?.text === 'string' ? input.text.trim() : '';
  if (!text) throw new AnnouncementError('Enter announcement text.');
  if (text.length > 500) throw new AnnouncementError('Announcement text must be 500 characters or fewer.');
  return AdminAnnouncement.create({ text });
}

export async function removeAnnouncement(id) {
  if (!mongoose.isValidObjectId(id)) throw new AnnouncementError('Announcement not found.', 404);
  const result = await AdminAnnouncement.findByIdAndDelete(id);
  if (!result) throw new AnnouncementError('Announcement not found.', 404);
  return { id };
}
