import { apiRequest } from './api.js';

export const fetchReels = (signal) => apiRequest('/reels', { signal });
export const createReel = (data) => apiRequest('/reels', { method: 'POST', body: JSON.stringify(data) });
export const deleteReel = (id) => apiRequest(`/reels/${encodeURIComponent(id)}`, { method: 'DELETE' });
