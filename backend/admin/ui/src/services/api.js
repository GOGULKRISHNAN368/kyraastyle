const apiBase = import.meta.env.DEV ? '/admin-api' : (import.meta.env.VITE_ADMIN_API_URL || '/admin-api');
export const SESSION_EXPIRED_EVENT = 'admin-session-expired';
let authDisabledMode = false;

export function setAuthDisabledMode(value) {
  authDisabledMode = value === true;
}

export async function getAuthMode() {
  const response = await fetch('/api/admin/auth-mode', { credentials: 'omit' });
  if (!response.ok) throw new Error(`Could not read admin auth mode (${response.status})`);
  const mode = await response.json();
  return { authDisabled: mode.authDisabled === true };
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: authDisabledMode ? 'omit' : 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message || `Request failed (${response.status})`);
    error.status = response.status;
    if (response.status === 401 && !path.startsWith('/auth/login') && !authDisabledMode) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

async function uploadImage(file, route) {
  const response = await fetch(`${apiBase}${route}`, {
    method: 'POST',
    credentials: authDisabledMode ? 'omit' : 'include',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Image-Type': file.type, 'X-File-Name': encodeURIComponent(file.name || 'image') },
    body: file,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Image upload failed (${response.status})`);
  }
  return response.json();
}

export const uploadDressImage = (file) => uploadImage(file, '/media/uploads');
export const fetchMediaLibrary = () => apiRequest('/media/library');
export const uploadCategoryImage = (file) => uploadImage(file, '/media/category-uploads');
export const uploadBannerImage = (file) => uploadImage(file, '/media/banner-uploads');

export async function uploadReelAsset(file) {
  const response = await fetch(`${apiBase}/media/reel-uploads`, {
    method: 'POST', credentials: authDisabledMode ? 'omit' : 'include',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Asset-Type': file.type, 'X-File-Name': encodeURIComponent(file.name || 'reel-asset') },
    body: file,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Video upload failed (${response.status})`);
  }
  return response.json();
}

export const uploadReelVideo = uploadReelAsset;

export const getCurrentAdmin = () => apiRequest('/auth/me');
export const loginAdmin = (email, password) => apiRequest('/auth/login', {
  method: 'POST', body: JSON.stringify({ email, password }),
});
export const logoutAdmin = () => apiRequest('/auth/logout', { method: 'POST' });
