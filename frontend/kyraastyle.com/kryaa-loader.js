/**
 * KRYAA STYLES - SITE PRELOADER & LOADING SCREEN
 * Pleasant Warm Champagne Silk Background + Official Logo (3-5s duration)
 */

(() => {
  'use strict';

  // Check URL parameters: ?skip=1 bypasses loader
  const urlParams = new URLSearchParams(window.location.search);
  const forceSkip = urlParams.get('skip') === '1';

  if (forceSkip) {
    return;
  }

  // Preloader Template (Pleasant Warm Champagne Silk + Official Website Logo)
  const preloaderHTML = `
    <div id="kryaa-preloader" role="dialog" aria-modal="true" aria-label="Kryaa Style Welcome">
      <!-- Flowing Silk Waves -->
      <div class="kr-loader-waves" aria-hidden="true"></div>

      <!-- Centerpiece Brand Showcase -->
      <div class="kr-loader-center">
        <!-- Official Website Logo -->
        <img src="../image/logo.png" alt="Kryaa Style" class="kr-loader-official-logo" decoding="async">

        <!-- Refined Brand Tagline -->
        <p class="kr-loader-tagline">CURATED FOR EVERY CELEBRATION</p>

        <!-- Sparkle Accent -->
        <div class="kr-loader-sparkle" aria-hidden="true">
          <span class="line"></span>
          <span class="star">✦</span>
          <span class="line"></span>
        </div>
      </div>

      <div class="kr-loader-tap-hint" aria-hidden="true">Tap to enter</div>
    </div>
  `;

  // Inject Preloader DOM immediately
  function injectPreloader() {
    if (document.getElementById('kryaa-preloader')) return;
    const container = document.createElement('div');
    container.innerHTML = preloaderHTML.trim();
    const el = container.firstElementChild;
    if (document.body) {
      document.body.prepend(el);
    } else {
      document.documentElement.appendChild(el);
    }
  }

  if (document.body) {
    injectPreloader();
  } else {
    document.addEventListener('DOMContentLoaded', injectPreloader);
  }

  const MIN_DURATION_MS = 3000;
  const MAX_DURATION_MS = 3100;
  let isDismissed = false;
  let timerId = null;
  let visibleSince = performance.now();

  function scheduleAutoDismiss() {
    if (timerId) clearTimeout(timerId);

    const dismissAfterMinimum = () => {
      if (isDismissed) return;
      if (timerId) clearTimeout(timerId);
      const remaining = Math.max(0, MIN_DURATION_MS - (performance.now() - visibleSince));
      timerId = setTimeout(dismissLoader, remaining);
    };

    if (document.readyState === 'complete') {
      dismissAfterMinimum();
    } else {
      timerId = setTimeout(dismissLoader, MAX_DURATION_MS);
      window.addEventListener('load', dismissAfterMinimum, { once: true });
    }
  }

  function dismissLoader() {
    if (isDismissed) return;
    isDismissed = true;

    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }

    const loader = document.getElementById('kryaa-preloader');
    if (loader) {
      loader.classList.add('kryaa-loaded');
      setTimeout(() => {
        loader.style.display = 'none';
      }, 850);
    }
  }

  function setupDismiss() {
    scheduleAutoDismiss();

    // Tap or click anywhere to enter immediately
    document.addEventListener('click', (e) => {
      const loader = document.getElementById('kryaa-preloader');
      if (loader && !loader.classList.contains('kryaa-loaded')) {
        dismissLoader();
      }
    });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        dismissLoader();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDismiss);
  } else {
    setupDismiss();
  }

  // Global API
  window.KryaaLoader = {
    dismiss: dismissLoader,
    open: function () {
      const loader = document.getElementById('kryaa-preloader');
      if (loader) {
        loader.style.display = 'flex';
        loader.classList.remove('kryaa-loaded');
        isDismissed = false;
        visibleSince = performance.now();
        scheduleAutoDismiss();
      }
    }
  };
})();

