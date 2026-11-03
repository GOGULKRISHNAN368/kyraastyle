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
        <img src="https://res.cloudinary.com/r3jgeild/image/upload/v1793546160/kryaastyle/template/674fb82d593b7315-png.png" alt="Kryaa Style" class="kr-loader-official-logo" decoding="async">

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
})()
