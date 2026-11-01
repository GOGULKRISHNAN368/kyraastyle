import { apiRequest } from './api.js';

export const fetchCoupons = (signal) => apiRequest('/coupons', { signal });
export const createCoupon = (data) => apiRequest('/coupons', { method: 'POST', body: JSON.stringify(data) });
export const updateCoupon = (id, data) => apiRequest(`/coupons/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCoupon = (id) => apiRequest(`/coupons/${encodeURIComponent(id)}`, { method: 'DELETE' });
