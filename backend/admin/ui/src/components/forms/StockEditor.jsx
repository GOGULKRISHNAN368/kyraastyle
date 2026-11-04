import { useEffect, useState } from 'react';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Modal from '../common/Modal.jsx';
import { updateProduct } from '../../services/products.js';

export default function StockEditor({ product, onClose, onSaved }) {
  const [hasSizes, setHasSizes] = useState(false);
  const [sizes, setSizes] = useState([]);
  const [stock, setStock] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentSizes = product?.sizes?.map((entry) => ({ label: entry.label || entry.size || '', stock: entry.stock ?? entry.quantity ?? 0 })) || [];
    setHasSizes(Boolean(product?.hasSizes ?? currentSizes.length));
    setSizes(currentSizes);
    setStock(product?.stock ?? 0);
    setError('');
  }, [product]);

  function updateSize(index, key, value) {
    setSizes((current) => current.map((entry, row) => row === index ? { ...entry, [key]: value } : entry));
  }

  async function save() {
    if (hasSizes && (!sizes.length || sizes.some((entry) => !entry.label.trim() || !Number.isInteger(Number(entry.stock)) || Number(entry.stock) < 0))) {
      setError('Add a size label and whole stock value of zero or more for each size.');
      return;
    }
    if (!hasSizes && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
      setError('Stock must be a whole number of zero or more.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await updateProduct(product._id, {
        hasSizes,
        sizes: hasSizes ? sizes.map((entry) => ({ label: entry.label.trim(), stock: Number(entry.stock) })) : [],
        stock: hasSizes ? sizes.reduce((sum, entry) => sum + Number(entry.stock), 0) : Number(stock),
      });
      onSaved(result.data);
    } catch (reason) {
      setError(reason.message || 'Could not save product stock.');
    } finally { setSaving(false); }
  }

  return <Modal open={Boolean(product)} onClose={onClose} title={`Sizes and stock · ${product?.name || ''}`} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button className="stock-save-button" onClick={save} loading={saving}>Save stock</Button></>}>
    <label className="product-size-toggle"><input type="checkbox" checked={hasSizes} onChange={(event) => setHasSizes(event.target.checked)} />This product has size options</label>
    {hasSizes ? <div className="stock-editor-grid">{sizes.map((entry, index) => <div className="product-size-row" key={`${entry.label}-${index}`}><Input label="Size label" value={entry.label} onChange={(event) => updateSize(index, 'label', event.target.value)} /><Input label={`Stock for ${entry.label || 'size'}`} type="number" min="0" step="1" value={entry.stock} onChange={(event) => updateSize(index, 'stock', event.target.value)} /></div>)}</div> : <Input label="Stock" type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} />}
    {error && <p className="product-form-error" role="alert">{error}</p>}
  </Modal>;
}
