(() => {
  'use strict';

  const scriptUrl = document.currentScript?.src || window.location.href;
  const loginUrl = new URL('store/login.html', scriptUrl);
  const configuredApi = typeof window.KYRAA_API_URL === 'string' && window.KYRAA_API_URL.trim();
  const apiBase = (configuredApi ? window.KYRAA_API_URL : (window.location.port === '3000' ? window.location.origin : 'http://localhost:3000')).replace(/\/$/, '');
  let sessionPromise;

  function currentPath() { return `${window.location.pathname}${window.location.search}${window.location.hash}`; }

  function redirectToLogin(next = currentPath()) {
    const url = new URL(loginUrl);
    url.searchParams.set('next', next);
    window.location.assign(url.href);
  }

  async function request(path, options = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const body = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Unable to complete your request.');
    return body;
  }

  function getSession({ refresh = false } = {}) {
    if (!sessionPromise || refresh) {
      sessionPromise = request('/api/customer/session').then(({ data }) => data).catch(() => null);
    }
    return sessionPromise;
  }

  async function requireLogin(next) {
    const customer = await getSession();
    if (customer) return customer;
    redirectToLogin(next);
    return null;
  }

  async function login(email, password) {
    const result = await request('/api/customer/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    sessionPromise = Promise.resolve(result.data);
    return result.data;
  }

  async function register(fields) {
    const result = await request('/api/customer/register', { method: 'POST', body: JSON.stringify(fields) });
    sessionPromise = Promise.resolve(result.data);
    return result.data;
  }

  async function logout() {
    await request('/api/customer/logout', { method: 'POST' });
    sessionPromise = Promise.resolve(null);
  }

  window.KyraaCustomerAuth = { apiBase, getSession, requireLogin, login, register, logout, redirectToLogin };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || link.target || event.defaultPrevented) return;
    const destination = new URL(link.href, window.location.href);
    if (!/\/store\/cart\.html$/i.test(destination.pathname)) return;
    event.preventDefault();
    requireLogin(destination.pathname + destination.search + destination.hash).then((customer) => {
      if (customer) window.location.assign(destination.href);
    });
  });

  if (/\/store\/(cart|checkout)\.html$/i.test(window.location.pathname)) {
    requireLogin();
  }
})();
