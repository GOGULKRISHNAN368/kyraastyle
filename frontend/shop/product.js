(() => {
  'use strict';

  const CLOUD_NAME = 'l8xwk9bz';
  const currency = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const byId = (id) => document.getElementById(id);
  const query = new URLSearchParams(location.search);
  const requestedSlug = query.get('slug') || '';
  const requestedId = query.get('id') || '';
  let product = null;
  let products = [];
  let images = [];
  let imageIndex = 0;
  let selectedSize = '';
  let programmaticScroll = false;
  let swipeStart = null;

  const numeric = (value) => value === undefined || value === null || value === '' || !Number.isFinite(Number(value)) ? null : Math.max(0, Number(value));
  const priceOf = (item) => numeric(item.price);
  const mrpOf = (item) => numeric(item.mrp);
  const idOf = (item) => String(item._id || item.id || item.slug || '');
  const toTitle = (value) => String(value || '').trim().toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);

  function categoryName(value) {
    const normalized = String(value || '').trim().toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ');
    if (/\bco\s*-?\s*ords?\b|\bco\s*-?\s*ord\s+sets?\b/.test(normalized)) return 'Co-Ord Sets';
    if (!normalized) return '';
    return toTitle(normalized);
  }

  function publicIdOf(image) {
    if (typeof image === 'string') return image.trim();
    return String(image?.publicId || image?.cloudinaryId || '').trim();
  }

  function cloudinaryUrl(publicId, width) {
    const id = String(publicId || '').replace(/^\/+|\/+$/g, '');
    if (!id || !/^[a-z0-9_./-]+$/i.test(id)) return '';
    const safeId = id.split('/').map(encodeURIComponent).join('/');
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto:best,c_limit,w_${width}/${safeId}`;
  }

  function srcsetFor(publicId, widths) {
    return widths.map((width) => `${cloudinaryUrl(publicId, width)} ${width}w`).join(', ');
  }

  function productImages(item) {
    return (Array.isArray(item.images) ? item.images : []).map((entry) => {
      const publicId = publicIdOf(entry);
      return publicId ? { publicId, alt: String(entry?.alt || ''), width: Number(entry?.width || item.width) || 800, height: Number(entry?.height || item.height) || 1000 } : null;
    }).filter(Boolean);
  }

  function realStock(item) { return numeric(item.stock); }

  function sizeOptions() {
    const globalStock = realStock(product);
    return (Array.isArray(product?.sizes) ? product.sizes : []).map((size) => {
      const label = String(typeof size === 'string' ? size : (size?.label || size?.size || '')).trim();
      if (!label) return null;
      const value = typeof size === 'object' && size ? numeric(size.stock ?? size.quantity) : null;
      const stock = value === null ? globalStock : value;
      return { label, stock };
    }).filter(Boolean);
  }

  function selectedStock() {
    const globalStock = realStock(product);
    const sizes = sizeOptions();
    if (!sizes.length) return globalStock;
    if (selectedSize) return sizes.find((size) => size.label === selectedSize)?.stock ?? globalStock;
    if (globalStock !== null) return globalStock;
    const knownStocks = sizes.map((size) => size.stock).filter((stock) => stock !== null);
    return knownStocks.length ? knownStocks.reduce((sum, stock) => sum + stock, 0) : null;
  }

  function isSoldOut() {
    if (realStock(product) === 0) return true;
    const sizes = sizeOptions();
    return sizes.length > 0 && sizes.every((size) => size.stock === 0);
  }

  function showImageError(image, frame) {
    image.addEventListener('error', () => {
      image.hidden = true;
      frame.classList.add('has-image-error');
      const gallery = frame.closest('.product-gallery');
      if (gallery) gallery.classList.add('has-image-error');
    }, { once: true });
  }

  function setImage(index, scroll = true) {
    if (!images.length) return;
    imageIndex = (index + images.length) % images.length;
    const activeImage = byId('product-gallery-track').children[imageIndex]?.querySelector('img');
    const activeItem = images[imageIndex];
    window.KyraaProductImages.setAspect(byId('product-main-image-wrap'), activeImage?.naturalWidth || activeItem?.width, activeImage?.naturalHeight || activeItem?.height);
    const track = byId('product-gallery-track');
    if (scroll && matchMedia('(max-width: 799px)').matches) {
      programmaticScroll = true;
      track.scrollTo({ left: track.clientWidth * imageIndex, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      window.setTimeout(() => { programmaticScroll = false; }, 400);
    } else if (!matchMedia('(max-width: 799px)').matches) {
      track.style.transform = `translateX(-${imageIndex * 100}%)`;
    }
    byId('product-thumbnails').querySelectorAll('.product-thumb').forEach((button, indexInList) => {
      button.setAttribute('aria-current', String(indexInList === imageIndex));
    });
    byId('product-gallery-counter').textContent = images.length > 1 ? `${imageIndex + 1} / ${images.length}` : '';
    byId('product-gallery-dots').querySelectorAll('button').forEach((dot, indexInList) => {
      dot.setAttribute('aria-current', String(indexInList === imageIndex));
    });
    byId('product-image-prev').hidden = images.length < 2;
    byId('product-image-next').hidden = images.length < 2;
    if (byId('product-lightbox').open) updateLightbox();
  }

  function updateLightbox() {
    const item = images[imageIndex];
    const image = byId('product-lightbox-image');
    const lightbox = byId('product-lightbox');
    lightbox.classList.remove('has-image-error');
    image.hidden = false;
    image.onerror = () => { image.hidden = true; lightbox.classList.add('has-image-error'); };
    image.src = cloudinaryUrl(item.publicId, 1200);
    image.srcset = srcsetFor(item.publicId, [600, 900, 1200]);
    image.sizes = '100vw';
    image.alt = `${product.name} view ${imageIndex + 1}`;
    image.width = 960;
    image.height = 1200;
    showImageError(image, byId('product-lightbox'));
    byId('product-lightbox-counter').textContent = images.length > 1 ? `${imageIndex + 1} / ${images.length}` : '';
    byId('product-lightbox-prev').hidden = images.length < 2;
    byId('product-lightbox-next').hidden = images.length < 2;
  }

  function openLightbox() {
    if (!images.length) return;
    updateLightbox();
    byId('product-lightbox').showModal();
    byId('product-lightbox-close').focus();
  }

  function renderGallery() {
    images = productImages(product);
    const thumbs = byId('product-thumbnails');
    const track = byId('product-gallery-track');
    const dots = byId('product-gallery-dots');
    const frame = byId('product-main-image-wrap');
    thumbs.replaceChildren();
    track.replaceChildren();
    dots.replaceChildren();
    frame.classList.remove('has-image-error');
    byId('product-content').classList.toggle('without-gallery', images.length === 0);
    byId('product-content').querySelector('.product-gallery').hidden = images.length === 0;
    byId('product-image-badges').replaceChildren();

    images.forEach((item, index) => {
      const slide = document.createElement('button');
      slide.type = 'button';
      slide.className = 'product-gallery-slide';
      slide.setAttribute('aria-label', `View ${product.name} photo ${index + 1}`);
      const image = document.createElement('img');
      image.className = 'product-main-image';
      image.src = cloudinaryUrl(item.publicId, 1200);
      image.srcset = srcsetFor(item.publicId, [600, 900, 1200]);
      image.sizes = '(max-width: 799px) 100vw, 46vw';
      image.alt = `${product.name} view ${index + 1}`;
      image.width = item.width || 960;
      image.height = item.height || 1200;
      image.loading = index === 0 ? 'eager' : 'lazy';
      image.fetchPriority = index === 0 ? 'high' : 'auto';
      image.decoding = 'async';
      window.KyraaProductImages.fit(image, item, slide);
      image.addEventListener('load', () => { if (imageIndex === index) window.KyraaProductImages.setAspect(frame, image.naturalWidth, image.naturalHeight); }, { once: true });
      showImageError(image, slide);
      slide.appendChild(image);
      slide.addEventListener('click', openLightbox);
      track.appendChild(slide);

      const thumb = document.createElement('button');
      thumb.className = 'product-thumb';
      thumb.type = 'button';
      thumb.setAttribute('role', 'listitem');
      thumb.setAttribute('aria-label', `Show ${product.name} view ${index + 1}`);
      const thumbImage = document.createElement('img');
      thumbImage.src = cloudinaryUrl(item.publicId, 160);
      thumbImage.sizes = '64px';
      thumbImage.alt = `${product.name} view ${index + 1}`;
      thumbImage.width = item.width || 160;
      thumbImage.height = item.height || 200;
      thumbImage.loading = index === 0 ? 'eager' : 'lazy';
      window.KyraaProductImages.fit(thumbImage, item, thumb);
      showImageError(thumbImage, thumb);
      thumb.appendChild(thumbImage);
      thumb.addEventListener('click', () => setImage(index));
      thumbs.appendChild(thumb);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'product-gallery-dot';
      dot.setAttribute('aria-label', `Show photo ${index + 1}`);
      dot.addEventListener('click', () => setImage(index));
      dots.appendChild(dot);
    });

    const sale = mrpOf(product) !== null && priceOf(product) !== null && mrpOf(product) > priceOf(product);
    if (sale) byId('product-image-badges').appendChild(makeBadge('Sale', 'is-sale'));
    if (product.isNewArrival === true) byId('product-image-badges').appendChild(makeBadge('New', 'is-new'));
    setImage(0, false);

    byId('product-image-prev').addEventListener('click', () => setImage(imageIndex - 1));
    byId('product-image-next').addEventListener('click', () => setImage(imageIndex + 1));
    byId('product-main-image-wrap').addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); setImage(imageIndex - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); setImage(imageIndex + 1); }
      if (event.key === 'Enter' && event.target === byId('product-main-image-wrap')) openLightbox();
    });
    track.addEventListener('scroll', () => {
      if (programmaticScroll || !matchMedia('(max-width: 799px)').matches || !track.clientWidth) return;
      const next = Math.round(track.scrollLeft / track.clientWidth);
      if (next !== imageIndex) setImage(next, false);
    }, { passive: true });
    thumbs.addEventListener('wheel', (event) => {
      if (thumbs.scrollHeight > thumbs.clientHeight) {
        event.preventDefault();
        thumbs.scrollTop += event.deltaY || event.deltaX;
      }
    }, { passive: false });

    const lightbox = byId('product-lightbox');
    byId('product-lightbox-close').addEventListener('click', () => lightbox.close());
    byId('product-lightbox-prev').addEventListener('click', () => setImage(imageIndex - 1, false));
    byId('product-lightbox-next').addEventListener('click', () => setImage(imageIndex + 1, false));
    lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });
    lightbox.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); setImage(imageIndex - 1, false); }
      if (event.key === 'ArrowRight') { event.preventDefault(); setImage(imageIndex + 1, false); }
    });
    const lightboxImage = byId('product-lightbox-image');
    lightboxImage.addEventListener('pointerdown', (event) => { swipeStart = [event.clientX, event.clientY]; });
    lightboxImage.addEventListener('pointerup', (event) => {
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart[0];
      const dy = event.clientY - swipeStart[1];
      swipeStart = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) setImage(imageIndex + (dx < 0 ? 1 : -1), false);
    });
  }

  function makeBadge(text, type) {
    const badge = document.createElement('span');
    badge.className = `product-image-badge ${type}`;
    badge.textContent = text;
    return badge;
  }

  function renderPrice() {
    const price = priceOf(product);
    const mrp = mrpOf(product);
    const current = byId('product-price');
    const crossed = byId('product-mrp');
    const discount = byId('product-discount');
    current.hidden = price === null;
    if (price !== null) current.textContent = `₹${currency.format(price)}`;
    const onSale = price !== null && mrp !== null && mrp > price;
    crossed.hidden = !onSale;
    discount.hidden = !onSale;
    if (onSale) {
      crossed.textContent = `₹${currency.format(mrp)}`;
      discount.textContent = `${Math.floor((mrp - price) / mrp * 100)}% off`;
    }
  }

  function renderSizes() {
    const choices = byId('product-size-options');
    const sizes = sizeOptions();
    const block = byId('product-size-block');
    block.hidden = !sizes.length;
    choices.replaceChildren();
    sizes.forEach((size) => {
      const option = document.createElement('button');
      option.className = 'product-size-option';
      option.type = 'button';
      option.textContent = size.label;
      option.disabled = isSoldOut() || size.stock === 0;
      option.setAttribute('aria-pressed', 'false');
      option.setAttribute('aria-label', `${size.label}${option.disabled ? ', sold out' : ''}`);
      option.addEventListener('click', () => {
        selectedSize = size.label;
        choices.querySelectorAll('.product-size-option').forEach((button) => button.setAttribute('aria-pressed', String(button === option)));
        block.classList.remove('has-size-error');
        byId('product-size-error').hidden = true;
        updatePurchaseState();
      });
      choices.appendChild(option);
    });
  }

  function updatePurchaseState() {
    const stock = selectedStock();
    const soldOut = isSoldOut() || stock === 0;
    const priceAvailable = priceOf(product) !== null;
    const stockNote = byId('product-stock-note');
    if (soldOut) stockNote.textContent = 'Out of stock';
    else if (stock !== null && stock <= 5) stockNote.textContent = `Only ${stock} left`;
    else stockNote.textContent = '';
    ['product-add-button', 'product-buy-button'].forEach((id) => {
      const button = byId(id);
      button.disabled = soldOut || !priceAvailable;
      button.textContent = button.dataset.originalLabel || button.textContent;
    });
  }

  function renderDetails() {
    const description = String(product.description || '').trim();
    const details = byId('product-details');
    details.hidden = !description;
    if (description) byId('product-details-body').textContent = description;
  }

  function renderSimilar() {
    const similar = products.filter((item) => item.category === product.category && idOf(item) !== idOf(product)).slice(0, 4);
    const grid = byId('product-similar-grid');
    grid.replaceChildren();
    similar.forEach((item) => {
      const picture = productImages(item)[0];
      if (!picture) return;
      const card = document.createElement('a');
      card.className = 'product-similar-card';
      card.href = item.slug ? `product.html?slug=${encodeURIComponent(item.slug)}&ui=2` : `product.html?id=${encodeURIComponent(idOf(item))}&ui=2`;
      const media = document.createElement('div'); media.className = 'product-similar-image';
      const image = document.createElement('img');
      image.src = cloudinaryUrl(picture.publicId, 500);
      image.sizes = '(max-width: 599px) 46vw, (max-width: 1023px) 30vw, 22vw';
      image.alt = `${item.name} view 1`;
      image.width = picture.width || 500;
      image.height = picture.height || 625;
      image.loading = 'lazy';
      window.KyraaProductImages.fit(image, picture, media);
      showImageError(image, card);
      const name = document.createElement('span');
      name.textContent = item.name || '';
      media.appendChild(image); card.append(media, name);
      const price = priceOf(item);
      if (price !== null) {
        const priceLine = document.createElement('strong');
        priceLine.textContent = `₹${currency.format(price)}`;
        const mrp = mrpOf(item);
        if (mrp !== null && mrp > price) {
          const crossed = document.createElement('del');
          crossed.textContent = `₹${currency.format(mrp)}`;
          priceLine.append(' ', crossed);
        }
        card.appendChild(priceLine);
      }
      grid.appendChild(card);
    });
    byId('product-similar').hidden = !grid.childElementCount;
  }

  function render() {
    byId('product-loading').hidden = true;
    byId('product-error').hidden = true;
    byId('product-content').hidden = false;
    document.title = `${product.name} | Kryaa Style`;
    const category = categoryName(product.category);
    const categoryLink = byId('product-breadcrumb-category');
    categoryLink.textContent = category;
    categoryLink.href = `index.html?cat=${encodeURIComponent(product.category || '')}`;
    categoryLink.hidden = !category;
    byId('product-breadcrumb-name').textContent = product.name || '';
    byId('product-title').textContent = product.name || '';
    renderPrice();
    renderGallery();
    renderSizes();
    updatePurchaseState();
    renderDetails();
    renderSimilar();
    byId('product-add-button').dataset.originalLabel = 'Add to bag';
    byId('product-buy-button').dataset.originalLabel = 'Buy now';
    byId('product-add-button').addEventListener('click', () => addToBag(false));
    byId('product-buy-button').addEventListener('click', () => addToBag(true));
  }

  function addToBag(buyNow) {
    if (isSoldOut() || priceOf(product) === null) return;
    if (sizeOptions().length && !selectedSize) {
      const block = byId('product-size-block');
      block.classList.remove('has-size-error');
      void block.offsetWidth;
      block.classList.add('has-size-error');
      byId('product-size-error').textContent = 'Please select a size';
      byId('product-size-error').hidden = false;
      block.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    const button = byId(buyNow ? 'product-buy-button' : 'product-add-button');
    button.disabled = true;
    button.textContent = buyNow ? 'Loading…' : 'Adding…';
    Promise.resolve(window.KyraaShopRuntime?.addBagItem(product, selectedSize, 1, buyNow))
      .catch((error) => window.KyraaShopRuntime?.showToast(error.message || 'Could not update your bag.'))
      .finally(() => { button.disabled = isSoldOut() || priceOf(product) === null; button.textContent = button.dataset.originalLabel; });
  }

  function showError(error) {
    byId('product-loading').hidden = true;
    byId('product-content').hidden = true;
    byId('product-error').hidden = false;
    const notFound = error?.message === 'Product not found.';
    byId('product-error-title').textContent = notFound ? 'Product not found' : 'Unable to load this product';
    byId('product-error-message').textContent = notFound ? '' : 'Please try again.';
    byId('product-retry').hidden = notFound;
  }

  async function loadProduct() {
    byId('product-error').hidden = true;
    byId('product-loading').hidden = false;
    try {
      await window.KyraaShopRuntime?.ready;
      products = await window.KyraaShop.getProducts();
      const eligible = products.filter((item) => item?.isActive !== false && !item?.mergedInto);
      product = eligible.find((item) => String(item.slug || '') === requestedSlug)
        || eligible.find((item) => idOf(item) === requestedId);
      if (!product) throw new Error('Product not found.');
      const identifier = requestedSlug || idOf(product);
      if (identifier && window.KyraaShopRuntime?.api) {
        const detail = await window.KyraaShopRuntime.api(`/products/${encodeURIComponent(identifier)}`);
        if (detail && typeof detail === 'object') product = { ...product, ...detail };
      }
      render();
    } catch (error) {
      showError(error);
      if (error?.message !== 'Product not found.') console.error('[Kyraa shop] Product detail request failed:', error.message);
    }
  }

  byId('product-retry').addEventListener('click', loadProduct);
  loadProduct();
})();
