(() => {
  'use strict';
  const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const byId = (id) => document.getElementById(id);
  const orderNumber = new URLSearchParams(location.search).get('order') || '';
  const buyNow = new URLSearchParams(location.search).get('buyNow') === '1';
  let loading = false;
  const formatMoney = (value) => `₹${money.format(Number(value) || 0)}`;
  const formatAddress = (order) => {
    const address = order.address || {};
    const parts = [address.line1, address.line2, address.landmark, address.city, address.state, address.pincode].filter(Boolean);
    return `${order.contact?.name || ''} · +91 ${order.contact?.phone || ''}\n${parts.join(', ')}`;
  };
  function showError(message) { const node = byId('confirmation-error'); node.textContent = message; node.hidden = !message; byId('confirmation-retry').hidden = !message; }
  async function load() {
    if (loading) return;
    loading = true; showError(''); byId('confirmation-title').textContent = 'Order Confirmed!'; byId('confirmation-mark').hidden = false; byId('confirmation-copy').hidden = false; byId('confirmation-actions').hidden = false; byId('confirmation-loading').hidden = false;
    try {
      await window.KyraaShopRuntime.ready;
      if (!await window.KyraaShopRuntime.getCustomer(true)) {
        window.KyraaShopRuntime.openLogin({ onSuccess: () => { loading = false; load(); }, onCancel: () => { location.href = 'index.html'; } });
        return;
      }
      if (!/^KS-\d{8}-\d{4,}$/.test(orderNumber)) throw new Error('Order not found.');
      const order = await window.KyraaShopAuth.requestPublic(`/api/orders/${encodeURIComponent(orderNumber)}`);
      byId('confirmation-number').textContent = `Order number: ${order.orderNumber}`;
      byId('confirmation-number').hidden = false;
      byId('confirmation-payment').textContent = order.paymentMethod === 'cod' ? 'Cash on delivery' : order.paymentMethod === 'upi' ? (order.paymentStatus === 'verification_pending' ? 'UPI reference submitted; payment verification pending' : 'UPI payment awaiting verification') : String(order.paymentMethod || '');
      if (order.paymentMethod === 'upi') {
        const verifiedPending = order.paymentStatus === 'verification_pending';
        byId('confirmation-title').textContent = verifiedPending ? 'Order Placed' : 'Order Awaiting Payment';
        byId('confirmation-copy').textContent = verifiedPending ? 'Your UPI reference was received. We will confirm payment after checking the transaction.' : 'Your order is saved. Complete the UPI payment and submit your 12 digit transaction reference to verify it.';
        byId('confirmation-mark').textContent = verifiedPending ? '✓' : '₹';
      }
      if (buyNow) sessionStorage.removeItem('buyNowItem');
      window.KyraaShopRuntime.writeBag([]);
      sessionStorage.removeItem('kyraa-upi-pending-order'); sessionStorage.removeItem('kyraa-checkout-details');
      byId('confirmation-total').textContent = formatMoney(order.total);
      byId('confirmation-address').textContent = formatAddress(order);
      const list = byId('confirmation-items'); list.replaceChildren();
      (order.items || []).forEach((item) => {
        const row = document.createElement('article'); row.className = 'confirmation-item';
        const image = document.createElement('img'); image.src = item.imageUrl || (item.image ? `https://res.cloudinary.com/l8xwk9bz/image/upload/f_auto,q_auto:best,c_limit,w_240/${encodeURIComponent(item.image).replace(/%2F/g, '/')}` : ''); image.alt = ''; image.width = 72; image.height = 90; image.loading = 'lazy'; window.KyraaProductImages.fit(image, item);
        const info = document.createElement('div'); const name = document.createElement('strong'); name.textContent = item.name || 'Product'; const meta = document.createElement('p'); meta.textContent = `${item.size ? `Size: ${item.size}` : 'Unstitched fabric'} · Qty: ${Number(item.qty) || 1}`; info.append(name, meta);
        const price = document.createElement('b'); price.textContent = formatMoney(Number(item.unitPrice) * Number(item.qty)); row.append(image, info, price); list.appendChild(row);
      });
      byId('confirmation-details').hidden = false;
      byId('confirmation-loading').hidden = true;
      document.title = `${order.orderNumber} | Kryaa Style`;
    } catch (error) {
      byId('confirmation-loading').hidden = true;
      if (/order not found/i.test(error.message || '')) { byId('confirmation-title').textContent = 'Order not found'; byId('confirmation-mark').hidden = true; byId('confirmation-copy').hidden = true; }
      showError(error.message || 'Order details could not be loaded.');
    }
    finally { loading = false; }
  }
  byId('confirmation-retry').addEventListener('click', load);
  load();
})();
