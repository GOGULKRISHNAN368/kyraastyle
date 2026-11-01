(() => {
  'use strict';
  const form = document.getElementById('auth-form');
  const message = document.getElementById('auth-message');
  const submit = document.getElementById('auth-submit');
  const tabs = [...document.querySelectorAll('[data-mode]')];
  const registerFields = [...document.querySelectorAll('.register-only')];
  const password = document.getElementById('customer-password');
  let mode = 'login';
  const next = new URLSearchParams(window.location.search).get('next') || '/store/cart.html';

  function safeNext() { return next.startsWith('/') && !next.startsWith('//') ? next : '/store/cart.html'; }
  function showMessage(text) { message.textContent = text; message.hidden = !text; }
  function setMode(value) {
    mode = value;
    tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.mode === value)));
    registerFields.forEach((field) => { field.hidden = value !== 'register'; });
    document.getElementById('customer-name').required = value === 'register';
    password.autocomplete = value === 'register' ? 'new-password' : 'current-password';
    submit.textContent = value === 'register' ? 'Create account and continue' : 'Sign in and continue';
    showMessage('');
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
  window.addEventListener('DOMContentLoaded', async () => {
    const customer = await window.KyraaCustomerAuth?.getSession();
    if (customer) window.location.replace(safeNext());
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(form));
    submit.disabled = true;
    showMessage('');
    try {
      if (mode === 'register') await window.KyraaCustomerAuth.register(fields);
      else await window.KyraaCustomerAuth.login(fields.email, fields.password);
      window.location.assign(safeNext());
    } catch (error) { showMessage(error.message || 'Unable to continue.'); }
    finally { submit.disabled = false; }
  });
})();
