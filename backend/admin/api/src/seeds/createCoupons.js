import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Coupon from '../models/Coupon.js';

const coupons = [
  { code: 'KRYAA10', expiryDate: new Date('2027-03-31T23:59:59.999Z'), discountType: 'percentage', discountValue: 10, minimumPurchase: 999, usageLimit: 200, isActive: true },
  { code: 'STYLE200', expiryDate: new Date('2027-02-28T23:59:59.999Z'), discountType: 'fixed', discountValue: 200, minimumPurchase: 1500, usageLimit: 25, isActive: true },
  { code: 'FESTIVE15', expiryDate: new Date('2027-01-31T23:59:59.999Z'), discountType: 'percentage', discountValue: 15, minimumPurchase: 2000, usageLimit: 40, isActive: true },
];

try {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(env.mongoUri, { dbName: env.mongoDb, serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
  for (const coupon of coupons) {
    await Coupon.updateOne({ code: coupon.code }, { $setOnInsert: coupon }, { upsert: true, runValidators: true });
  }
  process.stdout.write(`Coupons ready: ${coupons.map(({ code }) => code).join(', ')}\n`);
} catch (error) {
  process.stderr.write(error.message === 'MONGODB_URI is required.' ? 'MONGODB_URI is required.\n' : 'Could not initialize coupons. Check database configuration and connectivity.\n');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
