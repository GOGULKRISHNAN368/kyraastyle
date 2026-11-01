import { useEffect, useRef, useState } from 'react';
import Button from '../common/Button.jsx';
import Drawer from '../common/Drawer.jsx';
import Input from '../common/Input.jsx';
import Icon from '../common/Icon.jsx';
import Textarea from '../common/Textarea.jsx';
import Switch from '../common/Switch.jsx';
import { createProduct, fetchProductPreview, updateProduct } from '../../services/products.js';
import { uploadDressImage } from '../../services/api.js';

const dressSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const blankSizes = () => dressSizes.map((size) => ({ size, available: false, quantity: 0 }));
const emptyProduct = {
  name: '', category: '', section: '', position: '', cloudinaryId: '', width: 800,
  height: '', alt: '', price: 1299, oldPrice: 1499, sizes: blankSizes(),
  isNewArrival: false, isBestSeller: false, isCuratedLook: false,
  description: '', link: '', isActive: true,
};

export default function ProductForm({ open, product, categories, onClose, onSaved }) {
  const [form, setForm] = useState(emptyProduct);
  const [preview, setPreview] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [gallery, setGallery] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imageDragOver, setImageDragOver] = useState(false);
  const imageFilesRef = useRef([]);
  const mainPickerRef = useRef(null);
  const cameraPickerRef = useRef(null);
  const looksPickerRef = useRef(null);
  const imageStripRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    imageFilesRef.current.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
    imageFilesRef.current = [];
    setImageFiles([]);
    setGallery(product?.images || []);
    setForm(product ? {
      ...emptyProduct,
      ...product,
      width: Number(product.width) > 0 ? Number(product.width) : 800,
      position: product.position ?? '',
      price: product.price ?? '',
      oldPrice: product.oldPrice ?? '',
      sizes: product.sizes?.length ? product.sizes : blankSizes(),
      isNewArrival: Boolean(product.isNewArrival),
      isBestSeller: Boolean(product.isBestSeller),
      isCuratedLook: Boolean(product.isCuratedLook),
      height: product.height || '',
      isActive: product.isActive ?? true,
    } : { ...emptyProduct, sizes: blankSizes() });
    setError('');
    setFieldErrors({});
    setPreview(product?.imageUrl || '');
  }, [open, product]);

  useEffect(() => () => imageFilesRef.current.forEach((entry) => URL.revokeObjectURL(entry.previewUrl)), []);

  useEffect(() => {
    if (!open || !form.cloudinaryId.trim()) { setPreview(''); setPreviewError(''); return undefined; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchProductPreview(form.cloudinaryId.trim(), form.width)
        .then(({ data }) => { if (!cancelled) { setPreview(data.imageUrl); setPreviewError(''); } })
        .catch(() => { if (!cancelled) { setPreview(''); setPreviewError('Image preview is unavailable. Check the Cloudinary Public ID.'); } });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [open, form.cloudinaryId, form.width]);

  function setField(key, value) { setForm((current) => ({ ...current, [key]: value })); setFieldErrors((current) => ({ ...current, [key]: '' })); }

  function setSize(size, updates) {
    setForm((current) => ({ ...current, sizes: current.sizes.map((item) => item.size === size ? { ...item, ...updates } : item) }));
  }

  function addImageFiles(files) {
    const valid = files.filter((file) => file.type.startsWith('image/'));
    if (valid.length !== files.length) setError('Choose image files to upload.');
    else setError('');
    if (gallery.length + imageFiles.length + valid.length > 20) {
      setError('A dress can have up to 20 gallery images.');
      return;
    }
    const next = [...imageFiles, ...valid.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))];
    imageFilesRef.current = next;
    setImageFiles(next);
    setFieldErrors((current) => ({ ...current, cloudinaryId: '' }));
  }

  function removeImageFile(previewUrl) {
    const removed = imageFiles.find((entry) => entry.previewUrl === previewUrl);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    const next = imageFiles.filter((entry) => entry.previewUrl !== previewUrl);
    imageFilesRef.current = next;
    setImageFiles(next);
  }

  function handleImageInput(event) {
    addImageFiles([...event.target.files]);
    event.target.value = '';
  }

  function scrollImages(direction) {
    imageStripRef.current?.scrollBy({ left: direction * 180, behavior: 'smooth' });
  }

  function removeGalleryImage(index) {
    setGallery((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function submit(event) {
    event.preventDefault();
    const errors = {};
    if (!form.name.trim()) errors.name = 'Product name is required.';
    if (!form.category) errors.category = 'Choose a category.';
    if (!form.cloudinaryId.trim() && imageFiles.length === 0) errors.cloudinaryId = 'Add an image or enter a Cloudinary Public ID.';
    if (form.position !== '' && (!Number.isInteger(Number(form.position)) || Number(form.position) < 0)) errors.position = 'Enter zero or a positive whole number.';
    if (form.price !== '' && (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)) errors.price = 'Price must be zero or greater.';
    if (form.oldPrice !== '' && (!Number.isFinite(Number(form.oldPrice)) || Number(form.oldPrice) < 0)) errors.oldPrice = 'Old price must be zero or greater.';
    if (form.sizes.some((item) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 0)) errors.sizes = 'Stock quantities must be whole numbers of zero or more.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    const payload = {
      name: form.name.trim(),
      category: form.category,
      section: form.section.trim(),
      cloudinaryId: form.cloudinaryId.trim(),
      width: Number(form.width),
      height: form.height === '' ? undefined : Number(form.height),
      alt: form.alt || '',
      price: form.price === '' ? null : Number(form.price),
      oldPrice: form.oldPrice === '' ? null : Number(form.oldPrice),
      sizes: form.sizes.map((item) => ({ ...item, quantity: Number(item.quantity) })),
      images: [],
      isNewArrival: Boolean(form.isNewArrival),
      isBestSeller: Boolean(form.isBestSeller),
      isCuratedLook: Boolean(form.isCuratedLook),
      description: form.description || '',
      link: form.link || '',
      isActive: Boolean(form.isActive),
    };
    if (form.position !== '') payload.position = Number(form.position); else delete payload.position;
    if (form.height === '') delete payload.height;

    setSaving(true); setError('');
    try {
      const uploadedImages = [];
      for (const entry of imageFiles) uploadedImages.push((await uploadDressImage(entry.file)).data);
      const primaryImage = payload.cloudinaryId ? null : uploadedImages.shift();
      if (!payload.cloudinaryId && !primaryImage) throw new Error('Add a primary image before saving this dress.');
      if (primaryImage) {
        payload.cloudinaryId = primaryImage.cloudinaryId;
        payload.width = primaryImage.width;
        payload.height = primaryImage.height;
      }
      payload.images = [
        ...gallery.map(({ cloudinaryId, width, height }) => ({ cloudinaryId, width, height })),
        ...uploadedImages.map(({ cloudinaryId, width, height }) => ({ cloudinaryId, width, height })),
      ];
      const result = product ? await updateProduct(product._id, payload) : await createProduct(payload);
      onSaved(result.data, Boolean(product));
    } catch (reason) {
      setError(reason.message || 'Unable to save this product.');
    } finally { setSaving(false); }
  }

  const previewImage = !form.cloudinaryId.trim() && imageFiles[0]?.previewUrl ? imageFiles[0].previewUrl : preview;
  const imageItems = [
    ...(form.cloudinaryId.trim() && preview ? [{ key: 'primary', imageUrl: preview, primary: true }] : []),
    ...gallery.map((image, itemIndex) => ({ ...image, key: `gallery-${itemIndex}`, primary: false, galleryIndex: itemIndex })),
    ...imageFiles.map((entry, itemIndex) => ({ key: entry.previewUrl, imageUrl: entry.previewUrl, primary: !form.cloudinaryId.trim() && itemIndex === 0, filePreview: entry.previewUrl })),
  ];

  return <Drawer className="product-drawer" open={open} onClose={onClose} title={product ? 'Edit dress' : 'Add dress to collection'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="product-editor" loading={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Publish dress'}</Button></>}>
    <form id="product-editor" className="product-form" onSubmit={submit} noValidate>
      {error && <p className="product-form-error" role="alert">{error}</p>}
      <div className="product-editor-media">
        <div className="dress-image-manager">
          <input ref={mainPickerRef} className="dress-file-input" type="file" accept="image/*" onChange={handleImageInput}/>
          <input ref={cameraPickerRef} className="dress-file-input" type="file" accept="image/*" capture="environment" onChange={handleImageInput}/>
          <input ref={looksPickerRef} className="dress-file-input" type="file" accept="image/*" multiple onChange={handleImageInput}/>
          <button type="button" className={`dress-main-image ${previewImage ? 'has-image' : ''} ${imageDragOver ? 'is-dragging' : ''}`} onClick={() => mainPickerRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setImageDragOver(true); }} onDragLeave={() => setImageDragOver(false)} onDrop={(event) => { event.preventDefault(); setImageDragOver(false); addImageFiles([...event.dataTransfer.files]); }} aria-label="Choose or drop main portrait image">{previewImage ? <img src={previewImage} alt={form.alt || form.name || 'Main portrait image'}/> : <><span className="dress-camera-mark" aria-hidden="true">&#128247;</span><strong>Main Portrait Image</strong><small>(Ideal: 1200x1600)</small></>}</button>
          <div className="dress-image-upload-row">
            <div className="dress-image-strip" ref={imageStripRef} aria-label="Dress image thumbnails">
              {imageItems.map((item) => <div className="dress-image-slot" key={item.key}><img src={item.imageUrl} alt={item.primary ? 'Main dress image' : 'Dress look'}/>{(!item.primary || item.filePreview) && <button type="button" aria-label="Remove image" onClick={() => item.filePreview ? removeImageFile(item.filePreview) : removeGalleryImage(item.galleryIndex)}>Remove</button>}</div>)}
              {Array.from({ length: Math.max(0, 4 - imageItems.length) }, (_, index) => <button className="dress-image-add-slot" type="button" key={`empty-${index}`} aria-label="Add a dress image or use camera" onClick={() => cameraPickerRef.current?.click()}>+</button>)}
            </div>
            <button className="dress-upload-looks" type="button" onClick={() => looksPickerRef.current?.click()}>Upload Looks</button>
          </div>
          <div className="dress-image-slider-controls"><button type="button" aria-label="Scroll images left" onClick={() => scrollImages(-1)}><Icon name="chevron" size={24}/></button><div className="dress-image-slider-track" aria-hidden="true"><span/></div><button type="button" aria-label="Scroll images right" onClick={() => scrollImages(1)}><Icon name="chevron" size={24}/></button></div>
        </div>
        <Input label="Cloudinary Public ID" name="cloudinaryId" value={form.cloudinaryId} error={fieldErrors.cloudinaryId} onChange={(event) => setField('cloudinaryId', event.target.value)} required/>
        <Input label="Image alt text" name="alt" value={form.alt} onChange={(event) => setField('alt', event.target.value)}/>
      </div>
      <div className="product-editor-fields">
        <Input label="Dress name" name="name" value={form.name} error={fieldErrors.name} onChange={(event) => setField('name', event.target.value)} required/>
        <div className="product-form-grid"><Input label="Price (Rs.)" name="price" type="number" min="0" step="0.01" value={form.price} error={fieldErrors.price} onChange={(event) => setField('price', event.target.value)}/><Input label="Old price (Rs.)" name="oldPrice" type="number" min="0" step="0.01" value={form.oldPrice} error={fieldErrors.oldPrice} onChange={(event) => setField('oldPrice', event.target.value)}/></div>
        <div className="field"><span className="field-label">Categories</span><div className="category-chips" role="group" aria-label="Dress category">{categories.map((category) => <button className={`category-chip ${form.category === category ? 'is-selected' : ''}`} type="button" key={category} aria-pressed={form.category === category} onClick={() => setField('category', category)}>{category}</button>)}</div>{fieldErrors.category && <span className="field-error" role="alert">{fieldErrors.category}</span>}</div>
        <Input label="Section" name="section" value={form.section} onChange={(event) => setField('section', event.target.value)} hint="Ordering is saved within a section."/>
        <Input label="Position" name="position" type="number" min="0" step="1" value={form.position} error={fieldErrors.position} onChange={(event) => setField('position', event.target.value)}/>
        <section className="dress-stock" aria-labelledby="dress-stock-title"><h3 id="dress-stock-title">Sizes &amp; stock quantity</h3><div className="dress-size-grid">{form.sizes.map((item) => <div className={`dress-size-field ${item.available ? 'is-available' : ''}`} key={item.size}><label><input type="checkbox" checked={item.available} onChange={(event) => setSize(item.size, { available: event.target.checked })}/><span>{item.size}</span></label>{item.available && <Input label={`Stock for ${item.size}`} type="number" min="0" step="1" value={item.quantity} onChange={(event) => setSize(item.size, { quantity: event.target.value })}/>}</div>)}</div>{fieldErrors.sizes && <span className="field-error" role="alert">{fieldErrors.sizes}</span>}</section>
        <Textarea label="Product details" name="description" rows="4" value={form.description} onChange={(event) => setField('description', event.target.value)}/>
        <Input label="Product link" name="link" value={form.link} onChange={(event) => setField('link', event.target.value)} hint="Optional relative or public website URL."/>
        <div className="dress-flags" aria-label="Dress badges"><label><input type="checkbox" checked={form.isNewArrival} onChange={(event) => setField('isNewArrival', event.target.checked)}/>New arrival</label><label><input type="checkbox" checked={form.isBestSeller} onChange={(event) => setField('isBestSeller', event.target.checked)}/>Best seller</label><label><input type="checkbox" checked={form.isCuratedLook} onChange={(event) => setField('isCuratedLook', event.target.checked)}/>Curated look</label></div>
        <Switch label="Active on website" checked={form.isActive} onChange={(active) => setField('isActive', active)}/>
      </div>
    </form>
  </Drawer>;
}
