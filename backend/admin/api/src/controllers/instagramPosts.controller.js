import { createReadStream } from 'node:fs';
import asyncHandler from '../utils/asyncHandler.js';
import { createInstagramPost, deleteInstagramPost, getInstagramPostFile, listInstagramPosts } from '../services/instagramPosts.service.js';

export const list = asyncHandler(async (_request, response) => response.json({ data: await listInstagramPosts() }));

export const create = asyncHandler(async (request, response) => {
  const post = await createInstagramPost(request.body, request.get('X-Image-Type') || '', request.get('X-File-Name') || '');
  response.status(201).json({ data: post });
});

export const image = asyncHandler(async (request, response) => {
  const { filePath, mimeType } = await getInstagramPostFile(request.params.id);
  response.set({ 'Content-Type': mimeType, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
  createReadStream(filePath).on('error', () => { if (!response.headersSent) response.sendStatus(404); }).pipe(response);
});

export const remove = asyncHandler(async (request, response) => response.json({ data: await deleteInstagramPost(request.params.id) }));
