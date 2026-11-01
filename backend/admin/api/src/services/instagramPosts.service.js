import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import InstagramPost from '../models/InstagramPost.js';

const storageDirectory = fileURLToPath(new URL('../../uploads/instagram/', import.meta.url));
const formats = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/avif', 'avif'],
]);

export class InstagramPostError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function asPost(post) {
  return {
    id: String(post._id),
    originalName: post.originalName,
    mimeType: post.mimeType,
    createdAt: post.createdAt,
    imageUrl: `/admin-api/instagram-posts/${post._id}/image`,
  };
}

export async function listInstagramPosts() {
  const posts = await InstagramPost.find().sort({ position: 1, createdAt: -1 }).lean();
  return posts.map(asPost);
}

export async function createInstagramPost(buffer, mimeType, originalName = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new InstagramPostError('Choose an image to upload.');
  if (buffer.length > 100 * 1024 * 1024) throw new InstagramPostError('This image is too large to upload.', 413);
  const extension = formats.get(mimeType);
  if (!extension) throw new InstagramPostError('Choose a JPEG, PNG, WebP, or AVIF image.', 415);
  const _id = new mongoose.Types.ObjectId();
  const fileName = `${_id}.${extension}`;
  await mkdir(storageDirectory, { recursive: true });
  const filePath = path.join(storageDirectory, fileName);
  try {
    await writeFile(filePath, buffer, { flag: 'wx' });
    const post = await InstagramPost.create({ _id, fileName, originalName: path.basename(originalName).slice(0, 255), mimeType });
    return asPost(post);
  } catch (error) {
    await unlink(filePath).catch(() => {});
    throw error;
  }
}

export async function getInstagramPostFile(id) {
  if (!mongoose.isValidObjectId(id)) throw new InstagramPostError('Post not found.', 404);
  const post = await InstagramPost.findById(id).lean();
  if (!post) throw new InstagramPostError('Post not found.', 404);
  return { filePath: path.join(storageDirectory, post.fileName), mimeType: post.mimeType };
}

export async function deleteInstagramPost(id) {
  if (!mongoose.isValidObjectId(id)) throw new InstagramPostError('Post not found.', 404);
  const post = await InstagramPost.findByIdAndDelete(id).lean();
  if (!post) throw new InstagramPostError('Post not found.', 404);
  await unlink(path.join(storageDirectory, post.fileName)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  return { deleted: true };
}
