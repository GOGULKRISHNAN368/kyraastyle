import asyncHandler from '../utils/asyncHandler.js';
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from '../services/coupons.service.js';

export const list = asyncHandler(async (_request, response) => response.json({ data: await listCoupons() }));
export const create = asyncHandler(async (request, response) => response.status(201).json({ data: await createCoupon(request.body) }));
export const update = asyncHandler(async (request, response) => response.json({ data: await updateCoupon(request.params.id, request.body) }));
export const remove = asyncHandler(async (request, response) => response.json({ data: await deleteCoupon(request.params.id) }));
