(() => {
  'use strict';

  const categories = {
    chudi: { title: 'Chudi Edit', description: 'Graceful silhouettes for every celebration.', image: 'category-chudi.png' },
    'short-tops': { title: 'Short Tops', description: 'A modern edit of easy separates and polished looks.', image: 'category-short-tops.png' },
    'full-frocks': { title: 'Full Frocks', description: 'Discover flowing silhouettes made for special moments.', image: 'category-full-frocks.png' },
    'kurta-sets': { title: 'Kurta Sets', description: 'Explore Kurta Sets from Kyraa Style.', image: 'category-kurti-sets.png' },
    'kurti-sets': { title: 'Kurta Sets', description: 'Explore Kurta Sets from Kyraa Style.', image: 'category-kurti-sets.png' },
    sarees: { title: 'Sarees', description: 'Find timeless drapes and refined looks for every occasion.', image: 'category-sarees.png' },
    'salwar-suits': { title: 'Salwar Suits', description: 'Shop elegant suit sets in rich colours and fluid silhouettes.', image: 'category-salwar-suits.png' },
    'anarkali-suits': { title: 'Anarkali Suits', description: 'Explore beautifully flared Anarkali looks from the Kyraa edit.', image: 'category-anarkali-suits.png' }
  };

  /* Legacy demo catalog intentionally disabled; cards and facets use the shop API. 
  const unusedLegacyCatalog = [
    { name: 'Midnight Garden Embroidered Suit', designer: 'KYRAA EDIT', image: 'newarrival1.jpg', hoverImage: 'newarrival1-cloth.jpg', price: 8490, color: 'other', occasion: 'festive', tags: ['new', 'ready', 'sale'] },
    { name: 'Ruby Heirloom Evening Gown', designer: 'KYRAA EDIT', image: 'newarrival2.jpg', hoverImage: 'newarrival2-cloth.jpg', price: 12990, color: 'red', occasion: 'evening', tags: ['new', 'try-on'] },
    { name: 'Emerald Garden Anarkali', designer: 'KYRAA EDIT', image: 'newarrival3.jpg', hoverImage: 'newarrival3-cloth.jpg', price: 11490, color: 'green', occasion: 'celebration', tags: ['try-on', 'custom'] },
    { name: 'Sapphire Embroidered Gown', designer: 'KYRAA EDIT', image: 'newarrival4.jpg', hoverImage: 'newarrival4-cloth.jpg', price: 13990, color: 'blue', occasion: 'evening', tags: ['new', 'try-on'] },
    { name: 'Golden Hour Celebration Suit', designer: 'KYRAA EDIT', image: 'newarrival5.jpg', hoverImage: 'newarrival5-cloth.webp', price: 9990, color: 'other', occasion: 'festive', tags: ['ready', 'sale'] },
    { name: 'Teal Blossom Anarkali', designer: 'KYRAA EDIT', image: 'newarrival6.jpg', hoverImage: 'newarrival6-cloth.jpg', price: 10990, color: 'green', occasion: 'celebration', tags: ['new', 'custom'] },
    { name: 'Lavender Dream Gown', designer: 'KYRAA EDIT', image: 'newarrival7.jpg', hoverImage: 'newarrival7-cloth.jpg', price: 12490, color: 'other', occasion: 'evening', tags: ['try-on'] },
    { name: 'Coral Garden Occasionwear', designer: 'KYRAA EDIT', image: 'newarrival8.jpg', hoverImage: 'newarrival8-cloth.jpg', price: 11990, color: 'red', occasion: 'celebration', tags: ['new', 'ready'] },
    { name: 'Ivory Lumière Embroidered Set', designer: 'KYRAA EDIT', image: 'newarrival9.jpg', hoverImage: 'newarrival9-cloth.jpg', price: 14990, color: 'light', occasion: 'evening', tags: ['try-on', 'custom'] },
    { name: 'Plum Royale Anarkali', designer: 'KYRAA EDIT', image: 'newarrival10.jpg', hoverImage: 'newarrival10-cloth.jpg', price: 13490, color: 'other', occasion: 'festive', tags: ['new', 'sale'] }
  */
  let products = [];
  const categoryKey = new URLSearchParams(window.location.search).get('category') || '';
  const editKey = new URLSearchParams(window.location.search).get('edit') || '';
  const editTitles = {
    'new-arrivals': 'New Arrivals',
    women: 'Women',
    men: 'Men',
    kids: 'Kids',
    jewellery: 'Jewellery',
    accessories: 'Accessories',
    wedding: 'Wedding',
    sangeet: 'Sangeet',
    reception: 'Reception',
    festival: 'Festival',
    casual: 'Casual',
    'office-wear': 'Office Wear'
  };
  const category = categories[categoryKey];
  const heroImage = document.getElementById('collection-hero-image');
  if (!category) {
    document.getElementById('collection-title').textContent = 'Curated Collections';
    document.title = 'Curated Collections | Kyraa Style';
  } else {
    document.title = `${category.title} | Kyraa Style`;
    document.getElementById('breadcrumb-category').textContent = category.title;
    document.getElementById('collection-title').textContent = category.title;
    document.getElementById('collection-description').textContent = category.description;
    heroImage.src = `../image/${category.image}`;
    heroImage.alt = `${category.title} occasionwear collection`;
  }
  if (!category && editTitles[editKey]) {
    const editTitle = editTitles[editKey];
    document.title = `${editTitle} | Kyraa Style`;
    document.getElementById('breadcrumb-category').textContent = editTitle;
    document.getElementById('collection-title').textContent = `${editTitle} Edit`;
    document.getElementById('collection-description').textContent = editKey === 'new-arrivals'
      ? 'Explore the latest looks from the Kyraa Style edit.'
      : `Discover occasion-ready styles curated for ${editTitle.toLowerCase()}.`;
    const editHeroImages = { 'new-arrivals': 'newarrival2.jpg', wedding: 'category-anarkali-suits.png', sangeet: 'category-full-frocks.png', reception: 'category-sarees.png', festival: 'category-kurti-sets.png', casual: 'category-short-tops.png', 'office-wear': 'category-chudi.png' };
    heroImage.src = `../image/${editHeroImages[editKey] || 'newarrival2.jpg'}`;
    heroImage.alt = `${editTitle} occasionwear collection`;
  }
  document.querySelectorAll('.filter-link').forEach((link) => {
    if (new URL(link.href).searchParams.get('category') === categoryKey) link.setAttribute('aria-current', 'page');
  });

  const grid = document.getElementById('product-grid');
  const count = document.getElementById('result-count');
  const panel = document.getElementById('filter-panel');
  const toast = document.getElementById('catalog-toast');
  const filterGroups = document.getElementById('filter-groups');
  const sortSelect = document.getElementById('sort-select');
  const viewButtons = Array.from(document.querySelectorAll('.view-toggle button'));
  const currency = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const scrollStorageKey = () => `kyraa-category-scroll:${location.pathname}${location.search}`;
  let toastTimer;

  function readBag() {
    try {
      const stored = JSON.parse(window.localStorage.getItem('kyraa-category-bag') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (_) { return []; }
  }

  function updateBagCount() {
    const badge = document.getElementById('bag-count');
    if (!badge) return;
    const quantity = readBag().reduce((total, item) => total + Number(item.quantity || 1), 0);
    badge.textContent = String(quantity);
    badge.hidden = quantity === 0;
  }

  function currentFilters() {
    return Array.from(document.querySelectorAll('.filter-panel input:checked')).reduce((result, input) => {
      (result[input.name] ||= []).push(input.value);
      return result;
    }, {});
  }

  const slugOf = (value) => String(value || '').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const textOf = (value) => String(value ?? '').trim();
  const valueKey = (value) => textOf(value).toLocaleLowerCase();
  const productName = (product) => textOf(product.name || product.title);
  const listValues = (value) => (Array.isArray(value) ? value : [value]).map((entry) => {
    if (entry && typeof entry === 'object') return textOf(entry.value || entry.label || entry.name || entry.color || entry.occasion);
    return textOf(entry);
  }).filter(Boolean);
  const facetValues = (product, facet) => facet === 'occasion'
    ? listValues(product.occasions ?? product.occasion)
    : listValues(product.colors ?? product.color ?? product.colours ?? product.colour);
  const productImage = (product) => {
    const image = (Array.isArray(product.images) ? product.images : []).find(Boolean);
    const publicId = typeof image === 'string' ? image : image?.publicId || image?.cloudinaryId;
    if (publicId) return `https://res.cloudinary.com/l8xwk9bz/image/upload/f_auto,q_auto:best,c_limit,w_800/${String(publicId).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`;
    return textOf(image?.url || image?.secure_url || product.imageUrl || product.image || product.thumbnail);
  };
  const productDestination = (product) => {
    const destination = new URL('../shop/product.html', location.href);
    if (product.slug) destination.searchParams.set('slug', product.slug);
    else destination.searchParams.set('id', String(product._id || product.id || ''));
    destination.searchParams.set('ui', '2');
    return `${destination.pathname}${destination.search}`;
  };

  function syncQueryState() {
    const params = new URLSearchParams(location.search);
    params.delete('sort'); params.delete('view');
    params.set('sort', sortSelect.value);
    params.set('view', grid.classList.contains('is-list-view') ? 'list' : 'grid');
    ['occasion', 'color'].forEach((name) => {
      params.delete(name);
      document.querySelectorAll(`.filter-panel input[name="${name}"]:checked`).forEach((input) => params.append(name, input.value));
    });
    const query = params.toString();
    history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
  }

  function buildFilterGroups() {
    filterGroups.replaceChildren();
    const categoryValues = [...new Set(products.map((product) => textOf(product.category)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (categoryValues.length) {
      const group = document.createElement('details'); group.open = true;
      const summary = document.createElement('summary'); summary.textContent = 'Category'; group.appendChild(summary);
      categoryValues.forEach((value) => {
        const link = document.createElement('a'); link.className = 'filter-link';
        link.href = `category.html?category=${encodeURIComponent(slugOf(value))}`; link.textContent = value;
        if (slugOf(value) === categoryKey) link.setAttribute('aria-current', 'page');
        group.appendChild(link);
      });
      filterGroups.appendChild(group);
    }
    const saved = new URLSearchParams(location.search);
    [['occasion', 'Occasion'], ['color', 'Colour']].forEach(([facet, title]) => {
      const values = [...new Set(products.flatMap((product) => facetValues(product, facet)))].sort((a, b) => a.localeCompare(b));
      if (!values.length) return;
      const group = document.createElement('details'); group.open = true;
      const summary = document.createElement('summary'); summary.textContent = title; group.appendChild(summary);
      values.forEach((value) => {
        const label = document.createElement('label'); const input = document.createElement('input');
        input.type = 'checkbox'; input.name = facet; input.value = value;
        input.checked = saved.getAll(facet).some((stored) => valueKey(stored) === valueKey(value));
        label.append(input, document.createTextNode(` ${value}`)); group.appendChild(label);
      });
      filterGroups.appendChild(group);
    });
  }

  function activeQuickFilters() {
    return Array.from(document.querySelectorAll('.filter-chip[aria-pressed="true"]')).map((button) => button.dataset.tag);
  }

  function renderProducts() {
    return renderRealProducts(); /* Legacy renderer below remains disabled.
    const filters = currentFilters();
    const quickFilters = activeQuickFilters();
    let visible = products.filter((product) => {
      const occasionMatch = !filters.occasion || filters.occasion.includes(product.occasion);
      const colorMatch = !filters.color || filters.color.includes(product.color);
      const quickMatch = quickFilters.every((tag) => product.tags.includes(tag));
      return occasionMatch && colorMatch && quickMatch;
    });
    const sort = document.getElementById('sort-select').value;
    if (sort === 'price-low') visible.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') visible.sort((a, b) => b.price - a.price);
    if (sort === 'name') visible.sort((a, b) => a.name.localeCompare(b.name));
    count.textContent = String(visible.length);
    grid.replaceChildren();

    if (!visible.length) {
      grid.innerHTML = '<p class="empty-state">No styles match those filters. Try clearing a filter to see more.</p>';
      return;
    }
    visible.forEach((product) => {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="product-image-wrap">
          <img class="product-image" src="../image/${product.image}" alt="${product.name}" loading="lazy" tabindex="0" role="button" aria-label="Quick view: ${product.name}">
          <img class="product-image product-image--hover" src="../image/${product.hoverImage}" alt="" loading="lazy" aria-hidden="true">
          <span class="product-badge">${product.tags.includes('new') ? 'NEW ARRIVAL' : product.tags.includes('sale') ? 'ON SALE' : 'KYRAA EDIT'}</span>
          <button class="wishlist" type="button" aria-label="Add ${product.name} to wishlist" aria-pressed="false">♡</button>
          <button class="quick-view" type="button">Quick view</button>
        </div>
        <div class="product-info">
          <p class="designer-name">${product.designer}</p>
          <h2>${product.name}</h2>
          <p class="product-price">₹${product.price.toLocaleString('en-IN')}</p>
        </div>`;
      card.querySelector('.wishlist').addEventListener('click', (event) => {
        const button = event.currentTarget;
        const active = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(active));
        button.textContent = active ? '♥' : '♡';
      });
      card.querySelector('.quick-view').addEventListener('click', () => showQuickView(product));
      const productImage = card.querySelector('.product-image');
      const hoverImage = card.querySelector('.product-image--hover');
      hoverImage.addEventListener('error', () => card.classList.add('product-card--without-hover-image'), { once: true });
      productImage.addEventListener('click', () => showQuickView(product));
      productImage.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        showQuickView(product);
      });
      grid.appendChild(card);
    });
    */
  }

  function renderRealProducts() {
    const filters = currentFilters();
    let visible = products.filter((product) => {
      if (categoryKey && !editKey && slugOf(product.category) !== categoryKey) return false;
      if (editKey === 'new-arrivals' && product.isNewArrival !== true) return false;
      return ['occasion', 'color'].every((facet) => !filters[facet] || filters[facet].some((value) => facetValues(product, facet).some((actual) => valueKey(actual) === valueKey(value))));
    });
    if (sortSelect.value === 'price-low') visible.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (sortSelect.value === 'price-high') visible.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (sortSelect.value === 'name') visible.sort((a, b) => productName(a).localeCompare(productName(b)));
    count.textContent = String(visible.length);
    grid.replaceChildren();

    if (!visible.length) {
      const empty = document.createElement('p'); empty.className = 'empty-state';
      empty.textContent = products.length ? 'No styles match those filters. Try clearing a filter to see more.' : 'No products are available right now.';
      grid.appendChild(empty); syncQueryState(); return;
    }

    visible.forEach((product) => {
      const card = document.createElement('article'); card.className = 'product-card';
      const link = document.createElement('a'); link.className = 'product-card-link'; link.href = productDestination(product);
      const imageWrap = document.createElement('div'); imageWrap.className = 'product-image-wrap';
      const image = document.createElement('img'); image.className = 'product-image';
      const imageSource = productImage(product); if (imageSource) image.src = imageSource;
      image.alt = productName(product); image.loading = 'lazy'; image.decoding = 'async';
      const primaryImage = (Array.isArray(product.images) ? product.images : []).find(Boolean);
      image.width = Number(primaryImage?.width || product.width) || 800; image.height = Number(primaryImage?.height || product.height) || 1000;
      imageWrap.appendChild(image);
      if (product.isNewArrival === true) { const badge = document.createElement('span'); badge.className = 'product-badge'; badge.textContent = 'NEW ARRIVAL'; imageWrap.appendChild(badge); }
      const info = document.createElement('div'); info.className = 'product-info';
      const name = document.createElement('h2'); name.textContent = productName(product); info.appendChild(name);
      const price = Number(product.price);
      if (Number.isFinite(price)) {
        const priceNode = document.createElement('p'); priceNode.className = 'product-price'; priceNode.textContent = `₹${currency.format(price)}`; info.appendChild(priceNode);
        const mrp = Number(product.mrp);
        if (Number.isFinite(mrp) && mrp > price) { const mrpNode = document.createElement('del'); mrpNode.className = 'product-mrp'; mrpNode.textContent = `₹${currency.format(mrp)}`; info.appendChild(mrpNode); }
      }
      link.append(imageWrap, info);

      const controls = document.createElement('div'); controls.className = 'product-card-controls';
      const wishlist = document.createElement('button'); wishlist.type = 'button'; wishlist.className = 'wishlist'; wishlist.dataset.cardAction = 'wishlist';
      wishlist.setAttribute('aria-label', `Add ${productName(product)} to wishlist`); wishlist.setAttribute('aria-pressed', 'false'); wishlist.textContent = '♡';
      const quickView = document.createElement('button'); quickView.type = 'button'; quickView.className = 'quick-view'; quickView.dataset.cardAction = 'quick-view';
      quickView.dataset.productId = String(product._id || product.id || product.slug || ''); quickView.textContent = 'Quick view';
      controls.append(wishlist, quickView); card.append(link, controls); grid.appendChild(card);
    });
    syncQueryState();
  }

  function showQuickView(product) {
    const dialog = document.getElementById('quick-view-dialog');
    dialog.querySelector('.quick-view-image').src = productImage(product);
    dialog.querySelector('.quick-view-image').alt = productName(product);
    dialog.querySelector('.quick-view-title').textContent = productName(product);
    dialog.querySelector('.quick-view-price').textContent = `₹${product.price.toLocaleString('en-IN')}`;
    dialog.showModal();
  }

  document.getElementById('filter-toggle').addEventListener('click', (event) => {
    const button = event.currentTarget;
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    panel.classList.toggle('is-open', expanded);
  });
  const initialQuery = new URLSearchParams(location.search);
  if (['recommended', 'price-low', 'price-high', 'name'].includes(initialQuery.get('sort'))) sortSelect.value = initialQuery.get('sort');
  grid.classList.toggle('is-list-view', initialQuery.get('view') === 'list');
  viewButtons.forEach((button, index) => {
    button.classList.toggle('is-active', (index === 1) === grid.classList.contains('is-list-view'));
    button.addEventListener('click', () => {
      viewButtons.forEach((option) => option.classList.remove('is-active'));
      button.classList.add('is-active');
      grid.classList.toggle('is-list-view', index === 1);
      renderProducts();
    });
  });
  sortSelect.addEventListener('change', renderProducts);
  document.querySelectorAll('.filter-chip').forEach((button) => {
    button.addEventListener('click', () => {
      button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
      renderProducts();
    });
  });
  panel.addEventListener('change', renderProducts);
  document.getElementById('clear-filters').addEventListener('click', () => {
    panel.querySelectorAll('input:checked').forEach((input) => { input.checked = false; });
    document.querySelectorAll('.filter-chip[aria-pressed="true"]').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    renderProducts();
  });
  grid.addEventListener('click', (event) => {
    const control = event.target.closest('[data-card-action]');
    if (control && grid.contains(control)) {
      event.stopPropagation();
      if (control.dataset.cardAction === 'wishlist') {
        const active = control.getAttribute('aria-pressed') !== 'true';
        control.setAttribute('aria-pressed', String(active)); control.textContent = active ? '♥' : '♡';
      } else if (control.dataset.cardAction === 'quick-view') {
        const product = products.find((entry) => String(entry._id || entry.id || entry.slug || '') === control.dataset.productId);
        if (product) showQuickView(product);
      }
      return;
    }
    const cardLink = event.target.closest('.product-card-link');
    if (cardLink && grid.contains(cardLink) && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      try { sessionStorage.setItem(scrollStorageKey(), String(window.scrollY)); } catch (_) { /* Scroll restoration remains browser managed. */ }
    }
  });
  grid.addEventListener('auxclick', (event) => {
    if (event.target.closest('.product-card-link')) {
      try { sessionStorage.setItem(scrollStorageKey(), String(window.scrollY)); } catch (_) { /* Ignore unavailable storage. */ }
    }
  });
  document.getElementById('close-quick-view').addEventListener('click', () => document.getElementById('quick-view-dialog').close());
  document.getElementById('quick-view-add').addEventListener('click', async () => {
    const customer = await window.KyraaCustomerAuth?.requireLogin();
    if (!customer) return;
    const name = document.querySelector('.quick-view-title').textContent;
    const product = products.find((entry) => productName(entry) === name);
    const bag = readBag();
    const existing = bag.find((item) => item.product === name && item.size === 'M' && item.color === 'Selected colour');
    if (existing) {
      existing.quantity = Number(existing.quantity || 1) + 1;
    } else if (product) {
      bag.push({
        category: category ? category.title : 'Curated',
        product: productName(product),
        price: product.price,
        image: productImage(product),
        size: 'M',
        color: 'Selected colour',
        quantity: 1
      });
    }
    window.localStorage.setItem('kyraa-category-bag', JSON.stringify(bag));
    updateBagCount();
    document.getElementById('quick-view-dialog').close();
    toast.textContent = `${name} added to your bag.`;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
  });

  const categoryLinks = document.getElementById('category-links');
  async function loadCatalog() {
    try {
      if (typeof window.KyraaShop?.getProducts !== 'function') throw new Error('Product catalog is unavailable.');
      const catalog = await window.KyraaShop.getProducts();
      products = catalog.filter((product) => product?.isActive !== false && !product?.mergedInto);
      buildFilterGroups();
      categoryLinks.replaceChildren();
      [...new Set(products.map((product) => textOf(product.category)).filter(Boolean))].sort((a, b) => a.localeCompare(b)).forEach((value) => {
        const link = document.createElement('a'); link.href = `category.html?category=${encodeURIComponent(slugOf(value))}`; link.textContent = value; categoryLinks.appendChild(link);
      });
      renderProducts();
      requestAnimationFrame(() => {
        try {
          const saved = sessionStorage.getItem(scrollStorageKey());
          if (saved !== null) { window.scrollTo(0, Number(saved) || 0); sessionStorage.removeItem(scrollStorageKey()); }
        } catch (_) { /* Browser Back will restore position where storage is unavailable. */ }
      });
    } catch (_) {
      products = []; filterGroups.replaceChildren(); count.textContent = '0';
      grid.replaceChildren(); const message = document.createElement('p'); message.className = 'empty-state';
      message.textContent = 'Products could not be loaded. Please refresh to try again.'; grid.appendChild(message);
    }
  }
  window.addEventListener('pageshow', () => {
    try {
      const saved = sessionStorage.getItem(scrollStorageKey());
      if (saved !== null) requestAnimationFrame(() => window.scrollTo(0, Number(saved) || 0));
    } catch (_) { /* Browser Back restores the position when storage is unavailable. */ }
  });
  loadCatalog();
  updateBagCount();
})();
