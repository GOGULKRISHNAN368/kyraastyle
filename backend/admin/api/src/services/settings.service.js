import Settings from '../models/Settings.js';

export const DEFAULT_PRODUCT_CATEGORIES = [
  'Kurta Sets', 'Short Tops', 'Salwar Suits', 'Unstitched', 'Other',
];

export async function getProductCategories() {
  let settings = await Settings.findById('productCategories').lean();
  if (!settings) {
    try {
      settings = await Settings.create({ _id: 'productCategories', categories: DEFAULT_PRODUCT_CATEGORIES });
    } catch (error) {
      if (error.code !== 11000) throw error;
      settings = await Settings.findById('productCategories').lean();
    }
  }
  const categories = Array.isArray(settings?.categories)
    ? settings.categories.filter((category) => typeof category === 'string' && category.trim())
    : [];
  if (categories.length) return [...new Set(categories.map((category) => category.trim()))];
  const initialized = await Settings.findByIdAndUpdate(
    'productCategories',
    { $set: { categories: DEFAULT_PRODUCT_CATEGORIES } },
    { new: true, upsert: true },
  ).lean();
  return initialized.categories;
}

export async function setProductCategories(categories) {
  const settings = await Settings.findByIdAndUpdate(
    'productCategories',
    { $set: { categories } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  return settings.categories;
}
