/**
 * KRYAA STYLES - FULLSCREEN LUXURY OPENING & LOADING SCREEN
 * Pleasant Warm Silk Template (~3.8s Display Duration)
 */

(() => {
  'use strict';

  const CONFIG = {
    // 3.8s duration (within the 3 to 5-second range)
    displayDuration: 3800,
    storeUrl: window.KRYAA_STORE_URL || 'kyraastyle.com/index.html',
    imagesToPreload: [
      'logo.png',
      'image/logo.png',
      'image/kyraastyle-logo.svg',
      'image/banner-desktop-clean.jpg',
      'image/banner-mobile-photo.jpg'
    ]
  };

  let hasExited = false;
  let timerId = null;

  // Preload key store imagery in the background
  function preloadAssets() {
    CONFIG.imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }

  // Smoothly exit into the boutique
  function enterStore() {
    if (hasExited) return;
    hasExited = true;

    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }

    try {
      sessionStorage.setItem('kryaa_visited', 'true');
    } catch (e) {}

    const stage = document.getElementById('kryaaStage');
    if (stage) {
      stage.classList.add('exiting');
    }

    // Seamlessly navigate after silky fade
    setTimeout(() => {
      window.location.href = CONFIG.storeUrl;
    }, 750);
  }

  function init() {
    preloadAssets();

    // Auto-enter after the 3-5 second duration
    timerId = setTimeout(() => {
      enterStore();
    }, CONFIG.displayDuration);

    // Tap or click anywhere on the screen to enter immediately
    const stage = document.getElementById('kryaaStage');
    if (stage) {
      stage.addEventListener('click', () => {
        enterStore();
      });
    }

    // Keyboard support (Space, Enter, Escape)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        enterStore();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
