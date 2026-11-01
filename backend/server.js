require('dotenv').config({ path: require('node:path').resolve(__dirname, '.env'), override: true });

const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const DB_NAME = process.env.MONGODB_DB || 'test';
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'l8xwk9bz';
const FRONTEND_ROOT = path.resolve(__dirname, '..', 'frontend');

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is missing from backend/.env. Add it before starting the backend.');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, index: true },
  section: { type: String, index: true },
  position: Number,
  cloudinaryId: { type: String, required: true, unique: true },
  imageUrl: String,
  width: Number,
  height: Number,
  alt: String,
  price: { type: Number, min: 0 },
  link: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true, collection: 'products' });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const mediaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  cloudinaryUrl: { type: String, required: true },
  cloudinaryId: { type: String, required: true },
  resourceType: { type: String, enum: ['image', 'video'], required: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'media' });
const Media = mongoose.models.Media || mongoose.model('Media', mediaSchema);

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || 'test',
    serverSelectionTimeoutMS: 10000
  });
  console.log(`MongoDB connected: ${DB_NAME}`);
}

app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:8000';
  if (req.headers.origin === origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

function productWithImage(product) {
  const item = product.toObject ? product.toObject() : product;
  const width = Number.isFinite(item.width) && item.width > 0 ? Math.min(item.width, 1200) : 800;
  return {
    ...item,
    imageUrl: item.imageUrl || `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto:best,c_limit,w_${width}/${encodeURIComponent(item.cloudinaryId).replace(/%2F/g, '/')}`
  };
}

app.get('/api/products', async (req, res) => {
  try {
    const filter = { isActive: { $ne: false } };
    if (req.query.section) filter.section = req.query.section;
    if (req.query.category) filter.category = req.query.category;
    const products = await Product.find(filter).sort({ section: 1, position: 1, name: 1 }).lean();
    res.json(products.map(productWithImage));
  } catch (error) {
    console.error('Product lookup failed:', error.message);
    res.status(500).json({ error: 'Unable to load products.' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ cloudinaryId: req.params.id, isActive: { $ne: false } });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(productWithImage(product));
  } catch (error) {
    console.error('Product lookup failed:', error.message);
    res.status(500).json({ error: 'Unable to load product.' });
  }
});

// Public, read-only content bridge for the customer storefront. Admin writes
// remain protected by the separate admin API; this endpoint only returns data
// intended to be visible to shoppers.
function storefrontCategoryKey(name) {
  return String(name || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';
}

function storefrontImageUrl(cloudinaryId, width = 800) {
  const safeWidth = Number.isFinite(Number(width)) && Number(width) > 0 ? Math.min(Number(width), 1200) : 800;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto:best,c_limit,w_${safeWidth}/${encodeURIComponent(cloudinaryId).replace(/%2F/g, '/')}`;
}

app.get('/api/storefront/content', async (_req, res) => {
  try {
    const db = mongoose.connection.db;
    const now = new Date();
    const [products, settings, announcements, coupons, reels, instagramPosts] = await Promise.all([
      Product.find({ isActive: { $ne: false } }).sort({ section: 1, position: 1, name: 1 }).lean(),
      db.collection('settings').findOne({ _id: 'productCategories' }),
      db.collection('admin_announcements').find({}).sort({ createdAt: -1 }).toArray(),
      db.collection('admin_coupons').find({ isActive: true, expiryDate: { $gte: now }, $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] }).sort({ createdAt: -1 }).toArray(),
      db.collection('admin_reels').find({ isActive: { $ne: false } }).sort({ createdAt: -1 }).toArray(),
      db.collection('admin_instagram_posts').find({}).sort({ position: 1, createdAt: -1 }).toArray(),
    ]);
    const ids = products.map((product) => product._id);
    const [details, categoryDetails] = await Promise.all([
      ids.length ? db.collection('admin_dress_details').find({ _id: { $in: ids } }).toArray() : [],
      db.collection('admin_category_details').find({}).toArray(),
    ]);
    const detailsByProduct = new Map(details.map((item) => [String(item._id), item]));
    const productPayload = products.map((product) => {
      const dress = detailsByProduct.get(String(product._id)) || {};
      return {
        id: String(product._id), name: product.name, category: product.category, section: product.section || '',
        position: product.position || 0, imageUrl: productWithImage(product).imageUrl, alt: product.alt || product.name,
        price: product.price ?? null, description: product.description || '', link: product.link || '',
        oldPrice: dress.oldPrice ?? null, sizes: dress.sizes || [],
        images: (dress.images || []).map((image) => ({ imageUrl: storefrontImageUrl(image.cloudinaryId, image.width), width: image.width, height: image.height })),
        isNewArrival: Boolean(dress.isNewArrival), isBestSeller: Boolean(dress.isBestSeller), isCuratedLook: Boolean(dress.isCuratedLook),
      };
    });
    const countByCategory = new Map();
    productPayload.forEach((product) => countByCategory.set(product.category, (countByCategory.get(product.category) || 0) + 1));
    const categoryById = new Map(categoryDetails.map((item) => [item._id, item]));
    const categoryNames = Array.isArray(settings?.categories) ? settings.categories : [];
    const categories = categoryNames.map((name) => {
      const key = storefrontCategoryKey(name);
      const metadata = categoryById.get(key);
      const productCover = productPayload.find((product) => product.category === name);
      return {
        id: key, name, description: metadata?.description || '',
        imageUrl: metadata?.cloudinaryId ? storefrontImageUrl(metadata.cloudinaryId, metadata.width || 600) : productCover?.imageUrl || '',
        productCount: countByCategory.get(name) || 0,
      };
    });
    const couponPayload = coupons.filter((coupon) => coupon.usageLimit == null || coupon.usedCount < coupon.usageLimit).map((coupon) => ({
      code: coupon.code, expiryDate: coupon.expiryDate, discountType: coupon.discountType,
      discountValue: coupon.discountValue, minimumPurchase: coupon.minimumPurchase || 0,
      applicableProductIds: (coupon.applicableProductIds || []).map(String),
    }));
    const reelPayload = reels.map((reel) => ({
      id: String(reel._id), category: reel.category, productName: reel.productName,
      mediaType: reel.mediaType || 'video', mediaUrl: reel.mediaUrl, thumbnailUrl: reel.thumbnailUrl,
    }));
    const instagramPayload = instagramPosts.map((post) => ({
      id: String(post._id), alt: post.originalName || 'Kryaa Style collection',
      imageUrl: `/api/storefront/instagram-posts/${post._id}/image`,
    }));
    res.set('Cache-Control', 'no-store');
    res.json({ data: { products: productPayload, categories, announcements: announcements.map(({ _id, text, createdAt }) => ({ id: String(_id), text, createdAt })), coupons: couponPayload, reels: reelPayload, instagramPosts: instagramPayload } });
  } catch (error) {
    console.error('Storefront content lookup failed:', error.message);
    res.status(500).json({ error: 'Unable to load storefront content.' });
  }
});

app.get('/api/storefront/instagram-posts/:id/image', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.sendStatus(404);
    const post = await mongoose.connection.db.collection('admin_instagram_posts').findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
    if (!post || !/^[a-f\d]{24}\.(jpg|png|webp|avif)$/.test(post.fileName || '')) return res.sendStatus(404);
    const imagePath = path.resolve(__dirname, 'admin', 'api', 'uploads', 'instagram', post.fileName);
    res.set({ 'Content-Type': post.mimeType, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(imagePath).on('error', () => { if (!res.headersSent) res.sendStatus(404); }).pipe(res);
  } catch (_error) { res.sendStatus(404); }
});

// Preserve the existing upload route and its `media` collection.
const upload = multer({ dest: path.join(__dirname, 'uploads') });
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const isVideo = req.file.mimetype.startsWith('video/');
    const uploaded = await cloudinary.uploader.upload(req.file.path, {
      resource_type: isVideo ? 'video' : 'image',
      folder: 'app_uploads'
    });
    const media = await Media.create({
      title: req.body.title || req.file.originalname,
      cloudinaryUrl: uploaded.secure_url,
      cloudinaryId: uploaded.public_id,
      resourceType: isVideo ? 'video' : 'image'
    });
    res.status(201).json({ message: 'Successfully uploaded to Cloudinary and saved to MongoDB Atlas!', data: media });
  } catch (error) {
    console.error('Upload Process Failed:', error.message);
    res.status(500).json({ error: 'Server integration failed.', details: error.message });
  }
});

// Keep the legacy static paths available for callers that use backend/server.js to serve the site.
app.use(express.static(FRONTEND_ROOT));

connectDB()
  .then(() => app.listen(Number.isInteger(PORT) && PORT > 0 && PORT <= 65535 ? PORT : 3000, () => {
    console.log(`Kyraa Style API running on port ${PORT}`);
  }))
  .catch((error) => {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  });
