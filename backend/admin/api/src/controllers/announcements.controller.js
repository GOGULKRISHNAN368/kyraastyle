import asyncHandler from '../utils/asyncHandler.js';
import { createAnnouncement, listAnnouncements, removeAnnouncement } from '../services/announcements.service.js';

export const list = asyncHandler(async (_request, response) => response.json({ data: await listAnnouncements() }));
export const create = asyncHandler(async (request, response) => response.status(201).json({ data: await createAnnouncement(request.body) }));
export const remove = asyncHandler(async (request, response) => response.json(await removeAnnouncement(request.params.id)));
