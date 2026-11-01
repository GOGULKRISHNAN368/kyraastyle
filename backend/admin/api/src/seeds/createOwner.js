import bcrypt from 'bcrypt';
import { connectDatabase } from '../config/database.js';
import AdminUser from '../models/AdminUser.js';

try {
  await connectDatabase();
  const existing = await AdminUser.exists({});
  if (existing) {
    console.log('An admin user already exists; no owner was created.');
    process.exitCode = 0;
  } else {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error('ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required');
    }
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await AdminUser.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.trim().toLowerCase(),
      passwordHash,
      role: 'owner',
    });
    console.log('Initial owner account created.');
  }
} catch (error) {
  console.error('Owner seed failed. Check admin environment values and database connection.');
  process.exitCode = 1;
} finally {
  const mongoose = await import('mongoose');
  await mongoose.default.disconnect();
}
