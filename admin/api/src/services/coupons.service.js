import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';
import Product from '../models/Product.js';

export class CouponError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function validate(input, existing = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CouponError('Coupon details must be an object.');
  const code = String(input.code ?? existing.code ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) throw new CouponError('Enter a coupon code using 2–40 letters, numbers, hyphens, or underscores.');
  const discountType = input.discountType ?? existing.discountType;
  if (!['percentage', 'fixed'].includes(discountType)) throw new CouponError('Choose a valid discount type.');
  const discountValue = Number(input.discountValue ?? existing.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'percentage' && discountValue > 100)) {
    throw new CouponError(discountType === 'percentage' ? 'Percentage discount must be between 1 and 100.' : 'Discount value must be greater than zero.');
  }
  const expiryDate = new Date(input.expiryDate ?? existing.expiryDate);
  if (!Number.isFinite(expiryDate.getTime())) throw new CouponError('Enter a valid expiry date.');
  const minimumPurchase = Number(input.minimumPurchase ?? existing.minimumPurchase ?? 0);
  if (!Number.isFinite(minimumPurchase) || minimumPurchase < 0) throw new CouponError('Minimum purchase must be zero or more.');
  const rawLimit = input.usageLimit ?? existing.usageLimit ?? null;
  const usageLimit = rawLimit === '' || rawLimit === null ? null : Number(rawLimit);
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) throw new CouponError('Usage limit must be a positive whole number.');
  const ids = input.applicableProductIds ?? existing.applicableProductIds ?? [];
  if (!Array.isArray(ids) || ids.some((id) => !mongoose.isValidObjectId(id)) || new Set(ids.map(String)).size !== ids.length) {
    throw new CouponError('Choose valid products for this coupon.');
  }
  const isActive = input.isActive ?? existing.isActive ?? true;
  if (typeof isActive !== 'boolean') throw new CouponError('Coupon active status must be true or false.');
  return { code, expiryDate, discountType, discountValue, minimumPurchase, usageLimit, applicableProductIds: ids, isActive };
}

export async function listCoupons() {
  const coupons = await Coupon.find().sort({ createdAt: -1, code: 1 }).lean();
  const ids = [...new Set(coupons.flatMap((coupon) => coupon.applicableProductIds.map(String)))];
  const products = ids.length ? await Product.find({ _id: { $in: ids } }).select('name price').lean() : [];
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  return coupons.map((coupon) => ({
    ...coupon,
    applicableProducts: (coupon.applicableProductIds || []).map((id) => productMap.get(String(id))).filter(Boolean),
  }));
}

export async function createCoupon(input) {
  const values = validate(input);
  if (await Coupon.exists({ code: values.code })) throw new CouponError('That coupon code already exists.', 409);
  const validCount = await Product.countDocuments({ _id: { $in: values.applicableProductIds } });
  if (validCount !== values.applicableProductIds.length) throw new CouponError('One or more selected products no longer exist.', 400);
  try { return await Coupon.create(values); }
  catch (error) {
    if (error.code === 11000) throw new CouponError('That coupon code already exists.', 409);
    throw error;
  }
}

export async function updateCoupon(id, input) {
  if (!mongoose.isValidObjectId(id)) throw new CouponError('Coupon not found.', 404);
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new CouponError('Coupon not found.', 404);
  const values = validate(input, coupon.toObject());
  if (await Coupon.exists({ code: values.code, _id: { $ne: coupon._id } })) throw new CouponError('That coupon code already exists.', 409);
  const validCount = await Product.countDocuments({ _id: { $in: values.applicableProductIds } });
  if (validCount !== values.applicableProductIds.length) throw new CouponError('One or more selected products no longer exist.', 400);
  Object.assign(coupon, values);
  try { return await coupon.save(); }
  catch (error) {
    if (error.code === 11000) throw new CouponError('That coupon code already exists.', 409);
    throw error;
  }
}

export async function deleteCoupon(id) {
  if (!mongoose.isValidObjectId(id)) throw new CouponError('Coupon not found.', 404);
  const result = await Coupon.deleteOne({ _id: id });
  if (!result.deletedCount) throw new CouponError('Coupon not found.', 404);
  return { deleted: true };
}
