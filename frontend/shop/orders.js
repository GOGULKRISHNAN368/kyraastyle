(() => {
  'use strict';
  const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const dateFormat = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const dateTimeFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const byId = (id) => document.getElementById(id);
  const localShop = location.pathname.startsWith('/frontend/shop/');
  const shopBase = document.querySelector('base')?.href || new URL('./', location.href).href;
  const shopHref = (file) => new URL(file, shopBase).href;
  const listHref = localShop ? shopHref('orders.html') : '/orders';
  const orderParam = new URLSearchParams(location.search).get('order') || '';
  const orderNumber = orderParam || decodeURIComponent(location.pathname.replace(/\/$/, '').split('/').pop() || '');
  const isDetails = Boolean(orderParam) || /^KS-\d{8}-\d{4,}$/.test(orderNumber);
  const statusLabels = { placed: 'Pending', packed: 'Packed', shipped: 'Shipped', out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
  const timelineSteps = [['placed', 'Order Placed'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['out_for_delivery', 'Out for Delivery'], ['delivered', 'Delivered']];
  let loading = false;
  const formatMoney = (value) => `₹${money.format(Number(value) || 0)}`;
  const formatDate = (value) => value ? dateFormat.format(new Date(value)) : '';
  const formatDateTime = (value) => value ? dateTimeFormat.format(new Date(value)) : '';
  const add = (parent, tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; parent.appendChild(node); return node; };
  const imageUrl = (item, width = 500) => item?.imageUrl || (item?.image ? `https://res.cloudinary.com/l8xwk9bz/image/upload/f_auto,q_auto:best,c_limit,w_${width}/${encodeURIComponent(item.image).replace(/%2F/g, '/')}` : '');
  const statusClass = (value) => `status-pill status-${String(value || 'placed').replace(/_/g, '-')}`;
  const detailHref = (number) => localShop ? `${shopHref('orders.html')}?order=${encodeURIComponent(number)}` : `/orders/${encodeURIComponent(number)}`;
  const historyAt = (order, status) => (order.statusHistory || []).find((entry) => entry.status === status)?.at || (status === 'placed' ? order.createdAt : null);

  async function ensureCustomer() {
    const customer = await window.KyraaShopRuntime.getCustomer(true);
    if (customer) return customer;
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    location.href = `${shopHref('index.html')}?login=1&returnTo=${encodeURIComponent(returnTo)}`;
    return null;
  }
  function showLoadError(parent, message, retry) {
    parent.replaceChildren(); const box = add(parent, 'div', 'orders-message'); add(box, 'p', '', message);
    const button = add(box, 'button', 'orders-retry', 'Try again'); button.type = 'button'; button.addEventListener('click', retry);
  }
  function renderSkeleton(parent, count = 3) {
    parent.replaceChildren();
    for (let i = 0; i < count; i += 1) { const row = add(parent, 'div', 'orders-skeleton'); add(row, 'i', ''); const copy = add(row, 'div', ''); add(copy, 'i', ''); add(copy, 'i', ''); add(copy, 'i', ''); }
  }
  function renderOrders(orders) {
    const root = byId('orders-content'); root.replaceChildren();
    if (!orders.length) {
      const empty = add(root, 'div', 'orders-empty'); add(empty, 'h2', '', 'You have no orders yet.');
      const link = add(empty, 'a', 'orders-start-shopping', 'Start shopping'); link.href = shopHref('index.html'); return;
    }
    orders.forEach((order) => {
      const items = Array.isArray(order.items) ? order.items : []; const first = items[0] || {};
      const row = add(root, 'article', 'order-row'); row.tabIndex = 0; row.setAttribute('role', 'link'); row.setAttribute('aria-label', `View order ${order.orderNumber}`);
      const imageWrap = add(row, 'div', 'order-list-image-wrap'); const image = add(imageWrap, 'img', 'order-list-image'); image.src = imageUrl(first, 320); image.alt = first.name || ''; image.width = 120; image.height = 150; image.loading = 'lazy';
      if (order.orderStatus !== 'cancelled' && order.orderStatus !== 'delivered') {
        const track = add(imageWrap, 'a', 'order-track-link', 'Track Order'); track.href = detailHref(order.orderNumber); track.addEventListener('click', (event) => event.stopPropagation());
      }
      const content = add(row, 'div', 'order-list-copy'); add(row, 'span', `${statusClass(order.orderStatus)} order-list-status`, statusLabels[order.orderStatus] || 'Pending');
      const title = add(content, 'h2', 'order-list-name', first.name || 'Order'); if (items.length > 1) title.append(document.createTextNode(` +${items.length - 1} more items`));
      const cancelledAt = order.orderStatus === 'cancelled' ? historyAt(order, 'cancelled') : null;
      add(content, 'p', 'order-list-date', order.orderStatus === 'cancelled' ? (cancelledAt ? `Cancelled on ${formatDate(cancelledAt)}` : 'Cancelled') : `Ordered on ${formatDate(order.createdAt)}`);
      const facts = add(content, 'p', 'order-list-facts'); add(facts, 'strong', '', formatMoney(order.total)); add(facts, 'span', '', `Qty: ${Number(first.qty) || 1}`); if (first.size) add(facts, 'span', '', `Size: ${first.size}`);
      const chevron = add(row, 'span', 'order-row-chevron', '›'); chevron.setAttribute('aria-hidden', 'true');
      const open = () => { location.href = detailHref(order.orderNumber); };
      row.addEventListener('click', (event) => { if (!event.target.closest('a')) open(); });
      row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    });
  }
  async function loadOrders(initial = false) {
    const root = byId('orders-content'); if (loading) return; loading = true; if (initial) renderSkeleton(root);
    try { await window.KyraaShopRuntime.ready; if (!await ensureCustomer()) return; const orders = await window.KyraaShopAuth.requestPublic('/api/orders'); renderOrders(Array.isArray(orders) ? orders : []); }
    catch (error) { if (initial || !root.childElementCount) showLoadError(root, error.message || 'Your orders could not be loaded.', () => loadOrders(true)); }
    finally { loading = false; }
  }
  function renderItemsCard(order) {
    const card = document.createElement('section'); card.className = 'order-card order-items-card'; add(card, 'h2', 'order-card-eyebrow', 'ITEMS IN THIS ORDER');
    (order.items || []).forEach((item) => {
      const row = add(card, 'article', 'order-detail-item'); const image = add(row, 'img', 'order-detail-image'); image.src = imageUrl(item, 400); image.alt = item.name || ''; image.width = 120; image.height = 150; image.loading = 'lazy';
      const copy = add(row, 'div', 'order-detail-item-copy'); add(copy, 'h3', '', item.name || 'Product');
      const chips = add(copy, 'div', 'order-item-chips'); if (item.size) add(chips, 'span', '', `SIZE: ${item.size}`); add(chips, 'span', '', `QTY: ${Number(item.qty) || 1}`);
      add(copy, 'strong', 'order-detail-item-price', formatMoney(Number(item.unitPrice) * Number(item.qty)));
    });
    return card;
  }
  function renderCourier(card, courier = {}) {
    const hasDetails = courier.courierName || courier.trackingNumber || courier.trackingUrl;
    if (!hasDetails) return;
    const section = add(card, 'section', 'order-courier-details'); add(section, 'h3', '', 'Courier details');
    if (courier.courierName) add(section, 'p', '', `Courier: ${courier.courierName}`);
    if (courier.trackingNumber) add(section, 'p', '', `Tracking number: ${courier.trackingNumber}`);
    if (courier.trackingUrl) { try { const url = new URL(courier.trackingUrl); if (url.protocol === 'https:') { const link = add(section, 'a', '', 'Track with courier'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; } } catch { /* Ignore invalid saved links. */ } }
  }
  function renderStatus(order) {
    const card = document.createElement('section'); card.className = `order-card order-status-card${order.orderStatus === 'cancelled' ? ' is-cancelled' : ''}`;
    const status = order.orderStatus || 'placed'; const label = statusLabels[status] || 'Pending'; const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const head = add(card, 'div', 'order-status-heading'); const dot = add(head, 'span', `${statusClass(status)} order-status-dot`, ''); dot.setAttribute('aria-hidden', 'true'); const copy = add(head, 'div', 'order-status-copy'); add(copy, 'h2', '', label);
    const desc = { placed: 'Your order has been received.', packed: 'Your order is packed.', shipped: 'Your order is shipped.', out_for_delivery: 'Your order is out for delivery.', delivered: 'Your order is delivered.', cancelled: 'This order has been cancelled.' };
    add(copy, 'p', '', desc[status] || 'Order status'); add(head, 'span', `${statusClass(status)} order-status-pill`, label);
    if (status === 'cancelled') {
      const at = historyAt(order, 'cancelled'); if (at) add(card, 'p', 'order-cancelled-note', `This order was cancelled on ${formatDateTime(at)}.`);
      renderCourier(card, order.courier); return card;
    }
    const currentIndex = timelineSteps.findIndex(([key]) => key === status); const timeline = add(card, 'ol', 'order-timeline');
    timelineSteps.forEach(([key, title], index) => {
      const complete = currentIndex >= 0 && index < currentIndex; const current = key === status; const step = add(timeline, 'li', `order-timeline-step${complete ? ' is-complete' : ''}${current ? ' is-current' : ''}`);
      const icon = add(step, 'span', 'order-timeline-icon', complete ? '✓' : current ? '•' : ''); icon.setAttribute('aria-hidden', 'true'); const text = add(step, 'div', 'order-timeline-copy'); add(text, 'h3', '', title);
      const at = historyAt(order, key); if (at && (complete || current)) { const time = add(text, 'time', '', formatDateTime(at)); time.dateTime = new Date(at).toISOString(); }
    });
    renderCourier(card, order.courier); return card;
  }
  function renderAddress(order) {
    const card = document.createElement('section'); card.className = 'order-card order-address-card'; const title = add(card, 'h2', '', 'Shipping Address');
    const pin = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); pin.setAttribute('viewBox', '0 0 24 24'); pin.setAttribute('aria-hidden', 'true'); pin.innerHTML = '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle>'; title.prepend(pin);
    const address = order.address || {}; const parts = [address.line1, address.line2, address.landmark, address.city, address.state, address.pincode].filter(Boolean);
    add(card, 'strong', 'order-address-name', order.contact?.name || ''); add(card, 'p', 'order-address-lines', parts.join('\n'));
    add(card, 'h3', 'order-phone-label', 'PHONE NUMBER'); add(card, 'p', 'order-phone-number', order.contact?.phone || ''); return card;
  }
  function renderPrice(order) {
    const card = document.createElement('section'); card.className = 'order-card order-price-card'; add(card, 'h2', '', 'Price Summary');
    const rows = [['Items Total', formatMoney(order.subtotal)]]; const shipping = Number(order.shippingFee);
    rows.push(['Delivery Charges', Number.isFinite(shipping) ? (shipping === 0 ? 'FREE' : formatMoney(shipping)) : '—']);
    if (Number(order.discount) > 0) rows.push(['Discount', `−${formatMoney(order.discount)}`]);
    rows.forEach(([label, value]) => { const row = add(card, 'p', 'order-price-row'); add(row, 'span', '', label); add(row, 'strong', value === 'FREE' ? 'is-free' : '', value); });
    const total = add(card, 'p', 'order-total-row'); add(total, 'span', '', 'Order Total'); add(total, 'strong', '', formatMoney(order.total));
    add(card, 'p', 'order-payment-pill', `PAYMENT VIA ${String(order.paymentMethod || '').toUpperCase()}`);
    if (order.paymentStatus) add(card, 'p', 'order-payment-status', `Payment status: ${String(order.paymentStatus).replace(/_/g, ' ')}`);
    return card;
  }
  function renderDetails(order) {
    const root = byId('order-detail-content'); root.replaceChildren();
    const grid = add(root, 'div', 'order-detail-grid'); const items = add(grid, 'div', 'order-detail-left'); items.append(renderItemsCard(order), renderStatus(order));
    const meta = add(grid, 'div', 'order-detail-right'); meta.append(renderAddress(order), renderPrice(order));
    if (order.orderStatus === 'placed') { const cancel = add(meta, 'button', 'cancel-order-button', 'Cancel Order'); cancel.type = 'button'; cancel.addEventListener('click', () => byId('cancel-dialog').showModal()); }
    document.title = `${order.orderNumber} | Order Details | Kryaa Style`;
  }
  async function loadDetails(initial = false) {
    const root = byId('order-detail-content'); if (loading) return; loading = true; if (initial) renderSkeleton(root, 2);
    try { await window.KyraaShopRuntime.ready; if (!await ensureCustomer()) return; const order = await window.KyraaShopAuth.requestPublic(`/api/orders/${encodeURIComponent(orderNumber)}`); renderDetails(order); }
    catch (error) { if (initial || !root.childElementCount) { root.replaceChildren(); const box = add(root, 'div', 'orders-message'); if (/order not found/i.test(error.message || '')) { add(box, 'h2', '', 'Order not found'); const link = add(box, 'a', 'orders-start-shopping', 'My Orders'); link.href = listHref; } else { add(box, 'p', '', error.message || 'Order details could not be loaded.'); const button = add(box, 'button', 'orders-retry', 'Try again'); button.type = 'button'; button.addEventListener('click', () => loadDetails(true)); } } }
    finally { loading = false; }
  }
  async function cancelOrder() {
    const button = byId('confirm-cancel'); button.disabled = true; button.textContent = 'Cancelling…';
    try { const updated = await window.KyraaShopAuth.requestPublic(`/api/orders/${encodeURIComponent(orderNumber)}/cancel`, { method: 'POST' }); byId('cancel-dialog').close(); renderDetails(updated); }
    catch (error) { button.textContent = error.message || 'Could not cancel'; setTimeout(() => { button.textContent = 'Yes, cancel'; }, 1800); }
    finally { button.disabled = false; }
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (isDetails) { byId('order-detail-view').hidden = false; loadDetails(true); }
    else { byId('orders-list-view').hidden = false; loadOrders(true); }
    byId('confirm-cancel').addEventListener('click', cancelOrder);
    byId('cancel-dialog').addEventListener('click', (event) => { if (event.target === byId('cancel-dialog')) byId('cancel-dialog').close(); });
    window.setInterval(() => { if (document.hidden) return; if (isDetails) loadDetails(); else loadOrders(); }, 30000);
  });
})();
