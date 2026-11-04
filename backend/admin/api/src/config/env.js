import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(configDirectory, '..', '..', '.env') });
try {
  const sharedSettings = dotenv.parse(fs.readFileSync(path.resolve(configDirectory, '..', '..', '..', '..', '.env')));
  for (const key of ['MONGODB_URI', 'MONGODB_DB', 'CLOUDINARY_URL', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_CLOUD_NAME']) {
    if (!process.env[key] && sharedSettings[key]) process.env[key] = sharedSettings[key];
  }
} catch {
  // The admin API can use its own .env when the storefront .env is unavailable.
}

export const env = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI,
  mongoDb: process.env.MONGODB_DB || 'test',
  corsOrigin: process.env.CORS_ORIGIN,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  nodeEnv: process.env.NODE_ENV || 'development',
  cloudinaryUrl: process.env.CLOUDINARY_URL,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
};
