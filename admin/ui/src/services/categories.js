import { apiRequest } from './api.js';

export const fetchCategories = (signal) => apiRequest('/categories', { signal });
export const createCategory = (data) => apiRequest('/categories', { method: 'POST', body: JSON.stringify(data) });
export const updateCategory = (id, data) => apiRequest(`/categories/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCategory = (id) => apiRequest(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
