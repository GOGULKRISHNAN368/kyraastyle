import { useEffect, useRef, useState } from 'react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import Toast from '../components/common/Toast.jsx';
import { deleteInstagramPost, fetchInstagramPosts, uploadInstagramPost } from '../services/instagramPosts.js';

const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export default function InstagramPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [toast, setToast] = useState({ message: '', tone: 'success' });
  const inputRef = useRef(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchInstagramPosts(controller.signal).then(({ data }) => setPosts(data || []))
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message || 'Could not load Instagram posts.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  function notify(message, tone = 'success') {
    setToast({ message, tone });
    window.setTimeout(() => setToast({ message: '', tone: 'success' }), 4000);
  }

  async function uploadSelectedImage(file) {
    if (!file) return;
    setUploadError(''); setUploading(true);
    try {
      const { data } = await uploadInstagramPost(file);
      setPosts((current) => [data, ...current]);
      setPreview(''); setSelectedFile(null);
      notify('Instagram post added.');
    } catch (reason) { setUploadError(reason.message || 'Could not add this Instagram post.'); }
    finally { setUploading(false); }
  }

  function chooseImage(file) {
    if (!file) return;
    if (!supportedTypes.has(file.type)) { setUploadError('Choose a JPEG, PNG, WebP, or AVIF image.'); return; }
    setSelectedFile(file); setPreview(URL.createObjectURL(file));
    void uploadSelectedImage(file);
  }

  function clearPendingImage() {
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(''); setSelectedFile(null); setUploadError('');
  }

  async function confirmRemove() {
    if (!removing) return;
    try { await deleteInstagramPost(removing.id); setPosts((current) => current.filter((post) => post.id !== removing.id)); notify('Instagram post removed.'); }
    catch (reason) { notify(reason.message || 'Could not remove this post.', 'error'); }
    finally { setRemoving(null); }
  }

  return <div className="instagram-page">
    <p className="categories-subtitle">Manage Instagram posts for your storefront.</p>
    {uploadError && <p className="product-form-error" role="alert">{uploadError}</p>}
    <section className="instagram-grid" aria-label="Instagram posts">
      <div className="instagram-upload-wrap">
        <label className={`instagram-upload-tile ${uploading ? 'is-uploading' : ''}`} htmlFor="instagram-post-image" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click(); } }}>
          <input ref={inputRef} id="instagram-post-image" className="dress-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={(event) => { chooseImage(event.target.files?.[0]); event.target.value = ''; }}/>
          {preview ? <img src={preview} alt="Instagram post upload preview"/> : <><span aria-hidden="true">📸</span><strong>Upload Instagram Post</strong><small>(Ideal: 1080x1080 Square)</small></>}
          {preview && uploading && <span className="instagram-upload-status">Uploading…</span>}
        </label>
        {preview && !uploading && <div className="instagram-pending-actions"><Button variant="secondary" onClick={() => { void uploadSelectedImage(selectedFile); }}>Retry upload</Button><Button variant="ghost" onClick={clearPendingImage}>Remove image</Button></div>}
      </div>
      {loading ? Array.from({ length: 3 }, (_, index) => <Card className="instagram-post-card" key={`loading-${index}`}><Skeleton lines={3}/></Card>)
        : error ? <Card className="instagram-error-card"><div className="products-error" role="alert">{error}<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button></div></Card>
          : posts.length === 0 && !preview ? <div className="instagram-empty"><EmptyState title="No Instagram posts yet" description="Choose an image from your device to add your first post."/></div>
            : posts.map((post) => <article className="instagram-post-card" key={post.id}>
              <img src={post.imageUrl} alt={post.originalName || 'Instagram post'} loading="lazy"/>
              <div className="instagram-post-actions"><Button variant="danger" onClick={() => setRemoving(post)}>Remove</Button></div>
            </article>)}
    </section>
    <ConfirmDialog open={Boolean(removing)} title="Remove Instagram post?" confirmLabel="Remove post" onClose={() => setRemoving(null)} onConfirm={confirmRemove}>The saved image will be deleted from the admin server.</ConfirmDialog>
    <div className="toast-region" aria-live="polite"><Toast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })}/></div>
  </div>;
}
