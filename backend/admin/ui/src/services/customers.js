import { apiRequest } from './api.js';

export const fetchCustomers = (signal) => apiRequest('/customers', { signal });
