require('dotenv').config({ path: require('node:path').resolve(__dirname, '..', '.env'), override: true });

const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const DB_NAME = process.env.MONGODB_DB || 'test';
const FOLDERS = {
  dresses: 'kryaastyle/dresses',
  categories: 'kryaastyle/categories',
};

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
  isActive: { type: Boolean, default: true },
}, { timestamps: true, collection: 'products' });
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

function slug(value) {
  return String(value || '').normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function nameFromAsset(asset) {
  return String(asset.display_name || asset.public_id.split('/').pop() || asset.public_id)
    .replace(/[_-]+/g, ' ').trim();
}

function categoryFor(name) {
  if (/saree/i.test(name)) return 'Sarees';
  if (/salwar/i.test(name)) return 'Salwar Suits';
  if (/anarkali/i.test(name)) return 'Anarkali Suits';
  if (/frock/i.test(name)) return 'Full Frocks';
  if (/top/i.test(name)) return 'Short Tops';
  if (/office|workwear/i.test(name)) return 'Office Wear';
  if (/kurti|kurta/i.test(name)) return 'Kurta Sets';
  return 'Other';
}

function imageUrl(publicId, width) {
  const safeWidth = Number.isFinite(Number(width)) && Number(width) > 0 ? Math.min(Number(width), 1200) : 800;
  const encodedId = encodeURIComponent(publicId).replace(/%2F/gi, '/');
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto:best,c_limit,w_${safeWidth}/${encodedId}`;
}

async function listFolderImages(folder) {
  const resources = [];
  let cursor;
  do {
    let query = cloudinary.search
      .expression(`resource_type:image AND asset_folder="${folder}"`)
      .sort_by('public_id', 'asc')
      .max_results(500);
    if (cursor) query = query.next_cursor(cursor);
    const page = await query.execute();
    resources.push(...(page.resources || []));
    cursor = page.next_cursor;
  } while (cursor);
  return resources;
}

async function syncDressImages(assets) {
  let synced = 0;
  for (const [position, asset] of assets.entries()) {
    const name = nameFromAsset(asset);
    await Product.updateOne(
      { cloudinaryId: asset.public_id },
      {
        $set: {
          imageUrl: imageUrl(asset.public_id, asset.width),
          width: Number(asset.width) || 800,
          height: Number(asset.height) || 0,
          isActive: true,
        },
        $setOnInsert: {
          name,
          category: categoryFor(name),
          section: 'own-style',
          position,
          cloudinaryId: asset.public_id,
          alt: name,
        },
      },
      { upsert: true, runValidators: true },
    );
    synced += 1;
  }
  return synced;
}

async function syncCategoryImages(assets, categoryNames) {
  const categories = new Map(categoryNames.map((name) => [slug(name), name]));
  const collection = mongoose.connection.db.collection('admin_category_details');
  let synced = 0;
  for (const asset of assets) {
    const assetName = nameFromAsset(asset);
    const categoryName = categories.get(slug(assetName));
    if (!categoryName) continue;
    const id = slug(categoryName);
    await collection.updateOne(
      { _id: id },
      { $set: {
        cloudinaryId: asset.public_id,
        width: Number(asset.width) || 600,
        height: Number(asset.height) || 0,
      }, $setOnInsert: { description: '' } },
      { upsert: true },
    );
    synced += 1;
  }
  return synced;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing from backend/.env.');
  if (!CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are missing from backend/.env.');
  }
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  await mongoose.connect(process.env.MONGODB_URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const [dresses, categoryAssets, settings] = await Promise.all([
    listFolderImages(FOLDERS.dresses),
    listFolderImages(FOLDERS.categories),
    db.collection('settings').findOne({ _id: 'productCategories' }),
  ]);
  const productCount = await syncDressImages(dresses);
  const categoryCount = await syncCategoryImages(categoryAssets, Array.isArray(settings?.categories) ? settings.categories : []);
  console.log(`Cloudinary sync complete: ${productCount} dress images and ${categoryCount} category covers linked to the storefront.`);
}

main()
  .catch((error) => {
    let message = error?.message || 'Unknown Cloudinary sync error.';
    for (const secret of [process.env.MONGODB_URI, process.env.CLOUDINARY_API_KEY, process.env.CLOUDINARY_API_SECRET]) {
      if (secret) message = message.split(secret).join('[redacted]');
    }
    console.error(`Cloudinary image sync failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
