import asyncHandler from '../utils/asyncHandler.js';
import {
  bulkUpdateProducts, createProduct, getImagePreview, getProduct, listProducts,
  reorderProducts, setProductActive, softDeleteProduct, updateProduct,
} from '../services/products.service.js';

export const list = asyncHandler(async (request, response) => response.json(await listProducts(request.query)));
export const getOne = asyncHandler(async (request, response) => response.json({ data: await getProduct(request.params.id) }));
export const create = asyncHandler(async (request, response) => response.status(201).json({ data: await createProduct(request.body) }));
export const update = asyncHandler(async (request, response) => response.json({ data: await updateProduct(request.params.id, request.body) }));
export const updateActive = asyncHandler(async (request, response) => {
  if (!request.body || Object.keys(request.body).some((key) => key !== 'isActive')) {
    return response.status(400).json({ message: 'Provide only the isActive field.' });
  }
  return response.json({ data: await setProductActive(request.params.id, request.body.isActive) });
});
export const remove = asyncHandler(async (request, response) => response.json({ data: await softDeleteProduct(request.params.id) }));
export const reorder = asyncHandler(async (request, response) => response.json({ data: await reorderProducts(request.body?.items) }));
export const bulk = asyncHandler(async (request, response) => response.json({ data: await bulkUpdateProducts(request.body || {}) }));
export const preview = asyncHandler(async (request, response) => response.json({ data: { imageUrl: await getImagePreview(request.query.cloudinaryId, request.query.width) } }));
