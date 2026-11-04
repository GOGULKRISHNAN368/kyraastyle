(() => {
  'use strict';
  const key = (customerId) => `kyraa-shop-bag:${customerId || 'guest'}`;
  function read(customerId) {
    try { const rows = JSON.parse(localStorage.getItem(key(customerId)) || '[]'); return Array.isArray(rows) ? rows : []; }
    catch { return []; }
  }
  function write(customerId, rows) {
    const value = Array.isArray(rows) ? rows : [];
    localStorage.setItem(key(customerId), JSON.stringify(value));
    return value;
  }
  function count(customerId) {
    return read(customerId).reduce((total, row) => total + Math.max(0, Number(row.quantity) || 0), 0);
  }
  window.KyraaShopBag = { key, read, write, count };
})();
