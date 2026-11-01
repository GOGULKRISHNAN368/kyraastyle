import asyncHandler from '../utils/asyncHandler.js';
import { createLead, listLeads, setLeadVerified } from '../services/leads.service.js';

export const list = asyncHandler(async (_request, response) => response.json({ data: await listLeads() }));
export const create = asyncHandler(async (request, response) => response.status(201).json({ data: await createLead(request.body) }));
export const setVerified = asyncHandler(async (request, response) => response.json({ data: await setLeadVerified(request.params.id, request.body?.isVerified) }));
