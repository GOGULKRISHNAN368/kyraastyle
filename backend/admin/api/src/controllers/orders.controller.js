import asyncHandler from '../utils/asyncHandler.js';
import { createOrder, listOrders, updateOrder } from '../services/orders.service.js';

export const list = asyncHandler(async (request, response) => response.json({ data: await listOrders({ status: request.query.status, search: request.query.search }) }));
export const create = asyncHandler(async (request, response) => response.status(201).json({ data: await createOrder(request.body) }));
export const update = asyncHandler(async (request, response) => response.json({ data: await updateOrder(request.params.id, request.body) }));
