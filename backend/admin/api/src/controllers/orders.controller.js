import asyncHandler from '../utils/asyncHandler.js';
import { getOrder, listOrders, updateOrderStatus, updateCourier as saveCourier, updatePayment as savePayment, updateAdminNote as saveNote } from '../services/orders.service.js';

export const list = asyncHandler(async (request, response) => response.json({ data: await listOrders(request.query) }));
export const get = asyncHandler(async (request, response) => response.json({ data: await getOrder(request.params.orderNumber) }));
export const updateStatus = asyncHandler(async (request, response) => response.json({ data: await updateOrderStatus(request.params.orderNumber, request.body, request.adminUser) }));
export const updateCourier = asyncHandler(async (request, response) => response.json({ data: await saveCourier(request.params.orderNumber, request.body) }));
export const updatePayment = asyncHandler(async (request, response) => response.json({ data: await savePayment(request.params.orderNumber, request.body) }));
export const updateNote = asyncHandler(async (request, response) => response.json({ data: await saveNote(request.params.orderNumber, request.body) }));
