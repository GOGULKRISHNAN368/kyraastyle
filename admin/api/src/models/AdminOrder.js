import mongoose from 'mongoose';

export const orderStatuses = ['Pending', 'Payment Verified', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
export const orderMilestones = ['orderPlaced', 'paymentVerified', 'packed', 'shipped', 'outForDelivery', 'delivered'];

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  size: { type: String, trim: true, maxlength: 30, default: '' },
  price: { type: Number, min: 0, default: 0 },
}, { _id: false });

const addressSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 160, default: '' },
  phone: { type: String, trim: true, maxlength: 24, default: '' },
  line1: { type: String, trim: true, maxlength: 300, default: '' },
  line2: { type: String, trim: true, maxlength: 300, default: '' },
  city: { type: String, trim: true, maxlength: 100, default: '' },
  district: { type: String, trim: true, maxlength: 100, default: '' },
  state: { type: String, trim: true, maxlength: 100, default: '' },
  postalCode: { type: String, trim: true, maxlength: 20, default: '' },
  country: { type: String, trim: true, maxlength: 100, default: '' },
}, { _id: false });

const milestonesSchema = new mongoose.Schema({
  orderPlaced: { type: Date, default: null },
  paymentVerified: { type: Date, default: null },
  packed: { type: Date, default: null },
  shipped: { type: Date, default: null },
  outForDelivery: { type: Date, default: null },
  delivered: { type: Date, default: null },
}, { _id: false });

const adminOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  totalAmount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: orderStatuses, default: 'Pending' },
  expectedDeliveryDate: { type: Date, default: null },
  trackingId: { type: String, trim: true, maxlength: 120, default: '' },
  address: { type: addressSchema, default: () => ({}) },
  items: { type: [orderItemSchema], default: [] },
  milestones: { type: milestonesSchema, default: () => ({}) },
  paymentMethod: { type: String, trim: true, maxlength: 80, default: '' },
}, { timestamps: true, collection: 'admin_orders', autoIndex: false });

export default mongoose.models.AdminOrder || mongoose.model('AdminOrder', adminOrderSchema);
