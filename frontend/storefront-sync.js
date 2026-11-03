(() => {
  'use strict';

  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const slug = (value) => String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const categoryKey = new URLSearchParams(window.location.search).get('category') || '';
  const editKey = new URLSearchParams(window.location.search).get('edit') || '';
  let latestContent = null;

  function readBag() {
    try {
      const bag = JSON.parse(window.localStorage.getItem('kyraa-category-bag') || '[]');
      return Array.isArray(bag) ? bag : [];
    } catch (_) { return []; }
  }

  function writeBag(bag) {
    window.localStorage.setItem('kyraa-category-bag', JSON.stringify(bag));
    window.dispatchEvent(new Event('kyraa:bag-changed'));
  }

  function updateBagCount() {
    const count = document.getElementById('bag-count');
    if (!count) return;
    const quantity = readBag().reduce((total, item) => total + Number(item.quantity || 1), 0);
    count.hidden = quantity === 0;
    count.textContent = String(quantity);
  }

  async function addToBag(product, button) {
    const customer = await window.KyraaCustomerAuth?.requireLogin();
    if (!customer) return;
    const bag = readBag();
    const size = product.sizes?.find((item) => item.available)?.size || 'M';
    const existing = bag.find((item) => item.productId === product.id && item.size === size);
    if (existing) existing.quantity = Number(existing.quantity || 1) + 1;
    else bag.push({ productId: product.id, product: product.name, designer: 'KYRAA STYLE', price: Number(product.price || 0), image: product.imageUrl, size, color: 'Selected colour', quantity: 1 });
    writeBag(bag);
    updateBagCount();
    if (button) {
      const label = button.textContent;
      button.textContent = 'Added to bag';
      window.setTimeout(() => { button.textContent = label; }, 1500);
    }
  }

  function openQuickView(product) {
    const dialog = document.getElementById('quick-view-dialog');
    if (!dialog) return;
    const image = dialog.querySelector('.quick-view-image');
    const title = dialog.querySelector('.quick-view-title');
    const price = dialog.querySelector('.quick-view-price');
    if (image) { image.src = product.imageUrl; image.alt = product.alt || product.name; }
    if (title) title.textContent = product.name;
    if (price) price.textContent = product.price == null ? 'Price on request' : currency(product.price);
    const addButton = dialog.querySelector('.bag-button');
    if (addButton) addButton.onclick = () => { void addToBag(product, addButton); };
    if (!dialog.open) dialog.showModal();
  }

  function productCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card product-card--without-hover-image';
    card.dataset.productId = product.id || '';
    const imageWrap = document.createElement('div');
    imageWrap.className = 'product-image-wrap';
    const image = document.createElement('img');
    image.className = 'product-image';
    image.src = product.imageUrl;
    image.alt = product.alt || product.name;
    image.loading = 'lazy';
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `Quick view: ${product.name}`);
    image.addEventListener('click', () => openQuickView(product));
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openQuickView(product); }
    });
    imageWrap.appendChild(image);
    if (product.isNewArrival || product.isBestSeller || product.isEditorsPick || product.isLuxeCollection || product.isCuratedLook) {
      const badge = document.createElement('span');
      badge.className = 'product-badge';
      badge.textContent = product.isNewArrival ? 'NEW ARRIVAL' : product.isBestSeller ? 'BEST SELLER' : product.isEditorsPick ? 'EDITOR’S PICK' : product.isLuxeCollection ? 'LUXE' : 'CURATED';
      imageWrap.appendChild(badge);
    }
    const wishlist = document.createElement('button');
    wishlist.className = 'wishlist';
    wishlist.type = 'button';
    wishlist.setAttribute('aria-label', `Add ${product.name} to wishlist`);
    wishlist.setAttribute('aria-pressed', 'false');
    wishlist.textContent = '♡';
    wishlist.addEventListener('click', () => {
      const active = wishlist.getAttribute('aria-pressed') !== 'true';
      wishlist.setAttribute('aria-pressed', String(active));
      wishlist.textContent = active ? '♥' : '♡';
    });
    imageWrap.appendChild(wishlist);
    const quickView = document.createElement('button');
    quickView.className = 'quick-view';
    quickView.type = 'button';
    quickView.textContent = 'Quick view';
    quickView.addEventListener('click', () => openQuickView(product));
    imageWrap.appendChild(quickView);
    const info = document.createElement('div');
    info.className = 'product-info';
    const designer = document.createElement('p'); designer.className = 'designer-name'; designer.textContent = 'KYRAA STYLE';
    const name = document.createElement('h2'); name.textContent = product.name;
    const price = document.createElement('p'); price.className = 'product-price';
    if (product.price != null) {
      price.textContent = currency(product.price);
      if (product.oldPrice > product.price) {
        const oldPrice = document.createElement('del');
        oldPrice.textContent = ` ${currency(product.oldPrice)}`;
        price.appendChild(oldPrice);
      }
    } else price.textContent = 'Price on request';
    info.append(designer, name, price);
    card.append(imageWrap, info);
    return card;
  }

  function collection(content) {
    const all = Array.isArray(content.products) ? content.products : [];
    const categories = Array.isArray(content.categories) ? content.categories : [];
    const selectedCategory = categories.find((item) => item.id === categoryKey || slug(item.name) === categoryKey || (categoryKey === 'kurti-sets' && slug(item.name) === 'kurta-sets'));
    let products = selectedCategory ? all.filter((item) => item.category === selectedCategory.name) : all;
    const placement = { 'new-arrivals': 'isNewArrival', curated: 'isCuratedLook', 'best-sellers': 'isBestSeller', 'editors-picks': 'isEditorsPick', occasion: 'isOccasionPick', luxe: 'isLuxeCollection' }[editKey];
    if (placement) products = products.filter((item) => item[placement]);
    else if (editKey) products = products.filter((item) => slug(item.section) === slug(editKey));
    const sort = document.getElementById('sort-select')?.value;
    if (sort === 'price-low') products = [...products].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === 'price-high') products = [...products].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sort === 'name') products = [...products].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return { products, categories, selectedCategory };
  }

  function updateCollectionCopy(selectedCategory) {
    const title = document.getElementById('collection-title');
    const description = document.getElementById('collection-description');
    const breadcrumb = document.getElementById('breadcrumb-category');
    const hero = document.getElementById('collection-hero-image');
    const editNames = { 'new-arrivals': 'New Arrivals', curated: 'Curated by Kryaa', 'best-sellers': 'Best Sellers', 'editors-picks': 'Editor’s Picks', occasion: 'Shop by Occasion', luxe: 'Kryaa Luxe' };
    const label = selectedCategory?.name || editNames[editKey] || 'Curated Collections';
    if (title) title.textContent = label;
    if (description) description.textContent = selectedCategory?.description || `Explore ${label} from Kryaa Style.`;
    if (breadcrumb) breadcrumb.textContent = label;
    if (hero && selectedCategory?.imageUrl) { hero.src = selectedCategory.imageUrl; hero.alt = `${label} collection`; }
  }

  function updateCategoryLinks(categories, selectedCategory) {
    const host = document.getElementById('category-links');
    if (host) {
      host.replaceChildren(...categories.map((category) => {
        const link = document.createElement('a');
        link.href = `category.html?category=${encodeURIComponent(category.id)}`;
        link.textContent = category.name;
        return link;
      }));
    }
    const details = document.querySelector('.filter-panel details');
    if (!details) return;
    const summary = details.querySelector('summary');
    details.replaceChildren(summary, ...categories.map((category) => {
      const link = document.createElement('a');
      link.className = 'filter-link';
      link.href = `category.html?category=${encodeURIComponent(category.id)}`;
      link.textContent = category.name;
      if (selectedCategory?.id === category.id) link.setAttribute('aria-current', 'page');
      return link;
    }));
  }

  function render(content) {
    if (!content) return;
    latestContent = content;
    const { products, categories, selectedCategory } = collection(content);
    updateCollectionCopy(selectedCategory);
    updateCategoryLinks(categories, selectedCategory);
    const count = document.getElementById('result-count');
    if (count) count.textContent = String(products.length);
    grid.replaceChildren();
    if (!products.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No products are available in this collection yet.';
      grid.appendChild(empty);
      return;
    }
    products.forEach((product) => grid.appendChild(productCard(product)));
  }

  function guardTemplateControls() {
    document.getElementById('sort-select')?.addEventListener('change', (event) => {
      event.stopImmediatePropagation();
      render(latestContent);
    }, true);
    document.getElementById('filter-panel')?.addEventListener('change', (event) => {
      event.stopImmediatePropagation();
      render(latestContent);
    }, true);
  }

  guardTemplateControls();
  window.addEventListener('kyraa:bag-changed', updateBagCount);
  window.addEventListener('kyraa:storefront-content', (event) => render(event.detail));
  updateBagCount();
  const initial = window.KyraaStorefrontData?.getContent();
  if (initial) render(initial);
})();
