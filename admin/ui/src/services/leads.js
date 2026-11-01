import { apiRequest } from './api.js';

export const fetchLeads = (signal) => apiRequest('/leads', { signal });
export const createLead = (data) => apiRequest('/leads', { method: 'POST', body: JSON.stringify(data) });
export const setLeadVerified = (id, isVerified) => apiRequest(`/leads/${encodeURIComponent(id)}/verified`, { method: 'PATCH', body: JSON.stringify({ isVerified }) });