/* Replaces the legacy carousel with a single, intentional Kryaa Style first view. */
(() => {
  'use strict';

  const heroMarkup = `
    <section class="kr-reimagined-home" aria-label="Kryaa Style introduction">
      <header class="kr-editorial-nav">
        <a class="kr-editorial-logo" href="index.html" aria-label="Kryaa Style home"><img src="../image/logo.png" alt="Kryaa Style"></a>
        <nav aria-label="Main navigation"><ul class="kr-editorial-menu">
          <li><a href="index.html" aria-current="page">Home</a></li>
          <li><a href="../store/category.html?edit=new-arrivals">Shop</a></li>
          <li><a href="#collections">Collections</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#journal">Journal</a></li>
        </ul></nav>
        <button class="kr-editorial-menu-toggle" type="button" aria-label="Toggle menu" aria-expanded="false">
          <span class="kr-editorial-menu-toggle__bar"></span>
          <span class="kr-editorial-menu-toggle__bar"></span>
          <span class="kr-editorial-menu-toggle__bar"></span>
        </button>
        <div class="kr-editorial-actions" aria-label="Quick actions">
          <a class="kr-editorial-icon" href="search.html" aria-label="Search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.7"></circle><path d="m16 16 5 5"></path></svg></a>
          <a class="kr-editorial-icon" href="profile.html" aria-label="Account"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.2" r="3.4"></circle><path d="M4.7 21c.4-4.2 2.8-6.3 7.3-6.3s6.9 2.1 7.3 6.3"></path></svg></a>
          <a class="kr-editorial-icon" href="checkout.html" aria-label="Shopping bag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.3 8.1h13.4l1 12.1H4.3z"></path><path d="M8.5 8.1V6.6a3.5 3.5 0 0 1 7 0v1.5"></path></svg><b class="kr-editorial-bag-count">0</b></a>
        </div>
      </header>
      <div class="kr-editorial-hero">
        <div class="kr-editorial-copy">
          <p class="kr-editorial-eyebrow">Elegance for every day</p>
          <h1 class="kr-editorial-title"><span>Grace in</span><span><em>Everyday</em></span><span>Style</span></h1>
          <p class="kr-editorial-description">Modern kurtis. Effortless style.<br>Made for your everyday stories.</p>
          <a class="kr-editorial-cta" href="collection/men/kurta-sets.html">Shop now <span aria-hidden="true">→</span></a>
        </div>
        <div class="kr-editorial-model" aria-hidden="true"><img src="../hero-purple-mobile.jpg" alt=""></div>
        <div class="kr-editorial-bottomline" aria-hidden="true">Wear your story</div>
      </div>
    </section>`;

  function removeLegacyHero() {
    document.querySelectorAll('img[src*="banner-desktop"], img[src*="banner-mobile"]').forEach((image) => {
      const wrapper = image.closest('.wrapperContainer');
      if (wrapper) wrapper.classList.add('kr-replaced-hero');
    });
  }

  function injectHero() {
    if (document.querySelector('.kr-reimagined-home')) return;
    const app = document.getElementById('__next');
    const main = app && app.querySelector('main');
    if (!app || !main) return;
    main.insertAdjacentHTML('beforebegin', heroMarkup.replace('collection/men/kurta-sets.html', '../store/category.html?edit=new-arrivals'));
    removeLegacyHero();
  }

  function start() {
    injectHero();
    wireMenuToggle();
    wireNavMotion();
    // Next hydrates after the document parses; repeat briefly to catch its carousel markup.
    [80, 350, 1000].forEach((delay) => window.setTimeout(() => { injectHero(); wireMenuToggle(); wireNavMotion(); removeLegacyHero(); }, delay));
  }

  function wireMenuToggle() {
    const toggle = document.querySelector('.kr-editorial-menu-toggle');
    const menu = document.querySelector('.kr-editorial-menu');
    if (!toggle || !menu) return;
    if (toggle.dataset.wired === 'true') return;
    toggle.dataset.wired = 'true';
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('kr-editorial-menu--open', !expanded);
    });
    document.addEventListener('click', () => {
      if (toggle.getAttribute('aria-expanded') === 'true') {
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('kr-editorial-menu--open');
      }
    });
  }

  // Keep the header stable while scrolling, with the same solid treatment
  // the reference navigation uses once the page has left its top edge.
  function wireNavMotion() {
    const nav = document.querySelector('.kr-editorial-nav');
    if (!nav || nav.dataset.motionWired === 'true') return;
    nav.dataset.motionWired = 'true';

    let ticking = false;

    const updateNavigation = () => {
      nav.classList.toggle('kr-editorial-nav--solid', window.scrollY > 24);
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateNavigation);
      }
    }, { passive: true });

    updateNavigation();
  }

  // Let the server-rendered storefront finish React hydration first. Injecting
  // before that point can produce hydration warnings and restore the old nav.
  if (document.readyState === 'complete') window.setTimeout(start, 0);
  else window.addEventListener('load', start, { once: true });
})();
