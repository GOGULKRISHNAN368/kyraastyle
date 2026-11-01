import { createHash } from 'node:crypto';
import { getCloudinaryCredentials, getCloudinaryName } from '../config/cloudinary.js';
import { safeCloudinaryMessage } from '../utils/cloudinaryError.js';

export class CloudinaryVideoUploadError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const maxBytes = 10 * 1024 * 1024;
const supportedTypes = new Set(['video/mp4', 'video/quicktime', 'video/mov']);

export function buildReelVideoUrl(publicId) {
  const cloud = getCloudinaryName();
  const id = encodeURIComponent(publicId).replace(/%2F/gi, '/');
  return `https://res.cloudinary.com/${cloud}/video/upload/f_auto,q_auto/${id}`;
}

export function buildReelThumbnailUrl(publicId) {
  const cloud = getCloudinaryName();
  const id = encodeURIComponent(publicId).replace(/%2F/gi, '/');
  return `https://res.cloudinary.com/${cloud}/video/upload/so_0,f_jpg,q_auto,w_600,c_limit/${id}.jpg`;
}

export async function uploadReelVideo(buffer, contentType, fileName = 'kryaa-reel') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new CloudinaryVideoUploadError('Choose an MP4 or MOV video.');
  if (buffer.length > maxBytes) throw new CloudinaryVideoUploadError('Reels must be 10 MB or smaller.', 413);
  if (!supportedTypes.has(contentType)) throw new CloudinaryVideoUploadError('Choose an MP4 or MOV video.', 415);

  const { apiKey, apiSecret, cloudName } = getCloudinaryCredentials();
  const folder = 'kryaastyle/reels';
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: contentType }), fileName.replace(/[\\/\0]/g, '_').slice(0, 120));
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  let result;
  let cloudinaryCredentials;
  try {
    cloudinaryCredentials = { apiKey, apiSecret };
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, { method: 'POST', body: form });
    result = await response.json().catch(() => ({}));
    if (!response.ok || !result.public_id) {
      const reason = String(result?.error?.message || '');
      if (/signature/i.test(reason)) throw new CloudinaryVideoUploadError('Cloudinary rejected the reel upload signature. Check CLOUDINARY_URL in the admin API environment.', 502);
      if (/invalid api key|authentication|unauthorized/i.test(reason)) throw new CloudinaryVideoUploadError('Cloudinary rejected the admin credentials. Check CLOUDINARY_URL in the admin API environment.', 502);
      if (/file size|too large|maximum/i.test(reason)) throw new CloudinaryVideoUploadError('This video is above the upload service limit.', 413);
      if (/unsupported|format/i.test(reason)) throw new CloudinaryVideoUploadError('Cloudinary does not support this video format.', 415);
      throw new CloudinaryVideoUploadError(`Cloudinary upload failed: ${safeCloudinaryMessage(reason, cloudinaryCredentials)}`, 502);
    }
  } catch (error) {
    if (error instanceof CloudinaryVideoUploadError) throw error;
    throw new CloudinaryVideoUploadError('Cloudinary could not be reached. Try again.', 502);
  }

  return {
    videoPublicId: result.public_id,
    videoUrl: buildReelVideoUrl(result.public_id),
    thumbnailUrl: buildReelThumbnailUrl(result.public_id),
    duration: Number(result.duration) || 0,
  };
}
