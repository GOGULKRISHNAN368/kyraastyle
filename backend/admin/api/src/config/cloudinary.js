import { env } from './env.js';

export function getCloudinaryName() {
  const match = /^cloudinary:\/\/[^@]+@([^/?#]+)/i.exec(env.cloudinaryUrl || '');
  const cloudName = match?.[1] || env.cloudinaryCloudName;
  if (!cloudName) throw new Error('Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME.');
  return cloudName;
}

export function getCloudinaryCredentials() {
  const match = /^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/i.exec(env.cloudinaryUrl || '');
  if (match) return { apiKey: decodeURIComponent(match[1]), apiSecret: decodeURIComponent(match[2]), cloudName: match[3] };
  if (env.cloudinaryApiKey && env.cloudinaryApiSecret && env.cloudinaryCloudName) {
    return { apiKey: env.cloudinaryApiKey, apiSecret: env.cloudinaryApiSecret, cloudName: env.cloudinaryCloudName };
  }
  throw new Error('Cloudinary is not configured. Set CLOUDINARY_URL or the CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, and CLOUDINARY_CLOUD_NAME values.');
}

export function buildProductImageUrl(cloudinaryId, width = 800) {
  const cloud = getCloudinaryName();
  const publicId = encodeURIComponent(cloudinaryId).replace(/%2F/gi, '/');
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto:best,c_limit,w_${width}/${publicId}`;
}
