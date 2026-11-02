(() => {
  'use strict';

  const categories = [
    ['Chudi', 'https://res.cloudinary.com/r3jgeild/image/upload/v1793546191/kryaastyle/template/6de270b4ec31cf7b-webp.webp', 'chudi'],
    ['Short Tops', 'https://res.cloudinary.com/r3jgeild/image/upload/v1793546187/kryaastyle/template/0a326d52a967adff-webp.webp', 'short-tops'],
    ['Full Frocks', 'https://res.cloudinary.com/r3jgeild/image/upload/v1793546271/kryaastyle/template/27e415a5de51dc96-png.png', 'full-frocks'],
    ['Kurti Sets', 'https://res.cloudinary.com/r3jgeild/image/upload/v1793546196/kryaastyle/template/63018ff3f5d8b0a9-webp.webp', 'kurti-sets'],
    ['Sarees', 'https://res.cloudinary.com/r3jgeild/image/upload/v1793546274/kryaastyle/template/a9e5ce03f78f3c9a-png.png', 'sarees'],
    ['Salwar Suits', 'https://res.cloudinary.com/r3jgeild/image/upload/v1793546229/kryaastyle/template/951e9ab8b767d017-webp.webp', 'salwar-suits'],
    ['Anarkali Suits', 'https://res.cloudinary.com/r3jgeild/image/upload/v1793546276/kryaastyle/template/d01d56e99bd331b4-png.png', 'anarkali-suits'],
  ];

  const normalise = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

  function addStyles() {
    if (document.getElementById('kyraa-final-home-styles')) return;
    const style = document.createElement('style');
    style.id = 'kyraa-final-home-styles';
    style.textContent = `
      .kyraa-final-category { padding: 58px 0 46px !important; }
      .kyraa-final-category__heading { width: min(510px, calc(100% - 32px)); margin: 0 auto 42px; text-align: center; }
      .kyraa-final-category__heading h2 { margin: 0; color: #292624; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(24px, 2.25vw, 34px); font-weight: 400; line-height: 1.15; }
      .kyraa-final-category__rule { display: flex; align-items: center; justify-content: center; margin-top: 24px; }
      .kyraa-final-category__rule::before, .kyraa-final-category__rule::after { width: calc(50% - 12px); height: 1px; content: ''; background: #d6d0c6; }
      .kyraa-final-category__rule span { width: 11px; height: 11px; margin: 0 12px; transform: rotate(45deg); background: #c79c3f; }
      .kyraa-final-category__grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); width: min(1180px, 100%); margin: 0 auto; padding: 0 24px; gap: clamp(12px, 2vw, 28px); box-sizing: border-box; }
      .kyraa-final-category__card { display: flex; min-width: 0; flex-direction: column; align-items: center; color: #403b38; text-decoration: none; }
      .kyraa-final-category__image { display: block; width: min(150px, 100%); aspect-ratio: 1; overflow: hidden; border: 1px solid #e2ded6; border-radius: 50%; background: #f5f2ee; box-shadow: 0 4px 10px rgb(0 0 0 / 16%); }
      .kyraa-final-category__image img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center; transition: transform .25s ease; }
      .kyraa-final-category__card:hover .kyraa-final-category__image img { transform: scale(1.05); }
      .kyraa-final-category__label { margin-top: 14px; font-size: 18px; line-height: 1.3; text-align: center; white-space: nowrap; }
      @media (max-width: 767px) {
        .kyraa-final-category { padding: 38px 0 32px !important; overflow: hidden; }
        .kyraa-final-category__heading { margin-bottom: 25px; }
        .kyraa-final-category__heading h2 { font-size: 24px; }
        .kyraa-final-category__rule { margin-top: 16px; }
        .kyraa-final-category__grid { width: max-content; min-width: 100%; padding: 0 18px 8px; gap: 18px; overflow-x: auto; grid-template-columns: repeat(7, 94px); scrollbar-width: none; }
        .kyraa-final-category__grid::-webkit-scrollbar { display: none; }
        .kyraa-final-category__image { width: 92px; }
        .kyraa-final-category__label { margin-top: 9px; font-size: 13px; white-space: normal; }
      }
    `;
    document.head.appendChild(style);
  }

  function removeUnwantedFooterSections() {
    const unwanted = /^(discount\s*coupons?|from\s+our\s+stories)$/i;
    const candidates = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"],p,span,a,div'))
      .filter((element) => unwanted.test(normalise(element.textContent)))
      .sort((first, second) => first.textContent.length - second.textContent.length);
    candidates.forEach((element) => {
      const block = element.closest('section, article, [data-section], [class*="section"]')
        || element.closest('.wrapperContainer')
        || element.parentElement?.parentElement;
      if (block && !block.matches('footer')) block.remove();
    });
  }

  function renderExactCategories() {
    const heading = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')]
      .find((element) => normalise(element.textContent) === 'shop by category');
    const section = heading?.closest('.kryaa-category-section') || heading?.closest('.wrapperContainer') || heading?.parentElement?.parentElement;
    if (!section || section.querySelector('.kyraa-final-category__grid')) return;

    section.id = 'shop-by-category';
    section.dataset.womenCategoriesReady = 'true';
    section.classList.add('women-category-section', 'kyraa-final-category');
    section.innerHTML = `
      <div class="kyraa-final-category__heading">
        <h2>Shop By Category</h2>
        <div class="kyraa-final-category__rule" aria-hidden="true"><span></span></div>
      </div>
      <nav class="kyraa-final-category__grid" aria-label="Shop by category">
        ${categories.map(([title, image, category]) => `<a class="kyraa-final-category__card" href="../store/category.html?category=${category}"><span class="kyraa-final-category__image"><img src="${image}" alt="${title}" loading="lazy" decoding="async"></span><span class="kyraa-final-category__label">${title}</span></a>`).join('')}
      </nav>`;
  }

  let queued = false;
  function apply() {
    queued = false;
    addStyles();
    removeUnwantedFooterSections();
    renderExactCategories();
  }
  function queue() {
    if (queued) return;
    queued = true;
    window.setTimeout(apply, 0);
  }

  [0, 100, 350, 800, 1600, 3200, 5000].forEach((delay) => window.setTimeout(apply, delay));
  new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
})();
