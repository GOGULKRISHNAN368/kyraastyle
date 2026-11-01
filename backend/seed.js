require('dotenv').config({ path: require('node:path').resolve(__dirname, '.env'), override: true });

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'l8xwk9bz';
const DB_NAME = process.env.MONGODB_DB || 'test';
const REAL_IMAGES_DIR = path.resolve(__dirname, '..', 'frontend', 'Real_Imgs');
const verifiedCloudinaryIds = new Set([
  'Black_Kurti_3', 'Green_Kurti_1', 'IceBlue_Kurti_1', 'Pink_Kurti_2', 'Salwar_1', 'Salwar_Suits_1',
  'Short_Tops_1', 'Short_Tops_2', 'Short_Tops_3', 'Unstiched_Kurti_Material_Black',
  'Unstiched_Kurti_Material_Green', 'Unstiched_Kurti_Material_IceBlue', 'Unstiched_Kurti_Material_Pink',
  'Unstiched_Kurti_Material_White', 'White_Kurti_1', 'White_Kurti_2', 'White_Kurti_3', 'White_Kurti_4'
]);

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

function sectionFor(name) {
  if (/lookbook|wedding|sangeet|reception|festival|celebration/i.test(name)) return 'lookbook';
  if (/own.?style|real.?img|unstiched|unstitched|short.?tops/i.test(name)) return 'own-style';
  return 'curated';
}

function getRealImageIds() {
  const supportedTypes = new Set(['.png', '.jpg', '.jpeg', '.webp', '.dng']);
  const uniqueIds = new Set();
  for (const fileName of fs.readdirSync(REAL_IMAGES_DIR)) {
    const extension = path.extname(fileName).toLowerCase();
    const filePath = path.join(REAL_IMAGES_DIR, fileName);
    if (!supportedTypes.has(extension) || fs.statSync(filePath).size === 0) continue;
    uniqueIds.add(path.basename(fileName, path.extname(fileName)));
  }
  return [...uniqueIds].sort((a, b) => a.localeCompare(b));
}

async function seed() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing from backend/.env.');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${DB_NAME}`);
  const localIds = getRealImageIds();
  const cloudinaryIds = localIds.filter((id) => verifiedCloudinaryIds.has(id));
  const unavailableIds = localIds.filter((id) => !verifiedCloudinaryIds.has(id));
  let upserted = 0;
  for (let index = 0; index < cloudinaryIds.length; index += 1) {
    const cloudinaryId = cloudinaryIds[index];
    const name = cloudinaryId.replace(/[_-]+/g, ' ');
    const imageUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto:best,c_limit,w_800/${encodeURIComponent(cloudinaryId)}`;
    await Product.updateOne(
      { cloudinaryId },
      { $set: {
        name,
        imageUrl,
        category: categoryFor(name),
        section: 'own-style',
        position: index,
        alt: name,
        isActive: true
      } },
      { upsert: true, runValidators: true }
    );
    upserted += 1;
  }
  if (unavailableIds.length) {
    await Product.updateMany({ cloudinaryId: { $in: unavailableIds } }, { $set: { isActive: false } });
  }
  console.log(`Seed complete: ${upserted} verified Real_Imgs Cloudinary references active in ${DB_NAME}.products; ${unavailableIds.length} unmatched IDs excluded from the API.`);
}

seed()
  .catch((error) => {
    let message = error?.message || error?.error?.message;
    if (typeof message !== 'string' || !message.trim()) {
      message = 'Cloudinary returned an empty error response. Check the API credentials and asset access.';
    }
    for (const secret of [process.env.MONGODB_URI, process.env.CLOUDINARY_API_KEY, process.env.CLOUDINARY_API_SECRET]) {
      if (secret) message = message.split(secret).join('[redacted]');
    }
    console.error(`Cloudinary product seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
