import asyncHandler from '../utils/asyncHandler.js';
import { createBanner, deleteBanner, listBanners } from '../services/banners.service.js';
export const list = asyncHandler(async (_request, response) => response.json({ data: await listBanners() }));
export const create = asyncHandler(async (request, response) => response.status(201).json({ data: await createBanner(request.body) }));
export const remove = asyncHandler(async (request, response) => response.json({ data: await deleteBanner(request.params.id) }));
