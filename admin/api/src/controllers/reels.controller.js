import asyncHandler from '../utils/asyncHandler.js';
import { createReel, deleteReel, listReels } from '../services/reels.service.js';

export const list = asyncHandler(async (_request, response) => response.json({ data: await listReels() }));
export const create = asyncHandler(async (request, response) => response.status(201).json({ data: await createReel(request.body) }));
export const remove = asyncHandler(async (request, response) => response.json({ data: await deleteReel(request.params.id) }));
