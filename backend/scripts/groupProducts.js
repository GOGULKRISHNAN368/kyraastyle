require('dotenv').config({ path: require('node:path').resolve(__dirname, '..', '.env'), override: true });

const mongoose = require('mongoose');

const CLOUD_NAME = 'l8xwk9bz';
const GROUPS = [
  { name: 'White Floral Kurti Set', category: 'Kurta Sets', ids: ['White_Kurti_1', 'White_Kurti_2', 'White_Kurti_3', 'White_Kurti_4'], price: 1499, mrp: 1999, stock: 25, sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
  { name: 'Pink Printed Kurti Set', category: 'Kurta Sets', ids: ['Pink_Kurti_2', 'Pink_Kurti_3', 'Pink_Kurti_4', 'Pink_Kurti_5'], price: 1799, mrp: 2299, stock: 20, sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
  { name: 'Black Kurti', category: 'Kurta Sets', ids: ['Black_Kurti_3'], price: 1299, mrp: 1699, stock: 15, sizes: ['S', 'M', 'L', 'XL'] },
  { name: 'Green Kurti', category: 'Kurta Sets', ids: ['Green_Kurti_1'], price: 1399, mrp: 1799, stock: 15, sizes: ['S', 'M', 'L', 'XL'] },
  { name: 'Ice Blue Kurti', category: 'Kurta Sets', ids: ['IceBlue_Kurti_1'], price: 1399, mrp: 1799, stock: 10, sizes: ['S', 'M', 'L', 'XL'] },
  { name: 'Short Top', category: 'Short Tops', ids: ['Short_Tops_1', 'Short_Tops_2', 'Short_Tops_3'], price: 899, mrp: 1199, stock: 30, sizes: ['XS', 'S', 'M', 'L', 'XL'] },
  { name: 'Salwar Suit, Style 1', category: 'Salwar Suits', ids: ['Salwar_1'], price: 1999, mrp: 2599, stock: 10, sizes: ['S', 'M', 'L', 'XL'] },
  { name: 'Salwar Suit, Style 2', category: 'Salwar Suits', ids: ['Salwar_Suits_1'], price: 1999, mrp: 2599, stock: 10, sizes: ['S', 'M', 'L', 'XL'] },
  { name: 'Unstitched Kurti Material, Green', category: 'Unstitched', ids: ['Unstiched_Kurti_Material_Green'], price: 1099, mrp: 1499, stock: 20, sizes: [] },
  { name: 'Unstitched Kurti Material, Ice Blue', category: 'Unstitched', ids: ['Unstiched_Kurti_Material_IceBlue'], price: 1099, mrp: 1499, stock: 20, sizes: [] },
  { name: 'Unstitched Kurti Material, Pink', category: 'Unstitched', ids: ['Unstiched_Kurti_Material_Pink'], price: 1099, mrp: 1499, stock: 20, sizes: [] },
  { name: 'Unstitched Kurti Material, White', category: 'Unstitched', ids: ['Unstiched_Kurti_Material_White'], price: 1099, mrp: 1499, stock: 20, sizes: [] },
  { name: 'Unstitched Kurti Material, Black', category: 'Unstitched', ids: ['Unstiched_Kurti_Material_Black'], price: 1099, mrp: 1499, stock: 20, sizes: [] },
];

function slugFromName(name) {
  return name.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getBackupName(date = new Date()) {
  return `products_backup_${date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`;
}

function splitStock(total, labels) {
  if (!labels.length) return [];
  const each = Math.floor(total / labels.length);
  const remainder = total % labels.length;
  const middle = Math.floor(labels.length / 2);
  return labels.map((label, index) => ({ label, stock: each + (index === middle ? remainder : 0) }));
}

function imageUrl(publicId, width) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto:best,c_limit,w_${width}/${publicId}`;
}

function formatIndex(index) {
  return `${JSON.stringify(index.key)}${index.unique ? ' unique' : ''}${index.sparse ? ' sparse' : ''}`;
}

async function inspectPlan(collection, dryRun, backupName) {
  const [documents, indexes] = await Promise.all([collection.find({}).toArray(), collection.listIndexes().toArray()]);
  const byPublicId = new Map(documents.map((document) => [document.cloudinaryId, document]));
  const slugCounts = new Map();
  for (const document of documents) if (document.slug) slugCounts.set(document.slug, (slugCounts.get(document.slug) || 0) + 1);
  const duplicateSlugs = [...slugCounts].filter(([, count]) => count > 1).map(([slug]) => slug);
  const plan = GROUPS.map((group, index) => {
    const slug = slugFromName(group.name);
    const slugMatches = documents.filter((document) => document.slug === slug);
    const primarySource = byPublicId.get(group.ids[0]);
    const slugTarget = slugMatches[0];
    const productTarget = slugTarget || primarySource;
    const sources = group.ids.map((publicId) => byPublicId.get(publicId) || null);
    return { group, index, slug, slugTarget, primarySource, productTarget, sources };
  });
  const blockers = [];
  if (duplicateSlugs.length) blockers.push(`Slug duplicates prevent a unique slug index: ${duplicateSlugs.join(', ')}`);
  for (const item of plan) {
    if (item.slugTarget && item.primarySource && String(item.slugTarget._id) !== String(item.primarySource._id)) {
      blockers.push(`${item.group.name}: slug document and primary image document are different records; the unique cloudinaryId cannot be kept on both.`);
    }
  }
  const slugIndex = indexes.find((index) => index.key?.slug === 1);
  if (slugIndex && (!slugIndex.unique || !slugIndex.sparse)) blockers.push(`Existing slug index (${slugIndex.name}) is not unique and sparse; it will not be dropped or replaced.`);
  for (const field of ['isNewArrival', 'price']) {
    const index = indexes.find((entry) => entry.key?.[field] === 1 && Object.keys(entry.key).length === 1);
    if (index?.unique) blockers.push(`Existing ${field} index (${index.name}) is unique; it will not be dropped or replaced.`);
  }
  const createdTimes = plan.map((item) => {
    const value = item.productTarget?.createdAt;
    const timestamp = value ? new Date(value).getTime() : null;
    return Number.isFinite(timestamp) ? timestamp : null;
  });
  const distinctTimes = new Set(createdTimes.filter((time) => time !== null));
  const equalTimestamps = createdTimes.every((time) => time === null) || distinctTimes.size === 1;
  const newArrivalIndices = equalTimestamps
    ? new Set(plan.slice(0, 8).map((item) => item.index))
    : new Set([...plan].sort((a, b) => {
      const aTime = a.productTarget?.createdAt ? new Date(a.productTarget.createdAt).getTime() : -Infinity;
      const bTime = b.productTarget?.createdAt ? new Date(b.productTarget.createdAt).getTime() : -Infinity;
      return bTime - aTime || a.index - b.index;
    }).slice(0, 3).map((item) => item.index));
  for (const item of plan) item.isNewArrival = newArrivalIndices.has(item.index);
  const groupedPublicIds = new Set(GROUPS.flatMap((group) => group.ids));
  const ungroupedCount = documents.filter((document) => !groupedPublicIds.has(document.cloudinaryId) && !document.mergedInto).length;
  const missingPublicIds = plan.flatMap((item) => item.group.ids.filter((publicId, position) => !item.sources[position]).map((publicId) => ({ group: item.group.name, publicId })));

  console.log(`Mode: ${dryRun ? 'DRY RUN (read-only)' : 'APPLY'}`);
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Products currently in collection: ${documents.length}`);
  console.log(`Proposed backup collection: ${backupName}`);
  console.log(`Current indexes: ${indexes.map(formatIndex).join(' | ')}`);
  console.log(`Indexes to add without dropping existing indexes: slug unique+sparse, isNewArrival, price`);
  console.log(`Product groups planned: ${plan.length}`);
  console.log(`Image Public IDs in group list: ${groupedPublicIds.size}`);
  console.log(`Existing image documents matched: ${groupedPublicIds.size - missingPublicIds.length}/${groupedPublicIds.size}`);
  console.log(`Existing ungrouped documents to leave untouched: ${ungroupedCount}`);
  console.log(`New arrivals: ${equalTimestamps ? 'timestamps are tied/missing; first 8 groups' : '3 groups with newest primary-product timestamps'}`);
  for (const item of plan) {
    const targetId = item.productTarget?._id ? String(item.productTarget._id) : '(new product document)';
    const found = item.sources.filter(Boolean).length;
    const mergeCount = item.sources.slice(1).filter(Boolean).length;
    console.log(`- ${item.group.name} [${item.slug}] target=${targetId}; images=${item.group.ids.length}; sourceDocs=${found}; merge=${mergeCount}; stock=${item.group.stock}; sizes=${item.group.sizes.length ? item.group.sizes.map((size, i) => `${size}:${splitStock(item.group.stock, item.group.sizes)[i].stock}`).join(',') : 'none'}; newArrival=${item.isNewArrival}`);
  }
  if (missingPublicIds.length) console.log(`Listed IDs without source documents (will be represented from the approved group list using width 800): ${missingPublicIds.map((entry) => `${entry.group}=${entry.publicId}`).join(' | ')}`);
  if (blockers.length) {
    console.log('BLOCKERS:');
    for (const blocker of blockers) console.log(`- ${blocker}`);
  }
  return { documents, indexes, plan, blockers, missingPublicIds };
}

async function copyBackup(db, source, backupName, sourceCount, indexes) {
  if (await db.listCollections({ name: backupName }, { nameOnly: true }).hasNext()) throw new Error(`Backup collection already exists: ${backupName}. No data was changed.`);
  const docs = await source.find({}).toArray();
  let backup;
  try {
    await db.createCollection(backupName);
    backup = db.collection(backupName);
    if (docs.length) await backup.insertMany(docs, { ordered: true });
    for (const index of indexes) {
      if (index.name === '_id_') continue;
      const options = { name: index.name };
      for (const key of ['unique', 'sparse', 'expireAfterSeconds', 'partialFilterExpression', 'collation']) {
        if (index[key] !== undefined) options[key] = index[key];
      }
      await backup.createIndex(index.key, options);
    }
    const backupCount = await backup.countDocuments({});
    if (backupCount !== sourceCount) throw new Error(`Backup count mismatch: source=${sourceCount}, backup=${backupCount}.`);
    return backupCount;
  } catch (error) {
    throw new Error(`Backup failed (${backupName}); migration aborted. Any partial backup was left in place. ${error.message}`);
  }
}

async function applyPlan(db, collection, { documents, indexes, plan, blockers }, backupName) {
  if (blockers.length) throw new Error('Preflight blockers found; no backup or migration writes were performed.');
  const backupCount = await copyBackup(db, collection, backupName, documents.length, indexes);
  console.log(`Backup confirmed: ${backupName} (${backupCount} documents, existing indexes copied).`);
  const now = new Date();
  for (const item of plan) {
    const { group, slug, productTarget, sources } = item;
    const primary = sources[0];
    const imageDocs = group.ids.map((publicId, index) => {
      const source = sources[index];
      const width = Number(source?.width) > 0 ? Number(source.width) : 800;
      const height = Number(source?.height) >= 0 ? Number(source.height) : 0;
      return { publicId, width, height, alt: source?.alt || group.name, position: index };
    });
    const sizeRows = splitStock(group.stock, group.sizes);
    const targetId = productTarget?._id || new mongoose.Types.ObjectId();
    const values = {
      name: group.name,
      category: group.category,
      section: productTarget?.section || primary?.section || 'curated',
      position: Number.isInteger(productTarget?.position) ? productTarget.position : item.index,
      cloudinaryId: group.ids[0],
      width: imageDocs[0].width,
      height: imageDocs[0].height,
      imageUrl: imageUrl(group.ids[0], imageDocs[0].width),
      alt: imageDocs[0].alt,
      slug,
      subtitle: productTarget?.subtitle || '',
      description: productTarget?.description || '',
      details: productTarget?.details || {},
      occasion: productTarget?.occasion || [],
      price: group.price,
      mrp: group.mrp,
      sizes: sizeRows,
      hasSizes: sizeRows.length > 0,
      stock: sizeRows.length ? sizeRows.reduce((sum, size) => sum + size.stock, 0) : group.stock,
      images: imageDocs,
      isNewArrival: item.isNewArrival,
      tags: productTarget?.tags || [],
      isActive: productTarget?.isActive !== false,
      updatedAt: now,
    };
    if (productTarget) {
      await collection.updateOne({ _id: targetId }, { $set: values, $unset: { mergedInto: '' } });
    } else {
      await collection.insertOne({ _id: targetId, ...values, createdAt: now });
    }
    for (const source of sources.slice(1).filter(Boolean)) {
      await collection.updateOne({ _id: source._id }, { $set: { isActive: false, mergedInto: targetId, updatedAt: now } });
    }
  }
  const indexSpecs = [
    { key: { slug: 1 }, options: { unique: true, sparse: true } },
    { key: { isNewArrival: 1 }, options: {}, field: 'isNewArrival' },
    { key: { price: 1 }, options: {}, field: 'price' },
  ];
  for (const spec of indexSpecs) {
    const exists = indexes.some((index) => JSON.stringify(index.key) === JSON.stringify(spec.key));
    if (!exists) await collection.createIndex(spec.key, spec.options);
  }
  console.log(`Migration complete. Backup collection: ${backupName}`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const dryRun = process.argv.includes('--dry') || !apply;
  if (apply && process.argv.includes('--dry')) throw new Error('Use either --dry or --apply, not both.');
  const backupName = getBackupName();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing from backend/.env.');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || 'test', serverSelectionTimeoutMS: 10000, autoIndex: false });
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('products');
    const plan = await inspectPlan(collection, dryRun, backupName);
    if (dryRun) {
      if (plan.blockers.length) process.exitCode = 2;
      return;
    }
    await applyPlan(db, collection, plan, backupName);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  const message = String(error?.message || error).replace(process.env.MONGODB_URI || '\u0000', '[connection string redacted]');
  console.error(`Product grouping migration stopped: ${message}`);
  process.exitCode = 1;
});
