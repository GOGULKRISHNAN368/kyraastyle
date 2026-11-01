import asyncHandler from '../utils/asyncHandler.js';
import { listCustomers } from '../services/customers.service.js';

export const list = asyncHandler(async (_request, response) => response.json({ data: await listCustomers() }));
