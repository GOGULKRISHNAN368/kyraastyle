import { useEffect, useMemo, useState } from 'react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Select from '../components/common/Select.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import Toast from '../components/common/Toast.jsx';
import { fetchProductCategories, fetchProducts } from '../services/products.js';
import { createReel, deleteReel, fetchReels } from '../services/reels.js';
import { uploadReelAsset } from '../services/api.js';

const allowedVideoTypes = new Set(['video/mp4', 'video/quicktime', 'video/mov']);
const maxVideoBytes = 10 * 1024 * 1024;

export default function ReelsPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [reels, setReels] = useState([]);
  const [category, setCategory] = useState('');
  const [productId, setProductId] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [uploadedAsset, setUploadedAsset] = useState(null);
  const [mediaType, setMediaType] = useState('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');
  const [removing, setRemoving] = useState(null);
  const [toast, setToast] = useState({ message: '', tone: 'success' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchProductCategories(), fetchProducts({ active: 'true', limit: 200, sort: 'name', direction: 'asc' }, controller.signal)])
      .then(([categoryResult, productResult]) => { setCategories(categoryResult.data || []); setProducts(productResult.data || []); })
      .catch((reason) => { if (reason.name !== 'AbortError') setPageError(reason.message || 'Could not load categories and dresses.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setPageError('');
    fetchReels(controller.signal).then(({ data }) => setReels(data || []))
      .catch((reason) => { if (reason.name !== 'AbortError') setPageError(reason.message || 'Could not load reels.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const categoryProducts = useMemo(() => products.filter((product) => product.category === category), [products, category]);

  function notify(message, tone = 'success') {
    setToast({ message, tone });
    window.setTimeout(() => setToast({ message: '', tone: 'success' }), 4000);
  }

  function chooseMedia(file) {
    if (!file) return;
    const type = file.type.startsWith('image/') ? 'image' : allowedVideoTypes.has(file.type) ? 'video' : '';
    if (!type) { setError('Choose an image, MP4, or MOV file.'); return; }
    if (type === 'video' && file.size > maxVideoBytes) { setError('Reels must be 10 MB or smaller.'); return; }
    setError(''); setMediaFile(file); setUploadedAsset(null); setMediaType(type);
    setPreview(URL.createObjectURL(file));
  }

  async function publish(event) {
    event.preventDefault(); setError('');
    if (!category) { setError('Choose a category.'); return; }
    if (!mediaFile && !uploadedAsset) { setError('Choose an image or video to upload.'); return; }
    setSaving(true);
    try {
      const uploaded = uploadedAsset || (await uploadReelAsset(mediaFile)).data;
      setUploadedAsset(uploaded);
      await createReel({ category, productId: productId || null, mediaType: uploaded.mediaType, assetPublicId: uploaded.assetPublicId, duration: uploaded.duration });
      setCategory(''); setProductId(''); setMediaFile(null); setUploadedAsset(null); setMediaType(''); setPreview('');
      setReloadKey((value) => value + 1);
      notify('Reel published.');
    } catch (reason) { setError(reason.message || 'Could not publish this reel.'); }
    finally { setSaving(false); }
  }

  async function confirmRemove() {
    if (!removing) return;
    try { await deleteReel(removing._id); setReloadKey((value) => value + 1); notify('Reel removed.'); }
    catch (reason) { notify(reason.message || 'Could not remove reel.', 'error'); }
    finally { setRemoving(null); }
  }

  return <div className="reels-page">
    <p className="categories-subtitle">Manage short videos for your storefront.</p>
    <Card className="reel-editor-card">
      <form className="reel-editor" onSubmit={publish} noValidate>
        <h2>Upload New Reel</h2>
        {error && <p className="product-form-error" role="alert">{error}</p>}
        <div className="reel-form-grid">
          <div className="reel-video-picker">
            <input className="dress-file-input" id="reel-video-file" type="file" accept="image/*,video/mp4,video/quicktime,video/mov" onChange={(event) => { chooseMedia(event.target.files?.[0]); event.target.value = ''; }}/>
            <label className={`reel-video-drop ${preview ? 'has-preview' : ''}`} htmlFor="reel-video-file">
              {preview ? (mediaType === 'image' ? <img src={preview} alt="Reel image preview"/> : <video src={preview} controls muted playsInline preload="metadata"/>) : <><span aria-hidden="true">🎥</span><strong>Upload Image or Video</strong><small>Images or MP4/MOV · Video max 10MB</small></>}
            </label>
            {mediaFile && <span className="reel-video-name" title={mediaFile.name}>{mediaFile.name}</span>}
          </div>
          <div className="reel-fields">
            <Select label="Select category" name="reel-category" value={category} onChange={(event) => { setCategory(event.target.value); setProductId(''); }}>
              <option value="">Choose category</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
            <Select label="Link dress" name="reel-product" value={productId} disabled={!category} onChange={(event) => setProductId(event.target.value)}>
              <option value="">{category ? 'Choose a dress (optional)' : 'Choose category first'}</option>{categoryProducts.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}
            </Select>
            <Button type="submit" loading={saving}>{saving ? (uploadedAsset ? 'Publishing...' : 'Uploading...') : 'Publish Reel'}</Button>
          </div>
        </div>
      </form>
    </Card>

    <section className="reel-list" aria-label="Published reels">
      {pageError ? <Card><div className="products-error" role="alert">{pageError}<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button></div></Card>
        : loading ? <div className="reel-grid">{Array.from({ length: 3 }, (_, index) => <Card key={index}><Skeleton lines={4}/></Card>)}</div>
          : reels.length === 0 ? <EmptyState title="No reels yet" description="Upload a video to feature a dress in your storefront reels."/>
            : <div className="reel-grid">{reels.map((reel) => <article className="reel-card" key={reel._id}>
              <div className="reel-card-video">{reel.mediaType === 'image' ? <img src={reel.mediaUrl} alt={reel.productName || 'Kryaa Style reel'}/> : <video src={reel.mediaUrl} poster={reel.thumbnailUrl} controls playsInline preload="metadata"/>}</div>
              <div className="reel-card-content"><h2>{reel.productName || 'Unknown Dress'}</h2><p>Category: {reel.category}</p></div>
              <div className="reel-card-actions"><Button variant="danger" onClick={() => setRemoving(reel)}>Remove</Button></div>
            </article>)}</div>}
    </section>
    <ConfirmDialog open={Boolean(removing)} title="Remove reel?" confirmLabel="Remove reel" onClose={() => setRemoving(null)} onConfirm={confirmRemove}>This reel will be removed from the admin portal. The video asset will remain in Cloudinary.</ConfirmDialog>
    <div className="toast-region" aria-live="polite"><Toast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })}/></div>
  </div>;
}
