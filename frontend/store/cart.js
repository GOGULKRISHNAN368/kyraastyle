(() => {
  'use strict';
  const storageKey = 'kyraa-category-bag';
  const fallbackProducts = {
    'Midnight Garden Embroidered Suit': { price: 8490, image: '../image/newarrival1.jpg', designer: 'KYRAA EDIT' },
    'Ruby Heirloom Evening Gown': { price: 12990, image: '../image/newarrival2.jpg', designer: 'KYRAA EDIT' },
    'Emerald Garden Anarkali': { price: 11490, image: '../image/newarrival3.jpg', designer: 'KYRAA EDIT' },
    'Sapphire Embroidered Gown': { price: 13990, image: '../image/newarrival4.jpg', designer: 'KYRAA EDIT' },
    'Golden Hour Celebration Suit': { price: 9990, image: '../image/newarrival5.jpg', designer: 'KYRAA EDIT' },
    'Teal Blossom Anarkali': { price: 10990, image: '../image/newarrival6.jpg', designer: 'KYRAA EDIT' },
    'Lavender Dream Gown': { price: 12490, image: '../image/newarrival7.jpg', designer: 'KYRAA EDIT' },
    'Coral Garden Occasionwear': { price: 11990, image: '../image/newarrival8.jpg', designer: 'KYRAA EDIT' },
    'Ivory Lumière Embroidered Set': { price: 14990, image: '../image/newarrival9.jpg', designer: 'KYRAA EDIT' },
    'Plum Royale Anarkali': { price: 13490, image: '../image/newarrival10.jpg', designer: 'KYRAA EDIT' }
  };
  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const elements = {
    items: document.getElementById('cart-items'), itemLabel: document.getElementById('item-label'), count: document.getElementById('header-count'),
    subtotal: document.getElementById('subtotal'), discount: document.getElementById('discount'), discountRow: document.getElementById('discount-row'),
    shipping: document.getElementById('shipping'), total: document.getElementById('total'), date: document.getElementById('delivery-date'), checkout: document.getElementById('checkout-button'),
    couponForm: document.getElementById('coupon-form'), coupon: document.getElementById('coupon-code'), couponStatus: document.getElementById('coupon-status'), toast: document.getElementById('cart-toast')
  };
  let couponApplied = false;
  let toastTimer;

  function getBag() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(stored)) return [];
      return stored.map((item) => ({ ...fallbackProducts[item.product], ...item, quantity: Math.max(1, Number(item.quantity) || 1) })).filter((item) => item.product && item.price);
    } catch (_) { return []; }
  }
  function saveBag(bag) { localStorage.setItem(storageKey, JSON.stringify(bag)); }
  function escapeHTML(value) { const node = document.createElement('div'); node.textContent = value; return node.innerHTML; }
  function showToast(message) { elements.toast.textContent = message; elements.toast.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 2600); }
  function estimatedDate() { const date = new Date(); date.setDate(date.getDate() + 6); return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  function render() {
    const bag = getBag();
    const itemCount = bag.reduce((total, item) => total + item.quantity, 0);
    const subtotal = bag.reduce((total, item) => total + item.price * item.quantity, 0);
    const discount = couponApplied ? Math.round(subtotal * .10) : 0;
    const shippingCost = subtotal === 0 ? 0 : subtotal >= 2999 ? 0 : 199;
    elements.count.textContent = itemCount;
    elements.itemLabel.textContent = `(${itemCount} ${itemCount === 1 ? 'item' : 'items'})`;
    elements.subtotal.textContent = money.format(subtotal);
    elements.discount.textContent = `−${money.format(discount)}`;
    elements.discountRow.hidden = !discount;
    elements.shipping.textContent = subtotal === 0 ? '—' : shippingCost ? money.format(shippingCost) : 'Free';
    elements.total.textContent = money.format(Math.max(0, subtotal - discount + shippingCost));
    elements.date.textContent = subtotal ? estimatedDate() : '—';
    elements.checkout.disabled = bag.length === 0;
    if (!bag.length) {
      elements.items.innerHTML = '<div class="empty-bag"><h3>Your bag is waiting for its first piece.</h3><p>Discover occasionwear selected for your celebrations.</p><a class="shop-button" href="category.html">Shop the collection</a></div>';
      return;
    }
    elements.items.innerHTML = bag.map((item, index) => `
      <article class="cart-item">
        <img class="product-image" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.product)}">
        <div class="item-details"><p class="item-brand">${escapeHTML(item.designer || 'KYRAA EDIT')}</p><h3 class="item-name">${escapeHTML(item.product)}</h3><p class="item-meta">Size <b>${escapeHTML(item.size || 'M')}</b><span aria-hidden="true"> / </span>Colour <b>${escapeHTML(item.color || 'Selected colour')}</b></p><div class="quantity-control" aria-label="Quantity for ${escapeHTML(item.product)}"><button type="button" data-action="decrease" data-index="${index}" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button type="button" data-action="increase" data-index="${index}" aria-label="Increase quantity">+</button></div></div>
        <div class="item-side"><p class="item-price">${money.format(item.price * item.quantity)}</p><button class="remove-button" type="button" data-action="remove" data-index="${index}">Remove</button></div>
      </article>`).join('');
  }
  elements.items.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]'); if (!button) return;
    const bag = getBag(); const index = Number(button.dataset.index); const item = bag[index]; if (!item) return;
    if (button.dataset.action === 'increase') item.quantity += 1;
    if (button.dataset.action === 'decrease') item.quantity > 1 ? item.quantity -= 1 : bag.splice(index, 1);
    if (button.dataset.action === 'remove') bag.splice(index, 1);
    saveBag(bag); render();
  });
  document.getElementById('recommendations').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-product]');
    if (!button) return;
    const productName = button.dataset.product;
    const product = fallbackProducts[productName];
    if (!product) return;
    const bag = getBag();
    const existing = bag.find((item) => item.product === productName && item.size === 'M' && item.color === 'Selected colour');
    if (existing) existing.quantity += 1;
    else bag.push({ ...product, product: productName, size: 'M', color: 'Selected colour', quantity: 1 });
    saveBag(bag);
    render();
    showToast(`${productName} added to your bag.`);
  });
  elements.couponForm.addEventListener('submit', (event) => {
    event.preventDefault(); const bag = getBag(); const subtotal = bag.reduce((total, item) => total + item.price * item.quantity, 0);
    const code = elements.coupon.value.trim().toUpperCase(); elements.couponStatus.classList.remove('is-success', 'is-error');
    if (code === 'KYRAA10' && subtotal >= 4999) { couponApplied = true; elements.couponStatus.textContent = 'KYRAA10 applied — you saved 10% on your order.'; elements.couponStatus.classList.add('is-success'); render(); return; }
    elements.couponStatus.textContent = code === 'KYRAA10' ? 'KYRAA10 applies to orders above ₹4,999.' : 'That coupon is not available. Try KYRAA10.'; elements.couponStatus.classList.add('is-error');
  });
  elements.checkout.addEventListener('click', () => { window.location.href = 'checkout.html'; });
  render();
})();
