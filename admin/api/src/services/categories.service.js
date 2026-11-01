import CategoryDetails from '../models/CategoryDetails.js';
import Product from '../models/Product.js';
import { buildProductImageUrl } from '../config/cloudinary.js';
import { getProductCategories, setProductCategories } from './settings.service.js';

export class CategoryError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function categoryKey(name) {
  return name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';
}

function validateName(value) {
  if (typeof value !== 'string' || !value.trim()) throw new CategoryError('Category name is required.');
  const name = value.trim();
  if (name.length > 100) throw new CategoryError('Category name must be 100 characters or fewer.');
  return name;
}

function normalizeDetails(input, existing = {}) {
  const description = Object.hasOwn(input, 'description') ? input.description : existing.description || '';
  const cloudinaryId = Object.hasOwn(input, 'cloudinaryId') ? input.cloudinaryId : existing.cloudinaryId || '';
  if (typeof description !== 'string' || description.length > 2000) throw new CategoryError('Description must be 2,000 characters or fewer.');
  if (typeof cloudinaryId !== 'string' || cloudinaryId.length > 255) throw new CategoryError('Category image Public ID is invalid.');
  const width = Object.hasOwn(input, 'width') ? Number(input.width) : Number(existing.width || 600);
  const height = Object.hasOwn(input, 'height') ? Number(input.height) : Number(existing.height || 0);
  if (!Number.isInteger(width) || width < 1 || width > 12000 || !Number.isInteger(height) || height < 0 || height > 12000) {
    throw new CategoryError('Category image dimensions are invalid.');
  }
  return { description: description.trim(), cloudinaryId: cloudinaryId.trim(), width, height };
}

async function findCategoryName(key, categories) {
  return categories.find((name) => categoryKey(name) === key);
}

export async function listCategories() {
  const categories = await getProductCategories();
  const [details, products] = await Promise.all([
    CategoryDetails.find({ _id: { $in: categories.map(categoryKey) } }).lean(),
    Product.find({ category: { $in: categories } }).select('category cloudinaryId imageUrl width height').lean(),
  ]);
  const detailMap = new Map(details.map((item) => [item._id, item]));
  const productMap = new Map();
  for (const product of products) {
    const item = productMap.get(product.category) || { count: 0, cover: null };
    item.count += 1;
    if (!item.cover && product.cloudinaryId) item.cover = product;
    productMap.set(product.category, item);
  }
  return categories.map((name) => {
    const metadata = detailMap.get(categoryKey(name));
    const productData = productMap.get(name);
    const imageUrl = metadata?.cloudinaryId
      ? buildProductImageUrl(metadata.cloudinaryId, metadata.width || 600)
      : productData?.cover?.cloudinaryId
        ? buildProductImageUrl(productData.cover.cloudinaryId, productData.cover.width || 800)
        : '';
    return {
      id: categoryKey(name),
      name,
      description: metadata?.description || '',
      cloudinaryId: metadata?.cloudinaryId || '',
      imageUrl,
      productCount: productData?.count || 0,
    };
  });
}

export async function createCategory(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CategoryError('Category details must be an object.');
  const name = validateName(input.name);
  const categories = await getProductCategories();
  if (categories.some((item) => item.toLowerCase() === name.toLowerCase())) throw new CategoryError('A category with this name already exists.', 409);
  if (categories.some((item) => categoryKey(item) === categoryKey(name))) throw new CategoryError('This category name conflicts with an existing category.', 409);
  const details = normalizeDetails(input);
  const next = [...categories, name];
  await CategoryDetails.findByIdAndUpdate(categoryKey(name), { $set: { name, ...details } }, { upsert: true, new: true, runValidators: true });
  try { await setProductCategories(next); }
  catch (error) { await CategoryDetails.deleteOne({ _id: categoryKey(name) }); throw error; }
  return (await listCategories()).find((item) => item.id === categoryKey(name));
}

export async function updateCategory(key, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CategoryError('Category details must be an object.');
  const categories = await getProductCategories();
  const currentName = await findCategoryName(key, categories);
  if (!currentName) throw new CategoryError('Category not found.', 404);
  const name = Object.hasOwn(input, 'name') ? validateName(input.name) : currentName;
  const duplicate = categories.find((item) => item.toLowerCase() === name.toLowerCase() && item !== currentName);
  if (duplicate) throw new CategoryError('A category with this name already exists.', 409);
  const nextKey = categoryKey(name);
  if (categories.some((item) => item !== currentName && categoryKey(item) === nextKey)) throw new CategoryError('This category name conflicts with an existing category.', 409);

  const currentDetails = await CategoryDetails.findById(key).lean();
  const details = normalizeDetails(input, currentDetails || {});
  const renamed = name !== currentName;
  const keyChanged = nextKey !== key;
  const nextCategories = categories.map((item) => item === currentName ? name : item);
  if (renamed) await Product.updateMany({ category: currentName }, { $set: { category: name } });
  try {
    await CategoryDetails.findByIdAndUpdate(nextKey, { $set: { name, ...details } }, { upsert: true, new: true, runValidators: true });
    if (renamed) await setProductCategories(nextCategories);
    if (renamed && keyChanged) await CategoryDetails.deleteOne({ _id: key });
  } catch (error) {
    if (renamed) {
      await Product.updateMany({ category: name }, { $set: { category: currentName } }).catch(() => {});
      await setProductCategories(categories).catch(() => {});
    }
    if (keyChanged) await CategoryDetails.deleteOne({ _id: nextKey }).catch(() => {});
    throw error;
  }
  return (await listCategories()).find((item) => item.id === nextKey);
}

export async function deleteCategory(key) {
  const categories = await getProductCategories();
  const name = await findCategoryName(key, categories);
  if (!name) throw new CategoryError('Category not found.', 404);
  const count = await Product.countDocuments({ category: name });
  if (count) throw new CategoryError(`This category is used by ${count} ${count === 1 ? 'dress' : 'dresses'}. Move them to another category before deleting it.`, 409);
  const remaining = categories.filter((item) => item !== name);
  if (!remaining.length) throw new CategoryError('Keep at least one product category.', 409);
  await setProductCategories(remaining);
  await CategoryDetails.deleteOne({ _id: key });
  return { deleted: true };
}
