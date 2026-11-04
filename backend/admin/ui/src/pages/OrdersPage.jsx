import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Toast from '../components/common/Toast.jsx';
import { fetchOrder, fetchOrders, updateAdminNote, updateCourier, updateOrderStatus, updatePayment } from '../services/orders.js';
import { useAuth } from '../context/AuthContext.jsx';

const statuses = ['placed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const labels = { placed: 'Pending', packed: 'Packed', shipped: 'Shipped', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
const paymentStatuses = ['pending', 'awaiting_payment', 'verification_pending', 'paid', 'failed'];
const paymentLabels = { pending: 'Pending', awaiting_payment: 'Awaiting payment', verification_pending: 'Verification pending', paid: 'Paid', failed: 'Failed' };
const steps = statuses.slice(0, 5);
const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const dateTime = (value) => value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
const money = (value) => `₹${inr.format(Number(value) || 0)}`;
const imageOf = (item) => item?.imageUrl || (item?.image ? `https://res.cloudinary.com/l8xwk9bz/image/upload/f_auto,q_auto:best,c_limit,w_320/${String(item.image).split('/').map(encodeURIComponent).join('/')}` : '');
const statusClass = (value) => `admin-order-status status-${String(value || 'placed').replace(/_/g, '-')}`;
const paymentClass = (value) => `admin-payment-status payment-${String(value || 'pending').replace(/_/g, '-')}`;

function StatusBadge({ status }) { return <span className={statusClass(status)}>{labels[status] || status || 'Pending'}</span>; }
function PaymentBadge({ status }) { return <span className={paymentClass(status)}>{paymentLabels[status] || status || 'Pending'}</span>; }

function OrderList({ notify, onPlacedCount }) {
  const [result, setResult] = useState({ orders: [], total: 0, counts: {}, placedCount: 0, page: 1, pageCount: 1 });
  const [filters, setFilters] = useState({ status: '', paymentStatus: '', from: '', to: '', q: '', page: 1, limit: 20 });
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const navigate = useNavigate();
  const { authDisabled } = useAuth();
  const load = useCallback(async (signal, silent = false) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const response = await fetchOrders(filters, signal); const data = response?.data || {};
      setResult({ orders: data.orders || [], total: data.total || 0, counts: data.counts || {}, placedCount: data.placedCount || 0, page: data.page || 1, pageCount: data.pageCount || 1 });
      onPlacedCount(data.placedCount || 0);
    } catch (reason) { if (reason.name !== 'AbortError') { const message = authDisabled && reason.status === 401 ? 'Local auth bypass is enabled, but the API still requires authentication. Restart the admin API.' : reason.message || 'Could not load orders.'; if (!silent) setError(message); else notify(message, 'error'); } }
    finally { if (!signal?.aborted && !silent) setLoading(false); }
  }, [filters, notify, onPlacedCount, authDisabled]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => { const timer = window.setInterval(() => load(undefined, true), 30000); return () => window.clearInterval(timer); }, [load]);
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 }));
  const tabs = [['', 'All'], ...statuses.map((status) => [status, labels[status]])];
  return <div className="admin-orders-list">
    <div className="admin-orders-toolbar"><label className="admin-order-search"><span>Search</span><input value={filters.q} onChange={(event) => setFilter('q', event.target.value)} placeholder="Order number, customer or phone"/></label><label><span>Payment status</span><select value={filters.paymentStatus} onChange={(event) => setFilter('paymentStatus', event.target.value)}><option value="">All payment statuses</option>{paymentStatuses.map((status) => <option key={status} value={status}>{paymentLabels[status]}</option>)}</select></label><label><span>From</span><input type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)}/></label><label><span>To</span><input type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)}/></label></div>
    <div className="admin-order-tabs" role="tablist" aria-label="Filter by order status">{tabs.map(([status, title]) => <button type="button" role="tab" aria-selected={filters.status === status} className={filters.status === status ? 'is-active' : ''} key={status || 'all'} onClick={() => setFilter('status', status)}>{title}<span>{status ? result.counts[status] || 0 : Object.values(result.counts).reduce((sum, count) => sum + count, 0)}</span></button>)}</div>
    {loading ? <div className="admin-orders-loading">Loading orders…</div> : error ? <div className="admin-orders-error" role="alert">{error}{!authDisabled && <Button variant="secondary" onClick={() => load()}>Retry</Button>}</div> : !result.orders.length ? <EmptyState title="No orders yet" description="No orders match these filters."/> : <>
      <div className="admin-orders-table-wrap"><table className="admin-orders-table"><thead><tr><th>Order</th><th>Date &amp; time (IST)</th><th>Customer</th><th>City</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>{result.orders.map((order) => <tr key={order._id || order.orderNumber} onClick={() => navigate(`/orders/${encodeURIComponent(order.orderNumber)}`)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/orders/${encodeURIComponent(order.orderNumber)}`); }}><td data-label="Order">{order.orderNumber}</td><td data-label="Date & time">{dateTime(order.createdAt)}</td><td data-label="Customer">{order.contact?.name || '—'}<small>{order.contact?.phone || ''}</small></td><td data-label="City">{order.address?.city || '—'}</td><td data-label="Items">{(order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0)}</td><td data-label="Total">{money(order.total)}</td><td data-label="Payment"><span className="admin-order-payment-kind">{String(order.paymentMethod || '—').toUpperCase()}</span><PaymentBadge status={order.paymentStatus}/></td><td data-label="Status"><StatusBadge status={order.orderStatus}/></td></tr>)}</tbody></table></div>
      <div className="admin-orders-pagination"><span>{result.total} orders · Page {result.page} of {result.pageCount}</span><div><button type="button" disabled={filters.page <= 1} onClick={() => setFilter('page', filters.page - 1)}>Previous</button><button type="button" disabled={filters.page >= result.pageCount} onClick={() => setFilter('page', filters.page + 1)}>Next</button></div></div>
    </>}
  </div>;
}

function ConfirmDialog({ request, setRequest, saving, onConfirm }) {
  const ref = useRef(null);
  useEffect(() => { if (!ref.current) return; if (request && !ref.current.open) ref.current.showModal(); else if (!request && ref.current.open) ref.current.close(); }, [request]);
  if (!request) return <dialog ref={ref}/>;
  return <dialog ref={ref} className="admin-order-confirm-dialog" onCancel={(event) => { event.preventDefault(); setRequest(null); }}><form method="dialog" onSubmit={(event) => event.preventDefault()}><h2>{request.title}</h2><p>{request.description}</p>{request.askNote && <label>Note or cancellation reason (optional)<textarea value={request.note || ''} maxLength={500} onChange={(event) => setRequest((current) => ({ ...current, note: event.target.value }))}/></label>}<div><button type="button" disabled={saving} onClick={() => setRequest(null)}>Keep order</button><button type="button" className={request.danger ? 'is-danger' : 'is-primary'} disabled={saving} onClick={onConfirm}>{saving ? 'Saving…' : request.confirmLabel || 'Confirm'}</button></div></form></dialog>;
}

function OrderDetail({ orderNumber, notify, onPlacedCount }) {
  const [order, setOrder] = useState(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [request, setRequest] = useState(null); const [courier, setCourier] = useState({ courierName: '', trackingNumber: '', trackingUrl: '' }); const [adminNote, setAdminNote] = useState(''); const navigate = useNavigate();
  const { authDisabled } = useAuth();
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { const response = await fetchOrder(orderNumber); const data = response?.data || null; setOrder(data); setCourier({ courierName: data?.courier?.courierName || '', trackingNumber: data?.courier?.trackingNumber || '', trackingUrl: data?.courier?.trackingUrl || '' }); setAdminNote(data?.adminNote || ''); }
    catch (reason) { const message = authDisabled && reason.status === 401 ? 'Local auth bypass is enabled, but the API still requires authentication. Restart the admin API.' : reason.message || 'Could not load order.'; notify(message, 'error'); }
    finally { if (!silent) setLoading(false); }
  }, [orderNumber, notify, authDisabled]);
  useEffect(() => { load(); const timer = window.setInterval(() => load(true), 30000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => { if (order) onPlacedCount(order.orderStatus === 'placed' ? 1 : 0); }, [order, onPlacedCount]);
  const address = useMemo(() => { if (!order) return ''; const a = order.address || {}; return [order.contact?.name, order.contact?.phone, order.contact?.email, a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join('\n'); }, [order]);
  const nextStatus = order ? steps[steps.indexOf(order.orderStatus) + 1] : null;
  async function saveAction() {
    if (!request || !order) return;
    setSaving(true);
    try {
      const saved = await updateOrderStatus(order.orderNumber, { status: request.status, note: request.note || '' }); setOrder(saved.data); setRequest(null); notify(request.status === 'cancelled' ? 'Order cancelled.' : 'Order status updated.');
    } catch (reason) { notify(reason.message || 'Could not update this order.', 'error'); if ([400, 409].includes(reason.status)) await load(true); }
    finally { setSaving(false); }
  }
  async function saveCourier(event) { event.preventDefault(); setSaving(true); try { const saved = await updateCourier(order.orderNumber, courier); setOrder(saved.data); notify('Courier details saved.'); } catch (reason) { notify(reason.message || 'Could not save courier details.', 'error'); if ([400, 409].includes(reason.status)) await load(true); } finally { setSaving(false); } }
  async function setPayment(paymentStatus) { setSaving(true); try { const saved = await updatePayment(order.orderNumber, { paymentStatus }); setOrder(saved.data); notify(`Payment marked ${paymentStatus}.`); } catch (reason) { notify(reason.message || 'Could not update payment.', 'error'); if ([400, 409].includes(reason.status)) await load(true); } finally { setSaving(false); } }
  async function saveNote(event) { event.preventDefault(); setSaving(true); try { const saved = await updateAdminNote(order.orderNumber, { adminNote }); setOrder(saved.data); notify('Internal note saved.'); } catch (reason) { notify(reason.message || 'Could not save internal note.', 'error'); if ([400, 409].includes(reason.status)) await load(true); } finally { setSaving(false); } }
  async function copyAddress() { try { await navigator.clipboard.writeText(address); notify('Address copied.'); } catch { notify('Could not copy address.', 'error'); } }
  if (loading) return <div className="admin-orders-loading">Loading order…</div>;
  if (!order) return <div className="admin-orders-error">{authDisabled ? 'Local auth bypass is enabled, but the API still requires authentication. Restart the admin API.' : 'Order could not be loaded.'} {!authDisabled && <Button variant="secondary" onClick={() => load()}>Retry</Button>}<Button variant="secondary" onClick={() => navigate('/orders')}>Back to orders</Button></div>;
  const final = order.orderStatus === 'delivered' || order.orderStatus === 'cancelled';
  const amount = Number(order.shippingFee) || 0;
  return <div className="admin-order-detail">
    <div className="admin-order-detail-heading"><button type="button" onClick={() => navigate('/orders')} aria-label="Back to orders">←</button><div><h2>{order.orderNumber}</h2><p>Placed {dateTime(order.createdAt)}</p></div><StatusBadge status={order.orderStatus}/></div>
    <div className="admin-order-detail-grid">
      <div className="admin-order-detail-main">
        <section className="admin-order-card"><h3>Items in this order</h3>{(order.items || []).map((item, index) => <article className="admin-order-item" key={`${item.name}-${index}`}><img src={imageOf(item)} alt={item.name || ''} width="80" height="100"/><div><strong>{item.name}</strong><p>{item.size ? `Size: ${item.size} · ` : ''}Qty: {Number(item.qty) || 1}</p></div><b>{money(item.unitPrice)}</b></article>)}</section>
        <section className="admin-order-card"><div className="admin-order-card-heading"><h3>Status</h3><StatusBadge status={order.orderStatus}/></div>{order.orderStatus === 'cancelled' ? <p className="admin-order-cancelled-copy">This order was cancelled.</p> : <ol className="admin-order-stepper">{steps.map((status, index) => { const currentIndex = steps.indexOf(order.orderStatus); const completed = index < currentIndex; const current = index === currentIndex; const entry = [...(order.statusHistory || [])].reverse().find((item) => item.status === status); return <li key={status} className={`${completed ? 'is-complete' : ''} ${current ? 'is-current' : ''}`}><i>{completed ? '✓' : current ? '•' : ''}</i><div><strong>{labels[status]}</strong>{entry?.at && <time>{dateTime(entry.at)}</time>}</div></li>; })}</ol>}{!final && <div className="admin-order-actions">{nextStatus && <Button disabled={saving} onClick={() => setRequest({ status: nextStatus, title: `Move order to ${labels[nextStatus]}?`, description: 'This status cannot be moved backwards.', confirmLabel: `Move to ${labels[nextStatus]}`, askNote: true })}>Move to {labels[nextStatus]}</Button>}<button className="admin-order-cancel-action" type="button" disabled={saving} onClick={() => setRequest({ status: 'cancelled', title: 'Cancel this order?', description: 'Stock will be restored once after cancellation.', confirmLabel: 'Yes, cancel order', askNote: true, danger: true })}>Cancel order</button></div>}</section>
        <section className="admin-order-card"><h3>Courier details</h3><p className="admin-order-hint">Customers see these details on their Order Details and Track Order pages.</p><form className="admin-order-form" onSubmit={saveCourier}><label>Courier name<input required maxLength="100" value={courier.courierName} onChange={(event) => setCourier((current) => ({ ...current, courierName: event.target.value }))}/></label><label>Tracking number<input maxLength="120" value={courier.trackingNumber} onChange={(event) => setCourier((current) => ({ ...current, trackingNumber: event.target.value }))}/></label><label>Tracking link<input type="url" maxLength="1000" placeholder="https://" value={courier.trackingUrl} onChange={(event) => setCourier((current) => ({ ...current, trackingUrl: event.target.value }))}/></label><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save courier details'}</Button></form></section>
      </div>
      <aside className="admin-order-detail-side">
        <section className="admin-order-card"><div className="admin-order-card-heading"><h3>Customer</h3><button type="button" onClick={copyAddress}>Copy address</button></div><strong>{order.contact?.name || '—'}</strong><p>{order.contact?.phone || '—'}</p><p>{order.contact?.email || '—'}</p><p className="admin-order-address">{[order.address?.line1, order.address?.line2, order.address?.landmark, order.address?.city, order.address?.state, order.address?.pincode].filter(Boolean).join(', ') || '—'}</p>{order.note && <p className="admin-order-customer-note"><b>Order note</b><br/>{order.note}</p>}</section>
        <section className="admin-order-card"><h3>Payment</h3><p className="admin-order-payment-method">{String(order.paymentMethod || '—').toUpperCase()}</p><PaymentBadge status={order.paymentStatus}/>{(order.paymentMethod === 'upi' && (order.upiUtr || order.utr)) && <p className="admin-order-utr">UTR <code>{order.upiUtr || order.utr}</code><button type="button" onClick={() => navigator.clipboard.writeText(order.upiUtr || order.utr).then(() => notify('UTR copied.')).catch(() => notify('Could not copy UTR.', 'error'))}>Copy</button></p>}{order.paymentMethod === 'upi' && !final && <div className="admin-order-payment-actions"><Button disabled={saving || order.paymentStatus === 'paid'} onClick={() => setRequest({ type: 'payment', paymentStatus: 'paid', title: 'Mark UPI payment as paid?', description: 'This updates the payment status on the order.', confirmLabel: 'Mark as paid' })}>Mark as paid</Button><button type="button" disabled={saving || order.paymentStatus === 'failed'} onClick={() => setRequest({ type: 'payment', paymentStatus: 'failed', title: 'Mark UPI payment as failed?', description: 'This updates the payment status on the order.', confirmLabel: 'Mark as failed', danger: true })}>Mark as failed</button></div>}</section>
        <section className="admin-order-card"><h3>Price summary</h3><p><span>Items total</span><b>{money(order.subtotal)}</b></p><p><span>Shipping</span><b>{amount === 0 ? 'FREE' : money(amount)}</b></p>{Number(order.discount) > 0 && <p><span>Discount</span><b>−{money(order.discount)}</b></p>}<p className="admin-order-summary-total"><span>Total</span><b>{money(order.total)}</b></p></section>
        <section className="admin-order-card"><h3>Internal note</h3><form className="admin-order-form" onSubmit={saveNote}><label>Only visible to admin<textarea maxLength="500" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Add an internal note"/></label><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save note'}</Button></form></section>
      </aside>
    </div>
    <section className="admin-order-card admin-order-history"><h3>Status history</h3>{[...(order.statusHistory || [])].reverse().map((entry, index) => <article key={`${entry.status}-${entry.at}-${index}`}><StatusBadge status={entry.status}/><time>{dateTime(entry.at)}</time>{entry.note && <p>{entry.note}</p>}<small>{entry.by || 'Storefront'}</small></article>)}</section>
    <ConfirmDialog request={request} setRequest={setRequest} saving={saving} onConfirm={() => { if (request.type === 'payment') { const value = request.paymentStatus; setRequest(null); setPayment(value); } else saveAction(); }}/>
  </div>;
}

export default function OrdersPage({ onPlacedCount = () => {} }) {
  const { orderNumber } = useParams(); const [toast, setToast] = useState({ message: '', tone: 'success' }); const timer = useRef(null);
  const notify = useCallback((message, tone = 'success') => { setToast({ message, tone }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast({ message: '', tone: 'success' }), 4000); }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return <div className="admin-orders-page">{orderNumber ? <OrderDetail orderNumber={decodeURIComponent(orderNumber)} notify={notify} onPlacedCount={onPlacedCount}/> : <OrderList notify={notify} onPlacedCount={onPlacedCount}/>}<div className="toast-region" aria-live="polite"><Toast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })}/></div></div>;
}
