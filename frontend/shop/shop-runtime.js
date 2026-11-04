(() => {
  'use strict';

  const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const imageSet = (url) => [240, 480, 800].map((width) => `${String(url).replace(/c_limit,w_\d+/, `c_limit,w_${width}`)} ${width}w`).join(', ');
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const shopBase = new URL('./', document.currentScript?.src || location.href);

  let config = { requireLoginForProduct: true, trust: {} };
  let customer = null;
  let authDialog, bagDialog, loginForm, otpPanel, drawerBody, toast, otpVerificationPending = false;
  let returnFocus = null;
  let authSuccess = null;
  let authCancel = null;
  let resendInterval = null;
  let currentOtpEmail = '';
  let lastBagMessage = '';
  let migratedCustomer = '';
  let catalogRequest = null;
  let catalogProducts = [];

  async function api(path, options = {}) { return window.KyraaShopAuth.request(path, options); }

  function productDestination(product) {
    const key = product.slug ? `slug=${encodeURIComponent(product.slug)}` : `id=${encodeURIComponent(product._id || product.id || '')}`;
    return `../shop/product.html?${key}&ui=2`;
  }

  function shopListingDestination() {
    return new URL('../shop/index.html', location.href).href;
  }

  function readBag() { return window.KyraaShopBag.read(customer?.id); }
  function writeBag(items) { window.KyraaShopBag.write(customer?.id, items); updateBagCount(); }
  function itemCount(items = readBag()) { return items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0); }
  function updateBagCount() {
    const count = itemCount();
    qsa('[data-shop-bag-count]').forEach((node) => { node.textContent = String(count); node.hidden = count < 1; });
    qsa('[data-shop-bag-trigger]').forEach((node) => node.setAttribute('aria-label', `Shopping bag${count ? `, ${count} ${count === 1 ? 'item' : 'items'}` : ''}`));
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message; toast.classList.add('is-visible');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2300);
  }

  function buildHeaderControls() {
    const existingBag = qs('[data-shop-bag-trigger]') || qs('.shop-header__bag');
    if (existingBag) {
      existingBag.dataset.shopBagTrigger = 'true';
      let count = qs('[data-shop-bag-count]', existingBag);
      if (!count) { count = document.createElement('span'); count.className = 'shop-header__bag-count'; count.dataset.shopBagCount = 'true'; count.hidden = true; existingBag.appendChild(count); }
      existingBag.href = '#shop-bag';
    } else {
      const actions = qs('.kr-storefront-nav__actions');
      if (actions) {
        const link = document.createElement('a'); link.href = '#shop-bag'; link.dataset.shopBagTrigger = 'true'; link.setAttribute('aria-label', 'Shopping bag');
        link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path></svg><span class="shop-header__bag-count" data-shop-bag-count hidden>0</span>';
        actions.appendChild(link);
      }
    }
    const header = qs('.shop-header') || qs('.kr-storefront-nav');
    if (header && !qs('[data-shop-account]', header)) {
      const account = document.createElement('button'); account.type = 'button'; account.className = 'shop-header__account'; account.dataset.shopAccount = 'true';
      account.setAttribute('aria-label', 'Login'); account.textContent = 'Login';
      if (header.classList.contains('shop-header')) header.appendChild(account);
      else qs('.kr-storefront-nav__actions', header)?.appendChild(account);
    }
    updateBagCount();
  }

  function renderAccount() {
    qsa('[data-shop-account]').forEach((button) => {
      if (!button.classList.contains('kr-home-account-trigger')) {
        button.textContent = customer ? (customer.name || customer.email || 'Account').trim().slice(0, 1).toUpperCase() : 'Login';
      }
      button.setAttribute('aria-label', customer ? `Account menu for ${customer.name || customer.email}` : 'Login');
      button.setAttribute('aria-haspopup', 'menu'); button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'shop-account-menu');
      button.classList.toggle('is-signed-in', Boolean(customer));
    });
  }

  function ensureDialogs() {
    if (!document.getElementById('shop-auth-dialog')) {
      const dialog = document.createElement('dialog');
      dialog.id = 'shop-auth-dialog'; dialog.className = 'shop-auth-dialog'; dialog.setAttribute('aria-labelledby', 'shop-auth-title');
      dialog.innerHTML = `
        <div class="shop-auth-layout">
          <section class="shop-auth-visual" aria-label="Kryaa Style">
            <div class="shop-auth-photo-frame"><img id="shop-auth-photo" alt="Kryaa Style collection" loading="lazy"></div>
            <div class="shop-auth-brand-line"><span>KYRAA STYLE</span><p id="shop-auth-brand-line"></p></div>
          </section>
          <section class="shop-auth-panel">
            <button class="shop-auth-close" type="button" data-shop-auth-close aria-label="Close sign in">×</button>
            <p class="shop-auth-wordmark">KRYAA <span>STYLE</span></p>
            <h2 id="shop-auth-title">Welcome to Kryaa Style</h2>
            <p class="shop-auth-intro">Sign in to view the piece and add it to your bag.</p>
            <form id="shop-auth-form" novalidate>
              <div class="shop-auth-contact-fields">
                <label>Email address<input id="shop-auth-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" required></label>
                <label>Phone number<span class="shop-phone-field"><span aria-hidden="true">+91</span><input id="shop-auth-phone" name="phone" type="tel" autocomplete="tel-national" inputmode="numeric" maxlength="10" aria-label="10 digit phone number" required></span></label>
                <p class="shop-auth-error" id="shop-auth-error" role="alert" hidden></p>
                <button class="shop-auth-submit" id="shop-auth-send" type="submit">Send OTP</button>
              </div>
              <div class="shop-auth-otp" id="shop-auth-otp" hidden>
                <p class="shop-auth-otp-copy">Enter the 6 digit code for <strong id="shop-auth-destination"></strong></p>
                <div class="shop-otp-boxes" role="group" aria-label="Six digit verification code">${Array.from({ length: 6 }, (_, index) => `<input class="shop-otp-box" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="${index === 0 ? 'one-time-code' : 'off'}" maxlength="1" aria-label="Digit ${index + 1}" ${index === 0 ? 'autofocus' : ''}>`).join('')}</div>
                <p class="shop-auth-error" id="shop-otp-error" role="alert" hidden></p>
                <button class="shop-auth-submit" id="shop-auth-verify" type="button">Verify and continue</button>
                <button class="shop-auth-resend" id="shop-auth-resend" type="button" disabled>Resend code in 30s</button>
              </div>
            </form>
            <p class="shop-auth-success" id="shop-auth-success" role="status" hidden>Signed in successfully.</p>
            <p class="shop-auth-note" id="shop-auth-note"></p>
          </section>
        </div>`;
      document.body.appendChild(dialog);
    }
    if (!document.getElementById('shop-bag-dialog')) {
      const dialog = document.createElement('dialog'); dialog.id = 'shop-bag-dialog'; dialog.className = 'shop-bag-dialog'; dialog.setAttribute('aria-labelledby', 'shop-bag-title');
      dialog.innerHTML = `<section class="shop-bag-drawer"><div class="shop-bag-heading"><h2 id="shop-bag-title">Your bag</h2><button type="button" class="shop-bag-close" data-shop-bag-close aria-label="Close bag">×</button></div><p class="shop-bag-message" id="shop-bag-message" role="status" hidden></p><div class="shop-bag-items" id="shop-bag-items"></div><div class="shop-bag-footer"><p><span>Subtotal</span><strong id="shop-bag-subtotal">₹0</strong></p><button type="button" class="shop-auth-submit" id="shop-bag-checkout">Checkout</button><a href="index.html">Continue shopping</a></div></section>`;
      document.body.appendChild(dialog);
    }
    if (!document.getElementById('shop-runtime-toast')) {
      toast = document.createElement('div'); toast.id = 'shop-runtime-toast'; toast.className = 'shop-toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); document.body.appendChild(toast);
    } else toast = document.getElementById('shop-runtime-toast');
    authDialog = document.getElementById('shop-auth-dialog'); bagDialog = document.getElementById('shop-bag-dialog');
    loginForm = document.getElementById('shop-auth-form'); otpPanel = document.getElementById('shop-auth-otp'); drawerBody = document.getElementById('shop-bag-items');
    const photo = document.getElementById('shop-auth-photo');
    if (config.authImageUrl) { photo.src = config.authImageUrl; photo.srcset = config.authImageSrcset || ''; photo.sizes = '(max-width: 760px) 100vw, 50vw'; }
    document.getElementById('shop-auth-brand-line').textContent = config.authBrandLine || '';
    document.getElementById('shop-auth-note').textContent = config.authNote || '';
  }

  function showAuthError(message, otp = false) {
    const element = document.getElementById(otp ? 'shop-otp-error' : 'shop-auth-error');
    element.textContent = message; element.hidden = !message;
  }

  function openLogin({ onSuccess, onCancel } = {}) {
    returnFocus = document.activeElement;
    authSuccess = onSuccess || null; authCancel = onCancel || null;
    loginForm.reset(); otpPanel.hidden = true; qs('.shop-auth-contact-fields').hidden = false;
    showAuthError(''); showAuthError('', true);
    document.getElementById('shop-auth-success').hidden = true;
    document.getElementById('shop-auth-send').disabled = false;
    authDialog.showModal();
    setTimeout(() => document.getElementById('shop-auth-email').focus(), 30);
  }

  function closeLogin(success = false) {
    if (!authDialog.open) return;
    clearInterval(resendInterval); authDialog.close(success ? 'success' : 'cancel');
  }

  function startResendTimer(seconds = 30) {
    const button = document.getElementById('shop-auth-resend');
    clearInterval(resendInterval);
    let remaining = seconds; button.disabled = true; button.textContent = `Resend code in ${remaining}s`;
    resendInterval = setInterval(() => {
      remaining -= 1;
      button.disabled = remaining > 0;
      button.textContent = remaining > 0 ? `Resend code in ${remaining}s` : 'Resend code';
      if (remaining <= 0) clearInterval(resendInterval);
    }, 1000);
  }

  async function sendOtp() {
    const email = document.getElementById('shop-auth-email').value.trim().toLowerCase();
    const phone = document.getElementById('shop-auth-phone').value.replace(/\D/g, '');
    showAuthError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAuthError('Enter a valid email address.');
    if (!/^\d{10}$/.test(phone)) return showAuthError('Enter a valid 10 digit phone number.');
    const button = document.getElementById('shop-auth-send'); button.disabled = true; button.textContent = 'Sending…';
    try {
      const result = await api('/auth/otp', { method: 'POST', body: JSON.stringify({ email, phone }) });
      currentOtpEmail = email; document.getElementById('shop-auth-destination').textContent = email;
      qs('.shop-auth-contact-fields').hidden = true; otpPanel.hidden = false;
      startResendTimer(result.resendAfter || 30); qs('.shop-otp-box').focus();
    } catch (error) {
      showAuthError(error.message, !otpPanel.hidden);
      if (!otpPanel.hidden && error.retryAfter) startResendTimer(error.retryAfter);
    }
    finally { button.disabled = false; button.textContent = 'Send OTP'; }
  }

  function otpValue() { return qsa('.shop-otp-box').map((input) => input.value).join(''); }
  async function verifyOtp() {
    if (otpVerificationPending) return;
    showAuthError('', true);
    const code = otpValue();
    if (!/^\d{6}$/.test(code)) return showAuthError('Enter all 6 digits of your code.', true);
    otpVerificationPending = true;
    const button = document.getElementById('shop-auth-verify'); button.disabled = true; button.textContent = 'Checking…';
    try {
      const guestItems = (() => { try { return JSON.parse(localStorage.getItem('kyraa-shop-bag:guest') || '[]'); } catch { return []; } })();
      customer = await api('/auth/verify', { method: 'POST', body: JSON.stringify({ email: currentOtpEmail, code }) });
      renderAccount();
      if (guestItems.length) writeBag([...readBag(), ...guestItems]);
      qs('.shop-auth-contact-fields').hidden = true; otpPanel.hidden = true;
      document.getElementById('shop-auth-success').hidden = false;
      await new Promise((resolve) => setTimeout(resolve, 450));
      closeLogin(true);
      await authSuccess?.(customer);
      authSuccess = null; authCancel = null;
    } catch (error) {
      showAuthError(error.message, true);
      const boxes = qsa('.shop-otp-box'); boxes[5]?.focus(); boxes[5]?.select();
    } finally { otpVerificationPending = false; button.disabled = false; button.textContent = 'Verify and continue'; }
  }

  async function getCustomer(force = false) {
    if (customer && !force) return customer;
    try { customer = await api('/auth/me'); renderAccount(); await migrateLegacyBag(); return customer; }
    catch (error) { if (error.status !== 401 && error.message !== 'Sign in to continue.') console.warn('[Kyraa shop] Could not check the account:', error.message); customer = null; renderAccount(); return null; }
  }

  async function migrateLegacyBag() {
    if (!customer?.id || migratedCustomer === customer.id) return;
    migratedCustomer = customer.id;
    let legacy = [];
    try { legacy = JSON.parse(localStorage.getItem('kyraa-category-bag') || '[]'); } catch { legacy = []; }
    if (!Array.isArray(legacy) || !legacy.length) return;
    const current = readBag();
    const converted = legacy.filter((entry) => entry?.productId).map((entry) => ({
      productId: String(entry.productId), size: entry.size === 'No size options' ? '' : String(entry.size || ''), quantity: Math.max(1, Number(entry.quantity) || 1),
    }));
    if (!converted.length) return;
    try {
      const rows = await api('/cart/validate', { method: 'POST', body: JSON.stringify({ items: [...current, ...converted] }) });
      persistValidated(rows);
      localStorage.removeItem('kyraa-category-bag');
    } catch (error) { console.warn('[Kyraa shop] Existing bag could not be migrated:', error.message); }
  }

  async function requireCustomer(afterSuccess, afterCancel) {
    const [current, settings] = await Promise.all([getCustomer(true), api('/config')]); config = settings;
    if (current || !config.requireLoginForProduct) { await afterSuccess?.(current); return current; }
    openLogin({ onSuccess: afterSuccess, onCancel: afterCancel });
    return null;
  }

  function triggerBag() {
    getCustomer(true).then((current) => {
      if (!current) return openLogin({ onSuccess: () => triggerBag() });
      renderBag(); bagDialog.showModal();
    });
  }

  function persistValidated(rows) {
    const next = rows.filter((row) => row.productId).map((row) => ({ productId: row.productId, slug: row.slug, size: row.size || '', quantity: row.quantity || 0 }));
    writeBag(next);
  }

  async function validatedBag() {
    const items = readBag();
    if (!items.length) return [];
    const rows = await api('/cart/validate', { method: 'POST', body: JSON.stringify({ items }) });
    lastBagMessage = rows.map((row) => row.message).filter(Boolean).join(' ');
    persistValidated(rows);
    return rows;
  }

  function setBagMessage(message) {
    const element = document.getElementById('shop-bag-message'); element.textContent = message; element.hidden = !message;
  }

  async function renderBag() {
    drawerBody.setAttribute('aria-busy', 'true'); drawerBody.replaceChildren(); setBagMessage('');
    try {
      const rows = await validatedBag();
      setBagMessage(lastBagMessage);
      const valid = rows.filter((row) => row.available && row.quantity > 0);
      if (!valid.length) {
        const empty = document.createElement('p'); empty.className = 'shop-bag-empty'; empty.textContent = 'Your bag is empty.'; drawerBody.appendChild(empty);
      }
      let subtotal = 0;
      valid.forEach((row) => {
        const product = row.product; subtotal += row.price * row.quantity;
        const item = document.createElement('article'); item.className = 'shop-bag-item'; item.dataset.productId = row.productId; item.dataset.size = row.size || '';
        const image = document.createElement('img'); image.className = 'shop-bag-item__image'; image.src = product.imageUrl || product.images?.[0]?.imageUrl || ''; image.srcset = imageSet(image.src); image.alt = ''; image.loading = 'lazy'; image.sizes = '84px';
        const info = document.createElement('div'); info.className = 'shop-bag-item__info';
        const title = document.createElement('h3'); title.textContent = product.name;
        const meta = document.createElement('p'); meta.textContent = row.size ? `Size ${row.size}` : 'Unstitched fabric';
        const price = document.createElement('strong'); price.textContent = `₹${money.format(row.price)}`;
        const actions = document.createElement('div'); actions.className = 'shop-bag-item__actions';
        const minus = document.createElement('button'); minus.type = 'button'; minus.dataset.quantity = '-1'; minus.setAttribute('aria-label', 'Decrease quantity'); minus.textContent = '−';
        const quantity = document.createElement('span'); quantity.textContent = String(row.quantity);
        const plus = document.createElement('button'); plus.type = 'button'; plus.dataset.quantity = '1'; plus.setAttribute('aria-label', 'Increase quantity'); plus.textContent = '+';
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'shop-bag-remove'; remove.dataset.remove = 'true'; remove.textContent = 'Remove';
        actions.append(minus, quantity, plus); info.append(title, meta, price, actions, remove); item.append(image, info); drawerBody.appendChild(item);
      });
      document.getElementById('shop-bag-subtotal').textContent = `₹${money.format(subtotal)}`;
      document.getElementById('shop-bag-checkout').disabled = !valid.length;
    } catch (error) { setBagMessage(error.message); }
    finally { drawerBody.removeAttribute('aria-busy'); }
  }

  function addBagItem(product, size = '', quantity = 1, buyNow = false) {
    return getCustomer(true).then((current) => {
      if (!current) return openLogin({ onSuccess: () => addBagItem(product, size, quantity, buyNow) });
      const items = readBag();
      const productId = String(product._id || product.id || product.slug || product.cloudinaryId);
      const candidate = { productId, slug: product.slug || '', size, quantity };
      const next = buyNow ? [candidate] : items;
      if (!buyNow) {
        const existing = next.find((row) => row.productId === productId && String(row.size || '') === String(size || ''));
        if (existing) existing.quantity = Math.max(1, Number(existing.quantity) || 1) + quantity;
        else next.push(candidate);
      }
      api('/cart/validate', { method: 'POST', body: JSON.stringify({ items: next }) }).then((rows) => {
        const response = rows[0];
        if (!response?.available) { showToast(response?.message || 'This style is unavailable.'); return; }
        if (buyNow) {
          sessionStorage.setItem('buyNowItem', JSON.stringify({ productId, slug: product.slug || '', size, quantity: response.quantity || quantity }));
          location.href = 'checkout.html?buyNow=1';
        } else {
          persistValidated(rows); showToast('Added to bag'); renderBag(); bagDialog.showModal();
        }
      }).catch((error) => showToast(error.message || 'Your bag could not be checked.'));
    });
  }

  function setupListeners() {
    document.addEventListener('click', async (event) => {
      const bag = event.target.closest('[data-shop-bag-trigger]');
      if (bag) { event.preventDefault(); triggerBag(); return; }
      if (event.target.closest('[data-shop-auth-close]')) { closeLogin(false); return; }
      if (event.target.closest('[data-shop-bag-close]')) { bagDialog.close(); return; }
      const account = event.target.closest('[data-shop-account]');
      if (account) {
        const current = await getCustomer(true);
        if (!current) openLogin();
        else openAccountMenu(account);
        return;
      }
      const productLink = event.target.closest('a[href*="product.html"]');
      if (productLink && config.requireLoginForProduct) {
        const href = productLink.href;
        event.preventDefault();
        requireCustomer(() => { location.href = href; }, () => { location.href = shopListingDestination(); });
        return;
      }
      const card = event.target.closest('.product-card,.storefront-product-card,.new-arrival-card');
      if (card && !event.target.closest('button')) {
        const heading = card.querySelector('h1,h2,h3,.product-name,[data-product-name]');
        const name = heading?.textContent.trim().toLowerCase();
        const item = name && catalogProducts.find((row) => String(row.name || '').trim().toLowerCase() === name);
        if (item) {
          event.preventDefault(); event.stopImmediatePropagation();
          if (config.requireLoginForProduct) requireCustomer(() => { location.href = productDestination(item); }, () => { location.href = shopListingDestination(); });
          else location.href = productDestination(item);
        }
      }
    }, true);

    authDialog.addEventListener('close', () => {
      if (authDialog.returnValue !== 'success') authCancel?.();
      if (returnFocus?.isConnected) returnFocus.focus();
      if (authDialog.returnValue !== 'success') { authSuccess = null; authCancel = null; }
    });
    bagDialog.addEventListener('click', (event) => { if (event.target === bagDialog) bagDialog.close(); });
    document.getElementById('shop-auth-form').addEventListener('submit', (event) => { event.preventDefault(); if (!otpPanel.hidden) verifyOtp(); else sendOtp(); });
    document.getElementById('shop-auth-verify').addEventListener('click', verifyOtp);
    document.getElementById('shop-auth-resend').addEventListener('click', sendOtp);
    qsa('.shop-otp-box').forEach((input, index, boxes) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(-1);
        if (input.value && boxes[index + 1]) boxes[index + 1].focus();
        if (otpValue().length === 6) verifyOtp();
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value && boxes[index - 1]) boxes[index - 1].focus();
        if (event.key === 'ArrowLeft' && boxes[index - 1]) boxes[index - 1].focus();
        if (event.key === 'ArrowRight' && boxes[index + 1]) boxes[index + 1].focus();
      });
      input.addEventListener('paste', (event) => {
        const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!digits) return;
        event.preventDefault(); boxes.forEach((box, boxIndex) => { box.value = digits[boxIndex] || ''; });
        if (digits.length === 6) verifyOtp(); else boxes[Math.min(digits.length, 5)].focus();
      });
    });
    drawerBody.addEventListener('click', async (event) => {
      const line = event.target.closest('.shop-bag-item'); if (!line) return;
      const items = readBag(); const key = (row) => row.productId === line.dataset.productId && String(row.size || '') === line.dataset.size;
      if (event.target.closest('[data-remove]')) writeBag(items.filter((row) => !key(row)));
      else if (event.target.closest('[data-quantity]')) {
        const row = items.find(key); if (row) row.quantity = Math.max(0, (Number(row.quantity) || 1) + Number(event.target.closest('[data-quantity]').dataset.quantity));
        writeBag(items.filter((row) => row.quantity > 0));
      } else return;
      renderBag();
    });
    document.getElementById('shop-bag-checkout').addEventListener('click', () => { location.href = 'cart.html'; });
    qsa('[data-shop-auth-close]').forEach((button) => button.addEventListener('click', () => closeLogin(false)));
    window.visualViewport?.addEventListener('resize', () => document.body.classList.toggle('shop-keyboard-open', window.visualViewport.height < window.innerHeight * .72));
  }

  function openAccountMenu(anchor) {
    let menu = document.getElementById('shop-account-menu');
    if (!menu) {
      menu = document.createElement('div'); menu.id = 'shop-account-menu'; menu.className = 'shop-account-menu'; menu.setAttribute('role', 'menu'); menu.hidden = true;
      const identity = document.createElement('div'); identity.className = 'shop-account-menu__identity';
      const name = document.createElement('strong'); name.dataset.accountName = 'true';
      const email = document.createElement('small'); email.dataset.accountEmail = 'true';
      identity.append(name, email);
      const divider = document.createElement('span'); divider.className = 'shop-account-menu__divider'; divider.setAttribute('aria-hidden', 'true');
      const orders = document.createElement('a'); orders.className = 'shop-account-menu__row'; orders.setAttribute('role', 'menuitem'); orders.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"></path><path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12.1V21"></path></svg><span>Orders</span>';
      orders.href = new URL('orders.html', shopBase).href;
      const logout = document.createElement('button'); logout.type = 'button'; logout.className = 'shop-account-menu__row is-logout'; logout.setAttribute('role', 'menuitem'); logout.dataset.shopLogout = 'true'; logout.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"></path></svg><span>Logout</span>';
      menu.append(identity, divider, orders, divider.cloneNode(), logout); document.body.appendChild(menu);
      logout.addEventListener('click', async () => {
        try { await api('/auth/logout', { method: 'POST' }); } finally { customer = null; renderAccount(); menu.hidden = true; anchor.focus(); }
      });
      menu.addEventListener('click', (event) => { if (event.target.closest('a')) { menu.hidden = true; document.querySelector('[data-shop-account]')?.setAttribute('aria-expanded', 'false'); } });
      document.addEventListener('pointerdown', (event) => {
        const trigger = document.querySelector('[data-shop-account]');
        if (!menu.hidden && !menu.contains(event.target) && !trigger?.contains(event.target)) { menu.hidden = true; trigger?.setAttribute('aria-expanded', 'false'); }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !menu.hidden) { menu.hidden = true; const trigger = document.querySelector('[data-shop-account]'); trigger?.setAttribute('aria-expanded', 'false'); trigger?.focus(); }
      });
    }
    const name = menu.querySelector('[data-account-name]'); const email = menu.querySelector('[data-account-email]');
    name.textContent = customer.name || customer.email || 'Account'; email.textContent = customer.email || ''; email.title = customer.email || '';
    const wasOpen = !menu.hidden && menu.dataset.anchorId === anchor.id;
    menu.hidden = wasOpen; menu.dataset.anchorId = anchor.id;
    anchor.setAttribute('aria-expanded', String(!wasOpen));
    if (wasOpen) return;
    const rect = anchor.getBoundingClientRect(); menu.style.top = `${rect.bottom + 8}px`; menu.style.right = `${Math.max(8, innerWidth - rect.right)}px`;
  }

  async function boot() {
    buildHeaderControls();
    try { config = await api('/config'); } catch (error) { console.warn('[Kyraa shop] Shop config unavailable:', error.message); }
    ensureDialogs(); setupListeners(); renderAccount(); updateBagCount();
    const loginParams = new URLSearchParams(location.search);
    if (loginParams.get('login') === '1') {
      const requestedPath = loginParams.get('returnTo') || '/orders';
      let returnTo = '/orders';
      try { const candidate = new URL(requestedPath, location.origin); if (candidate.origin === location.origin && (/^\/(orders|shop\/)\b/.test(candidate.pathname) || /^\/frontend\/shop\//.test(candidate.pathname))) returnTo = `${candidate.pathname}${candidate.search}${candidate.hash}`; } catch { /* Fall back to the orders page. */ }
      const current = await getCustomer(true);
      if (current) { location.replace(returnTo); return; }
      openLogin({ onSuccess: () => location.replace(returnTo), onCancel: () => history.replaceState(null, '', location.pathname) });
    } else getCustomer();
    if (!catalogRequest) catalogRequest = api('/products').then((rows) => { catalogProducts = Array.isArray(rows) ? rows : []; return catalogProducts; }).catch(() => []);
    const directProduct = /(?:^|\/)product\.html$/i.test(location.pathname);
    if (directProduct && (new URLSearchParams(location.search).has('slug') || new URLSearchParams(location.search).has('id')) && config.requireLoginForProduct) {
      const current = await getCustomer(true);
      if (!current) openLogin({ onCancel: () => { location.href = 'index.html'; } });
    }
  }

  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  window.KyraaShopRuntime = { ready, api, getCustomer, requireCustomer, openLogin, addBagItem, readBag, writeBag, renderBag, showToast, get config() { return config; } };
  const start = () => boot().then(resolveReady).catch((error) => { console.error('[Kyraa shop] Shop controls could not start:', error); resolveReady(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
