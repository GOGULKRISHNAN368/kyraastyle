import { apiRequest } from './api.js';

export const fetchOrders = (filters = {}, signal) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== '' && value !== undefined && value !== null) query.set(key, String(value));
  return apiRequest(`/orders?${query}`, { signal });
};

export const updateOrder = (id, data) => apiRequest(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
