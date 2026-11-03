/**
 * KRYAA STYLE - NAVIGATION BAR
 * Mobile menu toggle for .kryaa-nav
 */

(() => {
  'use strict';

  const toggle = document.querySelector('.kryaa-nav__toggle');
  const menu = document.querySelector('.kryaa-nav__menu');

  if (!toggle || !menu) return;

  function setOpen(open) {
    menu.classList.toggle('kryaa-nav__menu--open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', () => {
    setOpen(menu.classList.toggle('kryaa-nav__menu--open'));
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      setOpen(false);
    });
  });
})();
