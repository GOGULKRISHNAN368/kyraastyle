const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SESSION_COOKIE = 'kyraa_shop_session';
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 30;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const pendingOtps = new Map();

function publicIdImageUrl(publicId, width, cloudName) {
  const safeId = String(publicId || '').trim().replace(/^\/+|\/+$/g, '');
  const safeWidth = Math.max(240, Math.min(1600, Number(width) || 800));
  if (!safeId || !/^[a-z0-9_./-]+$/i.test(safeId)) return '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto:best,c_limit,w_${safeWidth}/${safeId.split('/').map(encodeURIComponent).join('/')}`;
}

function readCookies(header = '') {
  return header.split(';').reduce((result, entry) => {
    const split = entry.indexOf('=');
    if (split > 0) result[entry.slice(0, split).trim()] = decodeURIComponent(entry.slice(split + 1).trim());
    return result;
  }, {});
}

function authSecret() {
  return process.env.CUSTOMER_AUTH_SECRET || process.env.MONGODB_URI || '';
}

function signCustomer(customerId) {
  const payload = Buffer.from(JSON.stringify({ sub: String(customerId), exp: Math.floor(Date.now() / 1000) + SESSION_AGE_SECONDS })).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function sessionCustomerId(request) {
  const token = readCookies(request.headers.cookie)[SESSION_COOKIE];
  const [payload, suppliedSignature] = String(token || '').split('.');
  if (!payload || !suppliedSignature || !authSecret()) return '';
  const expected = crypto.createHmac('sha256', authSecret()).update(payload).digest();
  let actual;
  try { actual = Buffer.from(suppliedSignature, 'base64url'); } catch { return ''; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return '';
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return value.sub && value.exp > Math.floor(Date.now() / 1000) ? String(value.sub) : '';
  } catch { return ''; }
}

function setSession(response, customerId) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(signCustomer(customerId))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_AGE_SECONDS}${secure}`);
}

function clearSession(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function cleanCustomer(customer) {
  return { id: String(customer._id), name: customer.name || '', email: customer.email || '', phone: customer.phone || '' };
}

function productStock(product, size) {
  if (product.hasSizes) {
    const row = (product.sizes || []).find((item) => String(item.label || item.size).toLowerCase() === String(size || '').toLowerCase());
    return row ? Math.max(0, Number(row.stock ?? row.quantity) || 0) : 0;
  }
  return Math.max(0, Number(product.stock) || 0);
}

function addDressDetails(product, dress, cloudName) {
  if (!dress) return product;
  const base = product.toObject ? product.toObject() : { ...product };
  if (Array.isArray(dress.images)) {
    const known = new Set((base.images || []).map((image) => image.publicId || image.cloudinaryId).filter(Boolean));
    const additional = dress.images.map((image, position) => {
      const publicId = image.publicId || image.cloudinaryId || '';
      return { publicId, width: image.width || 800, height: image.height || 0, alt: image.alt || base.alt || base.name, position, imageUrl: publicIdImageUrl(publicId, image.width || 800, cloudName) };
    }).filter((image) => image.publicId && !known.has(image.publicId));
    base.images = [...(base.images || []), ...additional];
  }
  if ((!base.hasSizes || !base.sizes?.length) && Array.isArray(dress.sizes) && dress.sizes.length) {
    base.sizes = dress.sizes;
    base.hasSizes = true;
  }
  if (base.mrp == null && dress.oldPrice != null) base.mrp = dress.oldPrice;
  if (!base.details?.fabric && !base.details?.care && !base.details?.notes) base.details = dress.details || base.details;
  return base;
}

function installShopRoutes(app, { mongoose, Product, productWithImage, frontendRoot, cloudName }) {
  const db = () => mongoose.connection.db;
  const configPath = path.join(frontendRoot, 'shop', 'shop-config.json');
  const safeConfig = () => {
    try {
      const value = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const imagePublicId = value.authImagePublicId || '';
      const authImage = publicIdImageUrl(imagePublicId, 960, cloudName);
      return {
        requireLoginForProduct: value.requireLoginForProduct !== false,
        authImagePublicId: imagePublicId,
        authImageUrl: authImage,
        authImageSrcset: [480, 720, 960, 1280].map((width) => `${publicIdImageUrl(imagePublicId, width, cloudName)} ${width}w`).filter((entry) => !entry.startsWith(' ')).join(', '),
        authBrandLine: String(value.authBrandLine || ''),
        authNote: String(value.authNote || ''),
        pincodeMessage: String(value.pincodeMessage || ''),
        trust: Object.fromEntries(['freeShipping', 'returns', 'cashOnDelivery', 'assuredQuality'].map((key) => [key, {
          enabled: Boolean(value.trust?.[key]?.enabled), text: String(value.trust?.[key]?.text || ''),
        }])),
      };
    } catch (error) {
      console.error(`Shop config unavailable: ${error.message}`);
      return { requireLoginForProduct: true, authImageUrl: '', authImageSrcset: '', authBrandLine: '', authNote: '', pincodeMessage: '', trust: {} };
    }
  };

  app.get('/api/shop/config', (_request, response) => {
    response.set('Cache-Control', 'no-store');
    response.json({ data: safeConfig() });
  });

  app.get('/api/shop/products', async (request, response) => {
    try {
      const filter = { isActive: { $ne: false }, mergedInto: { $exists: false } };
      if (request.query.category) filter.category = String(request.query.category);
      const products = await Product.find(filter).sort({ section: 1, position: 1, name: 1 }).lean();
      const details = products.length
        ? await db().collection('admin_dress_details').find({ _id: { $in: products.map((product) => product._id) } }).toArray()
        : [];
      const detailsById = new Map(details.map((entry) => [String(entry._id), entry]));
      const detailed = products.map((product) => addDressDetails(product, detailsById.get(String(product._id)), cloudName));
      response.set('Cache-Control', 'no-store');
      response.json({ data: detailed.map(productWithImage) });
    } catch (error) {
      console.error(`Shop catalog lookup failed: ${error.message}`);
      response.status(500).json({ message: 'The shop catalog could not be loaded.' });
    }
  });

  app.get('/api/shop/products/:identifier', async (request, response) => {
    try {
      const identifier = String(request.params.identifier || '');
      const query = /^[a-f\d]{24}$/i.test(identifier) ? { _id: identifier } : { slug: identifier };
      const found = await Product.findOne({ ...query, isActive: { $ne: false }, mergedInto: { $exists: false } }).lean();
      const dress = found ? await db().collection('admin_dress_details').findOne({ _id: found._id }) : null;
      const product = found ? addDressDetails(found, dress, cloudName) : null;
      if (!product) return response.status(404).json({ message: 'Product not found.' });
      response.json({ data: productWithImage(product) });
    } catch (error) {
      console.error(`Shop product lookup failed: ${error.message}`);
      response.status(500).json({ message: 'Product details could not be loaded.' });
    }
  });

  app.get('/api/shop/auth/me', async (request, response) => {
    try {
      const id = sessionCustomerId(request);
      if (!id || !mongoose.isValidObjectId(id)) return response.status(401).json({ message: 'Sign in to continue.' });
      const customer = await db().collection('customers').findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { name: 1, email: 1, phone: 1 } });
      if (!customer) return response.status(401).json({ message: 'Sign in to continue.' });
      response.json({ data: cleanCustomer(customer) });
    } catch (error) {
      console.error(`Shop session lookup failed: ${error.message}`);
      response.status(500).json({ message: 'Your sign-in could not be checked.' });
    }
  });

  app.post('/api/shop/auth/otp', async (request, response) => {
    const email = String(request.body?.email || '').trim().toLowerCase();
    const phone = String(request.body?.phone || '').replace(/\D/g, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response.status(400).json({ message: 'Enter a valid email address.' });
    if (!/^\d{10}$/.test(phone)) return response.status(400).json({ message: 'Enter a valid 10 digit phone number.' });
    const existing = pendingOtps.get(email);
    const now = Date.now();
    if (existing && now - existing.sentAt < OTP_RESEND_MS) return response.status(429).json({ message: 'Please wait before requesting another code.', retryAfter: Math.ceil((OTP_RESEND_MS - (now - existing.sentAt)) / 1000) });
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    pendingOtps.set(email, { code, phone: `+91${phone}`, sentAt: now, expiresAt: now + OTP_TTL_MS });
    try {
      await db().collection('admin_leads').updateOne(
        { email },
        { $set: { phone: `+91${phone}` }, $setOnInsert: { email, isVerified: false, createdAt: new Date() } },
        { upsert: true },
      );
    } catch (error) {
      pendingOtps.delete(email);
      console.error(`Shop lead could not be saved: ${error.message}`);
      return response.status(503).json({ message: 'Sign in is temporarily unavailable.' });
    }
    if (process.env.NODE_ENV !== 'production') console.log(`[shop OTP] ${email}: ${code}`);
    response.status(202).json({ data: { message: 'Your verification code is ready.', expiresIn: OTP_TTL_MS / 1000, resendAfter: OTP_RESEND_MS / 1000 } });
  });

  app.post('/api/shop/auth/verify', async (request, response) => {
    const email = String(request.body?.email || '').trim().toLowerCase();
    const code = String(request.body?.code || '').trim();
    const pending = pendingOtps.get(email);
    const validCodeFormat = /^\d{6}$/.test(code);
    const pendingExpired = pending && pending.expiresAt < Date.now();
    if (!validCodeFormat || !pending || pendingExpired) {
      if (pending?.expiresAt < Date.now()) pendingOtps.delete(email);
      return response.status(401).json({ message: 'That code is invalid or has expired. Try again.' });
    }
    try {
      const customers = db().collection('customers');
      const customerId = new mongoose.Types.ObjectId();
      await customers.updateOne(
        { email },
        {
          $set: { email, phone: pending.phone, lastLoginAt: new Date() },
          $setOnInsert: { _id: customerId, name: email.split('@')[0].slice(0, 120), createdAt: new Date() },
          $currentDate: { updatedAt: true },
        },
        { upsert: true },
      );
      const customer = await customers.findOne({ email }, { projection: { name: 1, email: 1, phone: 1 } });
      await db().collection('admin_leads').updateOne(
        { email },
        { $set: { isVerified: true, verifiedAt: new Date(), phone: pending.phone }, $setOnInsert: { email, createdAt: new Date() } },
        { upsert: true },
      );
      pendingOtps.delete(email);
      setSession(response, customer._id);
      response.json({ data: cleanCustomer(customer) });
    } catch (error) {
      console.error(`Shop OTP verification failed: ${error.message}`);
      response.status(500).json({ message: 'Your sign-in could not be completed.' });
    }
  });

  app.post('/api/shop/auth/logout', (_request, response) => {
    clearSession(response);
    response.status(204).end();
  });

  app.post('/api/shop/cart/validate', async (request, response) => {
    try {
      const rows = Array.isArray(request.body?.items) ? request.body.items.slice(0, 50) : [];
      const results = await Promise.all(rows.map(async (entry) => {
        const identifier = String(entry.productId || '');
        const productQuery = /^[a-f\d]{24}$/i.test(identifier) ? { _id: identifier } : { slug: identifier };
        const product = await Product.findOne({ ...productQuery, isActive: { $ne: false }, mergedInto: { $exists: false } }).lean();
        if (!product) return { productId: identifier, size: String(entry.size || ''), quantity: 0, available: false, message: 'This style is no longer available.' };
        const size = String(entry.size || '');
        const stock = productStock(product, size);
        const quantity = Math.max(1, Math.min(99, Math.floor(Number(entry.quantity) || 1)));
        const price = Number(product.price);
        const available = Number.isFinite(price) && price >= 0 && stock > 0 && (!product.hasSizes || (product.sizes || []).some((row) => (row.label || row.size) === size));
        return {
          productId: String(product._id), slug: product.slug || '', size, quantity: available ? Math.min(quantity, stock) : 0,
          available, message: !stock ? 'This style is sold out.' : quantity > stock ? `Quantity updated to ${stock}.` : '',
          price: Number.isFinite(price) ? price : null, stock, product: productWithImage(product),
        };
      }));
      response.json({ data: results });
    } catch (error) {
      console.error(`Shop bag validation failed: ${error.message}`);
      response.status(500).json({ message: 'Your bag could not be checked.' });
    }
  });
}

module.exports = { installShopRoutes };
