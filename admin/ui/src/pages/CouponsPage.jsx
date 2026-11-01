import { useEffect, useState } from 'react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import Toast from '../components/common/Toast.jsx';
import CouponForm from '../components/forms/CouponForm.jsx';
import { createCoupon, deleteCoupon, fetchCoupons, updateCoupon } from '../services/coupons.js';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
}
function discount(coupon) { return coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`; }
function appliedSummary(coupon) {
  if (!coupon.applicableProductIds?.length) return 'All products';
  return coupon.applicableProducts?.map((product) => product.name).join(', ') || `${coupon.applicableProductIds.length} products`;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', tone: 'success' });
  const [reloadKey, setReloadKey] = useState(0);
  const [formReset, setFormReset] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchCoupons(controller.signal).then(({ data }) => setCoupons(data || []))
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message || 'Could not load coupons.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reloadKey]);

  function notify(message, tone = 'success') {
    setToast({ message, tone });
    window.setTimeout(() => setToast({ message: '', tone: 'success' }), 4000);
  }

  async function saveCoupon(payload) {
    if (editing) await updateCoupon(editing._id, payload);
    else await createCoupon(payload);
    setEditing(null); setFormReset((value) => value + 1); setReloadKey((value) => value + 1);
    notify(editing ? 'Coupon updated.' : 'Coupon created.');
  }

  async function confirmDelete() {
    if (!deleting) return;
    try { await deleteCoupon(deleting._id); setReloadKey((value) => value + 1); notify('Coupon deleted.'); }
    catch (reason) { notify(reason.message || 'Could not delete coupon.', 'error'); }
    finally { setDeleting(null); }
  }

  return <div className="coupons-page">
    <p className="categories-subtitle">Manage discounts and offers for your storefront.</p>
    <Card className="coupon-editor-card"><CouponForm key={editing?._id || `new-coupon-${formReset}`} coupon={editing} onSave={saveCoupon} onCancel={() => setEditing(null)}/></Card>
    <section className="coupon-list" aria-label="Coupons">
      {loading ? <div className="coupon-grid">{Array.from({ length: 3 }, (_, index) => <Card key={index}><Skeleton lines={5}/></Card>)}</div>
        : error ? <Card><div className="products-error" role="alert">{error}<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button></div></Card>
          : coupons.length === 0 ? <EmptyState title="No coupons yet" description="Create a coupon to offer a discount on your products."/>
            : <div className="coupon-grid">{coupons.map((coupon) => <article className="coupon-card" key={coupon._id}>
              <div className="coupon-card-heading"><h2>{coupon.code}</h2><span className={`coupon-status ${coupon.isActive ? 'is-active' : 'is-inactive'}`}>{coupon.isActive ? 'Active' : 'Inactive'}</span></div>
              <p><strong>Discount:</strong> {discount(coupon)}</p>
              <p><strong>Valid Until:</strong> {formatDate(coupon.expiryDate)}</p>
              <p><strong>Usage:</strong> {coupon.usedCount || 0} / {coupon.usageLimit ?? 'Unlimited'}</p>
              <p><strong>Min. Purchase:</strong> ₹{coupon.minimumPurchase || 0}</p>
              <div className="coupon-products-summary"><strong>{coupon.applicableProductIds?.length ? `Applicable to (${coupon.applicableProductIds.length} products):` : 'Applicable to:'}</strong><span>{appliedSummary(coupon)}</span></div>
              <div className="coupon-card-actions"><Button variant="secondary" onClick={() => setEditing(coupon)}>Edit</Button><Button variant="danger" onClick={() => setDeleting(coupon)}>Delete</Button></div>
            </article>)}</div>}
    </section>
    <ConfirmDialog open={Boolean(deleting)} title="Delete coupon?" confirmLabel="Delete coupon" onClose={() => setDeleting(null)} onConfirm={confirmDelete}>This coupon will be removed from the admin portal.</ConfirmDialog>
    <div className="toast-region" aria-live="polite"><Toast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })}/></div>
  </div>;
}
