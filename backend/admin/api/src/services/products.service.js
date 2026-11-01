import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { buildProductImageUrl } from '../config/cloudinary.js';
import { getProductCategories } from './settings.service.js';
import { emptyDressDetails, getDressDetails, getDressDetailsMap, saveDressDetails, validateDressDetails } from './dressDetails.service.js';

export class ProductError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const textFields = ['name', 'category', 'section', 'cloudinaryId', 'alt', 'description', 'link'];
const dressDetailFields = ['oldPrice', 'sizes', 'images', 'isNewArrival', 'isBestSeller', 'isCuratedLook'];
const productFields = new Set([...textFields, 'position', 'width', 'height', 'price', 'isActive', ...dressDetailFields]);
const allowedSort = new Set(['name', 'category', 'section', 'position', 'createdAt', 'price', 'updatedAt']);

function escapedRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function parseOptionalNumber(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
  if (value === undefined || value === null || value === '') return field === 'price' ? null : undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
    throw new ProductError(`${field} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}.`);
  }
  return number;
}

export async function validateProductInput(input, existing = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ProductError('Product details must be an object.');
  const unknown = Object.keys(input).find((field) => !productFields.has(field));
  if (unknown) throw new ProductError(`Unsupported product field: ${unknown}.`);
  const value = {};
  for (const field of productFields) if (Object.hasOwn(existing, field)) value[field] = existing[field];
  for (const field of textFields) {
    if (Object.hasOwn(input, field)) {
      if (typeof input[field] !== 'string') throw new ProductError(`${field} must be text.`);
      value[field] = input[field].trim();
    }
  }
  value.name = value.name?.trim();
  value.cloudinaryId = value.cloudinaryId?.trim();
  if (!value.name) throw new ProductError('Product name is required.');
  if (!value.category) throw new ProductError('Category is required.');
  if (!value.cloudinaryId) throw new ProductError('Cloudinary Public ID is required.');

  const categories = await getProductCategories();
  if (!categories.includes(value.category)) throw new ProductError('Choose a category from the allowed list.');
  if (Object.hasOwn(input, 'position')) value.position = parseOptionalNumber(input.position, 'Position', { integer: true });
  if (Object.hasOwn(input, 'width')) value.width = parseOptionalNumber(input.width, 'Width', { min: 1, max: 12000, integer: true });
  if (Object.hasOwn(input, 'height')) value.height = parseOptionalNumber(input.height, 'Height', { min: 1, max: 12000, integer: true });
  if (!Number.isInteger(value.width) || value.width < 1 || value.width > 12000) value.width = 800;
  if (!Number.isInteger(value.height) || value.height < 0 || value.height > 12000) value.height = 0;
  if (Object.hasOwn(input, 'price')) value.price = parseOptionalNumber(input.price, 'Price', { min: 0 });
  if (Object.hasOwn(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') throw new ProductError('isActive must be true or false.');
    value.isActive = input.isActive;
  }
  for (const field of dressDetailFields) if (Object.hasOwn(input, field)) value[field] = input[field];
  const details = validateDressDetails(input, existing);
  Object.assign(value, details);
  for (const [field, max] of [['name', 200], ['category', 100], ['section', 120], ['cloudinaryId', 255], ['alt', 500], ['description', 10000], ['link', 2048]]) {
    if ((value[field] || '').length > max) throw new ProductError(`${field} must be ${max} characters or fewer.`);
  }
  value.imageUrl = buildProductImageUrl(value.cloudinaryId, value.width);
  return value;
}

function splitDressDetails(values) {
  const details = validateDressDetails(values, emptyDressDetails());
  for (const field of dressDetailFields) delete values[field];
  return details;
}

export function asProduct(product, dressDetails = emptyDressDetails()) {
  const result = product.toObject ? product.toObject() : { ...product };
  const width = Number.isInteger(result.width) && result.width > 0 ? result.width : 800;
  result.width = width;
  if (!Number.isInteger(result.height) || result.height < 0) result.height = 0;
  result.imageUrl = buildProductImageUrl(result.cloudinaryId, width);
  if (result.isActive == null) result.isActive = true;
  return {
    ...result,
    ...dressDetails,
    images: (dressDetails.images || []).map((image) => ({
      ...image,
      imageUrl: buildProductImageUrl(image.cloudinaryId, image.width || 800),
    })),
  };
}

export async function listProducts(query) {
  const filter = {};
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
    filter.$or = [{ name: search }, { cloudinaryId: search }, { description: search }, { alt: search }];
  }
  if (query.sort && !allowedSort.has(query.sort)) throw new ProductError('sort is not supported.');
  if (query.direction && !['asc', 'desc'].includes(query.direction)) throw new ProductError('direction must be asc or desc.');
  if (query.section?.length > 120) throw new ProductError('section must be 120 characters or fewer.');
  const sortKey = query.sort || 'position';
  const direction = query.direction === 'desc' ? -1 : 1;
  const pageNumber = query.page === undefined ? 1 : Number(query.page);
  const limitNumber = query.limit === undefined ? 50 : Number(query.limit);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) throw new ProductError('page must be a positive whole number.');
  if (!Number.isInteger(limitNumber) || limitNumber < 1) throw new ProductError('limit must be a positive whole number.');
  const page = pageNumber;
  if (limitNumber > 200) throw new ProductError('limit cannot exceed 200.');
  const limit = limitNumber;
  const [documents, total] = await Promise.all([
    Product.find(filter).sort({ [sortKey]: direction, name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  const detailMap = await getDressDetailsMap(documents.map((document) => document._id));
  return { data: documents.map((document) => asProduct(document, detailMap.get(String(document._id)))), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getProduct(id) {
  if (!mongoose.isValidObjectId(id)) throw new ProductError('Product not found.', 404);
  const product = await Product.findById(id).lean();
  if (!product) throw new ProductError('Product not found.', 404);
  return asProduct(product, await getDressDetails(id));
}

export async function createProduct(input) {
  const values = await validateProductInput(input);
  if (await Product.exists({ cloudinaryId: values.cloudinaryId })) throw new ProductError('A product with this Cloudinary ID already exists.', 409);
  if (values.position === undefined) {
    const latest = await Product.findOne({ section: values.section || '' }).sort({ position: -1 }).select('position').lean();
    values.position = (latest?.position ?? -1) + 1;
  }
  const details = splitDressDetails(values);
  try {
    const product = await Product.create(values);
    try { await saveDressDetails(product._id, details); }
    catch (error) { await Product.deleteOne({ _id: product._id }); throw error; }
    return asProduct(product, details);
  }
  catch (error) { if (error.code === 11000) throw new ProductError('A product with this Cloudinary ID already exists.', 409); throw error; }
}

export async function updateProduct(id, input) {
  if (!mongoose.isValidObjectId(id)) throw new ProductError('Product not found.', 404);
  const product = await Product.findById(id);
  if (!product) throw new ProductError('Product not found.', 404);
  const existingDetails = await getDressDetails(id);
  const values = await validateProductInput(input, { ...product.toObject(), ...existingDetails });
  const duplicate = await Product.exists({ cloudinaryId: values.cloudinaryId, _id: { $ne: product._id } });
  if (duplicate) throw new ProductError('A product with this Cloudinary ID already exists.', 409);
  const details = splitDressDetails(values);
  Object.assign(product, values);
  try {
    const saved = await product.save();
    await saveDressDetails(saved._id, details);
    return asProduct(saved, details);
  }
  catch (error) { if (error.code === 11000) throw new ProductError('A product with this Cloudinary ID already exists.', 409); throw error; }
}

export async function setProductActive(id, isActive) {
  if (!mongoose.isValidObjectId(id)) throw new ProductError('Product not found.', 404);
  if (typeof isActive !== 'boolean') throw new ProductError('isActive must be true or false.');
  const product = await Product.findByIdAndUpdate(id, { $set: { isActive } }, { new: true, runValidators: true }).lean();
  if (!product) throw new ProductError('Product not found.', 404);
  return asProduct(product, await getDressDetails(id));
}

export async function softDeleteProduct(id) { return setProductActive(id, false); }

export async function reorderProducts(items) {
  if (!Array.isArray(items) || items.length < 1) throw new ProductError('Provide products to reorder.');
  const ids = items.map((item) => item?.id);
  const positions = items.map((item) => item?.position);
  if (ids.some((id) => !mongoose.isValidObjectId(id)) || new Set(ids).size !== ids.length) throw new ProductError('Product IDs must be valid and unique.');
  if (positions.some((position) => !Number.isInteger(position) || position < 0) || new Set(positions).size !== positions.length) throw new ProductError('Positions must be unique non-negative whole numbers.');
  const products = await Product.find({ _id: { $in: ids } }).select('_id section').lean();
  if (products.length !== ids.length) throw new ProductError('One or more products could not be found.', 404);
  if (new Set(products.map((product) => product.section || '')).size > 1) throw new ProductError('Reorder products within the same section.');
  const operations = items.map(({ id, position }) => ({ updateOne: { filter: { _id: id }, update: { $set: { position } } } }));
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
  const result = await Product.updateMany({ _id: { $in: ids } }, { $set: update }, { runValidators: true });
  return { matched: result.matchedCount, modified: result.modifiedCount };
}

export async function getImagePreview(cloudinaryId, width = '800') {
  if (typeof cloudinaryId !== 'string' || !cloudinaryId.trim()) throw new ProductError('Cloudinary Public ID is required.');
  const imageWidth = parseOptionalNumber(width, 'Width', { min: 1, max: 12000, integer: true }) || 800;
  return buildProductImageUrl(cloudinaryId.trim(), imageWidth);
}
