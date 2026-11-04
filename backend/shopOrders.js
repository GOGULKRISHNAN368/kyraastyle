const crypto = require('node:crypto');

const sessionAge = 60 * 60 * 24 * 30;
const stateNames = new Set([
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]);
const requestCounts = new Map();
const upiReferenceCounts = new Map();
let indexPromise;

function cookies(header = '') {
  return header.split(';').reduce((result, entry) => {
    const index = entry.indexOf('=');
    if (index < 1) return result;
    try { result[entry.slice(0, index).trim()] = decodeURIComponent(entry.slice(index + 1).trim()); } catch { /* Ignore malformed cookies. */ }
    return result;
  }, {});
}

function customerIdFrom(request) {
  const key = process.env.CUSTOMER_AUTH_SECRET || process.env.MONGODB_URI || '';
  if (!key) return '';
  const jar = cookies(request.headers.cookie);
  const token = jar.kyraa_shop_session || jar.kyraa_customer_session;
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return '';
  const expected = crypto.createHmac('sha256', key).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return ''; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return '';
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.sub && Number(session.exp) > Math.floor(Date.now() / 1000) ? String(session.sub) : '';
  } catch { return ''; }
}

function istDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}`;
}

function publicConfig() {
  const configuredFee = Number(process.env.SHIPPING_FEE);
  const shippingFee = Number.isFinite(configuredFee) && configuredFee >= 0 ? Math.round(configuredFee) : 0;
  // COD is the storefront's default payment method so checkout remains usable
  // when online payment credentials have not been configured yet.
  const paymentMethods = ['cod'];
  const upiId = String(process.env.UPI_ID || '').trim();
  const payeeName = String(process.env.UPI_PAYEE_NAME || '').trim();
  if (upiId) paymentMethods.push('upi');
  return { shippingFee, couponsEnabled: false, paymentMethods, ...(upiId ? { upi: { payeeName, upiId } } : {}) };
}

function validateAddress(body = {}) {
  const contact = {
    name: String(body.name || '').trim(),
    phone: String(body.phone || '').replace(/\D/g, ''),
    email: String(body.email || '').trim().toLowerCase(),
  };
  const address = {
    line1: String(body.line1 || '').trim(), line2: String(body.line2 || '').trim(), landmark: String(body.landmark || '').trim(),
    pincode: String(body.pincode || '').trim(), city: String(body.city || '').trim(), state: String(body.state || '').trim(),
  };
  const note = String(body.note || '').trim();
  if (contact.name.length < 2 || contact.name.length > 120) throw new Error('Enter your full name.');
  if (!/^[6-9]\d{9}$/.test(contact.phone)) throw new Error('Enter a valid 10 digit Indian mobile number.');
  if (contact.email && (contact.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))) throw new Error('Enter a valid email address.');
  if (address.line1.length < 5 || address.line1.length > 300) throw new Error('Enter address line 1.');
  if (address.line2.length > 300 || address.landmark.length > 150) throw new Error('Address details are too long.');
  if (!/^[1-9]\d{5}$/.test(address.pincode)) throw new Error('Enter a valid 6 digit pincode.');
  if (address.city.length < 2 || address.city.length > 100) throw new Error('Enter a valid city.');
  if (!stateNames.has(address.state)) throw new Error('Select a valid Indian state or union territory.');
  if (note.length > 200) throw new Error('Order note must be 200 characters or fewer.');
  return { contact, address, note };
}

function stockFilter(product, size, quantity) {
  if (product.hasSizes) return { _id: product._id, sizes: { $elemMatch: { label: size, stock: { $gte: quantity } } } };
  return { _id: product._id, stock: { $gte: quantity } };
}

function lineFrom(product, size, qty, cloudName) {
  const images = Array.isArray(product.images) ? product.images : [];
  const image = images.find((entry) => entry.publicId || entry.cloudinaryId);
  const imagePublicId = image?.publicId || image?.cloudinaryId || product.cloudinaryId || '';
  const unitPrice = Number(product.price);
  const mrp = Number(product.mrp);
  const imageUrl = product.imageUrl || (imagePublicId && cloudName
    ? `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto:best,c_limit,w_800/${encodeURIComponent(imagePublicId).replace(/%2F/g, '/')}`
    : '');
  return { productId: product._id, name: String(product.name || ''), image: imagePublicId, imageUrl, size, qty, unitPrice, mrp: Number.isFinite(mrp) ? mrp : unitPrice };
}

function customerOrderView(order) {
  const { orderNumber, contact, address, items, subtotal, shippingFee, discount, total, paymentMethod, paymentStatus, upiUtr, orderStatus, statusHistory, courier, createdAt, updatedAt } = order;
  return { orderNumber, contact, address, items, subtotal, shippingFee, discount, total, paymentMethod, paymentStatus, upiUtr, orderStatus, statusHistory, courier, createdAt, updatedAt };
}

function installOrderRoutes(app, { mongoose, Product, cloudName = '' }) {
  const db = () => mongoose.connection.db;
  const ensureIndexes = () => {
    if (!indexPromise) indexPromise = Promise.all([
      db().collection('orders').createIndex({ orderNumber: 1 }, { unique: true }),
      db().collection('orders').createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true }),
      db().collection('orders').createIndex({ customerId: 1, createdAt: -1 }),
      db().collection('orders').createIndex({ upiUtr: 1 }, { unique: true, sparse: true }),
      db().collection('customers').createIndex({ _id: 1 }),
    ]).catch((error) => { indexPromise = null; throw error; });
    return indexPromise;
  };
  const requireCustomer = async (request) => {
    const id = customerIdFrom(request);
    if (!id || !mongoose.isValidObjectId(id)) return null;
    return db().collection('customers').findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { name: 1, email: 1, phone: 1 } });
  };

  app.get('/api/config/public', (_request, response) => response.set('Cache-Control', 'no-store').json({ data: publicConfig() }));

  app.post('/api/orders/:orderNumber/upi-reference', async (request, response) => {
    try {
      const customer = await requireCustomer(request);
      if (!customer) return response.status(401).json({ message: 'Sign in to update this order.' });
      const now = Date.now(); const key = String(customer._id);
      const bucket = upiReferenceCounts.get(key) || { started: now, count: 0 };
      if (now - bucket.started >= 10 * 60 * 1000) { bucket.started = now; bucket.count = 0; }
      bucket.count += 1; upiReferenceCounts.set(key, bucket);
      if (bucket.count > 5) return response.status(429).json({ message: 'Too many payment reference attempts. Please try again later.' });
      const utr = String(request.body?.utr || '').trim();
      if (!/^\d{12}$/.test(utr)) return response.status(400).json({ message: 'Enter a valid 12 digit UPI transaction reference.' });
      const orders = db().collection('orders');
      const order = await orders.findOne({ orderNumber: String(request.params.orderNumber), customerId: String(customer._id) });
      if (!order) return response.status(404).json({ message: 'Order not found.' });
      if (order.paymentMethod !== 'upi' || order.paymentStatus !== 'awaiting_payment') return response.status(409).json({ message: 'A payment reference cannot be added to this order.' });
      const updated = await orders.findOneAndUpdate(
        { _id: order._id, paymentStatus: 'awaiting_payment', upiUtr: { $exists: false } },
        { $set: { upiUtr: utr, paymentStatus: 'verification_pending', upiReferenceSubmittedAt: new Date(), updatedAt: new Date() } },
        { returnDocument: 'after' },
      );
      const saved = updated?.value || updated;
      if (!saved) return response.status(409).json({ message: 'A payment reference has already been submitted for this order.' });
      response.json({ data: customerOrderView(saved) });
    } catch (error) {
      if (error?.code === 11000) return response.status(409).json({ message: 'This transaction reference has already been submitted.' });
      response.status(500).json({ message: 'The payment reference could not be saved.' });
    }
  });
  app.get('/api/orders/previous-address', async (request, response) => {
    try {
      const customer = await requireCustomer(request);
      if (!customer) return response.status(401).json({ message: 'Sign in to continue.' });
      const order = await db().collection('orders').findOne({ customerId: String(customer._id) }, { sort: { createdAt: -1 }, projection: { contact: 1, address: 1 } });
      if (!order) return response.json({ data: null });
      response.json({ data: { contact: order.contact, address: order.address } });
    } catch (error) { response.status(500).json({ message: 'The previous address could not be loaded.' }); }
  });

  app.get('/api/orders', async (request, response) => {
    try {
      const customer = await requireCustomer(request);
      if (!customer) return response.status(401).json({ message: 'Sign in to continue.' });
      const orders = await db().collection('orders').find({ customerId: String(customer._id) })
        .sort({ createdAt: -1 }).toArray();
      response.json({ data: orders.map(customerOrderView) });
    } catch (_error) { response.status(500).json({ message: 'Your orders could not be loaded.' }); }
  });

  app.post('/api/orders/:orderNumber/cancel', async (request, response) => {
    const customer = await requireCustomer(request).catch(() => null);
    if (!customer) return response.status(401).json({ message: 'Sign in to continue.' });
    const session = await mongoose.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        const orders = db().collection('orders');
        const order = await orders.findOne({ orderNumber: String(request.params.orderNumber), customerId: String(customer._id) }, { session });
        if (!order) { result = { kind: 'missing' }; return; }
        if (order.orderStatus !== 'placed') { result = { kind: 'conflict' }; return; }
        for (const item of order.items || []) {
          const productId = item.productId?._id || item.productId;
          const filter = item.size
            ? { _id: new mongoose.Types.ObjectId(String(productId)), sizes: { $elemMatch: { label: item.size } } }
            : { _id: new mongoose.Types.ObjectId(String(productId)) };
          const update = item.size
            ? { $inc: { 'sizes.$.stock': Number(item.qty), stock: Number(item.qty) } }
            : { $inc: { stock: Number(item.qty) } };
          const changed = await Product.collection.findOneAndUpdate(filter, update, { session, returnDocument: 'after' });
          if (!(changed?.value || changed)) throw new Error(`Stock could not be restored for ${item.name || 'an item'}.`);
        }
        const cancelledAt = new Date();
        const changed = await orders.findOneAndUpdate(
          { _id: order._id, orderStatus: 'placed' },
          { $set: { orderStatus: 'cancelled', updatedAt: cancelledAt }, $push: { statusHistory: { status: 'cancelled', at: cancelledAt } } },
          { session, returnDocument: 'after' },
        );
        if (!(changed?.value || changed)) throw new Error('This order can no longer be cancelled.');
        result = { kind: 'cancelled', order: changed?.value || changed };
      });
    } catch (error) {
      if (/can no longer be cancelled/.test(error.message || '')) return response.status(409).json({ message: 'This order can no longer be cancelled' });
      return response.status(500).json({ message: error.message || 'The order could not be cancelled.' });
    } finally { await session.endSession(); }
    if (result?.kind === 'missing') return response.status(404).json({ message: 'Order not found.' });
    if (result?.kind === 'conflict') return response.status(409).json({ message: 'This order can no longer be cancelled' });
    response.json({ data: customerOrderView(result?.order) });
  });

  app.get('/api/orders/:orderNumber', async (request, response) => {
    try {
      const customer = await requireCustomer(request);
      if (!customer) return response.status(401).json({ message: 'Sign in to continue.' });
      const order = await db().collection('orders').findOne({ orderNumber: String(request.params.orderNumber), customerId: String(customer._id) });
      if (!order) return response.status(404).json({ message: 'Order not found.' });
      response.json({ data: customerOrderView(order) });
    } catch (error) { response.status(500).json({ message: 'Order details could not be loaded.' }); }
  });

  app.post('/api/orders', async (request, response) => {
    const customer = await requireCustomer(request).catch(() => null);
    if (!customer) return response.status(401).json({ message: 'Sign in to place an order.' });
    const now = Date.now();
    const bucket = requestCounts.get(String(customer._id)) || { started: now, count: 0 };
    if (now - bucket.started > 15 * 60 * 1000) { bucket.started = now; bucket.count = 0; }
    bucket.count += 1; requestCounts.set(String(customer._id), bucket);
    if (bucket.count > 10) return response.status(429).json({ message: 'Too many order attempts. Please try again later.' });
    const idempotencyKey = String(request.get('Idempotency-Key') || request.body?.idempotencyKey || '').trim();
    if (!/^[a-zA-Z0-9._:-]{8,120}$/.test(idempotencyKey)) return response.status(400).json({ message: 'A valid order request key is required.' });
    const paymentMethod = String(request.body?.paymentMethod || '');
    if (!['cod', 'upi'].includes(paymentMethod) || !publicConfig().paymentMethods.includes(paymentMethod)) return response.status(400).json({ message: 'This payment method is not currently available.' });
    let fields;
    try { fields = validateAddress(request.body); } catch (error) { return response.status(400).json({ message: error.message }); }
    const requestedItems = Array.isArray(request.body?.items) ? request.body.items : [];
    if (!requestedItems.length || requestedItems.length > 50) return response.status(400).json({ message: 'Add between 1 and 50 items to your order.' });
    try {
      await ensureIndexes();
      const existing = await db().collection('orders').findOne({ idempotencyKey });
      if (existing) {
        if (existing.customerId !== String(customer._id)) return response.status(409).json({ message: 'This order request key was already used.' });
        return response.json({ data: { orderNumber: existing.orderNumber } });
      }
      const session = await mongoose.startSession();
      let result;
      try {
        await session.withTransaction(async () => {
          const lines = [];
          let subtotal = 0;
          for (const entry of requestedItems) {
            const productId = String(entry.productId || '');
            if (!mongoose.isValidObjectId(productId)) throw new Error('One of the products is no longer available.');
            const product = await Product.findOne({ _id: productId, isActive: { $ne: false }, mergedInto: { $exists: false } }).session(session).lean();
            if (!product) throw new Error('One of the products is no longer available.');
            const size = String(entry.size || '').trim();
            const qty = Number(entry.qty ?? entry.quantity);
            if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw new Error('Enter a valid item quantity.');
            if (product.hasSizes && !(product.sizes || []).some((sizeRow) => String(sizeRow.label || sizeRow.size) === size)) throw new Error(`${product.name} does not offer the selected size.`);
            const price = Number(product.price);
            if (!Number.isFinite(price) || price < 0) throw new Error(`${product.name} has no valid price.`);
            const available = product.hasSizes
              ? Number((product.sizes || []).find((sizeRow) => String(sizeRow.label || sizeRow.size) === size)?.stock || 0)
              : Number(product.stock || 0);
            if (qty > available) throw new Error(`${product.name} has only ${available} available.`);
            const line = lineFrom(product, size, qty, cloudName);
            lines.push(line); subtotal += line.unitPrice * qty;
          }
          for (const line of lines) {
            const original = await Product.findById(line.productId).session(session).lean();
            const update = original.hasSizes ? { $inc: { 'sizes.$.stock': -line.qty } } : { $inc: { stock: -line.qty } };
            if (original.hasSizes && Number.isFinite(Number(original.stock))) update.$inc.stock = -line.qty;
            const changed = await Product.collection.findOneAndUpdate(stockFilter(original, line.size, line.qty), update, { session, returnDocument: 'after' });
            const updated = changed?.value || changed;
            if (!updated) throw new Error(`${line.name} stock changed. Review your bag and try again.`);
          }
          const shippingFee = publicConfig().shippingFee;
          const dateKey = istDateKey();
          const counterResult = await db().collection('order_counters').findOneAndUpdate(
            { _id: dateKey }, { $inc: { sequence: 1 } }, { upsert: true, returnDocument: 'after', session },
          );
          const counter = counterResult?.value || counterResult;
          const orderNumber = `KS-${dateKey}-${String(counter.sequence).padStart(4, '0')}`;
          const createdAt = new Date();
          const order = {
            orderNumber, customerId: String(customer._id), contact: { ...fields.contact, email: fields.contact.email || customer.email || '' },
            address: fields.address, note: fields.note, items: lines, subtotal, shippingFee, discount: 0, total: subtotal + shippingFee,
            paymentMethod, paymentStatus: paymentMethod === 'upi' ? 'awaiting_payment' : 'pending', orderStatus: 'placed', statusHistory: [{ status: 'placed', at: createdAt }], idempotencyKey, createdAt, updatedAt: createdAt,
          };
          await db().collection('orders').insertOne(order, { session });
          result = { orderNumber };
        });
      } finally { await session.endSession(); }
      response.status(201).json({ data: result });
    } catch (error) {
      if (error?.code === 11000) {
        const existing = await db().collection('orders').findOne({ idempotencyKey }).catch(() => null);
        if (existing && existing.customerId === String(customer._id)) return response.json({ data: { orderNumber: existing.orderNumber } });
      }
      const conflict = /stock changed|only \d+ available|no longer available|does not offer|valid quantity|valid price/i.test(error.message || '');
      response.status(conflict ? 409 : 500).json({ message: error.message || 'Your order could not be placed.' });
    }
  });
}

module.exports = { installOrderRoutes, publicConfig, validateAddress, istDateKey };
