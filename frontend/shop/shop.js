(() => {
  'use strict';

  const elements = {
    tabs: document.getElementById('shop-tabs'), grid: document.getElementById('shop-grid'),
    count: document.getElementById('shop-results-count'), error: document.getElementById('shop-error'),
    sort: document.getElementById('shop-sort'), dialog: document.getElementById('shop-filter-dialog'),
    min: document.getElementById('shop-price-min'),
    max: document.getElementById('shop-price-max'), stock: document.getElementById('shop-in-stock'),
    filterCount: document.getElementById('shop-filter-count'), toast: document.getElementById('shop-toast'),
  };
  const state = { products: [], categories: [], selected: 'all', applied: { min: null, max: null, inStock: false } };
  const currency = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const slug = (value) => String(value || '').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const productSizes = (product) => (Array.isArray(product.sizes) ? product.sizes : []).map((size) => ({
    label: String(size.label || size.size || '').trim(), stock: Math.max(0, Number(size.stock ?? size.quantity ?? 0)),
  })).filter((size) => size.label);
  const availableStock = (product) => {
    if (product.hasSizes) return productSizes(product).reduce((sum, size) => sum + size.stock, 0);
    if (product.stock === undefined || product.stock === null || product.stock === '') return null;
    const stock = Number(product.stock); return Number.isFinite(stock) ? Math.max(0, stock) : null;
  };
  const priceOf = (product) => product.price === undefined || product.price === null || product.price === '' || !Number.isFinite(Number(product.price)) ? null : Number(product.price);
  const mrpOf = (product) => Number(product.mrp ?? product.oldPrice ?? 0);
  const makeImageList = (product) => {
    const images = (Array.isArray(product.images) ? product.images : []).filter((image) => image?.publicId && image?.imageUrl);
    if (images.length) return images;
    return product.cloudinaryId && product.imageUrl ? [{ publicId: product.cloudinaryId, imageUrl: product.imageUrl, alt: product.alt || product.name, width: product.width, height: product.height }] : [];
  };
  const imageSet = (url) => [400, 800, 1200].map((width) => `${String(url).replace(/c_limit,w_\d+/, `c_limit,w_${width}`)} ${width}w`).join(', ');
  const announce = (message) => {
    elements.toast.textContent = message;
    elements.toast.classList.add('is-visible');
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 2200);
  };

  function reportBrokenImage(image, publicId, wrapper) {
    image.addEventListener('error', () => {
      image.hidden = true;
      if (!image.classList.contains('shop-card__image--secondary')) wrapper?.classList.add('has-image-error');
      console.warn(`[Kyraa shop] Could not load Cloudinary image Public ID: ${publicId}`);
    }, { once: true });
  }

  function groupCategories() {
    const preferred = ['Kurta Sets', 'Short Tops', 'Salwar Suits', 'Unstitched'];
    const available = [...new Set(state.products.map((product) => String(product.category || '').trim()).filter((category) => category && category.toLowerCase() !== 'other'))];
    return available.sort((a, b) => {
      const left = preferred.indexOf(a); const right = preferred.indexOf(b);
      if (left !== -1 || right !== -1) return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
      return a.localeCompare(b);
    }).map((name) => ({ id: slug(name), name, count: state.products.filter((product) => product.category === name).length }));
  }

  function selectedFromUrl() {
    const requested = new URLSearchParams(window.location.search).get('cat') || 'all';
    const valid = requested === 'all' || requested === 'new-arrivals' || state.categories.some((category) => category.id === requested);
    state.selected = valid ? requested : 'all';
  }

  function tabData() {
    const arrivals = state.products.filter((product) => product.isNewArrival).length;
    return [
      { id: 'all', label: 'All', count: state.products.length },
      { id: 'new-arrivals', label: 'New Arrivals', count: arrivals },
      ...state.categories,
    ].filter((tab) => tab.id === 'all' || tab.count > 0);
  }

  function drawTabs() {
    elements.tabs.replaceChildren();
    const tabs = tabData();
    const activeTab = tabs.find((tab) => tab.id === state.selected);
    document.getElementById('shop-title').textContent = state.selected === 'all' ? 'ALL' : (activeTab?.label || activeTab?.name || 'Shop');
    for (const tab of tabs) {
      const button = document.createElement('button');
      button.className = 'shop-tab'; button.type = 'button'; button.role = 'tab';
      button.id = `shop-tab-${tab.id}`; button.dataset.category = tab.id;
      button.setAttribute('aria-selected', String(state.selected === tab.id));
      button.setAttribute('aria-controls', 'shop-grid'); button.tabIndex = state.selected === tab.id ? 0 : -1;
      button.textContent = `${tab.label || tab.name} (${tab.count})`;
      button.addEventListener('click', () => selectTab(tab.id, true));
      button.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const buttons = [...elements.tabs.querySelectorAll('[role="tab"]')];
        const index = buttons.indexOf(button);
        const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[target]?.focus();
      });
      elements.tabs.appendChild(button);
    }
    if (matchMedia('(max-width: 760px)').matches) {
      elements.tabs.querySelector('[aria-selected="true"]')?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
    }
  }

  function selectTab(categoryId, pushHistory) {
    state.selected = categoryId;
    const url = new URL(window.location.href);
    if (categoryId === 'all') url.searchParams.delete('cat'); else url.searchParams.set('cat', categoryId);
    if (pushHistory) window.history.pushState({ cat: categoryId }, '', `${url.pathname}${url.search}${url.hash}`);
    drawTabs(); renderProducts();
    elements.tabs.querySelector(`[data-category="${CSS.escape(categoryId)}"]`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  }

  function currentProducts() {
    let products = state.products.slice();
    if (state.selected === 'new-arrivals') products = products.filter((product) => product.isNewArrival);
    else if (state.selected !== 'all') {
      const category = state.categories.find((entry) => entry.id === state.selected);
      products = category ? products.filter((product) => product.category === category.name) : [];
    }
    const filter = state.applied;
    if (filter.min != null) products = products.filter((product) => priceOf(product) != null && priceOf(product) >= filter.min);
    if (filter.max != null) products = products.filter((product) => priceOf(product) != null && priceOf(product) <= filter.max);
    if (filter.inStock) products = products.filter((product) => availableStock(product) > 0);
    if (elements.sort.value === 'price-low') products.sort((a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity));
    else if (elements.sort.value === 'price-high') products.sort((a, b) => (priceOf(b) ?? -Infinity) - (priceOf(a) ?? -Infinity));
    else products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return products;
  }

  function makeCard(product) {
    const card = document.createElement('article'); card.className = 'shop-card';
    const link = document.createElement('a'); link.className = 'shop-card__link';
    link.href = product.slug
      ? `product.html?slug=${encodeURIComponent(product.slug)}&ui=2`
      : `product.html?id=${encodeURIComponent(product._id || product.cloudinaryId)}&ui=2`;
    const wrap = document.createElement('div'); wrap.className = 'shop-card__image-wrap';
    const images = makeImageList(product);
    const main = images[0];
    if (main) {
      const image = document.createElement('img'); image.className = 'shop-card__image'; image.src = main.imageUrl; window.KyraaProductImages.fit(image, { width: main.width || product.width, height: main.height || product.height }, wrap);
      image.srcset = imageSet(main.imageUrl); image.sizes = '(max-width: 760px) 50vw, (max-width: 1100px) 33vw, 25vw';
      image.alt = main.alt || product.alt || product.name || ''; image.loading = 'lazy'; image.decoding = 'async';
      reportBrokenImage(image, main.publicId, wrap); wrap.appendChild(image);
      const second = images[1];
      if (second) {
        const hover = document.createElement('img'); hover.className = 'shop-card__image shop-card__image--secondary';
        hover.src = second.imageUrl; hover.srcset = imageSet(second.imageUrl); hover.sizes = image.sizes; window.KyraaProductImages.fit(hover, { width: second.width, height: second.height });
        hover.alt = ''; hover.setAttribute('aria-hidden', 'true'); hover.loading = 'lazy'; hover.decoding = 'async';
        reportBrokenImage(hover, second.publicId, wrap); wrap.appendChild(hover); const setHoverAspect = (entry) => { const aspect = Number(entry?.dataset.imageAspect); if (Number.isFinite(aspect) && aspect > 0) { wrap.style.setProperty('--image-aspect', String(aspect)); wrap.style.aspectRatio = String(aspect); } }; wrap.addEventListener('pointerenter', () => setHoverAspect(hover)); wrap.addEventListener('pointerleave', () => setHoverAspect(image)); wrap.addEventListener('focusin', () => setHoverAspect(hover)); wrap.addEventListener('focusout', () => setHoverAspect(image));
      }
    } else {
      wrap.classList.add('has-image-error');
      console.warn(`[Kyraa shop] Missing Cloudinary image Public ID for product: ${product.name}`);
    }
    const badges = document.createElement('div'); badges.className = 'shop-card__badges';
    const mrp = mrpOf(product), price = priceOf(product);
    if (price != null && mrp > price && mrp > 0) {
      const sale = document.createElement('span'); sale.className = 'shop-badge'; sale.textContent = `${Math.round((mrp - price) / mrp * 100)}% OFF`; badges.appendChild(sale);
    }
    if (product.isNewArrival) { const fresh = document.createElement('span'); fresh.className = 'shop-badge shop-badge--new'; fresh.textContent = 'NEW'; badges.appendChild(fresh); }
    if (badges.childElementCount) wrap.appendChild(badges);
    link.appendChild(wrap);

    const info = document.createElement('div'); info.className = 'shop-card__info';
    const name = document.createElement('h2'); name.className = 'shop-card__name'; name.textContent = product.name || 'Kryaa Style'; info.appendChild(name);
    const prices = document.createElement('p'); prices.className = 'shop-card__prices';
    const current = document.createElement('span'); current.className = 'shop-card__price'; current.textContent = price == null ? 'Price unavailable' : `₹${currency.format(price)}`; prices.appendChild(current);
    if (price != null && mrp > price) { const original = document.createElement('del'); original.className = 'shop-card__mrp'; original.textContent = `₹${currency.format(mrp)}`; prices.appendChild(original); }
    info.appendChild(prices);
    const stock = availableStock(product);
    if (stock === 0) { const sold = document.createElement('p'); sold.className = 'shop-card__stock'; sold.textContent = 'Sold out'; info.appendChild(sold); }
    else if (stock !== null && stock <= 3) { const low = document.createElement('p'); low.className = 'shop-card__stock'; low.textContent = 'Only few left'; info.appendChild(low); }
    link.appendChild(info); card.appendChild(link);

    const heart = document.createElement('button'); heart.className = 'shop-card__heart'; heart.type = 'button'; heart.setAttribute('aria-label', `Add ${product.name} to wishlist`); heart.setAttribute('aria-pressed', 'false'); heart.textContent = '♡';
    heart.addEventListener('click', (event) => { event.preventDefault(); const active = heart.getAttribute('aria-pressed') !== 'true'; heart.setAttribute('aria-pressed', String(active)); heart.textContent = active ? '♥' : '♡'; });
    wrap.appendChild(heart);
    return card;
  }

  function renderProducts() {
    const products = currentProducts();
    elements.count.textContent = `${products.length} ${products.length === 1 ? 'style' : 'styles'}`;
    elements.grid.replaceChildren();
    if (!products.length) {
      const empty = document.createElement('p'); empty.className = 'shop-empty'; empty.textContent = 'No products match these filters.'; elements.grid.appendChild(empty); return;
    }
    products.forEach((product) => elements.grid.appendChild(makeCard(product)));
  }

  function setupFilters() {
    const minPrices = state.products.map(priceOf).filter((price) => price != null);
    if (minPrices.length) { elements.min.min = '0'; elements.max.min = '0'; elements.max.placeholder = `₹${currency.format(Math.max(...minPrices))}`; }
    document.getElementById('shop-filter-open').addEventListener('click', () => {
      elements.min.value = state.applied.min ?? ''; elements.max.value = state.applied.max ?? ''; elements.stock.checked = state.applied.inStock;
      elements.dialog.showModal();
    });
    document.getElementById('shop-filter-apply').addEventListener('click', () => {
      const min = elements.min.value === '' ? null : Number(elements.min.value); const max = elements.max.value === '' ? null : Number(elements.max.value);
      if (min != null && (!Number.isFinite(min) || min < 0) || max != null && (!Number.isFinite(max) || max < 0) || min != null && max != null && min > max) { announce('Enter a valid price range.'); return; }
      state.applied = { min, max, inStock: elements.stock.checked };
      updateFilterCount(); renderProducts(); elements.dialog.close();
    });
    document.getElementById('shop-filter-clear').addEventListener('click', () => {
      state.applied = { min: null, max: null, inStock: false }; elements.min.value = ''; elements.max.value = ''; elements.stock.checked = false;
      updateFilterCount(); renderProducts(); elements.dialog.close();
    });
    document.getElementById('shop-filter-form').addEventListener('submit', (event) => event.preventDefault());
    elements.sort.addEventListener('change', renderProducts);
  }

  function updateFilterCount() {
    const count = Number(state.applied.min != null || state.applied.max != null) + Number(state.applied.inStock);
    elements.filterCount.textContent = String(count); elements.filterCount.hidden = count === 0;
  }

  window.addEventListener('popstate', () => { selectedFromUrl(); drawTabs(); renderProducts(); });
  (async () => {
    try {
      const products = await window.KyraaShop?.getProducts?.();
      if (!Array.isArray(products)) throw new Error('Product catalog is unavailable.');
      state.products = products.filter((product) => product && product.isActive !== false && !product.mergedInto && String(product.category || '').toLowerCase() !== 'other');
      state.categories = groupCategories(); selectedFromUrl(); drawTabs(); setupFilters(); updateFilterCount(); renderProducts();
      elements.error.hidden = true;
    } catch (error) {
      elements.count.textContent = 'Catalog unavailable'; elements.error.textContent = 'We could not load products. Please refresh to try again.'; elements.error.hidden = false;
      console.error('[Kyraa shop] Product API request failed:', error.message);
    }
  })();
})();
