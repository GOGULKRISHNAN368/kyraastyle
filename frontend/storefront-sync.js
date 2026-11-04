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
    card.append(imageLink, body);
    return card;
  }

  function imageEditorialCard(product, isNewArrival = false) {
    const card = el('a', isNewArrival ? 'storefront-arrival-card' : 'kr-editors-picks__card');
    card.href = safeHref(product.link, `../store/category.html?category=${encodeURIComponent(categorySlug(product.category))}`);
    const image = el('img'); image.src = product.imageUrl; image.alt = product.alt || product.name || ''; image.loading = 'lazy'; image.decoding = 'async';
    const shade = el('span', isNewArrival ? 'storefront-arrival-card__shade' : 'kr-editors-picks__shade');
    const copy = el('span', isNewArrival ? 'storefront-arrival-card__copy' : 'kr-editors-picks__copy');
    if (!isNewArrival) copy.appendChild(el('small', '', String(product.category || 'KYRAA EDIT').toUpperCase()));
    copy.appendChild(el(isNewArrival ? 'strong' : 'strong', '', product.name || 'Kryaa Style'));
    if (!isNewArrival) copy.appendChild(el('em', '', 'Shop now'));
    card.append(image, shade, copy);
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
    const isNewArrivals = label === 'New Arrivals';
    const isEditorsPicks = label === "Editor's Picks";
    if (isEditorsPicks) {
      let grid = section.querySelector('.kr-editors-picks__grid');
      if (!grid) {
        grid = el('div', 'kr-editors-picks__grid');
        const originalRow = section.querySelector('.slick-slider, .grid');
        if (originalRow) originalRow.replaceWith(grid); else section.appendChild(grid);
      }
      grid.dataset.storefrontProductOutlet = 'true';
      grid.replaceChildren(...products.slice(0, 4).map((product) => imageEditorialCard(product)));
      return;
    }
    let outlet = section.querySelector('[data-storefront-product-outlet]');
    if (!outlet) {
      outlet = el('div', `storefront-template-product-carousel${isNewArrivals ? ' storefront-template-product-carousel--new-arrivals' : ''}`);
      outlet.dataset.storefrontProductOutlet = 'true';
      const originalRow = section.querySelector('.slick-slider, .curated-trending-looks, .kr-best-sellers__grid, .kr-editors-picks__grid, .grid');
      if (originalRow) originalRow.replaceWith(outlet);
      else section.appendChild(outlet);
    }
    if (isNewArrivals) {
      outlet.classList.add('storefront-template-product-carousel--new-arrivals');
      section.querySelector('.new-arrivals-mobile-grid-carousel')?.remove();
      section.querySelector('.new-arrivals-mobile-controls')?.remove();
    }
    outlet.replaceChildren();
    const controls = el('div', 'storefront-template-carousel-controls');
    const previous = el('button', 'storefront-template-arrow', '‹');
    const next = el('button', 'storefront-template-arrow', '›');
    previous.type = 'button'; next.type = 'button';
    previous.setAttribute('aria-label', `Show previous ${label} products`);
    next.setAttribute('aria-label', `Show more ${label} products`);
    controls.append(previous, next);
    let progressThumb = null;
    if (isNewArrivals) {
      controls.classList.add('storefront-template-carousel-controls--paged');
      const progress = el('span', 'storefront-template-carousel-progress');
      progressThumb = el('span', 'storefront-template-carousel-progress-thumb');
      progress.appendChild(progressThumb);
      controls.insertBefore(progress, next);
    }
    const viewport = el('div', 'storefront-template-product-viewport');
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', `${label} products`);
    const rail = el('div', 'storefront-template-product-rail');
    if (isNewArrivals) {
      for (let start = 0; start < products.length; start += 4) {
        const page = el('div', 'storefront-template-product-page');
        products.slice(start, start + 4).forEach((product) => page.appendChild(imageEditorialCard(product, true)));
        rail.appendChild(page);
      }
    } else products.forEach((product) => rail.appendChild(productCard(product)));
    viewport.appendChild(rail); outlet.append(viewport, controls);
    const updateControls = () => {
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth - 2);
      previous.disabled = viewport.scrollLeft <= 2;
      next.disabled = viewport.scrollLeft >= maxScroll;
      if (progressThumb) {
        const pages = Math.max(1, rail.children.length);
        const width = 100 / pages;
        const page = maxScroll ? Math.min(pages - 1, Math.round(viewport.scrollLeft / maxScroll * (pages - 1))) : 0;
        progressThumb.style.width = `${width}%`;
        progressThumb.style.left = `${page * width}%`;
      }
    };
    const scroll = (direction) => viewport.scrollBy({ left: direction * (isNewArrivals ? viewport.clientWidth : Math.max(220, viewport.clientWidth * .84)), behavior: 'smooth' });
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
      card.append(imageWrap, info); grid.appendChild(card);
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
