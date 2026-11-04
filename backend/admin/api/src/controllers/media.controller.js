import asyncHandler from '../utils/asyncHandler.js';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { buildProductImageUrl } from '../config/cloudinary.js';
import { CloudinaryUploadError, uploadBannerImage, uploadCategoryImage, uploadDressImage, uploadReelImage } from '../services/cloudinaryUpload.service.js';
import { uploadReelVideo } from '../services/cloudinaryVideoUpload.service.js';

async function upload(request, response, uploader) {
  const contentType = request.get('X-Image-Type') || '';
  let fileName = 'dress-image';
  try { fileName = decodeURIComponent(request.get('X-File-Name') || fileName); } catch { /* Keep the safe fallback for malformed optional names. */ }
  if (!Buffer.isBuffer(request.body)) throw new CloudinaryUploadError('Choose an image to upload.');
  response.status(201).json({ data: await uploader(request.body, contentType, fileName) });
}

export const uploadDressImageController = asyncHandler(async (request, response) => upload(request, response, uploadDressImage));
export const uploadCategoryImageController = asyncHandler(async (request, response) => upload(request, response, uploadCategoryImage));
export const uploadBannerImageController = asyncHandler(async (request, response) => upload(request, response, uploadBannerImage));

export const listMediaLibraryController = asyncHandler(async (_request, response) => {
  const [products, uploaded] = await Promise.all([
    Product.find({ mergedInto: { $exists: false } }).select('name cloudinaryId imageUrl width height alt images').lean(),
    mongoose.connection.db.collection('media').find({ resourceType: 'image' }).sort({ createdAt: -1 }).limit(300).toArray(),
  ]);
  const byPublicId = new Map();
  for (const product of products) {
    const images = Array.isArray(product.images) && product.images.length ? product.images : [{
      publicId: product.cloudinaryId, width: product.width, height: product.height, alt: product.alt || product.name,
    }];
    for (const image of images) {
      const publicId = image.publicId || image.cloudinaryId;
      if (!publicId || byPublicId.has(publicId)) continue;
      byPublicId.set(publicId, {
        publicId, width: image.width || 800, height: image.height || 0,
        alt: image.alt || product.name, imageUrl: buildProductImageUrl(publicId, image.width || 800),
      });
    }
  }
  for (const asset of uploaded) {
    if (!asset.cloudinaryId || byPublicId.has(asset.cloudinaryId)) continue;
    byPublicId.set(asset.cloudinaryId, {
      publicId: asset.cloudinaryId, width: asset.width || 800, height: asset.height || 0,
      alt: asset.title || asset.cloudinaryId, imageUrl: asset.cloudinaryUrl || buildProductImageUrl(asset.cloudinaryId, asset.width || 800),
    });
  }
  return response.json({ data: [...byPublicId.values()].slice(0, 300) });
});

export const uploadReelAssetController = asyncHandler(async (request, response) => {
  const contentType = request.get('X-Asset-Type') || '';
  let fileName = 'kryaa-reel';
  try { fileName = decodeURIComponent(request.get('X-File-Name') || fileName); } catch { /* Keep the safe fallback for malformed optional names. */ }
  if (!Buffer.isBuffer(request.body)) throw new CloudinaryUploadError('Choose an image, MP4, or MOV file.');
  if (contentType.startsWith('image/')) {
    const uploaded = await uploadReelImage(request.body, contentType, fileName);
    return response.status(201).json({ data: { mediaType: 'image', assetPublicId: uploaded.cloudinaryId, mediaUrl: uploaded.imageUrl, thumbnailUrl: uploaded.imageUrl, duration: 0 } });
  }
  const uploaded = await uploadReelVideo(request.body, contentType, fileName);
  return response.status(201).json({ data: { mediaType: 'video', assetPublicId: uploaded.videoPublicId, mediaUrl: uploaded.videoUrl, thumbnailUrl: uploaded.thumbnailUrl, duration: uploaded.duration } });
});
