import mongoose from 'mongoose';

export const statuses = ['placed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
export const paymentStatuses = ['pending', 'awaiting_payment', 'verification_pending', 'paid', 'failed'];
const forward = ['placed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

export class OrderError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const collection = () => mongoose.connection.db.collection('orders');
const productCollection = () => mongoose.connection.db.collection('products');
function id(orderNumber) { return String(orderNumber || '').trim(); }
function badDate(value, label) { throw new OrderError(`${label} must be a valid date.`); }
function dateBoundary(value, label, inclusiveEnd = false) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return badDate(value, label);
  const date = new Date(`${value}T00:00:00.000+05:30`);
  if (!Number.isFinite(date.getTime())) return badDate(value, label);
  if (inclusiveEnd) date.setTime(date.getTime() + 86400000);
  return date;
}
function safeRegex(value) { return new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
async function requiredOrder(orderNumber, session) {
  const order = await collection().findOne({ orderNumber: id(orderNumber) }, session ? { session } : undefined);
  if (!order) throw new OrderError('Order not found.', 404);
  return order;
}
function updatedDoc(result) { return result?.value || result; }
function historyEntry(status, actor, note, at = new Date()) {
  const entry = { status, at, by: String(actor?.id || actor?._id || 'admin') };
  if (note) entry.note = note;
  return entry;
}

export async function listOrders(query = {}) {
  const filter = {}; const requestedStatus = String(query.status || '').trim(); const requestedPaymentStatus = String(query.paymentStatus || '').trim();
  if (requestedStatus && requestedStatus !== 'all') {
    if (!statuses.includes(requestedStatus)) throw new OrderError('Choose a valid order status.');
    filter.orderStatus = requestedStatus;
  }
  if (requestedPaymentStatus) {
    if (!paymentStatuses.includes(requestedPaymentStatus)) throw new OrderError('Choose a valid payment status.');
    filter.paymentStatus = requestedPaymentStatus;
  }
  const search = String(query.q || '').trim();
  if (search) { const regex = safeRegex(search); filter.$or = [{ orderNumber: regex }, { 'contact.name': regex }, { 'contact.phone': regex }]; }
  const from = dateBoundary(query.from, 'Start date'); const to = dateBoundary(query.to, 'End date', true);
  if (from || to) { filter.createdAt = {}; if (from) filter.createdAt.$gte = from; if (to) filter.createdAt.$lt = to; }
  const page = Math.max(1, Math.floor(Number(query.page) || 1)); const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit) || 20)));
  const [orders, total, grouped] = await Promise.all([
    collection().find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    collection().countDocuments(filter),
    collection().aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]).toArray(),
  ]);
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
  grouped.forEach((entry) => { if (Object.hasOwn(counts, entry._id)) counts[entry._id] = entry.count; });
  return { orders, total, counts, placedCount: counts.placed, page, limit, pageCount: Math.ceil(total / limit) };
}

export async function getOrder(orderNumber) { return requiredOrder(orderNumber); }

async function cancelOrderWithStock(orderNumber, actor, note) {
  const session = await mongoose.startSession(); let cancelled;
  try {
    await session.withTransaction(async () => {
      const current = await requiredOrder(orderNumber, session);
      if (current.orderStatus === 'cancelled' || current.orderStatus === 'delivered') throw new OrderError('This order can no longer be cancelled.', 409);
      const cancelledAt = new Date();
      const changed = await collection().findOneAndUpdate(
        { _id: current._id, orderStatus: current.orderStatus },
        { $set: { orderStatus: 'cancelled', updatedAt: cancelledAt }, $push: { statusHistory: historyEntry('cancelled', actor, note, cancelledAt) } },
        { session, returnDocument: 'after' },
      );
      cancelled = updatedDoc(changed);
      if (!cancelled) throw new OrderError('This order changed in another session. Reload and try again.', 409);
      for (const item of current.items || []) {
        const rawId = item.productId?._id || item.productId;
        if (!mongoose.isValidObjectId(String(rawId))) throw new OrderError(`Cannot restore stock for ${item.name || 'an item'}.`, 409);
        const productId = new mongoose.Types.ObjectId(String(rawId)); const quantity = Number(item.qty);
        if (!Number.isInteger(quantity) || quantity < 1) throw new OrderError(`Cannot restore stock for ${item.name || 'an item'}.`, 409);
        const size = String(item.size || '').trim();
        const filter = size ? { _id: productId, sizes: { $elemMatch: { label: size } } } : { _id: productId };
        const inc = size ? { 'sizes.$.stock': quantity, stock: quantity } : { stock: quantity };
        const restored = await productCollection().findOneAndUpdate(filter, { $inc: inc }, { session, returnDocument: 'after' });
        if (!updatedDoc(restored)) throw new OrderError(`Stock could not be restored for ${item.name || 'an item'}.`, 409);
      }
    });
    return cancelled;
  } finally { await session.endSession(); }
}

