const apiBase = import.meta.env.DEV ? '/admin-api' : (import.meta.env.VITE_ADMIN_API_URL || '/admin-api');
export const SESSION_EXPIRED_EVENT = 'admin-session-expired';

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (response.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

async function uploadImage(file, route) {
  const response = await fetch(`${apiBase}${route}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Image-Type': file.type, 'X-File-Name': encodeURIComponent(file.name || 'image') },
    body: file,
  });
  if (response.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Image upload failed (${response.status})`);
  }
  return response.json();
}

export const uploadDressImage = (file) => uploadImage(file, '/media/uploads');
export const uploadCategoryImage = (file) => uploadImage(file, '/media/category-uploads');

export async function uploadReelAsset(file) {
  const response = await fetch(`${apiBase}/media/reel-uploads`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Asset-Type': file.type, 'X-File-Name': encodeURIComponent(file.name || 'reel-asset') },
    body: file,
  });
  if (response.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Video upload failed (${response.status})`);
  }
  return response.json();
}

export const uploadReelVideo = uploadReelAsset;

export const getCurrentAdmin = () => apiRequest('/auth/me');
export const createDevelopmentSession = () => apiRequest('/auth/dev-session');
export const loginAdmin = (email, password) => apiRequest('/auth/login', {
  method: 'POST', body: JSON.stringify({ email, password }),
});
export const logoutAdmin = () => apiRequest('/auth/logout', { method: 'POST' });
