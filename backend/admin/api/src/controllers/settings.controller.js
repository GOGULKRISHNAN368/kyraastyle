import asyncHandler from '../utils/asyncHandler.js';
import { getProductCategories } from '../services/settings.service.js';

export const productCategories = asyncHandler(async (_request, response) => {
  response.json({ data: await getProductCategories() });
});
