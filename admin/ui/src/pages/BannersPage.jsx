import { useEffect, useState } from 'react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Input from '../components/common/Input.jsx';
import Toast from '../components/common/Toast.jsx';
import { uploadBannerImage } from '../services/api.js';
import { createBanner, deleteBanner, fetchBanners } from '../services/banners.js';

const desktopGuide = 'Desktop: 1920 × 678 px recommended (wide 2.4:1–3.3:1).';
const mobileGuide = 'Mobile: 1080 × 1080 px recommended (square 0.8:1–1.2:1).';

export default function BannersPage() {
  const [banners, setBanners] = useState([]); const [desktop, setDesktop] = useState(null); const [mobile, setMobile] = useState(null);
  const [title, setTitle] = useState(''); const [link, setLink] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [removing, setRemoving] = useState(null); const [toast, setToast] = useState({ message: '', tone: 'success' });
  const reload = () => fetchBanners().then(({ data }) => setBanners(data || [])).catch((reason) => setError(reason.message || 'Could not load banners.'));
  useEffect(() => { reload(); }, []);
  const notify = (message, tone = 'success') => { setToast({ message, tone }); window.setTimeout(() => setToast({ message: '', tone: 'success' }), 4000); };
  async function save(event) {
    event.preventDefault(); setError('');
    if (!desktop || !mobile) { setError('Upload both the desktop and mobile banner images.'); return; }
    setSaving(true);
    try {
      const [desktopUpload, mobileUpload] = await Promise.all([uploadBannerImage(desktop), uploadBannerImage(mobile)]);
      await createBanner({ title, link, desktopCloudinaryId: desktopUpload.data.cloudinaryId, desktopWidth: desktopUpload.data.width, desktopHeight: desktopUpload.data.height, mobileCloudinaryId: mobileUpload.data.cloudinaryId, mobileWidth: mobileUpload.data.width, mobileHeight: mobileUpload.data.height });
      setDesktop(null); setMobile(null); setTitle(''); setLink(''); await reload(); notify('Homepage banner published.');
    } catch (reason) { setError(reason.message || 'Could not publish the banner.'); } finally { setSaving(false); }
  }
  async function remove() { if (!removing) return; try { await deleteBanner(removing._id); await reload(); notify('Banner removed.'); } catch (reason) { notify(reason.message || 'Could not remove banner.', 'error'); } finally { setRemoving(null); } }
  return <div className="banners-page"><p className="categories-subtitle">Homepage hero banners use separate Cloudinary assets for desktop and mobile screens.</p><Card className="banner-editor-card"><form className="banner-editor" onSubmit={save}><h2>Add homepage banner</h2>{error && <p className="product-form-error" role="alert">{error}</p>}<div className="banner-upload-grid"><label className="banner-file-picker"><strong>Desktop banner</strong><small>{desktop ? desktop.name : desktopGuide}</small><input type="file" accept="image/*" onChange={(event) => setDesktop(event.target.files?.[0] || null)}/></label><label className="banner-file-picker"><strong>Mobile banner</strong><small>{mobile ? mobile.name : mobileGuide}</small><input type="file" accept="image/*" onChange={(event) => setMobile(event.target.files?.[0] || null)}/></label></div><div className="coupon-fields-grid"><Input label="Banner title" value={title} onChange={(event) => setTitle(event.target.value)} hint="Used as accessible image text."/><Input label="Banner link" value={link} onChange={(event) => setLink(event.target.value)} hint="Optional storefront URL."/></div><Button type="submit" loading={saving}>{saving ? 'Uploading banner…' : 'Publish banner'}</Button></form></Card><section className="banner-list">{banners.length ? banners.map((banner) => <Card className="banner-card" key={banner._id}><picture><source media="(max-width: 700px)" srcSet={banner.mobileImageUrl}/><img src={banner.desktopImageUrl} alt={banner.title || 'Kryaa Style homepage banner'}/></picture><div><strong>{banner.title || 'Homepage banner'}</strong><small>Desktop {banner.desktopWidth} × {banner.desktopHeight} · Mobile {banner.mobileWidth} × {banner.mobileHeight}</small><Button variant="danger" size="sm" onClick={() => setRemoving(banner)}>Remove</Button></div></Card>) : <EmptyState title="No homepage banners yet" description="Upload a matched desktop and mobile banner pair."/>}</section><ConfirmDialog open={Boolean(removing)} title="Remove banner?" confirmLabel="Remove banner" onClose={() => setRemoving(null)} onConfirm={remove}>The banner will no longer appear on the homepage. Its Cloudinary assets will stay in your account.</ConfirmDialog><div className="toast-region" aria-live="polite"><Toast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })}/></div></div>;
}
