(() => {
  'use strict';

  const configured = String(window.KYRAA_API_URL || '').replace(/\/$/, '');
  const apiBase = configured || (window.location.port === '3000' ? window.location.origin : 'http://localhost:3000');
  let content = null;
  let pendingRequest = null;
  let refreshTimer = 0;

  function publish(next) {
    content = next;
    window.dispatchEvent(new CustomEvent('kyraa:storefront-content', { detail: next }));
  }

  function refresh() {
    if (pendingRequest) return pendingRequest;
    pendingRequest = fetch(`${apiBase}/api/storefront/content`, { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`Storefront API returned ${response.status}`);
        return response.json();
      })
      .then(({ data }) => {
        if (data) publish(data);
        return data;
      })
      .catch((error) => {
        console.info('Storefront content is unavailable; retaining the template fallback.', error.message);
        return content;
      })
      .finally(() => { pendingRequest = null; });
    return pendingRequest;
  }

  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => { void refresh(); }, 120);
  }

  function attachSocket() {
    if (window.__kyraaStorefrontSocket) return;
    if (typeof window.io !== 'function') return;
    const socket = window.io(apiBase, { transports: ['websocket', 'polling'] });
    socket.on('storefront:changed', scheduleRefresh);
    window.__kyraaStorefrontSocket = socket;
  }

  function connectLiveUpdates() {
    if (window.__kyraaStorefrontSocket) return;
    if (typeof window.io === 'function') {
      attachSocket();
      return;
    }
    if (document.querySelector('script[data-kyraa-socket-client]')) return;
    const script = document.createElement('script');
    script.dataset.kyraaSocketClient = 'true';
    script.async = true;
    script.src = `${apiBase}/socket.io/socket.io.js`;
    script.onload = attachSocket;
    document.head.appendChild(script);
  }

  window.KyraaStorefrontData = Object.freeze({ apiBase, refresh, getContent: () => content });
  void refresh();
  connectLiveUpdates();
})();
