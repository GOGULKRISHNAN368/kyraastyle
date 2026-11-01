(function () {
  'use strict';

  const footer = `
    <footer class="kr-converto-footer" aria-label="kyraastyle footer">
      <div class="kr-converto-footer__card">
        <div class="kr-converto-footer__top">
          <div class="kr-converto-footer__brand">
            <a class="kr-converto-footer__logo" href="https://kyraastyle.com/" aria-label="kyraastyle home">
              <img src="../image/logo.png" alt="kyraastyle" />
            </a>
            <p>Curated Indian fashion for every celebration, crafted with a modern point of view.</p>
          </div>
          <section>
            <h2>Quick link</h2>
            <ul>
              <li><a href="https://kyraastyle.com/">Home</a></li>
              <li><a href="https://kyraastyle.com/about-us">About us</a></li>
              <li><a href="https://kyraastyle.com/contact-us">Contact us</a></li>
              <li><a href="https://kyraastyle.com/terms-and-conditions">License</a></li>
            </ul>
          </section>
          <section>
            <h2>Company</h2>
            <ul>
              <li><a href="https://kyraastyle.com/category/kurti-sets">Kurta sets</a></li>
              <li><a href="https://kyraastyle.com/collection/men/sherwanis">sarees</a></li>
              <li><a href="https://kyraastyle.com/collection/men/nehru-jacket-and-sets">short kurtis</a></li>
              <li><a href="https://kyraastyle.com/store-locator">products</a></li>
            </ul>
          </section>
          <section>
            <h2>Others</h2>
            <ul>
              <li><a href="https://kyraastyle.com/magazine">Blog</a></li>
              <li><a href="https://kyraastyle.com/celebrity-style">Blog details</a></li>
              <li><a href="https://kyraastyle.com/404">404</a></li>
            </ul>
          </section>
          <section>
            <h2>Social</h2>
            <ul>
              <li><a href="https://www.facebook.com/kyraastyle/" target="_blank" rel="noreferrer">Facebook</a></li>
              <li><a href="https://in.linkedin.com/company/Kyraastyle/" target="_blank" rel="noreferrer">LinkedIn</a></li>
              <li><a href="https://www.instagram.com/kyraastyle/" target="_blank" rel="noreferrer" aria-label="Follow kyraastyle on Instagram">Instagram</a></li>
              <li><a href="https://twitter.com/kyraastyle/" target="_blank" rel="noreferrer">X / Twitter</a></li>
            </ul>
          </section>
        </div>
        <div class="kr-converto-footer__meta">
          <p>&copy; 2026 kyraastyle. All rights reserved.</p>
          <p>Design by kyraastyle &ndash; Powered by fashion.</p>
        </div>
        <div class="kr-converto-footer__name" aria-hidden="true">KYRAASTYLE</div>
      </div>
    </footer>`;

  function installFooter() {
    const legacyFooter = document.querySelector('footer:not(.kr-converto-footer)');
    if (legacyFooter && !document.querySelector('.kr-converto-footer')) {
      legacyFooter.outerHTML = footer;
    }
  }

  function removeMustOwnDesigners() {
    const heading = Array.from(document.querySelectorAll('h1, h2, h3')).find(
      (element) => element.textContent.trim().toLowerCase() === 'must-own designers'
    );
    const section = heading && heading.closest('.wrapperContainer');
    if (section) section.remove();
  }

  function applyPageUpdates() {
    removeMustOwnDesigners();
    installFooter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPageUpdates, { once: true });
  } else {
    applyPageUpdates();
  }
}());
