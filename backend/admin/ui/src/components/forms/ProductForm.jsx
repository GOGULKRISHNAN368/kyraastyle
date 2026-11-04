import { useEffect, useRef, useState } from 'react';
import Button from '../common/Button.jsx';
import Drawer from '../common/Drawer.jsx';
import Input from '../common/Input.jsx';
import Modal from '../common/Modal.jsx';
import Textarea from '../common/Textarea.jsx';
import Switch from '../common/Switch.jsx';
import { createProduct, updateProduct } from '../../services/products.js';
import { fetchMediaLibrary, uploadDressImage } from '../../services/api.js';

const emptyProduct = {
  name: '', category: 'Store', section: '', position: '', price: '', mrp: '', stock: 0,
  hasSizes: false, sizes: [], cloudinaryId: '', width: 800, height: 0, alt: '',
  subtitle: '', description: '', details: { fabric: '', care: '', notes: '' }, occasion: '',
  isNewArrival: false, isBestSeller: false, isCuratedLook: false,
  isEditorsPick: false, isOccasionPick: false, isLuxeCollection: false,
  link: '', isActive: true,
};

function productImages(product) {
  if (Array.isArray(product?.images) && product.images.length) {
    return product.images.map((image, position) => ({
      ...image,
      publicId: image.publicId || image.cloudinaryId,
      position,
      imageUrl: image.imageUrl || '',
    })).filter((image) => image.publicId);
  }
  if (!product?.cloudinaryId) return [];
  return [{
    publicId: product.cloudinaryId, width: product.width || 800, height: product.height || 0,
    alt: product.alt || product.name || '', imageUrl: product.imageUrl || '', position: 0,
  }];
}

function productSizes(product) {
  if (!Array.isArray(product?.sizes)) return [];
  return product.sizes.map((size) => ({
    label: String(size.label || size.size || '').trim(),
    stock: Number(size.stock ?? (size.available ? size.quantity : 0)) || 0,
  })).filter((size) => size.label);
}

