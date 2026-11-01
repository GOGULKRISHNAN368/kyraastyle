import { useEffect, useState } from 'react';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Modal from '../common/Modal.jsx';
import { updateProduct } from '../../services/products.js';

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const emptySizes = () => SIZE_OPTIONS.map((size) => ({ size, available: false, quantity: 0 }));

export default function StockEditor({ product, onClose, onSaved }) {
  const [sizes, setSizes] = useState(emptySizes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSizes(product?.sizes?.length ? product.sizes.map((entry) => ({ ...entry })) : emptySizes());
    setError('');
  }, [product]);

  function updateSize(size, updates) {
    setSizes((current) => current.map((entry) => entry.size === size ? { ...entry, ...updates } : entry));
  }

  async function save() {
    if (sizes.some((entry) => !Number.isInteger(Number(entry.quantity)) || Number(entry.quantity) < 0)) {
      setError('Enter a whole stock quantity of zero or more.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await updateProduct(product._id, {
        sizes: sizes.map((entry) => ({ ...entry, quantity: Number(entry.quantity) })),
      });
      onSaved(result.data);
    } catch (reason) {
      setError(reason.message || 'Could not save dress stock.');
    } finally {
      setSaving(false);
    }
  }

  return <Modal open={Boolean(product)} onClose={onClose} title={`Sizes and stock · ${product?.name || ''}`} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button className="stock-save-button" onClick={save} loading={saving}>Save stock</Button></>}>
    <div className="stock-editor-grid">{sizes.map((entry) => <div className={`dress-size-field ${entry.available ? 'is-available' : ''}`} key={entry.size}><label><input type="checkbox" checked={entry.available} onChange={(event) => updateSize(entry.size, { available: event.target.checked })}/><span>{entry.size}</span></label>{entry.available && <Input label={`Stock for ${entry.size}`} type="number" min="0" step="1" value={entry.quantity} onChange={(event) => updateSize(entry.size, { quantity: event.target.value })}/>}</div>)}</div>
    {error && <p className="product-form-error" role="alert">{error}</p>}
  </Modal>;
}
