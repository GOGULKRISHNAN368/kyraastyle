import { useEffect, useState } from 'react';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import { fetchProducts } from '../../services/products.js';

function dateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function CouponForm({ coupon, onSave, onCancel }) {
  const [form, setForm] = useState({ code: '', expiryDate: '', discountType: 'percentage', discountValue: '', minimumPurchase: '0', usageLimit: '', applicableProductIds: [], isActive: true });
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(coupon ? {
      code: coupon.code || '', expiryDate: dateInput(coupon.expiryDate), discountType: coupon.discountType || 'percentage',
      discountValue: String(coupon.discountValue ?? ''), minimumPurchase: String(coupon.minimumPurchase ?? 0),
      usageLimit: coupon.usageLimit == null ? '' : String(coupon.usageLimit),
      applicableProductIds: (coupon.applicableProductIds || []).map(String), isActive: coupon.isActive !== false,
    } : { code: '', expiryDate: '', discountType: 'percentage', discountValue: '', minimumPurchase: '0', usageLimit: '', applicableProductIds: [], isActive: true });
    setError('');
  }, [coupon]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts({ limit: 200, sort: 'name', direction: 'asc' }, controller.signal)
      .then(({ data }) => setProducts(data || []))
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message || 'Could not load products.'); });
    return () => controller.abort();
  }, []);

  function setField(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function toggleProduct(id) {
    setForm((current) => ({ ...current, applicableProductIds: current.applicableProductIds.includes(id) ? current.applicableProductIds.filter((item) => item !== id) : [...current.applicableProductIds, id] }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!form.code.trim()) return setError('Coupon code is required.');
    if (!form.expiryDate) return setError('Expiry date is required.');
    if (!form.discountValue || Number(form.discountValue) <= 0) return setError('Enter a discount greater than zero.');
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100) return setError('Percentage discount cannot exceed 100.');
    setSaving(true);
    try {
      await onSave({ ...form, expiryDate: new Date(`${form.expiryDate}T23:59:59.999`).toISOString(), discountValue: Number(form.discountValue), minimumPurchase: Number(form.minimumPurchase || 0), usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit) });
    } catch (reason) { setError(reason.message || 'Could not save this coupon.'); }
    finally { setSaving(false); }
  }

  return <form className="coupon-editor" onSubmit={submit} noValidate>
    <h2>{coupon ? 'Edit Coupon' : 'Create New Coupon'}</h2>
    {error && <p className="product-form-error" role="alert">{error}</p>}
    <div className="coupon-fields-grid">
      <Input label="Coupon code" name="coupon-code" value={form.code} onChange={(event) => setField('code', event.target.value.toUpperCase())} placeholder="e.g. SAVE20" maxLength="40" required/>
      <Input label="Expiry date" name="coupon-expiry" type="date" value={form.expiryDate} onChange={(event) => setField('expiryDate', event.target.value)} required/>
      <Select label="Discount type" name="coupon-type" value={form.discountType} onChange={(event) => setField('discountType', event.target.value)}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount (Rs.)</option></Select>
      <Input label="Discount value" name="coupon-value" type="number" min="0.01" max={form.discountType === 'percentage' ? '100' : undefined} step="any" value={form.discountValue} onChange={(event) => setField('discountValue', event.target.value)} placeholder={form.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 200'} required/>
      <Input label="Minimum purchase (optional)" name="coupon-minimum" type="number" min="0" step="any" value={form.minimumPurchase} onChange={(event) => setField('minimumPurchase', event.target.value)} />
      <Input label="Total usage limit (optional)" name="coupon-limit" type="number" min="1" step="1" value={form.usageLimit} onChange={(event) => setField('usageLimit', event.target.value)} placeholder="e.g. 100 uses" />
    </div>
    <fieldset className="coupon-product-fieldset">
      <legend>Applicable products (leave empty for all products)</legend>
      <div className="coupon-product-picker" aria-label="Applicable products">
        {products.map((product) => <button key={product._id} type="button" className={`coupon-product-chip ${form.applicableProductIds.includes(String(product._id)) ? 'is-selected' : ''}`} aria-pressed={form.applicableProductIds.includes(String(product._id))} onClick={() => toggleProduct(String(product._id))}>{product.name} ({product.price == null ? 'Price not set' : `₹${product.price}`})</button>)}
        {!products.length && <span className="field-hint">No products are available.</span>}
      </div>
    </fieldset>
    <label className="coupon-active-toggle"><input type="checkbox" checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)}/> Coupon is active</label>
    <div className="coupon-form-actions"><Button type="submit" loading={saving}>{saving ? 'Saving...' : coupon ? 'Update Coupon' : 'Create Coupon'}</Button>{coupon && <Button variant="secondary" onClick={onCancel}>Cancel Edit</Button>}</div>
  </form>;
}
