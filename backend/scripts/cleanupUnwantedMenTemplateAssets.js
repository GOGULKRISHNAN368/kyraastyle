require('dotenv').config({ path: require('node:path').resolve(__dirname, '..', '.env'), override: true });

const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const manifestPath = path.resolve(__dirname, '..', 'template-cloudinary-manifest.json');
const unwantedReference = /^\.\.\/assets\/tr_w-(?:450|750)\/uploads\/(?:product_gallery|instagram_style)\//i;

if (!process.env.MONGODB_URI || !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Set MongoDB and Cloudinary values in backend/.env before running this cleanup.');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function removeDatabaseReferences(database, ids) {
  if (!ids.length) return 0;
  const exactIds = { $in: ids };
  const [products, media, banners, categories, dresses] = await Promise.all([
    database.collection('products').deleteMany({ cloudinaryId: exactIds }),
    database.collection('media').deleteMany({ cloudinaryId: exactIds }),
    database.collection('admin_banners').deleteMany({ $or: [{ desktopCloudinaryId: exactIds }, { mobileCloudinaryId: exactIds }] }),
    database.collection('admin_category_details').deleteMany({ cloudinaryId: exactIds }),
    database.collection('admin_dress_details').updateMany({ 'images.cloudinaryId': exactIds }, { $pull: { images: { cloudinaryId: exactIds } } }),
  ]);
  return products.deletedCount + media.deletedCount + banners.deletedCount + categories.deletedCount + dresses.modifiedCount;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const entries = Object.entries(manifest).filter(([reference]) => unwantedReference.test(reference));
  const ids = entries.map(([, asset]) => asset.publicId).filter(Boolean);
  if (!ids.length) return console.log('No old men-template assets remain in the manifest.');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || 'test', serverSelectionTimeoutMS: 10000 });
  try {
    const databaseChanges = await removeDatabaseReferences(mongoose.connection.db, ids);
    const result = await cloudinary.api.delete_resources(ids, { resource_type: 'image', invalidate: true });
    for (const [reference] of entries) delete manifest[reference];
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Removed ${ids.length} old men-template Cloudinary assets, ${databaseChanges} exact MongoDB reference(s), and ${entries.length} manifest record(s).`);
    console.log(`Cloudinary result: ${JSON.stringify(result.deleted || {})}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(`Men-template cleanup failed: ${error.message}`);
  process.exitCode = 1;
});
