(() => {
  'use strict';
  const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const $ = (selector, root = document) => root.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const states = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'];
  const detailsKey = 'kyraa-checkout-details';
  const idempotencyStorageKey = 'kyraa-order-idempotency';
  const upiPendingStorageKey = 'kyraa-upi-pending-order';
  let customer = null;
  let rows = [];
  let config = { shippingFee: 0, couponsEnabled: false, paymentMethods: [] };
  let buyNow = false;
  let busy = false;

  const apiPublic = (path, options) => window.KyraaShopAuth.requestPublic(path, options);
  function formatMoney(value) { return `₹${money.format(Number(value) || 0)}`; }
  function status(id, message) { const node = byId(id); node.textContent = message; node.hidden = !message; }
  function retryStatus(id, message, action) {
    const node = byId(id); node.replaceChildren(document.createTextNode(message)); node.hidden = false;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'checkout-retry'; button.textContent = 'Try again'; button.addEventListener('click', action, { once: true }); node.appendChild(button);
  }
  function rowQuantity(row) { return Math.max(0, Number(row.quantity ?? row.qty) || 0); }
  function rowPrice(row) {
    for (const value of [row.price, row.unitPrice, row.product?.price]) {
      const candidate = Number(value);
      if (value !== null && value !== undefined && Number.isFinite(candidate) && candidate >= 0) return candidate;
    }
    return 0;
  }
  function validRows() { return rows.filter((row) => row.available !== false && rowQuantity(row) > 0); }
  function itemsForRequest() { return validRows().map((row) => ({ productId: row.productId, size: row.size || '', qty: rowQuantity(row) })); }
  function linesMarkup(container) {
    container.replaceChildren();
    validRows().forEach((row) => {
      const product = row.product; const line = document.createElement('article'); line.className = 'checkout-summary-line';
      const image = document.createElement('img'); image.src = product.imageUrl || product.images?.[0]?.imageUrl || ''; image.alt = product.name || ''; image.width = 80; image.height = 100; image.loading = 'lazy'; window.KyraaProductImages.fit(image, product.images?.[0] || product);
      const quantity = rowQuantity(row); const detail = document.createElement('div'); const name = document.createElement('strong'); name.textContent = product.name || 'Product'; const meta = document.createElement('p'); meta.textContent = `${row.size ? `Size: ${row.size}` : 'Unstitched fabric'} · Qty: ${quantity}`; detail.append(name, meta);
      const price = document.createElement('strong'); price.textContent = formatMoney(rowPrice(row) * quantity); line.append(image, detail, price); container.appendChild(line);
    });
  }
  function renderSummary() {
    const valid = validRows(); const subtotal = valid.reduce((sum, row) => sum + rowPrice(row) * rowQuantity(row), 0); const shipping = subtotal ? Math.max(0, Number(config.shippingFee) || 0) : 0; const total = subtotal + shipping;
    linesMarkup(byId('desktop-summary-lines'));
    const count = valid.reduce((sum, row) => sum + rowQuantity(row), 0);
    byId('summary-count').textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    byId('summary-mobile-total').textContent = formatMoney(total);
    byId('checkout-subtotal').textContent = byId('checkout-subtotal-inline').textContent = formatMoney(subtotal);
    const shippingLabel = shipping ? formatMoney(shipping) : 'FREE';
    byId('checkout-shipping').textContent = byId('checkout-shipping-inline').textContent = shippingLabel;
    byId('checkout-shipping').classList.toggle('is-free', shipping === 0);
    byId('checkout-shipping-inline').classList.toggle('is-free', shipping === 0);
    byId('checkout-total').textContent = byId('checkout-total-inline').textContent = formatMoney(total);
    byId('place-order-label').textContent = `PLACE ORDER • ${formatMoney(total)}`;
    byId('checkout-coupon').hidden = config.couponsEnabled !== true;
    byId('buy-now-note').hidden = !buyNow;
  }
  function fillStateOptions() {
    const select = $('#details-form [name="state"]');
    states.forEach((state) => { const option = document.createElement('option'); option.value = state; option.textContent = state; select.appendChild(option); });
  }
  function restoreDetails(defaultState = true) {
    let saved = {};
    try { saved = JSON.parse(sessionStorage.getItem(detailsKey) || '{}'); } catch { saved = {}; }
    const form = byId('details-form');
    Object.entries(saved).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value; });
    if (!saved.name) form.elements.name.value = customer.name || '';
    if (!saved.phone) form.elements.phone.value = String(customer.phone || '').replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
    if (!saved.email) form.elements.email.value = customer.email || '';
    if (!saved.state && defaultState) form.elements.state.value = 'Tamil Nadu';
  }
  function saveDetails() { sessionStorage.setItem(detailsKey, JSON.stringify(Object.fromEntries(new FormData(byId('details-form')).entries()))); }
  function showStep(step) {
    byId('details-step').hidden = step !== 1; byId('payment-step').hidden = step !== 2;
    byId('checkout-current-label').textContent = step === 1 ? 'Delivery details' : 'Payment';
    byId('payment-topbar').hidden = step !== 2;
    byId('checkout-back-link').hidden = step === 2;
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function validateField(field) {
    const value = String(field.value || '').trim(); let message = '';
    if (field.name === 'name' && (value.length < 2 || value.length > 120)) message = 'Enter your full name.';
    if (field.name === 'phone' && !/^[6-9]\d{9}$/.test(value.replace(/\D/g, ''))) message = 'Enter a valid 10 digit Indian mobile number.';
    if (field.name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = 'Enter a valid email address.';
    if (field.name === 'line1' && (value.length < 5 || value.length > 300)) message = 'Enter address line 1.';
    if (field.name === 'line2' && value.length > 300) message = 'Keep address line 2 under 300 characters.';
    if (field.name === 'landmark' && value.length > 150) message = 'Keep the landmark under 150 characters.';
    if (field.name === 'pincode' && !/^[1-9]\d{5}$/.test(value)) message = 'Enter a valid 6 digit pincode.';
    if (field.name === 'city' && (value.length < 2 || value.length > 100)) message = 'Enter a valid city.';
    if (field.name === 'state' && !states.includes(value)) message = 'Select a state or union territory.';
    if (field.name === 'note' && value.length > 200) message = 'Order note must be 200 characters or fewer.';
    field.setAttribute('aria-invalid', String(Boolean(message)));
    const errorHost = field.closest('label') || field.parentElement;
    let error = errorHost.querySelector('.field-error');
    if (message && !error) { error = document.createElement('small'); error.className = 'field-error'; error.id = `field-error-${field.name}`; errorHost.appendChild(error); }
    if (error) {
      error.textContent = message;
      error.hidden = !message;
      if (message) field.setAttribute('aria-describedby', error.id);
      else field.removeAttribute('aria-describedby');
    }
    return message;
  }
  function validateForm() {
    const fields = [...byId('details-form').elements].filter((field) => field.name);
    const errors = fields.map((field) => ({ field, message: validateField(field) })).filter((item) => item.message);
    if (errors.length) { errors[0].field.scrollIntoView({ behavior: 'smooth', block: 'center' }); errors[0].field.focus({ preventScroll: true }); status('details-error', 'Please correct the highlighted details.'); return false; }
    status('details-error', ''); saveDetails(); return true;
  }
  function renderPaymentMethods() {
    const container = byId('payment-methods'); container.replaceChildren();
    const methods = (Array.isArray(config.paymentMethods) ? config.paymentMethods : []).filter((method) => method === 'cod' || method === 'upi');
    if (!methods.length) {
      const note = document.createElement('p'); note.className = 'checkout-contact-line'; note.textContent = 'Online payment is being set up. Please check back soon.'; container.appendChild(note); byId('place-order').disabled = true; return;
    }
    methods.forEach((method, index) => {
      const label = document.createElement('label'); label.className = 'payment-method';
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'paymentMethod'; radio.value = method; radio.checked = index === 0;
      const copy = document.createElement('span'); copy.className = 'payment-method-copy';
      const title = document.createElement('strong'); title.textContent = method === 'cod' ? 'CASH ON DELIVERY (COD)' : 'UPI';
      const subtitle = document.createElement('small'); subtitle.textContent = method === 'cod' ? 'Pay when your order arrives' : 'Pay to our UPI ID and enter the transaction reference';
      copy.append(title, subtitle); label.append(radio, copy); container.appendChild(label);
    });
    const updateSelection = () => {
      container.querySelectorAll('.payment-method').forEach((label) => label.classList.toggle('is-selected', label.querySelector('input').checked));
      byId('place-order').disabled = !container.querySelector('input[name="paymentMethod"]:checked');
    };
    container.addEventListener('change', updateSelection); updateSelection();
  }
  function showUpiPayment(orderNumber, total) {
    const upiId = String(config.upi?.upiId || '').trim();
    if (!upiId) { status('payment-error', 'UPI is not configured on the server.'); return; }
    const payeeName = String(config.upi?.payeeName || '').trim();
    const parameters = new URLSearchParams({ pa: upiId, am: String(Number(total) || 0), cu: 'INR', tn: orderNumber });
    if (payeeName) parameters.set('pn', payeeName);
    const paymentUri = `upi://pay?${parameters.toString()}`;
    byId('upi-payment-amount').textContent = formatMoney(total);
    byId('upi-payment-payee').textContent = payeeName ? `Pay to ${payeeName}` : '';
    byId('upi-payment-id').textContent = upiId;
    byId('upi-open-app').href = paymentUri;
    byId('upi-open-app').hidden = !matchMedia('(max-width: 799px)').matches;
    status('payment-error', '');
    try { window.KyraaUpiQr.render(byId('upi-payment-qr'), paymentUri); }
    catch (error) { status('payment-error', error.message || 'The UPI QR code could not be created.'); }
    byId('payment-methods').hidden = true;
    byId('payment-inline-totals').hidden = true;
    byId('place-order').hidden = true;
    byId('upi-payment-panel').hidden = false;
  }
  function finishUpiOrder(orderNumber) {
    if (buyNow) sessionStorage.removeItem('buyNowItem'); else window.KyraaShopRuntime.writeBag([]);
    sessionStorage.removeItem(detailsKey); sessionStorage.removeItem(idempotencyStorageKey); sessionStorage.removeItem(upiPendingStorageKey);
    location.href = `order-confirmed.html?order=${encodeURIComponent(orderNumber)}`;
  }
  async function submitUpiReference(event) {
    event.preventDefault();
    const pending = JSON.parse(sessionStorage.getItem(upiPendingStorageKey) || 'null');
    if (!pending?.orderNumber) return;
    const utr = byId('upi-reference').value.trim();
    if (!/^\d{12}$/.test(utr)) { status('payment-error', 'Enter a valid 12 digit UPI transaction reference.'); byId('upi-reference').focus(); return; }
    const button = byId('upi-paid-button'); button.disabled = true; status('payment-error', '');
    try {
      await apiPublic(`/api/orders/${encodeURIComponent(pending.orderNumber)}/upi-reference`, { method: 'POST', body: JSON.stringify({ utr }) });
      finishUpiOrder(pending.orderNumber);
    } catch (error) { status('payment-error', error.message || 'The payment reference could not be saved.'); button.disabled = false; }
  }
  function setPreviousAddress(data) {
    if (!data?.address) return;
    const form = byId('details-form'); const values = { ...(data.contact || {}), ...(data.address || {}) };
    if (values.phone) values.phone = String(values.phone).replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
    Object.entries(values).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value || ''; });
    saveDetails();
  }
  async function placeOrder() {
    if (busy || byId('place-order').disabled) return;
    busy = true; const button = byId('place-order'); button.disabled = true; status('payment-error', '');
    let idempotencyKey = sessionStorage.getItem(idempotencyStorageKey);
    if (!idempotencyKey) { idempotencyKey = globalThis.crypto?.randomUUID?.() || `ks-${Date.now()}-${Math.random().toString(36).slice(2)}`; sessionStorage.setItem(idempotencyStorageKey, idempotencyKey); }
    const values = Object.fromEntries(new FormData(byId('details-form')).entries());
    const selected = $('input[name="paymentMethod"]:checked');
    const originalLabel = byId('place-order-label').textContent;
    byId('place-order-label').textContent = 'PLACING ORDER…';
    try {
      const order = await apiPublic('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ ...values, items: itemsForRequest(), paymentMethod: selected?.value || '' }) });
      if (!order?.orderNumber) throw new Error('The order response was incomplete.');
      if (selected?.value === 'upi') {
        sessionStorage.removeItem(idempotencyStorageKey);
        const total = validRows().reduce((sum, row) => sum + rowPrice(row) * rowQuantity(row), 0) + Math.max(0, Number(config.shippingFee) || 0);
        sessionStorage.setItem(upiPendingStorageKey, JSON.stringify({ orderNumber: order.orderNumber, total }));
        showUpiPayment(order.orderNumber, total);
      } else {
        if (buyNow) sessionStorage.removeItem('buyNowItem'); else window.KyraaShopRuntime.writeBag([]);
        sessionStorage.removeItem(detailsKey); sessionStorage.removeItem(idempotencyStorageKey);
        location.href = `order-confirmed.html?order=${encodeURIComponent(order.orderNumber)}`;
      }
    } catch (error) { retryStatus('payment-error', error.message || 'Your order could not be placed.', placeOrder); }
    finally { busy = false; button.disabled = !byId('payment-methods').querySelector('input[name="paymentMethod"]:checked'); byId('place-order-label').textContent = originalLabel; }
  }
  async function loadRows() {
    buyNow = new URLSearchParams(location.search).get('buyNow') === '1';
    const bag = window.KyraaShopRuntime.readBag(); let items = bag;
    if (buyNow) {
      let one = null; try { one = JSON.parse(sessionStorage.getItem('buyNowItem') || 'null'); } catch { one = null; }
      if (!one) throw new Error('The selected item could not be loaded. Return to the product page and try again.');
      items = [one];
    }
    if (!items.length) { location.href = 'cart.html'; return; }
    rows = await window.KyraaShopRuntime.api('/cart/validate', { method: 'POST', body: JSON.stringify({ items }) });
    const valid = validRows();
    if (!valid.length) throw new Error(rows.map((row) => row.message).filter(Boolean).join(' ') || 'Your bag has no available items.');
    if (!buyNow) window.KyraaShopRuntime.writeBag(valid.map((row) => ({ productId: row.productId, slug: row.slug, size: row.size || '', quantity: rowQuantity(row) })));
  }
  async function boot() {
    await window.KyraaShopRuntime.ready;
    customer = await window.KyraaShopRuntime.getCustomer(true);
    if (!customer) { window.KyraaShopRuntime.openLogin({ onSuccess: () => boot(), onCancel: () => { location.href = 'cart.html'; } }); return; }
    byId('checkout-contact-line').textContent = `Signed in as ${customer.email}${customer.phone ? ` · ${customer.phone}` : ''}`;
    fillStateOptions();
    config = await apiPublic('/api/config/public').catch(() => ({ shippingFee: 0, couponsEnabled: false, paymentMethods: [] }));
    await loadRows(); renderSummary(); renderPaymentMethods();
    const previous = await apiPublic('/api/orders/previous-address').catch(() => null);
    restoreDetails(!previous?.address);
    if (previous?.address) { const button = byId('previous-address'); button.hidden = false; button.addEventListener('click', () => setPreviousAddress(previous)); }
    byId('details-form').addEventListener('input', saveDetails);
    byId('details-form').querySelectorAll('input,textarea,select').forEach((field) => field.addEventListener('blur', () => validateField(field)));
    byId('continue-payment').addEventListener('click', () => { if (!validateForm()) return; const values = Object.fromEntries(new FormData(byId('details-form')).entries()); byId('review-address').textContent = `${values.name} · +91 ${values.phone}\n${values.line1}${values.line2 ? `, ${values.line2}` : ''}${values.landmark ? `, ${values.landmark}` : ''}, ${values.city}, ${values.state} ${values.pincode}`; showStep(2); });
    byId('edit-address').addEventListener('click', () => showStep(1));
    byId('back-to-address').addEventListener('click', () => showStep(1));
    byId('place-order').addEventListener('click', placeOrder);
    byId('upi-reference-form').addEventListener('submit', submitUpiReference);
    byId('upi-skip-button').addEventListener('click', () => { const pending = JSON.parse(sessionStorage.getItem(upiPendingStorageKey) || 'null'); if (pending?.orderNumber) finishUpiOrder(pending.orderNumber); });
    byId('upi-copy-id').addEventListener('click', async () => { try { await navigator.clipboard.writeText(byId('upi-payment-id').textContent); byId('upi-copy-id').textContent = 'Copied'; setTimeout(() => { byId('upi-copy-id').textContent = 'Copy UPI ID'; }, 1500); } catch { status('payment-error', 'Could not copy the UPI ID.'); } });
    const pendingUpi = JSON.parse(sessionStorage.getItem(upiPendingStorageKey) || 'null');
    if (pendingUpi?.orderNumber) showUpiPayment(pendingUpi.orderNumber, pendingUpi.total);
  }
  boot().catch((error) => retryStatus('details-error', error.message || 'Checkout could not be loaded.', boot));
})();
