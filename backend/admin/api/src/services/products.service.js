import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { buildProductImageUrl } from '../config/cloudinary.js';
import { getProductCategories } from './settings.service.js';
import { emptyDressDetails, getDressDetails, getDressDetailsMap, saveDressDetails } from './dressDetails.service.js';

export class ProductError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const legacyFields = ['isBestSeller', 'isCuratedLook', 'isEditorsPick', 'isOccasionPick', 'isLuxeCollection'];
const allowedFields = new Set([
  'name', 'category', 'section', 'position', 'cloudinaryId', 'imageUrl', 'width', 'height', 'alt', 'price', 'mrp', 'oldPrice',
  'slug', 'subtitle', 'description', 'details', 'occasion', 'sizes', 'hasSizes', 'stock', 'images', 'isNewArrival', 'tags', 'link', 'isActive',
  ...legacyFields,
]);
const allowedSort = new Set(['name', 'category', 'section', 'position', 'createdAt', 'price', 'updatedAt']);
const MAX_IMAGES = 20;

function escapedRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function slugFromName(value) {
  return String(value || '').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
}

function parseNumber(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false, optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    throw new ProductError(`${field} is required.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
    throw new ProductError(`${field} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}.`);
  }
  return number;
}

function parseTextList(value, field) {
  const values = typeof value === 'string' ? value.split(',') : value;
  if (!Array.isArray(values) || values.some((item) => typeof item !== 'string')) throw new ProductError(`${field} must be a list of text values.`);
  const normalized = [...new Set(values.map((item) => item.trim()).filter(Boolean))];
  if (normalized.some((item) => item.length > 100)) throw new ProductError(`${field} values must be 100 characters or fewer.`);
  return normalized;
}

function normalizeSizeRows(rows) {
  if (!Array.isArray(rows)) throw new ProductError('Sizes must be a list.');
  if (rows.length > 30) throw new ProductError('A product can have up to 30 size options.');
  const labels = new Set();
  return rows.map((entry) => {
    const label = typeof entry?.label === 'string' ? entry.label.trim() : typeof entry?.size === 'string' ? entry.size.trim() : '';
    const rawStock = entry?.stock ?? (entry?.available === false ? 0 : entry?.quantity);
    if (!label || label.length > 24 || labels.has(label.toLowerCase())) throw new ProductError('Each size needs a unique label of 1 to 24 characters.');
    labels.add(label.toLowerCase());
    return { label, stock: parseNumber(rawStock ?? 0, `Stock for ${label}`, { min: 0, integer: true }) };
  });
}

function normalizeImages(rows, primary, fallback = {}) {
  if (rows !== undefined && !Array.isArray(rows)) throw new ProductError('Images must be a list.');
  const imageRows = (rows || []).map((image, index) => {
    const publicId = typeof image?.publicId === 'string' ? image.publicId.trim()
      : typeof image?.cloudinaryId === 'string' ? image.cloudinaryId.trim() : '';
    if (!publicId || publicId.length > 255) throw new ProductError('Each image needs a valid Cloudinary Public ID.');
    return {
      publicId,
      width: parseNumber(image.width ?? 800, 'Image width', { min: 1, max: 12000, integer: true }),
      height: parseNumber(image.height ?? 0, 'Image height', { min: 0, max: 12000, integer: true }),
      alt: typeof image.alt === 'string' ? image.alt.trim().slice(0, 500) : '',
      position: parseNumber(image.position ?? index, 'Image position', { min: 0, max: 10000, integer: true }),
    };
  });
  let primaryId = typeof primary === 'string' ? primary.trim() : '';
  if (!primaryId) primaryId = imageRows[0]?.publicId || '';
  if (primaryId) {
    let primaryImage = imageRows.find((image) => image.publicId === primaryId);
    if (!primaryImage) {
      primaryImage = {
        publicId: primaryId,
        width: parseNumber(fallback.width ?? 800, 'Image width', { min: 1, max: 12000, integer: true }),
        height: parseNumber(fallback.height ?? 0, 'Image height', { min: 0, max: 12000, integer: true }),
        alt: typeof fallback.alt === 'string' ? fallback.alt.trim().slice(0, 500) : '',
        position: 0,
      };
      imageRows.unshift(primaryImage);
    }
    imageRows.splice(imageRows.indexOf(primaryImage), 1);
    imageRows.unshift({ ...primaryImage, position: 0 });
  }
  if (imageRows.length < 1) throw new ProductError('Add at least one product image.');
  if (imageRows.length > MAX_IMAGES) throw new ProductError(`A product can have up to ${MAX_IMAGES} images.`);
  return imageRows.map((image, position) => ({ ...image, position }));
}

function normalizeDetails(value, existing = {}) {
  if (value === undefined) return existing || {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProductError('Details must be an object.');
  const allowed = ['fabric', 'care', 'notes'];
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) throw new ProductError(`Unsupported detail field: ${unknown}.`);
  const result = { ...(existing || {}) };
  for (const field of allowed) {
    if (Object.hasOwn(value, field)) {
      if (typeof value[field] !== 'string') throw new ProductError(`${field} must be text.`);
      result[field] = value[field].trim();
    }
  }
  for (const [field, limit] of [['fabric', 500], ['care', 2000], ['notes', 5000]]) {
    if ((result[field] || '').length > limit) throw new ProductError(`${field} must be ${limit} characters or fewer.`);
  }
  return result;
}

function normalizeLegacySizes(rows) {
  if (!Array.isArray(rows)) return emptyDressDetails().sizes;
  if (rows.some((row) => Object.hasOwn(row || {}, 'label'))) {
    const legacySizes = emptyDressDetails().sizes;
    for (const row of rows) {
      const found = legacySizes.find((size) => size.size === row.label);
      if (found) { found.available = Number(row.stock) > 0; found.quantity = Number(row.stock) || 0; }
    }
    return legacySizes;
  }
  return rows;
}

async function validateProductInput(input, existing = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ProductError('Product details must be an object.');
  const unknown = Object.keys(input).find((field) => !allowedFields.has(field));
  if (unknown) throw new ProductError(`Unsupported product field: ${unknown}.`);
  const value = { ...existing };
  for (const field of ['name', 'category', 'section', 'alt', 'description', 'subtitle', 'link']) {
    if (Object.hasOwn(input, field)) {
      if (typeof input[field] !== 'string') throw new ProductError(`${field} must be text.`);
      value[field] = input[field].trim();
    }
  }
  value.name = value.name?.trim();
  value.category = value.category?.trim() || 'Store';
  value.mrp ??= value.oldPrice ?? null;
  if (!value.name) throw new ProductError('Product name is required.');
  if (!(await getProductCategories()).includes(value.category)) throw new ProductError('Choose a category from the allowed list.');
  if (Object.hasOwn(input, 'position')) value.position = parseNumber(input.position, 'Position', { integer: true });
  if (Object.hasOwn(input, 'width')) value.width = parseNumber(input.width, 'Width', { min: 1, max: 12000, integer: true });
  if (Object.hasOwn(input, 'height')) value.height = parseNumber(input.height, 'Height', { min: 0, max: 12000, integer: true });
  if (Object.hasOwn(input, 'price')) value.price = parseNumber(input.price, 'Price', { min: 0, optional: true });
  if (Object.hasOwn(input, 'mrp') || Object.hasOwn(input, 'oldPrice')) {
    value.mrp = parseNumber(input.mrp ?? input.oldPrice, 'MRP', { min: 0, optional: true });
  }
  if (value.price != null && value.mrp != null && value.mrp < value.price) throw new ProductError('MRP must be greater than or equal to price.');
  if (Object.hasOwn(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') throw new ProductError('isActive must be true or false.');
    value.isActive = input.isActive;
  }
  for (const field of ['isNewArrival', 'hasSizes', ...legacyFields]) {
    if (Object.hasOwn(input, field)) {
      if (typeof input[field] !== 'boolean') throw new ProductError(`${field} must be true or false.`);
      value[field] = input[field];
    }
  }
  if (Object.hasOwn(input, 'sizes')) value.sizes = normalizeSizeRows(input.sizes);
  else if (Array.isArray(value.sizes) && value.sizes.some((row) => row?.size)) value.sizes = normalizeSizeRows(value.sizes);
  value.hasSizes = value.hasSizes ?? (value.sizes?.some((row) => Number(row.stock) > 0) || false);
  if (value.hasSizes && !value.sizes?.length) throw new ProductError('Add at least one size or turn off size options.');
  if (Object.hasOwn(input, 'stock')) value.stock = parseNumber(input.stock, 'Stock', { min: 0, integer: true });
  if (value.hasSizes) value.stock = value.sizes.reduce((total, size) => total + size.stock, 0);
  if (Object.hasOwn(input, 'occasion')) value.occasion = parseTextList(input.occasion, 'Occasions');
  if (Object.hasOwn(input, 'tags')) value.tags = parseTextList(input.tags, 'Tags');
  if (Object.hasOwn(input, 'details')) value.details = normalizeDetails(input.details, value.details);
  value.slug = slugFromName(value.name);
  if (!value.slug) throw new ProductError('Product name must contain letters or numbers to create a slug.');
  if (value.name.length > 200 || value.category.length > 100 || (value.section || '').length > 120
    || (value.alt || '').length > 500 || (value.description || '').length > 10000
    || (value.subtitle || '').length > 500 || (value.link || '').length > 2048) {
    throw new ProductError('One or more product text fields exceed their allowed length.');
  }
  const submittedImages = Object.hasOwn(input, 'images') ? input.images : value.images;
  value.images = normalizeImages(submittedImages, input.cloudinaryId || value.cloudinaryId, {
    width: input.width ?? value.width, height: input.height ?? value.height, alt: input.alt ?? value.alt,
  });
  const primary = value.images[0];
  value.cloudinaryId = primary.publicId;
  value.width = primary.width;
  value.height = primary.height;
  value.alt = primary.alt || value.alt || '';
  value.imageUrl = buildProductImageUrl(primary.publicId, primary.width);
  if (Object.hasOwn(input, 'oldPrice')) value.oldPrice = value.mrp;
  return value;
}

function mergeProduct(product, legacy = emptyDressDetails()) {
  const result = product.toObject ? product.toObject() : { ...product };
  const primaryWidth = Number.isInteger(result.width) && result.width > 0 ? result.width : 800;
  const images = (result.images || []).length ? result.images : [
    { publicId: result.cloudinaryId, width: primaryWidth, height: result.height || 0, alt: result.alt || result.name, position: 0 },
    ...(legacy.images || []).map((image, index) => ({ publicId: image.cloudinaryId, width: image.width || 800, height: image.height || 0, alt: '', position: index + 1 })),
  ];
  const sizes = (result.sizes || []).some((row) => row?.label)
    ? result.sizes
    : (legacy.sizes || []).filter((row) => row.available).map((row) => ({ label: row.size, stock: row.quantity }));
  return {
    ...result,
    width: primaryWidth,
    imageUrl: buildProductImageUrl(result.cloudinaryId, primaryWidth),
    mrp: result.mrp ?? legacy.oldPrice ?? null,
    oldPrice: result.mrp ?? legacy.oldPrice ?? null,
    sizes,
    stock: result.hasSizes ? (result.sizes || []).reduce((total, size) => total + Number(size.stock || 0), 0) : (result.stock ?? 0),
    hasSizes: Boolean(result.hasSizes ?? sizes.length),
    images: images.map((image, position) => {
      const publicId = image.publicId || image.cloudinaryId;
      return { ...image, publicId, cloudinaryId: publicId, position, imageUrl: buildProductImageUrl(publicId, image.width || 800) };
    }),
    isNewArrival: Boolean(result.isNewArrival || legacy.isNewArrival),
    ...Object.fromEntries(legacyFields.map((field) => [field, Boolean(result[field] || legacy[field])])),
  };
}

function legacyDetailsFromProduct(values) {
  return {
    oldPrice: values.mrp ?? null,
    sizes: normalizeLegacySizes(values.sizes),
    images: (values.images || []).slice(1).map((image) => ({ cloudinaryId: image.publicId, width: image.width, height: image.height })),
    isNewArrival: Boolean(values.isNewArrival),
    isBestSeller: Boolean(values.isBestSeller),
    isCuratedLook: Boolean(values.isCuratedLook),
    isEditorsPick: Boolean(values.isEditorsPick),
    isOccasionPick: Boolean(values.isOccasionPick),
    isLuxeCollection: Boolean(values.isLuxeCollection),
  };
}

export async function listProducts(query) {
  const filter = { mergedInto: { $exists: false } };
  for (const field of ['category', 'section', 'search', 'sort', 'direction', 'page', 'limit', 'active']) {
    if (query[field] !== undefined && typeof query[field] !== 'string') throw new ProductError(`${field} must be a single text value.`);
  }
  if (query.category) {
    if (!(await getProductCategories()).includes(query.category)) throw new ProductError('Choose a category from the allowed list.');
    filter.category = query.category;
  }
  if (query.section) filter.section = query.section;
  if (query.active !== undefined) {
    if (!['true', 'false'].includes(query.active)) throw new ProductError('active must be true or false.');
    filter.isActive = query.active === 'true' ? { $ne: false } : false;
  }
  if (query.search?.trim()) {
    if (query.search.trim().length > 200) throw new ProductError('search must be 200 characters or fewer.');
    const search = new RegExp(escapedRegex(query.search.trim()), 'i');
    filter.$or = [{ name: search }, { cloudinaryId: search }, { description: search }, { alt: search }, { subtitle: search }, { slug: search }];
  }
  if (query.sort && !allowedSort.has(query.sort)) throw new ProductError('sort is not supported.');
  if (query.direction && !['asc', 'desc'].includes(query.direction)) throw new ProductError('direction must be asc or desc.');
  if (query.section?.length > 120) throw new ProductError('section must be 120 characters or fewer.');
  const sortKey = query.sort || 'position';
  const direction = query.direction === 'desc' ? -1 : 1;
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) throw new ProductError('page must be a positive whole number.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new ProductError('limit must be between 1 and 200.');
  const [documents, total] = await Promise.all([
    Product.find(filter).sort({ [sortKey]: direction, name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  const detailMap = await getDressDetailsMap(documents.map((document) => document._id));
  return { data: documents.map((document) => mergeProduct(document, detailMap.get(String(document._id)))), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getProduct(id) {
  if (!mongoose.isValidObjectId(id)) throw new ProductError('Product not found.', 404);
  const product = await Product.findOne({ _id: id, mergedInto: { $exists: false } }).lean();
  if (!product) throw new ProductError('Product not found.', 404);
  return mergeProduct(product, await getDressDetails(id));
}

export async function createProduct(input) {
  const values = await validateProductInput(input);
  if (await Product.exists({ cloudinaryId: values.cloudinaryId, mergedInto: { $exists: false } })) throw new ProductError('A product with this primary image already exists.', 409);
  if (await Product.exists({ slug: values.slug })) throw new ProductError('A product with this name already exists.', 409);
  if (values.position === undefined) {
    const latest = await Product.findOne({ section: values.section || '', mergedInto: { $exists: false } }).sort({ position: -1 }).select('position').lean();
    values.position = (latest?.position ?? -1) + 1;
  }
  const product = await Product.create(values);
  await saveDressDetails(product._id, legacyDetailsFromProduct(values));
  return mergeProduct(product, legacyDetailsFromProduct(values));
}

export async function updateProduct(id, input) {
  if (!mongoose.isValidObjectId(id)) throw new ProductError('Product not found.', 404);
  const product = await Product.findOne({ _id: id, mergedInto: { $exists: false } });
  if (!product) throw new ProductError('Product not found.', 404);
  const legacy = await getDressDetails(id);
  const existing = { ...legacy, ...product.toObject() };
  if (!product.images?.length && legacy.images?.length) existing.images = [
    { publicId: product.cloudinaryId, width: product.width, height: product.height, alt: product.alt },
    ...legacy.images.map((image) => ({ publicId: image.cloudinaryId, width: image.width, height: image.height })),
  ];
  if (!product.sizes?.length && legacy.sizes?.some((size) => size.available)) {
    existing.sizes = legacy.sizes.filter((size) => size.available).map((size) => ({ label: size.size, stock: size.quantity }));
    existing.hasSizes = true;
  }
  const values = await validateProductInput(input, existing);
  const duplicatePrimary = await Product.exists({ cloudinaryId: values.cloudinaryId, _id: { $ne: product._id }, mergedInto: { $exists: false } });
  if (duplicatePrimary) throw new ProductError('A product with this primary image already exists.', 409);
  const duplicateSlug = await Product.exists({ slug: values.slug, _id: { $ne: product._id } });
  if (duplicateSlug) throw new ProductError('A product with this name already exists.', 409);
  Object.assign(product, values);
  try {
    await product.save();
    await saveDressDetails(product._id, legacyDetailsFromProduct(values));
  } catch (error) {
    if (error.code === 11000) throw new ProductError('A product with this name or primary image already exists.', 409);
    throw error;
  }
  return mergeProduct(product, legacyDetailsFromProduct(values));
}

export async function setProductActive(id, isActive) {
  if (!mongoose.isValidObjectId(id)) throw new ProductError('Product not found.', 404);
  if (typeof isActive !== 'boolean') throw new ProductError('isActive must be true or false.');
  const product = await Product.findOneAndUpdate({ _id: id, mergedInto: { $exists: false } }, { $set: { isActive } }, { new: true, runValidators: true }).lean();
  if (!product) throw new ProductError('Product not found.', 404);
  return mergeProduct(product, await getDressDetails(id));
}

export async function softDeleteProduct(id) { return setProductActive(id, false); }

export async function reorderProducts(items) {
  if (!Array.isArray(items) || items.length < 1) throw new ProductError('Provide products to reorder.');
  const ids = items.map((item) => item?.id);
  const positions = items.map((item) => item?.position);
  if (ids.some((id) => !mongoose.isValidObjectId(id)) || new Set(ids).size !== ids.length) throw new ProductError('Product IDs must be valid and unique.');
  if (positions.some((position) => !Number.isInteger(position) || position < 0) || new Set(positions).size !== positions.length) throw new ProductError('Positions must be unique non-negative whole numbers.');
  const products = await Product.find({ _id: { $in: ids }, mergedInto: { $exists: false } }).select('_id section').lean();
  if (products.length !== ids.length) throw new ProductError('One or more products could not be found.', 404);
  if (new Set(products.map((product) => product.section || '')).size > 1) throw new ProductError('Reorder products within the same section.');
  const operations = items.map(({ id, position }) => ({ updateOne: { filter: { _id: id, mergedInto: { $exists: false } }, update: { $set: { position } } } }));
  await Product.bulkWrite(operations, { ordered: true });
  return { updated: operations.length };
}

export async function bulkUpdateProducts({ ids, action, value }) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 200) throw new ProductError('Select between 1 and 200 products.');
  if (ids.some((id) => !mongoose.isValidObjectId(id)) || new Set(ids).size !== ids.length) throw new ProductError('Product IDs must be valid and unique.');
  let update;
  if (action === 'activate') update = { isActive: true };
  else if (action === 'deactivate') update = { isActive: false };
  else if (action === 'category') {
    if (typeof value !== 'string' || !(await getProductCategories()).includes(value)) throw new ProductError('Choose a category from the allowed list.');
    update = { category: value };
  } else if (action === 'section') {
    if (typeof value !== 'string' || value.trim().length > 120) throw new ProductError('Section must be text up to 120 characters.');
    update = { section: value.trim() };
  } else throw new ProductError('Choose a valid bulk action.');
  const result = await Product.updateMany({ _id: { $in: ids }, mergedInto: { $exists: false } }, { $set: update }, { runValidators: true });
  return { matched: result.matchedCount, modified: result.modifiedCount };
}

export async function getImagePreview(cloudinaryId, width = '800') {
  if (typeof cloudinaryId !== 'string' || !cloudinaryId.trim()) throw new ProductError('Cloudinary Public ID is required.');
  const imageWidth = parseNumber(width, 'Width', { min: 1, max: 12000, integer: true });
  return buildProductImageUrl(cloudinaryId.trim(), imageWidth);
}
