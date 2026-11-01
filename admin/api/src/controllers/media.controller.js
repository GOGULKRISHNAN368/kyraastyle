import asyncHandler from '../utils/asyncHandler.js';
import { CloudinaryUploadError, uploadCategoryImage, uploadDressImage, uploadReelImage } from '../services/cloudinaryUpload.service.js';
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
