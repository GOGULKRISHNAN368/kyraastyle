import { useEffect, useState } from 'react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Input from '../components/common/Input.jsx';
import SearchBar from '../components/common/SearchBar.jsx';
import Select from '../components/common/Select.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import Toast from '../components/common/Toast.jsx';
import { fetchOrders, updateOrder } from '../services/orders.js';

const statuses = ['Pending', 'Payment Verified', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
const milestoneFields = [
  ['orderPlaced', 'Order Placed'], ['paymentVerified', 'Payment Verified'], ['packed', 'Packed'],
  ['shipped', 'Shipped'], ['outForDelivery', 'Out for Delivery'], ['delivered', 'Delivered'],
];

function dateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateValue(value) { return value ? new Date(`${value}T12:00:00`).toISOString() : null; }
function formatDate(value) { return value ? new Date(value).toLocaleString() : '—'; }
function formatMoney(value) { return `₹${Number(value || 0).toLocaleString('en-IN')}`; }

function OrderCard({ order, onSaved, notify }) {
  const [status, setStatus] = useState(order.status || 'Pending');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(dateInput(order.expectedDeliveryDate));
  const [trackingId, setTrackingId] = useState(order.trackingId || '');
  const [milestones, setMilestones] = useState(Object.fromEntries(milestoneFields.map(([key]) => [key, dateInput(order.milestones?.[key])])));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(order.status || 'Pending');
    setExpectedDeliveryDate(dateInput(order.expectedDeliveryDate));
    setTrackingId(order.trackingId || '');
    setMilestones(Object.fromEntries(milestoneFields.map(([key]) => [key, dateInput(order.milestones?.[key])])));
  }, [order]);

  async function save(event) {
    event.preventDefault(); setSaving(true);
    try {
      const payload = {
        status,
        expectedDeliveryDate: dateValue(expectedDeliveryDate),
        trackingId: trackingId.trim(),
        milestones: Object.fromEntries(Object.entries(milestones).map(([key, value]) => [key, dateValue(value)])),
      };
      const { data } = await updateOrder(order._id, payload);
      onSaved(data); notify('Order updates saved.');
    } catch (reason) { notify(reason.message || 'Could not save order updates.', 'error'); }
    finally { setSaving(false); }
  }

  const address = order.address || {};
  const addressLine = [address.line1, address.line2, address.city, address.district, address.state, address.postalCode, address.country].filter(Boolean).join(', ');

  return <article className="order-card">
    <form onSubmit={save}>
      <div className="order-card-top">
        <div className="order-identity"><h3>Order: {order.orderNumber}</h3>{order.email && <p>Email: {order.email}</p>}</div>
        <strong className="order-total">{formatMoney(order.totalAmount)}</strong>
        <div className="order-top-controls">
          <Select label="Update status" name={`order-status-${order._id}`} value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Input label="Expected delivery" name={`order-delivery-${order._id}`} type="date" value={expectedDeliveryDate} onChange={(event) => setExpectedDeliveryDate(event.target.value)}/>
          <Input label="Tracking ID" name={`order-tracking-${order._id}`} value={trackingId} onChange={(event) => setTrackingId(event.target.value)} placeholder="e.g. AWB123456789" maxLength="120"/>
        </div>
      </div>

      <div className="order-detail-columns">
        <section className="order-address"><h4>Delivery Address</h4><strong>{address.name || 'Customer'}</strong>{address.phone && <span>{address.phone}</span>}{addressLine && <p>{addressLine}</p>}</section>
        <section className="order-items"><h4>Items Ordered</h4>{order.items?.length ? order.items.map((item, index) => <p key={`${item.name}-${index}`}>{item.quantity}x {item.name}{item.size ? ` (Size: ${item.size})` : ''}</p>) : <p>No item details available.</p>}</section>
      </div>

      <section className="order-milestones"><h4>Tracking Milestone Dates</h4><div className="order-milestone-grid">{milestoneFields.map(([key, label]) => <Input key={key} label={label} name={`${key}-${order._id}`} type="date" value={milestones[key] || ''} onChange={(event) => setMilestones((current) => ({ ...current, [key]: event.target.value }))}/>)}</div></section>
      <Button type="submit" loading={saving} className="order-save-button">{saving ? 'Saving...' : 'Save Order Updates'}</Button>
      <p className="order-payment-meta"><span aria-hidden="true">◷</span> {formatDate(order.createdAt)}{order.paymentMethod && ` · Payment: ${order.paymentMethod}`}</p>
    </form>
  </article>;
}

export default function OrdersPage({ mode = 'all' }) {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', tone: 'success' });
  const [reloadKey, setReloadKey] = useState(0);
  const statusFilter = mode === 'completed' ? 'Delivered' : mode === 'cancelled' ? 'Cancelled' : '';
  const title = mode === 'completed' ? 'Completed Orders' : mode === 'cancelled' ? 'Cancelled Orders' : 'Customer Orders';

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchOrders({ status: statusFilter, search }, controller.signal)
      .then(({ data }) => setOrders(data || []))
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message || 'Could not load orders.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [statusFilter, search, reloadKey]);

  function notify(message, tone = 'success') {
    setToast({ message, tone });
    window.setTimeout(() => setToast({ message: '', tone: 'success' }), 4000);
  }

  function replaceOrder(updated) { setOrders((current) => current.map((order) => order._id === updated._id ? updated : order)); }

  return <div className="orders-page">
    <p className="categories-subtitle">Manage all incoming customer orders.</p>
    <Card className="orders-panel">
      <div className="orders-panel-heading"><h2>{title}</h2><p>Review customer details, update delivery status, and save tracking milestones.</p></div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search order number, email, or phone"/>
      {loading ? <div className="orders-skeleton-list">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} lines={7}/>)}</div>
        : error ? <div className="products-error" role="alert">{error}<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button></div>
          : orders.length === 0 ? <EmptyState title="No orders yet" description="Orders will appear here when the storefront checkout writes them to admin_orders."/>
            : <div className="order-list">{orders.map((order) => <OrderCard key={order._id} order={order} onSaved={replaceOrder} notify={notify}/>)}</div>}
    </Card>
    <div className="toast-region" aria-live="polite"><Toast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })}/></div>
  </div>;
}
