(() => {
  'use strict';

  const apiBase = String(window.KYRAA_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  const escapeText = (value) => String(value ?? '');
  const categorySlug = (name) => escapeText(name).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const safeHref = (value, fallback) => {
    if (typeof value !== 'string' || !value.trim()) return fallback;
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
    } catch (_) { return fallback; }
  };
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = escapeText(text);
    return node;
  };
  const sectionHost = () => document.querySelector('main') || document.body;

  function renderAnnouncement(content) {
    const announcement = content.announcements?.[0];
    let bar = document.querySelector('.announcement-bar');
    if (!announcement) {
      return;
    }
    if (!bar) {
      bar = el('div', 'announcement-bar storefront-announcement');
      document.body.prepend(bar);
    }
    bar.hidden = false;
    bar.textContent = announcement.text;
    bar.setAttribute('aria-label', 'Store announcement');
  }

  function renderBanners(banners) {
    if (!banners?.length || document.querySelector('.storefront-managed-banner')) return;
    const banner = banners[0];
    if (!banner.desktopImageUrl || !banner.mobileImageUrl) return;
    const section = el('section', 'storefront-managed-banner');
    const link = el('a', 'storefront-managed-banner-link');
    link.href = safeHref(banner.link, '../store/category.html');
    const picture = el('picture');
    const source = el('source'); source.media = '(max-width: 700px)'; source.srcset = banner.mobileImageUrl;
    const image = el('img'); image.src = banner.desktopImageUrl; image.alt = banner.title || 'Kryaa Style collection'; image.fetchPriority = 'high';
    picture.append(source, image); link.appendChild(picture); section.appendChild(link);
    const main = sectionHost(); const nav = document.querySelector('.kr-storefront-nav');
    if (nav?.nextElementSibling === main) main.insertAdjacentElement('beforebegin', section); else main.prepend(section);
  }

  function categoryCard(category) {
    const card = el('a', 'women-category-card');
    card.href = `../store/category.html?category=${encodeURIComponent(category.id || categorySlug(category.name))}`;
    const imageWrap = el('span', 'women-category-circle');
    if (category.imageUrl) {
      const image = el('img'); image.src = category.imageUrl; image.alt = category.name; image.loading = 'lazy'; imageWrap.appendChild(image);
    }
    card.append(imageWrap, el('span', 'women-category-title', category.name));
    return card;
  }

  function renderHomeCategories(categories) {
    const section = document.querySelector('.women-category-section');
    if (!section || !categories?.length) return;
    const desktop = section.querySelector('.women-category-desktop');
    const firstPage = section.querySelector('.women-category-mobile-page');
    const secondPage = section.querySelectorAll('.women-category-mobile-page')[1];
    if (desktop) desktop.replaceChildren(...categories.map(categoryCard));
    if (firstPage) firstPage.replaceChildren(...categories.slice(0, 6).map(categoryCard));
    if (secondPage) secondPage.replaceChildren(...categories.slice(6).map(categoryCard));
    const mobile = section.querySelector('.women-category-mobile');
    if (mobile) mobile.hidden = categories.length <= 6;
  }

  function productCard(product) {
    const card = el('article', 'storefront-product-card');
    const imageLink = el('a', 'storefront-product-image');
    imageLink.href = safeHref(product.link, `../store/category.html?category=${encodeURIComponent(categorySlug(product.category))}`);
    const image = el('img'); image.src = product.imageUrl; image.alt = product.alt || product.name; image.loading = 'lazy'; image.decoding = 'async';
    imageLink.appendChild(image);
    const body = el('div', 'storefront-product-copy');
    if (product.category) body.appendChild(el('p', 'storefront-product-category', product.category));
    body.appendChild(el('h3', '', product.name));
    if (product.price != null) {
      const price = el('p', 'storefront-product-price', `₹${Number(product.price).toLocaleString('en-IN')}`);
      if (product.oldPrice > product.price) {
        const old = el('del', '', `₹${Number(product.oldPrice).toLocaleString('en-IN')}`);
        price.append(' ', old);
      }
      body.appendChild(price);
    }
    const add = el('button', 'storefront-add-to-bag', 'Add to bag');
    add.type = 'button';
    add.addEventListener('click', async () => {
      const customer = await window.KyraaCustomerAuth?.requireLogin();
      if (!customer) return;
      let bag;
      try { bag = JSON.parse(window.localStorage.getItem('kyraa-category-bag') || '[]'); } catch (_) { bag = []; }
      if (!Array.isArray(bag)) bag = [];
      const size = product.sizes?.find((item) => item.available)?.size || 'M';
      const existing = bag.find((item) => item.productId === product.id && item.size === size);
      if (existing) existing.quantity = Number(existing.quantity || 1) + 1;
      else bag.push({ productId: product.id, product: product.name, designer: 'KYRAA STYLE', price: Number(product.price || 0), image: product.imageUrl, size, color: 'Selected colour', quantity: 1 });
      window.localStorage.setItem('kyraa-category-bag', JSON.stringify(bag));
      add.textContent = 'Added';
      window.setTimeout(() => { add.textContent = 'Add to bag'; }, 1600);
    });
    body.appendChild(add);
    card.append(imageLink, body);
    return card;
  }

  const normaliseHeading = (value) => String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  function findHomeTemplateSection(labels) {
    const wanted = labels.map(normaliseHeading);
    const heading = [...document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6, main [role="heading"]')]
      .find((item) => wanted.includes(normaliseHeading(item.textContent)));
    if (!heading) return null;
    return heading.closest('section') || heading.closest('.wrapperContainer') || heading.parentElement?.parentElement || null;
  }

  function renderIntoHomeTemplate(section, products, label) {
    if (!section || !products.length) return;
    let outlet = section.querySelector('[data-storefront-product-outlet]');
    if (!outlet) {
      outlet = el('div', 'storefront-template-product-carousel');
      outlet.dataset.storefrontProductOutlet = 'true';
      const originalRow = section.querySelector('.slick-slider, .curated-trending-looks, .kr-best-sellers__grid, .kr-editors-picks__grid, .grid');
      if (originalRow) originalRow.replaceWith(outlet);
      else section.appendChild(outlet);
    }
    outlet.replaceChildren();
    const controls = el('div', 'storefront-template-carousel-controls');
    const previous = el('button', 'storefront-template-arrow', '‹');
    const next = el('button', 'storefront-template-arrow', '›');
    previous.type = 'button'; next.type = 'button';
    previous.setAttribute('aria-label', `Show previous ${label} products`);
    next.setAttribute('aria-label', `Show more ${label} products`);
    controls.append(previous, next);
    const viewport = el('div', 'storefront-template-product-viewport');
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', `${label} products`);
    const rail = el('div', 'storefront-template-product-rail');
    products.forEach((product) => rail.appendChild(productCard(product)));
    viewport.appendChild(rail); outlet.append(viewport, controls);
    const updateControls = () => {
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth - 2);
      previous.disabled = viewport.scrollLeft <= 2;
      next.disabled = viewport.scrollLeft >= maxScroll;
    };
    const scroll = (direction) => viewport.scrollBy({ left: direction * Math.max(220, viewport.clientWidth * .84), behavior: 'smooth' });
    previous.addEventListener('click', () => scroll(-1));
    next.addEventListener('click', () => scroll(1));
    viewport.addEventListener('scroll', updateControls, { passive: true });
    window.requestAnimationFrame(updateControls);
  }

  function renderHomeProducts(products) {
    if (!products?.length) return;
    const newArrivals = products.filter((product) => product.isNewArrival);
    // The original New Arrivals row doubles as the default home row. This keeps
    // the existing page template untouched while ensuring a newly published
    // product is visible even before any optional placement box is selected.
    const placements = [
      { label: 'New Arrivals', section: () => findHomeTemplateSection(['New Arrivals']), products: newArrivals.length ? newArrivals : products },
      { label: "Editor's Picks", section: () => document.getElementById('kr-editors-picks') || findHomeTemplateSection(["Editor's Picks"]), products: products.filter((product) => product.isEditorsPick) },
      { label: 'Curated by Kryaa', section: () => document.querySelector('.curated-trending-looks')?.closest('section') || findHomeTemplateSection(['Curated Trending Looks', 'Curated by Kryaa']), products: products.filter((product) => product.isCuratedLook) },
      { label: 'Best Sellers', section: () => document.getElementById('kr-best-sellers') || findHomeTemplateSection(['Best Sellers', "Kyraa's Best Sellers"]), products: products.filter((product) => product.isBestSeller) },
      { label: 'Shop by Occasion', section: () => findHomeTemplateSection(['Shop by Occasion']), products: products.filter((product) => product.isOccasionPick) },
      { label: 'Kryaa Luxe', section: () => document.getElementById('kryaa-luxe-banner') || findHomeTemplateSection(['Kryaa Luxe']), products: products.filter((product) => product.isLuxeCollection) },
    ];
    placements.forEach((placement) => renderIntoHomeTemplate(placement.section(), placement.products, placement.label));

    // An owner can name a custom section in the dress form. If that title is
    // present in the supplied homepage template, it receives the same card
    // carousel and arrow controls as the standard placements.
    const customSections = new Map();
    products.forEach((product) => {
      const name = String(product.section || '').trim();
      if (!name) return;
      if (!customSections.has(name)) customSections.set(name, []);
      customSections.get(name).push(product);
    });
    customSections.forEach((items, name) => renderIntoHomeTemplate(findHomeTemplateSection([name]), items, name));
  }

  function renderCoupons(coupons) {
    if (!coupons?.length || document.querySelector('.storefront-coupon-strip')) return;
    const strip = el('section', 'storefront-coupon-strip');
    strip.setAttribute('aria-label', 'Available offers');
    coupons.slice(0, 3).forEach((coupon) => {
      const item = el('div', 'storefront-coupon');
      const discount = coupon.discountType === 'percentage' ? `${coupon.discountValue}% off` : `₹${Number(coupon.discountValue).toLocaleString('en-IN')} off`;
      item.append(el('strong', '', discount), el('span', '', `Use code ${coupon.code}`));
      const button = el('button', '', 'Copy code'); button.type = 'button'; button.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(coupon.code); button.textContent = 'Copied'; }
        catch (_) { button.textContent = coupon.code; }
      });
      item.appendChild(button); strip.appendChild(item);
    });
    const host = sectionHost();
    const anchor = host.querySelector('.storefront-live-products');
    if (anchor) anchor.insertAdjacentElement('beforebegin', strip); else host.appendChild(strip);
  }

  function renderMedia(content) {
    const media = [];
    (content.reels || []).forEach((reel) => media.push({ type: reel.mediaType, src: reel.mediaType === 'image' ? reel.mediaUrl : reel.mediaUrl, poster: reel.thumbnailUrl, video: reel.mediaType === 'video', alt: reel.productName || reel.category || 'Kryaa Style collection' }));
    (content.instagramPosts || []).forEach((post) => media.push({ type: 'image', src: post.imageUrl, alt: post.alt || 'Kryaa Style collection' }));
    if (!media.length || document.querySelector('.storefront-live-media')) return;
    const section = el('section', 'storefront-live-media');
    section.append(el('p', 'storefront-section-eyebrow', 'FROM OUR LATEST STORIES'), el('h2', '', 'Kryaa Style, In Motion'));
    const grid = el('div', 'storefront-media-grid');
    media.slice(0, 8).forEach((item) => {
      const figure = el('figure', '');
      if (item.video && item.src) {
        const video = el('video'); video.controls = true; video.playsInline = true; video.preload = 'metadata'; video.poster = item.poster || '';
        video.setAttribute('aria-label', item.alt);
        const source = el('source'); source.src = item.src; video.appendChild(source); figure.appendChild(video);
      } else {
        const image = el('img'); image.src = item.src; image.alt = item.alt; image.loading = 'lazy'; figure.appendChild(image);
      }
      grid.appendChild(figure);
    });
    section.appendChild(grid);
    sectionHost().appendChild(section);
  }

  function renderCatalog(content) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    const all = content.products || [];
    const categories = content.categories || [];
    const search = new URLSearchParams(window.location.search);
    const key = search.get('category') || '';
    const edit = search.get('edit') || '';
    const category = categories.find((item) => item.id === key || categorySlug(item.name) === key || (key === 'kurti-sets' && categorySlug(item.name) === 'kurta-sets'));
    let products = category ? all.filter((product) => product.category === category.name) : all;
    if (edit === 'new-arrivals') products = products.filter((product) => product.isNewArrival);
    else if (edit === 'curated') products = products.filter((product) => product.isCuratedLook);
    else if (edit === 'best-sellers') products = products.filter((product) => product.isBestSeller);
    else if (edit === 'editors-picks') products = products.filter((product) => product.isEditorsPick);
    else if (edit === 'occasion') products = products.filter((product) => product.isOccasionPick);
    else if (edit === 'luxe') products = products.filter((product) => product.isLuxeCollection);
    else if (edit) products = products.filter((product) => categorySlug(product.section) === categorySlug(edit));
    const title = document.getElementById('collection-title');
    const description = document.getElementById('collection-description');
    const breadcrumb = document.getElementById('breadcrumb-category');
    const hero = document.getElementById('collection-hero-image');
    if (category) {
      if (title) title.textContent = category.name;
      if (description) description.textContent = category.description || `Explore ${category.name} from Kryaa Style.`;
      if (breadcrumb) breadcrumb.textContent = category.name;
      if (hero && category.imageUrl) { hero.src = category.imageUrl; hero.alt = `${category.name} collection`; }
    } else if (edit) {
      const names = { 'new-arrivals': 'New Arrivals', curated: 'Curated by Kryaa', 'best-sellers': 'Best Sellers', 'editors-picks': "Editor's Picks", occasion: 'Shop by Occasion', luxe: 'Kryaa Luxe' };
      const editName = names[edit] || edit.replace(/-/g, ' ');
      if (title) title.textContent = editName;
      if (description) description.textContent = `Explore ${editName} from Kryaa Style.`;
      if (breadcrumb) breadcrumb.textContent = editName;
    }
    const count = document.getElementById('result-count'); if (count) count.textContent = String(products.length);
    grid.replaceChildren();
    if (!products.length) { grid.appendChild(el('p', 'empty-state', 'No products are available in this collection yet.')); return; }
    products.forEach((product) => {
      const card = el('article', 'product-card');
      const imageWrap = el('div', 'product-image-wrap');
      const image = el('img', 'product-image'); image.src = product.imageUrl; image.alt = product.alt || product.name; image.loading = 'lazy';
      imageWrap.appendChild(image);
      if (product.isNewArrival || product.isBestSeller || product.isCuratedLook || product.isEditorsPick || product.isLuxeCollection) imageWrap.appendChild(el('span', 'product-badge', product.isNewArrival ? 'NEW ARRIVAL' : product.isBestSeller ? 'BEST SELLER' : product.isEditorsPick ? 'EDITOR\'S PICK' : product.isLuxeCollection ? 'LUXE' : 'CURATED'));
      const info = el('div', 'product-info'); info.append(el('p', 'designer-name', 'KRYAA STYLE'), el('h2', '', product.name));
      const price = el('p', 'product-price', product.price == null ? '' : `₹${Number(product.price).toLocaleString('en-IN')}`);
      if (product.oldPrice > product.price) price.append(' ', el('del', '', `₹${Number(product.oldPrice).toLocaleString('en-IN')}`));
      info.appendChild(price);
      if (product.description) info.appendChild(el('p', 'storefront-product-description', product.description));
      const add = el('button', 'storefront-add-to-bag', 'Add to bag'); add.type = 'button';
      add.addEventListener('click', async () => {
        const customer = await window.KyraaCustomerAuth?.requireLogin();
        if (!customer) return;
        let bag;
        try { bag = JSON.parse(window.localStorage.getItem('kyraa-category-bag') || '[]'); } catch (_) { bag = []; }
        if (!Array.isArray(bag)) bag = [];
        const size = product.sizes?.find((item) => item.available)?.size || 'M';
        const existing = bag.find((item) => item.productId === product.id && item.size === size);
        if (existing) existing.quantity = Number(existing.quantity || 1) + 1;
        else bag.push({ productId: product.id, product: product.name, designer: 'KYRAA STYLE', price: Number(product.price || 0), image: product.imageUrl, size, color: 'Selected colour', quantity: 1 });
        window.localStorage.setItem('kyraa-category-bag', JSON.stringify(bag));
        add.textContent = 'Added'; window.setTimeout(() => { add.textContent = 'Add to bag'; }, 1600);
      });
      info.appendChild(add); card.append(imageWrap, info); grid.appendChild(card);
    });
    const links = document.getElementById('category-links');
    if (links && categories.length) {
      links.replaceChildren(...categories.map((item) => {
        const link = el('a', '', item.name); link.href = `category.html?category=${encodeURIComponent(item.id)}`; return link;
      }));
    }
    const filters = document.querySelector('.filter-panel details');
    if (filters && categories.length) {
      const summary = filters.querySelector('summary');
      filters.replaceChildren(summary, ...categories.map((item) => {
        const link = el('a', 'filter-link', item.name); link.href = `category.html?category=${encodeURIComponent(item.id)}`;
        if (category?.id === item.id) link.setAttribute('aria-current', 'page');
        return link;
      }));
    }
  }

  function applyStorefrontContent(data) {
    if (!data) return;
    const renderStorefront = () => {
      renderAnnouncement(data);
      renderBanners(data.banners);
      renderCatalog(data);
      renderHomeCategories(data.categories);
      renderHomeProducts(data.products);
      renderCoupons(data.coupons);
      renderMedia(data);
    };
    renderStorefront();
    // The captured homepage finishes its own hydration after this script is
    // loaded. Repeat briefly so we fill the original template rows after they exist.
    [300, 1000, 2500, 5000, 8000].forEach((delay) => window.setTimeout(renderStorefront, delay));
  }

  function loadStorefrontContent() {
    return fetch(`${apiBase}/api/storefront/content`, { headers: { Accept: 'application/json' } })
    .then((response) => { if (!response.ok) throw new Error(`Storefront API returned ${response.status}`); return response.json(); })
    .then(({ data }) => applyStorefrontContent(data))
    .catch((error) => console.info('Using the storefront fallback content until the admin API is available.', error.message));
  }

  function connectLiveStorefrontUpdates() {
    if (window.io || document.querySelector('script[data-kryaa-socket-client]')) return;
    const client = document.createElement('script');
    client.dataset.kryaaSocketClient = 'true';
    client.src = `${apiBase}/socket.io/socket.io.js`;
    client.async = true;
    client.onload = () => {
      if (typeof window.io !== 'function') return;
      const socket = window.io(apiBase, { transports: ['websocket', 'polling'] });
      socket.on('storefront:changed', () => { void loadStorefrontContent(); });
    };
    document.head.appendChild(client);
  }

  void loadStorefrontContent();
  connectLiveStorefrontUpdates();
})();
