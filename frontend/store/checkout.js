(() => {
  'use strict';
  const key = 'kyraa-category-bag';
  const fallback = {
    'Midnight Garden Embroidered Suit': 8490, 'Ruby Heirloom Evening Gown': 12990, 'Emerald Garden Anarkali': 11490,
    'Sapphire Embroidered Gown': 13990, 'Golden Hour Celebration Suit': 9990, 'Teal Blossom Anarkali': 10990,
    'Lavender Dream Gown': 12490, 'Coral Garden Occasionwear': 11990, 'Ivory Lumière Embroidered Set': 14990, 'Plum Royale Anarkali': 13490
  };
  const format = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const bag = (() => { try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(saved) ? saved.map((item) => ({ ...item, price: item.price || fallback[item.product], quantity: Math.max(1, Number(item.quantity) || 1) })).filter((item) => item.price) : []; } catch (_) { return []; } })();
  const quantity = bag.reduce((total, item) => total + item.quantity, 0);
  const subtotal = bag.reduce((total, item) => total + item.price * item.quantity, 0);
  const shipping = subtotal && subtotal < 2999 ? 199 : 0;
  document.getElementById('order-items').textContent = `${quantity || 'No'} ${quantity === 1 ? 'piece' : 'pieces'} in your order`;
  document.getElementById('order-lines').innerHTML = bag.length ? bag.map((item) => `<div class="order-line"><span>${item.quantity} × ${escapeHTML(item.product)}</span><b>${format.format(item.price * item.quantity)}</b></div>`).join('') : '<p class="order-line">Your bag is empty.</p>';
  document.getElementById('order-total').textContent = format.format(subtotal + shipping);
  function escapeHTML(value) { const node = document.createElement('div'); node.textContent = value; return node.innerHTML; }
  const form = document.getElementById('delivery-form'); const toast = document.getElementById('checkout-toast'); let toastTimer;
  form.addEventListener('submit', (event) => { event.preventDefault(); const address = Object.fromEntries(new FormData(form)); localStorage.setItem('kyraa-delivery-address', JSON.stringify(address)); toast.textContent = 'Delivery address saved. Payment is the next step.'; toast.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3000); });
})();
