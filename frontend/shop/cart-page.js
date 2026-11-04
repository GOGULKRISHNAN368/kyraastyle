(() => {
  'use strict';
  const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const byId = (id) => document.getElementById(id);
  let customer;
  let config = { shippingFee: 0, couponsEnabled: false };
  let undoItem = null;
  let undoTimer;

  function showStatus(message) { byId('cart-status').textContent = message; byId('cart-status').hidden = !message; }
  function currentRows(rows) { return rows.filter((row) => row.available && row.quantity > 0); }
  function saveRows(rows) {
    const next = rows.filter((row) => row.productId).map((row) => ({ productId: row.productId, slug: row.slug, size: row.size || '', quantity: row.quantity || 0 }));
    window.KyraaShopRuntime.writeBag(next);
  }

  async function validateBag() {
    const items = window.KyraaShopRuntime.readBag();
    if (!items.length) return [];
    const rows = await window.KyraaShopRuntime.api('/cart/validate', { method: 'POST', body: JSON.stringify({ items }) });
    saveRows(rows);
    showStatus(rows.map((row) => row.message).filter(Boolean).join(' '));
    return rows;
  }

  function makeItem(row) {
    const product = row.product;
    const article = document.createElement('article'); article.className = 'cart-line'; article.dataset.productId = row.productId; article.dataset.size = row.size || '';
    const image = document.createElement('img'); image.className = 'cart-line-image'; image.src = product.imageUrl || product.images?.[0]?.imageUrl || ''; image.srcset = image.src ? [320, 480, 800].map((width) => `${image.src.replace(/c_limit,w_\d+/, `c_limit,w_${width}`)} ${width}w`).join(', ') : ''; image.sizes = '(max-width: 599px) 80px, 96px'; image.alt = product.name || ''; image.width = 400; image.height = 500; image.loading = 'lazy'; window.KyraaProductImages.fit(image, product.images?.[0] || product);
    const detail = document.createElement('div'); detail.className = 'cart-line-detail';
    const name = document.createElement('h2'); name.textContent = product.name || 'Product';
    const size = document.createElement('p'); size.textContent = row.size ? `Size: ${row.size}` : 'Unstitched fabric';
    const qty = document.createElement('div'); qty.className = 'cart-qty';
    const minus = document.createElement('button'); minus.type = 'button'; minus.dataset.qty = '-1'; minus.setAttribute('aria-label', 'Decrease quantity'); minus.textContent = '−'; minus.disabled = row.quantity <= 1;
    const count = document.createElement('output'); count.textContent = String(row.quantity); count.setAttribute('aria-label', 'Quantity');
    const plus = document.createElement('button'); plus.type = 'button'; plus.dataset.qty = '1'; plus.setAttribute('aria-label', 'Increase quantity'); plus.textContent = '+'; plus.disabled = row.quantity >= row.stock;
    qty.append(minus, count, plus);
    const price = document.createElement('strong'); price.className = 'cart-line-price'; price.textContent = `₹${money.format(row.price * row.quantity)}`;
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'cart-remove'; remove.dataset.remove = 'true'; remove.setAttribute('aria-label', `Remove ${product.name}`); remove.textContent = 'Remove';
    detail.append(name, size, price);
    const controls = document.createElement('div'); controls.className = 'cart-line-controls'; controls.append(qty, remove);
    article.append(image, detail, controls);
    return article;
  }

  function render(rows) {
    const items = currentRows(rows); const list = byId('cart-lines'); list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('div'); empty.className = 'cart-empty';
      const title = document.createElement('h2'); title.textContent = 'Your cart is empty.';
      const link = document.createElement('a'); link.href = 'index.html'; link.className = 'cart-primary cart-continue'; link.textContent = 'Continue shopping';
      empty.append(title, link); list.appendChild(empty);
    } else items.forEach((row) => list.appendChild(makeItem(row)));
    const subtotal = items.reduce((sum, row) => sum + row.price * row.quantity, 0);
    const shipping = subtotal ? config.shippingFee : 0; const total = subtotal + shipping;
    byId('cart-subtotal').textContent = `₹${money.format(subtotal)}`;
    byId('cart-shipping').textContent = shipping ? `₹${money.format(shipping)}` : 'Free';
    byId('cart-total').textContent = `₹${money.format(total)}`;
    byId('cart-mobile-total').textContent = `₹${money.format(total)}`;
    ['cart-checkout', 'cart-mobile-checkout'].forEach((id) => { byId(id).disabled = !items.length; });
    byId('cart-mobile-bar').hidden = !items.length;
    byId('cart-coupon-slot').hidden = !config.couponsEnabled;
  }

  function announceRemove(row) {
    undoItem = { productId: row.productId, slug: row.slug, size: row.size || '', quantity: row.quantity };
    const toast = byId('cart-undo'); toast.hidden = false;
    clearTimeout(undoTimer); undoTimer = setTimeout(() => { toast.hidden = true; undoItem = null; }, 5000);
  }

  async function updateLine(line, action) {
    const items = window.KyraaShopRuntime.readBag(); const match = (row) => row.productId === line.dataset.productId && String(row.size || '') === line.dataset.size;
    const target = items.find(match); if (!target) return;
    if (action === 'remove') { announceRemove(target); saveRows(items.filter((row) => !match(row))); }
    else target.quantity = Math.max(1, Number(target.quantity || 1) + action);
    render(await validateBag());
  }

  async function checkout() {
    const current = await window.KyraaShopRuntime.getCustomer(true);
    if (!current) { window.KyraaShopRuntime.openLogin({ onSuccess: () => checkout() }); return; }
    location.href = 'checkout.html';
  }

  async function boot() {
    await window.KyraaShopRuntime.ready;
    customer = await window.KyraaShopRuntime.getCustomer(true);
    if (!customer) { window.KyraaShopRuntime.openLogin({ onSuccess: () => boot() }); return; }
    try { config = await window.KyraaShopAuth.requestPublic('/api/config/public'); } catch { showStatus('Order settings could not be loaded.'); }
    byId('cart-coupon-slot').hidden = !config.couponsEnabled;
    render(await validateBag());
  }

  byId('cart-lines').addEventListener('click', (event) => {
    const line = event.target.closest('.cart-line'); if (!line) return;
    const qty = event.target.closest('[data-qty]');
    if (event.target.closest('[data-remove]')) updateLine(line, 'remove');
    else if (qty) updateLine(line, Number(qty.dataset.qty));
  });
  byId('cart-undo-button').addEventListener('click', async () => {
    if (!undoItem) return;
    const rows = window.KyraaShopRuntime.readBag(); rows.push(undoItem); saveRows(rows); undoItem = null; clearTimeout(undoTimer); byId('cart-undo').hidden = true; render(await validateBag());
  });
  byId('cart-checkout').addEventListener('click', checkout); byId('cart-mobile-checkout').addEventListener('click', checkout);
  boot().catch((error) => showStatus(error.message || 'Your cart could not be loaded.'));
})();
