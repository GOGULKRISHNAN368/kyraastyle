import mongoose from 'mongoose';
import AdminOrder, { orderMilestones, orderStatuses } from '../models/AdminOrder.js';

export class OrderError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function parseDate(value, label) {
  if (value === '' || value == null) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new OrderError(`${label} must be a valid date.`);
  return date;
}

function validateUpdate(input, current) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new OrderError('Order updates must be an object.');
  const allowed = new Set(['status', 'expectedDeliveryDate', 'trackingId', 'milestones']);
  const unknown = Object.keys(input).find((key) => !allowed.has(key));
  if (unknown) throw new OrderError(`Unsupported order update: ${unknown}.`);
  const values = {};
  if (Object.hasOwn(input, 'status')) {
    if (!orderStatuses.includes(input.status)) throw new OrderError('Choose a valid order status.');
    values.status = input.status;
  }
  if (Object.hasOwn(input, 'expectedDeliveryDate')) values.expectedDeliveryDate = parseDate(input.expectedDeliveryDate, 'Expected delivery date');
  if (Object.hasOwn(input, 'trackingId')) {
    if (typeof input.trackingId !== 'string' || input.trackingId.trim().length > 120) throw new OrderError('Tracking ID must be 120 characters or fewer.');
    values.trackingId = input.trackingId.trim();
  }
  if (Object.hasOwn(input, 'milestones')) {
    if (!input.milestones || typeof input.milestones !== 'object' || Array.isArray(input.milestones)) throw new OrderError('Milestones must be an object.');
    const invalid = Object.keys(input.milestones).find((field) => !orderMilestones.includes(field));
    if (invalid) throw new OrderError(`Unsupported milestone: ${invalid}.`);
    values.milestones = { ...current.milestones.toObject(), ...Object.fromEntries(Object.entries(input.milestones).map(([key, value]) => [key, parseDate(value, key)])) };
  }
  return values;
}

export async function listOrders({ status, search } = {}) {
  const filter = {};
  if (status) {
    if (!orderStatuses.includes(status)) throw new OrderError('Choose a valid order status.');
    filter.status = status;
  }
  if (search?.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ orderNumber: regex }, { email: regex }, { 'address.name': regex }, { 'address.phone': regex }, { trackingId: regex }];
  }
  return AdminOrder.find(filter).sort({ createdAt: -1 }).lean();
}

export async function createOrder(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new OrderError('Order details must be an object.');
  const orderNumber = typeof input.orderNumber === 'string' ? input.orderNumber.trim() : '';
  if (!orderNumber || orderNumber.length > 80) throw new OrderError('Order number is required (up to 80 characters).');
  if (await AdminOrder.exists({ orderNumber })) throw new OrderError('That order number already exists.', 409);
  const status = input.status || 'Pending';
  if (!orderStatuses.includes(status)) throw new OrderError('Choose a valid order status.');
  const items = Array.isArray(input.items) ? input.items.map((item) => ({
    name: String(item?.name || '').trim(), quantity: Number(item?.quantity || 1), size: String(item?.size || ''), price: Number(item?.price || 0),
  })) : [];
  if (items.some((item) => !item.name || item.name.length > 200 || !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.price) || item.price < 0)) throw new OrderError('One or more order items are invalid.');
  const totalAmount = Number(input.totalAmount || 0);
  if (!Number.isFinite(totalAmount) || totalAmount < 0) throw new OrderError('Order total must be zero or greater.');
  return AdminOrder.create({
    orderNumber,
    email: typeof input.email === 'string' ? input.email.trim().toLowerCase() : '',
    totalAmount,
    status,
    address: input.address || {},
    items,
    paymentMethod: typeof input.paymentMethod === 'string' ? input.paymentMethod.trim() : '',
    milestones: { orderPlaced: parseDate(input.milestones?.orderPlaced || input.createdAt || new Date(), 'Order placed date') },
  });
}

export async function updateOrder(id, input) {
  if (!mongoose.isValidObjectId(id)) throw new OrderError('Order not found.', 404);
  const order = await AdminOrder.findById(id);
  if (!order) throw new OrderError('Order not found.', 404);
  const values = validateUpdate(input, order);
  Object.assign(order, values);
  return order.save();
}
