(() => {
  'use strict';
  const localHost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const servedByLocalDevServer = location.port === '8000';
  const localApi = `${location.protocol}//${location.hostname}:3000`;
  const apiBase = String(window.KYRAA_API_URL || (localHost || servedByLocalDevServer ? localApi : location.origin)).replace(/\/$/, '');

  async function request(path, options = {}) {
    const response = await fetch(`${apiBase}/api/shop${path}`, {
      credentials: 'include', headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, ...options,
    });
    if (response.status === 204) return null;
    const body = await response.json();
    if (!response.ok) {
      const error = new Error(body.message || 'Something went wrong.');
      error.status = response.status;
      error.retryAfter = Number(body.retryAfter) || 0;
      throw error;
    }
    return body.data === undefined ? body : body.data;
  }

  async function requestPublic(path, options = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      credentials: 'include', headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, ...options,
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'Something went wrong.');
    return body.data;
  }

  window.KyraaShopAuth = {
    request,
    requestPublic,
    getConfig: () => request('/config'),
    getMe: () => request('/auth/me'),
    sendOtp: (email, phone) => request('/auth/otp', { method: 'POST', body: JSON.stringify({ email, phone }) }),
    verifyOtp: (email, code) => request('/auth/verify', { method: 'POST', body: JSON.stringify({ email, code }) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
  };
})();
