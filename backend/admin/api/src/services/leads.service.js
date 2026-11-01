import mongoose from 'mongoose';
import AdminLead from '../models/AdminLead.js';

export class LeadError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function normalizeLead(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new LeadError('Lead details must be an object.');
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  if (!email && !phone) throw new LeadError('Provide an email address or phone number.');
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new LeadError('Enter a valid email address.');
  if (phone && !/^\+?[0-9\s().-]{7,24}$/.test(phone)) throw new LeadError('Enter a valid phone number.');
  return { email, phone };
}

export async function listLeads() {
  return AdminLead.find().select('email phone isVerified verifiedAt createdAt updatedAt').sort({ createdAt: -1 }).lean();
}

export async function createLead(input) {
  const fields = normalizeLead(input);
  return AdminLead.create({ ...fields, isVerified: false, verifiedAt: null });
}

export async function setLeadVerified(id, isVerified) {
  if (!mongoose.isValidObjectId(id)) throw new LeadError('Lead not found.', 404);
  if (typeof isVerified !== 'boolean') throw new LeadError('Verified status must be true or false.');
  const lead = await AdminLead.findByIdAndUpdate(id, {
    $set: { isVerified, verifiedAt: isVerified ? new Date() : null },
  }, { new: true, runValidators: true }).select('email phone isVerified verifiedAt createdAt updatedAt').lean();
  if (!lead) throw new LeadError('Lead not found.', 404);
  return lead;
}