export async function updateOrderStatus(orderNumber, input = {}, actor = {}) {
  const status = String(input.status || ''); const note = String(input.note || '').trim();
  if (!statuses.includes(status)) throw new OrderError('Choose a valid order status.');
  if (note.length > 500) throw new OrderError('Status note must be 500 characters or fewer.');
  const order = await requiredOrder(orderNumber);
  if (order.orderStatus === 'delivered' || order.orderStatus === 'cancelled') throw new OrderError('Delivered and cancelled orders cannot be changed.', 409);
  if (status === 'cancelled') return cancelOrderWithStock(orderNumber, actor, note);
  const currentIndex = forward.indexOf(order.orderStatus); const next = forward[currentIndex + 1];
  if (!next || status !== next) throw new OrderError(`Order status can only move forward to ${next || 'a final status'}.`, 409);
  if (status === 'shipped' && !String(order.courier?.courierName || '').trim()) throw new OrderError('Add courier details before marking shipped.', 400);
  const at = new Date(); const set = { orderStatus: status, updatedAt: at };
  if (status === 'delivered' && order.paymentMethod === 'cod') set.paymentStatus = 'paid';
  const result = await collection().findOneAndUpdate(
    { _id: order._id, orderStatus: order.orderStatus },
    { $set: set, $push: { statusHistory: historyEntry(status, actor, note, at) } },
    { returnDocument: 'after' },
  );
  const updated = updatedDoc(result);
  if (!updated) throw new OrderError('The order changed in another session. Reload it and try again.', 409);
  return updated;
}

export async function updateCourier(orderNumber, input = {}) {
  const courierName = String(input.courierName || '').trim(); const trackingNumber = String(input.trackingNumber || '').trim(); const trackingUrl = String(input.trackingUrl || '').trim();
  if (courierName.length > 100 || trackingNumber.length > 120 || trackingUrl.length > 1000) throw new OrderError('Courier details exceed the allowed length.');
  if (trackingUrl) { let url; try { url = new URL(trackingUrl); } catch { throw new OrderError('Tracking URL must be a valid HTTPS link.'); } if (url.protocol !== 'https:') throw new OrderError('Tracking URL must be a valid HTTPS link.'); }
  const result = await collection().findOneAndUpdate({ orderNumber: id(orderNumber) }, { $set: { courier: { courierName, trackingNumber, trackingUrl }, updatedAt: new Date() } }, { returnDocument: 'after' });
  const order = updatedDoc(result); if (!order) throw new OrderError('Order not found.', 404); return order;
}

export async function updatePayment(orderNumber, input = {}) {
  const paymentStatus = String(input.paymentStatus || '');
  if (!['paid', 'failed'].includes(paymentStatus)) throw new OrderError('Choose paid or failed for the payment status.');
  const order = await requiredOrder(orderNumber);
  if (order.orderStatus === 'cancelled') throw new OrderError('Cancelled orders cannot have their payment changed.', 409);
  if (order.paymentMethod === 'upi') {
    const result = await collection().findOneAndUpdate({ _id: order._id, orderStatus: { $ne: 'cancelled' } }, { $set: { paymentStatus, updatedAt: new Date() } }, { returnDocument: 'after' });
    const updated = updatedDoc(result); if (!updated) throw new OrderError('The order changed in another session.', 409); return updated;
  }
  if (order.paymentMethod === 'cod' && paymentStatus === 'paid') {
    if (order.orderStatus !== 'delivered') throw new OrderError('COD can only be marked paid after delivery.', 409);
    const result = await collection().findOneAndUpdate({ _id: order._id, orderStatus: 'delivered', paymentMethod: 'cod' }, { $set: { paymentStatus: 'paid', updatedAt: new Date() } }, { returnDocument: 'after' });
    const updated = updatedDoc(result); if (!updated) throw new OrderError('The order changed in another session.', 409); return updated;
  }
  throw new OrderError('Only UPI payments can be marked paid or failed.', 400);
}

export async function updateAdminNote(orderNumber, input = {}) {
  const adminNote = String(input.adminNote || '').trim(); if (adminNote.length > 500) throw new OrderError('Internal note must be 500 characters or fewer.');
  const result = await collection().findOneAndUpdate({ orderNumber: id(orderNumber) }, { $set: { adminNote, updatedAt: new Date() } }, { returnDocument: 'after' });
  const order = updatedDoc(result); if (!order) throw new OrderError('Order not found.', 404); return order;
}
