import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Reel from '../models/Reel.js';
import { getProductCategories } from './settings.service.js';
import { buildReelThumbnailUrl, buildReelVideoUrl } from './cloudinaryVideoUpload.service.js';
import { buildProductImageUrl } from '../config/cloudinary.js';

export class ReelError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function asReel(reel) {
  const item = reel.toObject ? reel.toObject() : { ...reel };
  const mediaType = item.mediaType || 'video';
  const mediaUrl = mediaType === 'image' ? buildProductImageUrl(item.assetPublicId, 800) : buildReelVideoUrl(item.assetPublicId);
  return {
    ...item,
    mediaType,
    mediaUrl,
    thumbnailUrl: mediaType === 'image' ? mediaUrl : buildReelThumbnailUrl(item.assetPublicId),
    productId: item.productId ? String(item.productId) : null,
  };
}

export async function listReels() {
  const reels = await Reel.find({ isActive: { $ne: false } }).sort({ createdAt: -1 }).lean();
  const productIds = [...new Set(reels.map((item) => item.productId).filter(Boolean).map(String))];
  const products = productIds.length ? await Product.find({ _id: { $in: productIds } }).select('name category').lean() : [];
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  return reels.map((item) => {
    const product = item.productId ? productMap.get(String(item.productId)) : null;
    return {
      ...asReel(item),
      productName: product?.name || item.productName || 'Unknown Dress',
      category: product?.category || item.category,
    };
  });
}

export async function createReel(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ReelError('Reel details must be an object.');
  const categories = await getProductCategories();
  if (typeof input.category !== 'string' || !categories.includes(input.category)) throw new ReelError('Choose a category from the available list.');
  const mediaType = input.mediaType || 'video';
  if (!['image', 'video'].includes(mediaType)) throw new ReelError('Choose an image or video for the reel.');
  if (typeof input.assetPublicId !== 'string' || !input.assetPublicId.trim() || input.assetPublicId.length > 255) throw new ReelError('Upload an image or video before publishing the reel.');
  let product = null;
  if (input.productId) {
    if (!mongoose.isValidObjectId(input.productId)) throw new ReelError('Choose a valid dress.');
    product = await Product.findById(input.productId).select('name category').lean();
    if (!product) throw new ReelError('The selected dress could not be found.', 404);
    if (product.category !== input.category) throw new ReelError('Choose a dress from the selected category.');
  }
  const duration = Number(input.duration || 0);
  if (!Number.isFinite(duration) || duration < 0) throw new ReelError('Reel duration is invalid.');
  const reel = await Reel.create({
    category: input.category,
    productId: product?._id || null,
    productName: product?.name || 'Unknown Dress',
    mediaType,
    assetPublicId: input.assetPublicId.trim(),
    mediaUrl: mediaType === 'image' ? buildProductImageUrl(input.assetPublicId.trim(), 800) : buildReelVideoUrl(input.assetPublicId.trim()),
    thumbnailUrl: mediaType === 'image' ? buildProductImageUrl(input.assetPublicId.trim(), 800) : buildReelThumbnailUrl(input.assetPublicId.trim()),
    duration,
  });
  return asReel(reel);
}

export async function deleteReel(id) {
  if (!mongoose.isValidObjectId(id)) throw new ReelError('Reel not found.', 404);
  const result = await Reel.deleteOne({ _id: id });
  if (!result.deletedCount) throw new ReelError('Reel not found.', 404);
  return { deleted: true };
}
