import { apiRequest } from './api.js';

export function fetchProducts(filters, signal) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== '' && value !== undefined && value !== null) query.set(key, String(value));
  return apiRequest(`/products?${query}`, { signal });
}

export const fetchProductCategories = () => apiRequest('/settings/product-categories');
export const fetchProductPreview = (cloudinaryId, width) => {
  const query = new URLSearchParams({ cloudinaryId, width: String(width || 800) });
  return apiRequest(`/products/image-preview?${query}`);
};
export const createProduct = (data) => apiRequest('/products', { method: 'POST', body: JSON.stringify(data) });
export const updateProduct = (id, data) => apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const setProductActive = (id, isActive) => apiRequest(`/products/${id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
export const reorderProducts = (items) => apiRequest('/products/reorder', { method: 'PATCH', body: JSON.stringify({ items }) });
export const bulkUpdateProducts = (payload) => apiRequest('/products/bulk', { method: 'POST', body: JSON.stringify(payload) });
export const deleteProduct = (id) => apiRequest(`/products/${id}`, { method: 'DELETE' });
