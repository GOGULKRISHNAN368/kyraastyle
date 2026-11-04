(() => {
  'use strict';

  const requested = new URLSearchParams(window.location.search).get('next') || '/frontend/store/cart.html';
  const safePath = requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\')
    ? requested
    : '/frontend/store/cart.html';

  window.location.replace(new URL(safePath, window.location.origin).href);
})();
