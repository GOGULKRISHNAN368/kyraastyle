import { apiRequest } from './api.js';
export const fetchBanners = (signal) => apiRequest('/banners', { signal });
export const createBanner = (data) => apiRequest('/banners', { method: 'POST', body: JSON.stringify(data) });
export const deleteBanner = (id) => apiRequest(`/banners/${encodeURIComponent(id)}`, { method: 'DELETE' });