export default function ProductForm({ open, product, categories, onClose, onSaved }) {
  const [form, setForm] = useState(emptyProduct);
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [imageDragOver, setImageDragOver] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const filePickerRef = useRef(null);
  const cameraPickerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const initialImages = productImages(product);
    const sizes = productSizes(product);
    setImages(initialImages);
    setForm(product ? {
      ...emptyProduct,
      ...product,
      mrp: product.mrp ?? product.oldPrice ?? '',
      stock: product.stock ?? 0,
      hasSizes: product.hasSizes ?? sizes.length > 0,
      sizes,
      details: { ...emptyProduct.details, ...(product.details || {}) },
      occasion: Array.isArray(product.occasion) ? product.occasion.join(', ') : product.occasion || '',
      position: product.position ?? '',
      isActive: product.isActive ?? true,
    } : { ...emptyProduct });
    setError('');
    setFieldErrors({});
  }, [open, product]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  }

  function setDetail(key, value) {
    setForm((current) => ({ ...current, details: { ...current.details, [key]: value } }));
  }

  function setSize(index, key, value) {
    setForm((current) => ({ ...current, sizes: current.sizes.map((size, row) => row === index ? { ...size, [key]: value } : size) }));
    setFieldErrors((current) => ({ ...current, sizes: '' }));
  }

  function addSize() { setForm((current) => ({ ...current, sizes: [...current.sizes, { label: '', stock: 0 }] })); }
  function removeSize(index) { setForm((current) => ({ ...current, sizes: current.sizes.filter((_, row) => row !== index) })); }

  function addImageFiles(files, primary = false) {
    const valid = files.filter((file) => file.type.startsWith('image/'));
    if (valid.length !== files.length) setError('Choose image files to upload.');
    else setError('');
    if (images.length + valid.length > 20) { setError('A product can have up to 20 images.'); return; }
    const additions = valid.map((file) => ({ file, publicId: '', imageUrl: URL.createObjectURL(file), alt: file.name.replace(/\.[^.]+$/, '') }));
    setImages((current) => primary ? [...additions, ...current] : [...current, ...additions]);
    setFieldErrors((current) => ({ ...current, images: '' }));
  }

  function removeImage(index) {
    setImages((current) => {
      const removed = current[index];
      if (removed?.file) URL.revokeObjectURL(removed.imageUrl);
      return current.filter((_, position) => position !== index);
    });
  }

  function moveImage(index, offset) {
    const target = index + offset;
    if (target < 0 || target >= images.length) return;
    setImages((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function setPrimary(index) {
    setImages((current) => {
      const next = [...current];
      const [primary] = next.splice(index, 1);
      next.unshift(primary);
      return next;
    });
  }

  async function openMediaLibrary() {
    setMediaOpen(true);
    setMediaError('');
    if (mediaItems.length) return;
    setMediaLoading(true);
    try { setMediaItems((await fetchMediaLibrary()).data); }
    catch (reason) { setMediaError(reason.message || 'Unable to load the Media Library.'); }
    finally { setMediaLoading(false); }
  }

  function useMediaImage(item, primary = false) {
    setImages((current) => {
      const existing = current.findIndex((image) => image.publicId === item.publicId);
      const next = [...current];
      if (existing >= 0) {
        const [selected] = next.splice(existing, 1);
        return primary ? [selected, ...next] : [...next, selected];
      }
      const selected = { ...item, file: undefined };
      return primary ? [selected, ...next] : [...next, selected];
    });
    setFieldErrors((current) => ({ ...current, images: '' }));
    setMediaOpen(false);
  }

  async function submit(event) {
    event.preventDefault();
    const errors = {};
    if (!form.name.trim()) errors.name = 'Product name is required.';
    if (!images.length) errors.images = 'Add at least one product image.';
    if (form.price !== '' && (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)) errors.price = 'Price must be zero or greater.';
    if (form.mrp !== '' && (!Number.isFinite(Number(form.mrp)) || Number(form.mrp) < 0)) errors.mrp = 'MRP must be zero or greater.';
    if (form.price !== '' && form.mrp !== '' && Number(form.mrp) < Number(form.price)) errors.mrp = 'MRP must be greater than or equal to price.';
    if (!form.hasSizes && (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0)) errors.stock = 'Stock must be a whole number of zero or more.';
    if (form.hasSizes && (!form.sizes.length || form.sizes.some((size) => !size.label.trim() || !Number.isInteger(Number(size.stock)) || Number(size.stock) < 0))) errors.sizes = 'Add a label and a whole non-negative stock value for each size.';
    if (form.hasSizes && new Set(form.sizes.map((size) => size.label.trim().toLowerCase())).size !== form.sizes.length) errors.sizes = 'Size labels must be unique.';
    if (form.position !== '' && (!Number.isInteger(Number(form.position)) || Number(form.position) < 0)) errors.position = 'Enter zero or a positive whole number.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError('');
    try {
      const finalImages = [];
      for (const [index, item] of images.entries()) {
        const uploaded = item.file ? (await uploadDressImage(item.file)).data : null;
        const publicId = uploaded?.cloudinaryId || item.publicId;
        finalImages.push({
          publicId,
          width: uploaded?.width || item.width || 800,
          height: uploaded?.height || item.height || 0,
          alt: (index === 0 && form.alt) || item.alt || form.name,
          position: finalImages.length,
        });
      }
      const primary = finalImages[0];
      if (!primary?.publicId) throw new Error('Add at least one valid product image.');
      const payload = {
        name: form.name.trim(), category: form.category, section: form.section.trim(),
        position: form.position === '' ? undefined : Number(form.position),
        cloudinaryId: primary.publicId, width: primary.width, height: primary.height, alt: primary.alt,
        images: finalImages,
        price: form.price === '' ? null : Number(form.price), mrp: form.mrp === '' ? null : Number(form.mrp),
        stock: form.hasSizes ? form.sizes.reduce((sum, size) => sum + Number(size.stock), 0) : Number(form.stock),
        hasSizes: Boolean(form.hasSizes),
        sizes: form.hasSizes ? form.sizes.map((size) => ({ label: size.label.trim(), stock: Number(size.stock) })) : [],
        subtitle: form.subtitle.trim(), description: form.description || '', details: form.details,
        occasion: form.occasion.split(',').map((item) => item.trim()).filter(Boolean),
        isNewArrival: Boolean(form.isNewArrival), isBestSeller: Boolean(form.isBestSeller), isCuratedLook: Boolean(form.isCuratedLook),
        isEditorsPick: Boolean(form.isEditorsPick), isOccasionPick: Boolean(form.isOccasionPick), isLuxeCollection: Boolean(form.isLuxeCollection),
        link: form.link || '', isActive: Boolean(form.isActive),
      };
      const result = product ? await updateProduct(product._id, payload) : await createProduct(payload);
      onSaved(result.data, Boolean(product));
    } catch (reason) {
      setError(reason.message || 'Unable to save this product.');
    } finally { setSaving(false); }
  }

  const sizedStock = form.sizes.reduce((sum, size) => sum + (Number(size.stock) || 0), 0);
  return <>
    <Drawer className="product-drawer" open={open} onClose={onClose} title={product ? 'Edit product' : 'Add product'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="product-editor" loading={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Create product'}</Button></>}>
      <form id="product-editor" className="product-form" onSubmit={submit} noValidate>
        {error && <p className="product-form-error" role="alert">{error}</p>}
        <section className="product-fieldset">
          <h3>Product images</h3>
          <p className="field-hint">The first image is the primary image. Use the arrows to reorder images or mark another image as primary.</p>
          <div className="product-image-actions">
            <input ref={filePickerRef} className="dress-file-input" type="file" accept="image/*" multiple onChange={(event) => { addImageFiles([...event.target.files]); event.target.value = ''; }}/>
            <input ref={cameraPickerRef} className="dress-file-input" type="file" accept="image/*" capture="environment" onChange={(event) => { addImageFiles([...event.target.files], true); event.target.value = ''; }}/>
            <Button type="button" variant="secondary" onClick={() => filePickerRef.current?.click()}>Upload images</Button>
            <Button type="button" variant="secondary" onClick={() => cameraPickerRef.current?.click()}>Use camera</Button>
            <Button type="button" variant="secondary" onClick={openMediaLibrary}>Choose from Media Library</Button>
          </div>
          <div className={`product-image-dropzone ${imageDragOver ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setImageDragOver(true); }} onDragLeave={() => setImageDragOver(false)} onDrop={(event) => { event.preventDefault(); setImageDragOver(false); addImageFiles([...event.dataTransfer.files]); }}>
            {images.length ? images.map((image, index) => <div className="product-image-row" key={`${image.publicId || image.imageUrl}-${index}`}>
              <img src={image.imageUrl} alt={image.alt || form.name || 'Product image'} />
              <div className="product-image-row-copy"><strong>{index === 0 ? 'Primary image' : `Image ${index + 1}`}</strong><small>{image.publicId || 'New upload'}</small></div>
              {index > 0 && <Button type="button" variant="secondary" onClick={() => setPrimary(index)}>Set primary</Button>}
              <Button type="button" variant="ghost" disabled={index === 0} aria-label="Move image up" onClick={() => moveImage(index, -1)}>↑</Button>
              <Button type="button" variant="ghost" disabled={index === images.length - 1} aria-label="Move image down" onClick={() => moveImage(index, 1)}>↓</Button>
              <Button type="button" variant="ghost" onClick={() => removeImage(index)}>Remove</Button>
            </div>) : <span>Drop images here, or choose an upload source above.</span>}
          </div>
          {fieldErrors.images && <span className="field-error" role="alert">{fieldErrors.images}</span>}
          <Input label="Primary image alt text" name="alt" value={form.alt} onChange={(event) => setField('alt', event.target.value)}/>
        </section>

        <section className="product-fieldset">
          <h3>Product information</h3>
          <Input label="Product name" name="name" value={form.name} error={fieldErrors.name} onChange={(event) => setField('name', event.target.value)} required />
          <Input label="Subtitle" name="subtitle" value={form.subtitle} onChange={(event) => setField('subtitle', event.target.value)} />
          <div className="field"><span className="field-label">Category</span><div className="category-chips" role="group" aria-label="Product category">{categories.map((category) => <button className={`category-chip ${form.category === category ? 'is-selected' : ''}`} type="button" key={category} aria-pressed={form.category === category} onClick={() => setField('category', category)}>{category}</button>)}</div></div>
          <div className="product-form-grid"><Input label="Price" name="price" type="number" min="0" step="0.01" value={form.price} error={fieldErrors.price} onChange={(event) => setField('price', event.target.value)} /><Input label="MRP" name="mrp" type="number" min="0" step="0.01" value={form.mrp} error={fieldErrors.mrp} onChange={(event) => setField('mrp', event.target.value)} /></div>
          <Textarea label="Description" name="description" rows="4" value={form.description} onChange={(event) => setField('description', event.target.value)} />
          <Input label="Occasions (comma separated)" name="occasion" value={form.occasion} onChange={(event) => setField('occasion', event.target.value)} />
          <div className="product-form-grid"><Input label="Fabric" name="fabric" value={form.details.fabric || ''} onChange={(event) => setDetail('fabric', event.target.value)} /><Input label="Care instructions" name="care" value={form.details.care || ''} onChange={(event) => setDetail('care', event.target.value)} /></div>
          <Textarea label="Additional notes" name="notes" rows="3" value={form.details.notes || ''} onChange={(event) => setDetail('notes', event.target.value)} />
          <div className="homepage-placement"><h3>Storefront flags</h3><div className="dress-flags">
            {[
              ['isNewArrival', 'New arrival'], ['isBestSeller', 'Best seller'], ['isCuratedLook', 'Curated look'],
              ['isEditorsPick', "Editor's pick"], ['isOccasionPick', 'Occasion pick'], ['isLuxeCollection', 'Luxe collection'],
            ].map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setField(key, event.target.checked)}/><span><strong>{label}</strong></span></label>)}
          </div></div>
          <div className="product-form-grid"><Input label="Section" name="section" value={form.section} onChange={(event) => setField('section', event.target.value)} /><Input label="Position" name="position" type="number" min="0" step="1" value={form.position} error={fieldErrors.position} onChange={(event) => setField('position', event.target.value)} /></div>
          <Input label="Product link" name="link" value={form.link} onChange={(event) => setField('link', event.target.value)} />
          <Switch label="Active on website" checked={form.isActive} onChange={(active) => setField('isActive', active)} />
        </section>

        <section className="product-fieldset">
          <h3>Sizes and stock</h3>
          <label className="product-size-toggle"><input type="checkbox" checked={form.hasSizes} onChange={(event) => setField('hasSizes', event.target.checked)} />This product has size options</label>
          {form.hasSizes ? <>
            {form.sizes.map((size, index) => <div className="product-size-row" key={`${index}-${size.label}`}>
              <Input label="Size label" name={`size-label-${index}`} value={size.label} onChange={(event) => setSize(index, 'label', event.target.value)} />
              <Input label="Stock" name={`size-stock-${index}`} type="number" min="0" step="1" value={size.stock} onChange={(event) => setSize(index, 'stock', event.target.value)} />
              <Button type="button" variant="ghost" aria-label="Remove size" onClick={() => removeSize(index)}>Remove</Button>
            </div>)}
            <Button type="button" variant="secondary" onClick={addSize}>Add size</Button>
            <p className="field-hint">Total stock: {sizedStock}</p>
          </> : <Input label="Stock" name="stock" type="number" min="0" step="1" value={form.stock} error={fieldErrors.stock} onChange={(event) => setField('stock', event.target.value)} />}
          {fieldErrors.sizes && <span className="field-error" role="alert">{fieldErrors.sizes}</span>}
        </section>
      </form>
    </Drawer>
    <Modal open={mediaOpen} onClose={() => setMediaOpen(false)} title="Choose from Media Library">
      {mediaLoading ? <p>Loading images…</p> : mediaError ? <p className="product-form-error" role="alert">{mediaError}</p> : mediaItems.length ? <div className="product-media-library-grid">{mediaItems.map((item) => <article key={item.publicId} className="product-media-library-item"><img src={item.imageUrl} alt={item.alt || item.publicId}/><small>{item.publicId}</small><div><Button type="button" variant="secondary" onClick={() => useMediaImage(item, true)}>Set primary</Button><Button type="button" onClick={() => useMediaImage(item)}>Add image</Button></div></article>)}</div> : <p>No images are available in the Media Library yet.</p>}
    </Modal>
  </>;
}
