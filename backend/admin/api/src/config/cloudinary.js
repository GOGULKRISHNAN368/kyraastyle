import { env } from './env.js';

export function getCloudinaryName() {
  const match = /^cloudinary:\/\/[^@]+@([^/?#]+)/i.exec(env.cloudinaryUrl || '');
  if (!match) throw new Error('CLOUDINARY_URL is not configured correctly');
  return match[1];
}

export function getCloudinaryCredentials() {
  const match = /^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/i.exec(env.cloudinaryUrl || '');
  if (!match) throw new Error('CLOUDINARY_URL is not configured correctly');
  return { apiKey: decodeURIComponent(match[1]), apiSecret: decodeURIComponent(match[2]), cloudName: match[3] };
}

export function buildProductImageUrl(cloudinaryId, width = 800) {
  const cloud = getCloudinaryName();
  const publicId = encodeURIComponent(cloudinaryId).replace(/%2F/gi, '/');
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto:best,c_limit,w_${width}/${publicId}`;
}
