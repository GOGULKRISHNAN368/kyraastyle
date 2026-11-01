import { createHash } from 'node:crypto';
import { buildProductImageUrl, getCloudinaryCredentials } from '../config/cloudinary.js';
import { safeCloudinaryMessage } from '../utils/cloudinaryError.js';

const folder = 'kryaastyle/dresses';

export class CloudinaryUploadError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

async function uploadImage(buffer, contentType, fileName, folder) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new CloudinaryUploadError('Choose an image to upload.');
  if (buffer.length > 100 * 1024 * 1024) throw new CloudinaryUploadError('This image is too large to upload.');
  if (typeof contentType !== 'string' || !contentType.startsWith('image/')) throw new CloudinaryUploadError('Choose an image file.');

  const { apiKey, apiSecret, cloudName } = getCloudinaryCredentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: contentType }), fileName.replace(/[\\/\0]/g, '_').slice(0, 120));
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  let cloudinaryResponse;
  try {
    cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
  } catch {
    throw new CloudinaryUploadError('Cloudinary could not be reached. Try again.', 502);
  }
  const result = await cloudinaryResponse.json().catch(() => ({}));
  if (!cloudinaryResponse.ok || !result.public_id) {
    const cloudinaryMessage = String(result?.error?.message || '');
    if (/invalid signature|signature/i.test(cloudinaryMessage)) {
      throw new CloudinaryUploadError('Cloudinary rejected the upload signature. Check CLOUDINARY_URL in the admin API environment.', 502);
    }
    if (/invalid api key|authentication|unauthorized/i.test(cloudinaryMessage)) {
      throw new CloudinaryUploadError('Cloudinary rejected the admin credentials. Check CLOUDINARY_URL in the admin API environment.', 502);
    }
    if (/file size|too large|maximum/i.test(cloudinaryMessage)) {
      throw new CloudinaryUploadError('This image is above the upload service limit.', 413);
    }
    if (/unsupported|format/i.test(cloudinaryMessage)) {
      throw new CloudinaryUploadError('Cloudinary does not support this image format.', 415);
    }
    throw new CloudinaryUploadError(`Cloudinary upload failed: ${safeCloudinaryMessage(cloudinaryMessage, { apiKey, apiSecret })}`, 502);
  }
  return {
    cloudinaryId: result.public_id,
    width: Number(result.width) || 800,
    height: Number(result.height) || 0,
    imageUrl: buildProductImageUrl(result.public_id, Number(result.width) || 800),
  };
}

export const uploadDressImage = (buffer, contentType, fileName = 'dress-image') =>
  uploadImage(buffer, contentType, fileName, 'kryaastyle/dresses');

export const uploadCategoryImage = (buffer, contentType, fileName = 'category-image') =>
  uploadImage(buffer, contentType, fileName, 'kryaastyle/categories');

export const uploadReelImage = (buffer, contentType, fileName = 'kryaa-reel') =>
  uploadImage(buffer, contentType, fileName, 'kryaastyle/reels');
