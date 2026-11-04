(() => {
  'use strict';
  const script = document.currentScript;
  const shopBase = new URL('./', script?.src || window.location.href);
  const onLocalPage = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  const servedByLocalDevServer = window.location.port === '8000';
  const localApi = `${window.location.protocol}//${window.location.hostname}:3000`;
  const apiBase = String(window.KYRAA_API_URL || (onLocalPage || servedByLocalDevServer ? localApi : window.location.origin)).replace(/\/$/, '');
  let productsRequest;

  window.KyraaShop = window.KyraaShop || {};
  window.KyraaShop.apiBase = apiBase;
  window.KyraaShop.getProducts = () => {
    if (!productsRequest) productsRequest = fetch(`${apiBase}/api/shop/products`, { headers: { Accept: 'application/json' } })
      .then((response) => { if (!response.ok) throw new Error(`Product API returned ${response.status}.`); return response.json(); })
      .then((data) => {
        const products = Array.isArray(data) ? data : data?.data;
        if (!Array.isArray(products)) throw new Error('The Product API returned an invalid catalog.');
        return products;
      });
    return productsRequest;
  };

  const cssUrl = new URL('shop-menu.css', shopBase);
  cssUrl.searchParams.set('v', '3');
  const cssHref = cssUrl.href;
  if (![...document.querySelectorAll('link[rel="stylesheet"]')].some((link) => link.href === cssHref)) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = cssHref; document.head.appendChild(link);
  }

  const slug = (value) => String(value || '').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const preferred = ['Kurta Sets', 'Short Tops', 'Salwar Suits', 'Unstitched'];
  // Keep navigation usable while the catalog API is unavailable or still loading.
  const defaultCategories = ['Chudi', 'Short Tops', 'Full Frocks', 'Kurti Sets', 'Sarees', 'Salwar Suits', 'Anarkali Suits'];
  let lastInteraction = 'pointer';
  let suppressNextFocusOpen = false;
  document.addEventListener('keydown', () => { lastInteraction = 'keyboard'; }, true);
  document.addEventListener('pointerdown', () => { lastInteraction = 'pointer'; }, true);
  const targetUrl = (category) => {
    const url = new URL('index.html', shopBase);
    if (category) url.searchParams.set('cat', category);
    return url.href;
  };

  function getPanel(menu) {
    return menu.querySelector('.shop-menu__panel')
      || document.getElementById(menu.querySelector('.shop-menu__trigger')?.getAttribute('aria-controls'));
  }

  function openMenu(menu, open = true) {
    const trigger = menu.querySelector('.shop-menu__trigger'); const panel = getPanel(menu);
    if (!trigger || !panel) return;
    if (open && menu.classList.contains('kr-storefront-shop-menu')) {
      const triggerRect = trigger.getBoundingClientRect();
      panel.style.top = `${triggerRect.bottom}px`;
      panel.style.left = window.matchMedia('(max-width: 760px)').matches
        ? '0px'
        : `${triggerRect.left + triggerRect.width / 2}px`;
    }
    panel.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); menu.classList.toggle('is-open', open);
  }

  function fillMenu(menu, products = []) {
    const panel = getPanel(menu); if (!panel) return;
    const counts = new Map();
    products.filter((product) => product?.isActive !== false && !product?.mergedInto && String(product?.category || '').trim() && String(product.category).toLowerCase() !== 'other')
      .forEach((product) => counts.set(product.category, (counts.get(product.category) || 0) + 1));
    const categoryNames = counts.size ? [...counts.keys()] : defaultCategories;
    const categories = categoryNames.sort((a, b) => {
      const left = preferred.indexOf(a), right = preferred.indexOf(b);
      if (left >= 0 || right >= 0) return (left < 0 ? 99 : left) - (right < 0 ? 99 : right);
      return a.localeCompare(b);
    });
    const arrivals = products.filter((product) => product?.isNewArrival && product.isActive !== false && !product.mergedInto).length;
    const entries = [
      ...(arrivals ? [{ label: 'New Arrivals', count: arrivals, cat: 'new-arrivals' }] : []),
      ...categories.map((label) => ({ label, count: counts.get(label) || '', cat: slug(label) })),
      { label: 'All products', count: products.length ? products.filter((product) => product?.isActive !== false && !product?.mergedInto && String(product?.category || '').toLowerCase() !== 'other').length : '', cat: '' },
    ];
    panel.replaceChildren();
    for (const entry of entries) {
      const row = document.createElement('a'); row.className = 'shop-menu__row'; row.role = 'menuitem'; row.href = targetUrl(entry.cat);
      const name = document.createElement('span'); name.textContent = entry.label;
      row.append(name);
      if (entry.count !== '' && entry.count != null) {
        const count = document.createElement('span'); count.className = 'shop-menu__count'; count.textContent = String(entry.count);
        row.append(count);
      }
      row.addEventListener('click', () => openMenu(menu, false)); panel.appendChild(row);
    }
    panel.dataset.ready = 'true';
  }

  function install(menu) {
    const trigger = menu.querySelector('.shop-menu__trigger'); const panel = menu.querySelector('.shop-menu__panel');
    if (!trigger || !panel || menu.dataset.shopMenuReady === 'true') return;
    if (menu.classList.contains('kr-storefront-shop-menu')) {
      panel.classList.add('kr-storefront-shop-menu__panel');
      document.body.appendChild(panel);
    }
    menu.dataset.shopMenuReady = 'true'; trigger.setAttribute('aria-controls', `shop-menu-panel-${Math.random().toString(36).slice(2, 8)}`); panel.id = trigger.getAttribute('aria-controls');
    trigger.addEventListener('click', () => {
      if (lastInteraction === 'keyboard' && trigger.getAttribute('aria-expanded') === 'true') {
        panel.querySelector('[role="menuitem"]')?.focus();
      } else openMenu(menu, trigger.getAttribute('aria-expanded') !== 'true');
    });
    trigger.addEventListener('focus', () => {
      if (suppressNextFocusOpen) { suppressNextFocusOpen = false; return; }
      if (lastInteraction === 'keyboard') openMenu(menu, true);
    });
    menu.addEventListener('mouseenter', () => openMenu(menu, true));
    menu.addEventListener('mouseleave', (event) => {
      if (!panel.contains(event.relatedTarget) && !panel.contains(document.activeElement)) openMenu(menu, false);
    });
    panel.addEventListener('mouseleave', (event) => {
      if (!menu.contains(event.relatedTarget) && !menu.contains(document.activeElement)) openMenu(menu, false);
    });
    const closeOnFocusExit = (event) => {
      if (!menu.contains(event.relatedTarget) && !panel.contains(event.relatedTarget)) openMenu(menu, false);
    };
    menu.addEventListener('focusout', closeOnFocusExit);
    panel.addEventListener('focusout', closeOnFocusExit);
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); openMenu(menu, false); suppressNextFocusOpen = true; trigger.focus(); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); openMenu(menu, true);
        const links = [...panel.querySelectorAll('[role="menuitem"]')];
        (event.key === 'ArrowDown' ? links[0] : links[links.length - 1])?.focus();
      }
    });
    panel.addEventListener('keydown', (event) => {
      const links = [...panel.querySelectorAll('[role="menuitem"]')]; const index = links.indexOf(document.activeElement);
      if (event.key === 'Escape') { event.preventDefault(); openMenu(menu, false); suppressNextFocusOpen = true; trigger.focus(); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const shift = event.key === 'ArrowDown' ? 1 : -1; links[(index + shift + links.length) % links.length]?.focus(); }
      else if (event.key === 'Home') { event.preventDefault(); links[0]?.focus(); }
      else if (event.key === 'End') { event.preventDefault(); links.at(-1)?.focus(); }
    });
  }

  const menus = [...document.querySelectorAll('[data-shop-menu]')];
  menus.forEach(install);
  menus.forEach((menu) => fillMenu(menu));
  window.KyraaShop.getProducts().then((products) => menus.forEach((menu) => fillMenu(menu, products))).catch((error) => {
    console.warn('[Kyraa shop] Shop menu counts are unavailable:', error.message);
  });
})();
