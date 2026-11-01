import mongoose from 'mongoose';
import Banner from '../models/Banner.js';
import { buildProductImageUrl } from '../config/cloudinary.js';

export class BannerError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }

function ratio(width, height) { return Number(width) / Number(height); }
function imageUrl(id, width) { return buildProductImageUrl(id, width); }
function asBanner(banner) {
  const item = banner.toObject ? banner.toObject() : banner;
  return { ...item, desktopImageUrl: imageUrl(item.desktopCloudinaryId, item.desktopWidth), mobileImageUrl: imageUrl(item.mobileCloudinaryId, item.mobileWidth) };
}

function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BannerError('Banner details must be an object.');
  const fields = ['desktopCloudinaryId', 'desktopWidth', 'desktopHeight', 'mobileCloudinaryId', 'mobileWidth', 'mobileHeight'];
  if (fields.some((field) => input[field] === undefined || input[field] === null || input[field] === '')) throw new BannerError('Upload both desktop and mobile banner images.');
  const desktopWidth = Number(input.desktopWidth); const desktopHeight = Number(input.desktopHeight);
  const mobileWidth = Number(input.mobileWidth); const mobileHeight = Number(input.mobileHeight);
  if (!Number.isInteger(desktopWidth) || !Number.isInteger(desktopHeight) || desktopWidth < 1200 || desktopHeight < 400 || ratio(desktopWidth, desktopHeight) < 2.4 || ratio(desktopWidth, desktopHeight) > 3.3) throw new BannerError('Desktop banner should be at least 1200 × 400 and use a wide 2.4:1–3.3:1 ratio (recommended 1920 × 678).');
  if (!Number.isInteger(mobileWidth) || !Number.isInteger(mobileHeight) || mobileWidth < 720 || mobileHeight < 720 || ratio(mobileWidth, mobileHeight) < .8 || ratio(mobileWidth, mobileHeight) > 1.2) throw new BannerError('Mobile banner should be at least 720 × 720 and close to square (recommended 1080 × 1080).');
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const link = typeof input.link === 'string' ? input.link.trim() : '';
  if (title.length > 120 || link.length > 2048) throw new BannerError('Banner text is too long.');
  return { title, link, desktopCloudinaryId: String(input.desktopCloudinaryId).trim(), desktopWidth, desktopHeight, mobileCloudinaryId: String(input.mobileCloudinaryId).trim(), mobileWidth, mobileHeight, position: Number.isInteger(Number(input.position)) && Number(input.position) >= 0 ? Number(input.position) : 0, isActive: input.isActive !== false };
}

export async function listBanners() { return (await Banner.find().sort({ position: 1, createdAt: -1 }).lean()).map(asBanner); }
export async function createBanner(input) { return asBanner(await Banner.create(validate(input))); }
export async function deleteBanner(id) { if (!mongoose.isValidObjectId(id)) throw new BannerError('Banner not found.', 404); const result = await Banner.deleteOne({ _id: id }); if (!result.deletedCount) throw new BannerError('Banner not found.', 404); return { deleted: true }; }
