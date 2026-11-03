(() => {
  'use strict';

  const normalise = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const slug = (value) => String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const catalogHref = (product) => `../store/category.html?category=${encodeURIComponent(slug(product.category))}`;
  const categoryHref = (category) => `../store/category.html?category=${encodeURIComponent(category.id || slug(category.name))}`;

  function sectionFor(labels) {
    const wanted = labels.map(normalise);
    const heading = [...document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6, main [role="heading"]')]
      .find((item) => wanted.includes(normalise(item.textContent)));
    return heading?.closest('section') || heading?.parentElement?.parentElement || null;
  }

  function patchImage(image, item) {
    if (!image || !item?.imageUrl) return;
    image.src = item.imageUrl;
    image.removeAttribute('srcset');
    image.alt = item.alt || item.name || image.alt;
  }

  function patchCategoryCard(card, category) {
    if (!card || !category) return;
    card.href = categoryHref(category);
    patchImage(card.querySelector('img'), { imageUrl: category.imageUrl, alt: category.name });
    const label = card.querySelector('.women-category-title');
    if (label) label.textContent = category.name;
  }

  function patchCategories(categories) {
    if (!Array.isArray(categories) || !categories.length) return;
    const section = document.querySelector('.women-category-section');
    if (!section) return;
    const desktop = [...section.querySelectorAll('.women-category-desktop .women-category-card')];
    desktop.forEach((card, index) => patchCategoryCard(card, categories[index]));
    const mobile = [...section.querySelectorAll('.women-category-mobile-page .women-category-card')];
    mobile.forEach((card, index) => patchCategoryCard(card, categories[index]));
  }

  function patchProductSlot(slot, product) {
    if (!slot || !product) return;
    slot.dataset.storefrontProductId = String(product.id || '');
    patchImage(slot.querySelector('img:not(.kryaa-new-arrivals-hover-image)'), product);
    slot.querySelectorAll('img.kryaa-new-arrivals-hover-image').forEach((image) => patchImage(image, product));
    const title = slot.querySelector('h3, strong');
    if (title) title.textContent = product.name;
    slot.querySelectorAll('a').forEach((link) => { link.href = catalogHref(product); });
  }

  function patchProductRow(labels, products) {
    if (!products.length) return;
    const section = sectionFor(labels);
    if (!section) return;
    const slots = [...section.querySelectorAll('.slick-slide:not(.slick-cloned), .new-arrivals-mobile-grid-card')]
      .filter((slot) => slot.querySelector('img:not(.kryaa-new-arrivals-hover-image)'));
    slots.forEach((slot, index) => patchProductSlot(slot, products[index % products.length]));
  }

  function patchEditorsPicks(products) {
    if (!products.length) return;
    [...document.querySelectorAll('#kr-editors-picks .kr-editors-picks__card')]
      .forEach((card, index) => patchProductSlot(card, products[index % products.length]));
  }

  function patchHero(banners) {
    const banner = banners?.find((item) => item.desktopImageUrl) || null;
    if (!banner) return;
    const hero = document.querySelector('.kryaa-hero-carousel') || document.querySelector('.slick-slider');
    if (!hero) return;
    const image = hero.querySelector('img');
    patchImage(image, { imageUrl: banner.desktopImageUrl, alt: banner.title || 'Kryaa Style collection' });
    const mobileSource = hero.querySelector('source[media]');
    if (mobileSource && banner.mobileImageUrl) mobileSource.srcset = banner.mobileImageUrl;
    if (banner.link) hero.querySelectorAll('a').forEach((link) => { link.href = banner.link; });
  }

  function patchAnnouncement(announcements) {
    const announcement = announcements?.[0];
    const bar = document.querySelector('.announcement-bar, [data-storefront-announcement]');
    if (announcement?.text && bar) bar.textContent = announcement.text;
  }

  function apply(content) {
    if (!content) return;
    patchAnnouncement(content.announcements);
    patchHero(content.banners);
    patchCategories(content.categories || []);
    const products = Array.isArray(content.products) ? content.products : [];
    patchProductRow(['New Arrivals', 'Designers In The Spotlight'], products.filter((item) => item.isNewArrival).length ? products.filter((item) => item.isNewArrival) : products);
    patchProductRow(["Editor's Picks", 'Editor’s Picks'], products.filter((item) => item.isEditorsPick));
    patchEditorsPicks(products.filter((item) => item.isEditorsPick));
  }

  window.addEventListener('kyraa:storefront-content', (event) => apply(event.detail));
  const current = window.KyraaStorefrontData?.getContent();
  if (current) apply(current);
})();
