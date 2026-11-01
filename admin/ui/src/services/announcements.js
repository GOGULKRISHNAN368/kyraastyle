import { apiRequest } from './api.js';

export const fetchAnnouncements = (signal) => apiRequest('/announcements', { signal });
export const createAnnouncement = (text) => apiRequest('/announcements', { method: 'POST', body: JSON.stringify({ text }) });
export const removeAnnouncement = (id) => apiRequest(`/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' });
