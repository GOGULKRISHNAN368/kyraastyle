import asyncHandler from '../utils/asyncHandler.js';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../services/categories.service.js';

export const list = asyncHandler(async (_request, response) => response.json({ data: await listCategories() }));
export const create = asyncHandler(async (request, response) => response.status(201).json({ data: await createCategory(request.body) }));
export const update = asyncHandler(async (request, response) => response.json({ data: await updateCategory(request.params.key, request.body) }));
export const remove = asyncHandler(async (request, response) => response.json({ data: await deleteCategory(request.params.key) }));
