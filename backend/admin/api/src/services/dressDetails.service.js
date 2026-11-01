import mongoose from 'mongoose';
import DressDetails from '../models/DressDetails.js';

export const DRESS_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

export class DressDetailsError extends Error {
  constructor(message) { super(message); this.status = 400; }
}

export function emptyDressDetails() {
  return {
    oldPrice: null,
    sizes: DRESS_SIZES.map((size) => ({ size, available: false, quantity: 0 })),
    images: [],
    isNewArrival: false,
    isBestSeller: false,
    isCuratedLook: false,
  };
}

function publicDetails(document) {
  const defaults = emptyDressDetails();
  return {
    oldPrice: document?.oldPrice ?? defaults.oldPrice,
    sizes: document?.sizes?.length ? document.sizes : defaults.sizes,
    images: Array.isArray(document?.images) ? document.images : [],
    isNewArrival: Boolean(document?.isNewArrival),
    isBestSeller: Boolean(document?.isBestSeller),
    isCuratedLook: Boolean(document?.isCuratedLook),
  };
}

export function validateDressDetails(input, existing = emptyDressDetails()) {
  const result = {
    oldPrice: existing.oldPrice ?? null,
    sizes: existing.sizes?.length ? existing.sizes : emptyDressDetails().sizes,
    images: Array.isArray(existing.images) ? existing.images : [],
    isNewArrival: Boolean(existing.isNewArrival),
    isBestSeller: Boolean(existing.isBestSeller),
    isCuratedLook: Boolean(existing.isCuratedLook),
  };
  if (Object.hasOwn(input, 'oldPrice')) {
    if (input.oldPrice === null || input.oldPrice === '') result.oldPrice = null;
    else {
      const oldPrice = Number(input.oldPrice);
      if (!Number.isFinite(oldPrice) || oldPrice < 0) throw new DressDetailsError('Old price must be zero or greater.');
      result.oldPrice = oldPrice;
    }
  }
  if (Object.hasOwn(input, 'sizes')) {
    if (!Array.isArray(input.sizes)) throw new DressDetailsError('Size stock must be a list.');
    const bySize = new Map();
    for (const entry of input.sizes) {
      if (!entry || !DRESS_SIZES.includes(entry.size) || bySize.has(entry.size)) throw new DressDetailsError('Size stock contains an invalid or duplicate size.');
      if (typeof entry.available !== 'boolean') throw new DressDetailsError('Size availability must be true or false.');
      const quantity = Number(entry.quantity);
      if (!Number.isInteger(quantity) || quantity < 0) throw new DressDetailsError('Stock quantities must be non-negative whole numbers.');
      bySize.set(entry.size, { size: entry.size, available: entry.available, quantity: entry.available ? quantity : 0 });
    }
    if (bySize.size !== DRESS_SIZES.length) throw new DressDetailsError('Provide stock details for every dress size.');
    result.sizes = DRESS_SIZES.map((size) => bySize.get(size));
  }
  if (Object.hasOwn(input, 'images')) {
    if (!Array.isArray(input.images) || input.images.length > 20) throw new DressDetailsError('Add no more than 20 gallery images.');
    result.images = input.images.map((image) => {
      if (!image || typeof image.cloudinaryId !== 'string' || !image.cloudinaryId.trim() || image.cloudinaryId.length > 255) {
        throw new DressDetailsError('Gallery images need a valid Cloudinary Public ID.');
      }
      const width = Number(image.width || 800);
      const height = Number(image.height || 0);
      if (!Number.isInteger(width) || width < 1 || width > 12000 || !Number.isInteger(height) || height < 0 || height > 12000) {
        throw new DressDetailsError('Gallery image dimensions are invalid.');
      }
      return { cloudinaryId: image.cloudinaryId.trim(), width, height };
    });
  }
  for (const field of ['isNewArrival', 'isBestSeller', 'isCuratedLook']) {
    if (Object.hasOwn(input, field)) {
      if (typeof input[field] !== 'boolean') throw new DressDetailsError(`${field} must be true or false.`);
      result[field] = input[field];
    }
  }
  return result;
}

export async function saveDressDetails(productId, details) {
  if (!mongoose.isValidObjectId(productId)) throw new Error('Product ID is invalid.');
  return DressDetails.findByIdAndUpdate(productId, { $set: details }, { new: true, upsert: true, runValidators: true }).lean();
}

export async function getDressDetails(productId) {
  if (!mongoose.isValidObjectId(productId)) return emptyDressDetails();
  const details = await DressDetails.findById(productId).lean();
  return publicDetails(details);
}

export async function getDressDetailsMap(productIds) {
  if (!productIds.length) return new Map();
  const documents = await DressDetails.find({ _id: { $in: productIds } }).lean();
  return new Map(documents.map((document) => [String(document._id), publicDetails(document)]));
}
