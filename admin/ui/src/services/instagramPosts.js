import { apiRequest } from './api.js';

export const fetchInstagramPosts = (signal) => apiRequest('/instagram-posts', { signal });
export const deleteInstagramPost = (id) => apiRequest(`/instagram-posts/${encodeURIComponent(id)}`, { method: 'DELETE' });

export async function uploadInstagramPost(file) {
  const apiBase = import.meta.env.DEV ? '/admin-api' : (import.meta.env.VITE_ADMIN_API_URL || '/admin-api');
  const response = await fetch(`${apiBase}/instagram-posts`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Image-Type': file.type, 'X-File-Name': encodeURIComponent(file.name || 'instagram-post') },
    body: file,
  });
  if (response.status === 401) window.dispatchEvent(new Event('admin-session-expired'));
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Image upload failed (${response.status})`);
  }
  return response.json();
}
