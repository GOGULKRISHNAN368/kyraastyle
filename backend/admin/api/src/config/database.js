import mongoose from 'mongoose';
import { env } from './env.js';
import AdminLead from '../models/AdminLead.js';
import AdminOrder from '../models/AdminOrder.js';
import AdminAnnouncement from '../models/AdminAnnouncement.js';

export async function connectDatabase() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required');
  await mongoose.connect(env.mongoUri, { dbName: env.mongoDb });
  try { await AdminLead.createCollection(); }
  catch (error) { if (error.code !== 48) throw error; }
  try { await AdminOrder.createCollection(); }
  catch (error) { if (error.code !== 48) throw error; }
  try { await AdminAnnouncement.createCollection(); }
  catch (error) { if (error.code !== 48) throw error; }
}

export function databaseStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}
