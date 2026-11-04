import { apiRequest } from './api.js';

export const fetchOrders = (filters = {}, signal) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== '' && value !== undefined && value !== null) query.set(key, String(value));
  return apiRequest(`/orders?${query}`, { signal });
};
export const fetchOrder = (orderNumber) => apiRequest(`/orders/${encodeURIComponent(orderNumber)}`);
export const updateOrderStatus = (orderNumber, data) => apiRequest(`/orders/${encodeURIComponent(orderNumber)}/status`, { method: 'PATCH', body: JSON.stringify(data) });
export const updateCourier = (orderNumber, data) => apiRequest(`/orders/${encodeURIComponent(orderNumber)}/courier`, { method: 'PATCH', body: JSON.stringify(data) });
export const updatePayment = (orderNumber, data) => apiRequest(`/orders/${encodeURIComponent(orderNumber)}/payment`, { method: 'PATCH', body: JSON.stringify(data) });
export const updateAdminNote = (orderNumber, data) => apiRequest(`/orders/${encodeURIComponent(orderNumber)}/note`, { method: 'PATCH', body: JSON.stringify(data) });
