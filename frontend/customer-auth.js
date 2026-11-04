(() => {
  'use strict';

  const script = document.currentScript;
  const frontendRoot = new URL('./', script?.src || location.href);
  const runtimeUrl = new URL('shop/shop-runtime.js?v=9', frontendRoot).href;
  const authUrl = new URL('shop/shop-auth.js?v=2', frontendRoot).href;
  const bagUrl = new URL('shop/shop-bag.js?v=1', frontendRoot).href;
  const styleUrl = new URL('shop/shop-flow.css?v=6', frontendRoot).href;
  let runtimeReady;
  let accountRuntimeRequested = false;

  function loadScript(url, readyKey) {
    if (window[readyKey]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${url}"]`);
      const script = existing || document.createElement('script');
      script.onload = () => window[readyKey] ? resolve() : reject(new Error('Shop tools are not available.'));
      script.onerror = () => reject(new Error('Shop tools are not available.'));
      if (!existing) { script.src = url; script.async = true; document.head.appendChild(script); }
    });
  }

  function loadRuntime() {
    if (window.KyraaShopRuntime) return window.KyraaShopRuntime.ready.then(() => window.KyraaShopRuntime);
    if (!runtimeReady) runtimeReady = new Promise((resolve, reject) => {
      if (![...document.styleSheets].some((sheet) => sheet.href === styleUrl)) {
        const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = styleUrl; document.head.appendChild(link);
      }
      Promise.resolve().then(() => loadScript(authUrl, 'KyraaShopAuth'))
        .then(() => loadScript(bagUrl, 'KyraaShopBag'))
        .then(() => new Promise((runtimeResolve, runtimeReject) => {
          if (window.KyraaShopRuntime?.ready) { window.KyraaShopRuntime.ready.then(() => runtimeResolve(window.KyraaShopRuntime)); return; }
          const runtime = document.createElement('script'); runtime.src = runtimeUrl; runtime.async = true;
          runtime.onload = () => window.KyraaShopRuntime?.ready ? window.KyraaShopRuntime.ready.then(() => runtimeResolve(window.KyraaShopRuntime)) : runtimeReject(new Error('Sign in is not available.'));
          runtime.onerror = () => runtimeReject(new Error('Sign in is not available.'));
          document.head.appendChild(runtime);
        })).then(resolve, reject);
    });
    return runtimeReady;
  }

  function hookExistingBag() {
    document.querySelectorAll('header .header-bag,header .shop-header__bag,header a[href$="cart.html"],header a[href*="cart.html?"]').forEach((link) => {
      link.dataset.shopBagTrigger = 'true'; link.href = '#shop-bag';
      const count = link.querySelector('.bag-count,#bag-count');
      if (count) { count.dataset.shopBagCount = 'true'; count.hidden = true; }
    });
    document.querySelectorAll('.catalog-header button[aria-label="Account"],.kr-storefront-nav__actions button[aria-label="Account"]').forEach((button) => {
      button.dataset.shopAccount = 'true';
    });
    if (!accountRuntimeRequested && document.querySelector('[data-shop-account]')) {
      accountRuntimeRequested = true;
      loadRuntime().catch((error) => {
        accountRuntimeRequested = false;
        console.warn('[Kyraa shop] Account menu could not start:', error.message);
      });
    }
  }

  hookExistingBag();
  const observer = new MutationObserver(hookExistingBag);
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });

  window.KyraaCustomerAuth = {
    async getSession() {
      try { return await (await loadRuntime()).getCustomer(true); }
      catch { return null; }
    },
    async requireLogin() {
      const runtime = await loadRuntime();
      const customer = await runtime.getCustomer(true);
      if (customer) return customer;
      return new Promise((resolve) => runtime.openLogin({ onSuccess: resolve, onCancel: () => resolve(null) }));
    },
  };
})();
