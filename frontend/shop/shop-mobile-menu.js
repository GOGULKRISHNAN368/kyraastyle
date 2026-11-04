(() => {
  'use strict';
  const mobile = matchMedia('(max-width: 760px)');
  const onLocalPage = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const servedByLocalDevServer = location.port === '8000';
  const localApi = `${location.protocol}//${location.hostname}:3000`;
  const apiBase = String(window.KYRAA_API_URL || (onLocalPage || servedByLocalDevServer ? localApi : location.origin)).replace(/\/$/, '');
  const header = document.querySelector('.shop-header');
  if (!header) return;
  const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'shop-header__menu'; toggle.setAttribute('aria-label', 'Open navigation'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'shop-mobile-drawer'); toggle.innerHTML = '<span></span><span></span><span></span>';
  header.insertBefore(toggle, header.querySelector('.shop-header__bag'));
  const drawer = document.createElement('div'); drawer.className = 'shop-mobile-drawer'; drawer.id = 'shop-mobile-drawer'; drawer.hidden = true;
  drawer.innerHTML = '<button type="button" class="shop-mobile-drawer__backdrop" aria-label="Close navigation"></button><nav class="shop-mobile-drawer__panel" aria-label="Mobile navigation"><div class="shop-mobile-drawer__head"><strong>KYRAA STYLE</strong><button type="button" class="shop-mobile-drawer__close" aria-label="Close navigation">×</button></div><button type="button" class="shop-mobile-drawer__expand" aria-expanded="false">Shop <span aria-hidden="true">＋</span></button><div class="shop-mobile-drawer__categories" hidden></div><a href="index.html">All products</a></nav>';
  document.body.appendChild(drawer);
  const close = () => { drawer.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open navigation'); document.body.classList.remove('shop-menu-open'); toggle.focus(); };
  const open = () => { if (!mobile.matches) return; drawer.hidden = false; toggle.setAttribute('aria-expanded', 'true'); toggle.setAttribute('aria-label', 'Close navigation'); document.body.classList.add('shop-menu-open'); drawer.querySelector('.shop-mobile-drawer__close').focus(); };
  toggle.addEventListener('click', () => drawer.hidden ? open() : close());
  drawer.querySelector('.shop-mobile-drawer__close').addEventListener('click', close);
  drawer.querySelector('.shop-mobile-drawer__backdrop').addEventListener('click', close);
  drawer.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  drawer.querySelector('.shop-mobile-drawer__expand').addEventListener('click', (event) => { const button = event.currentTarget; const expanded = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!expanded)); drawer.querySelector('.shop-mobile-drawer__categories').hidden = expanded; button.lastElementChild.textContent = expanded ? '＋' : '−'; });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !drawer.hidden) close(); });
  fetch(`${apiBase}/api/shop/products`, { headers: { Accept: 'application/json' } }).then((response) => response.json()).then((body) => {
    const rows = Array.isArray(body) ? body : body.data; if (!Array.isArray(rows)) return;
    const counts = new Map(); rows.filter((row) => row?.isActive !== false && !row?.mergedInto && row?.category).forEach((row) => counts.set(row.category, (counts.get(row.category) || 0) + 1));
    const target = drawer.querySelector('.shop-mobile-drawer__categories');
    [...counts].sort(([a], [b]) => a.localeCompare(b)).forEach(([name, count]) => { const link = document.createElement('a'); const url = new URL('index.html', location.href); url.searchParams.set('cat', name); link.href = url.href; link.textContent = `${name} (${count})`; target.appendChild(link); link.addEventListener('click', close); });
  }).catch(() => {});
})();
