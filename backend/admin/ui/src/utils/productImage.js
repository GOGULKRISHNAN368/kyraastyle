const exactImages = new Map([
  ['blackkuti3pieceset1', 'Black_Kuti_3PieceSet_1.jpg'],
  ['greenkurti1', 'Green_Kurti_1.jpg'],
  ['icebluekurti1', 'IceBlue_Kurti_1.jpg'],
  ['salwarsuits1', 'Salwar_Suits_1.jpg'],
  ['unstichedkurtimaterialblack', 'Unstiched_Kurti_Material_Black.jpg'],
  ['unstichedkurtimaterialpink', 'Unstiched_Kurti_Material_Pink.jpg'],
  ['unstichedkurtimaterialwhite', 'Unstiched_Kurti_Material_White.jpg'],
  ['whitekurti1', 'White_Kurti_1.jpg'],
  ['whitekurti4', 'White_Kurti_4.jpg'],
]);

const categoryImages = [
  [/saree|sari/i, 'saree.jpg'],
  [/salwar/i, 'salwar.jpg'],
  [/anarkali/i, 'anarkali.jpg'],
  [/frock/i, 'frock.jpg'],
  [/short\s*top|top\s*wear/i, 'short-tops.webp'],
  [/office|workwear/i, 'officewear.jpg'],
  [/kurta|kurti/i, 'kurta.jpg'],
];

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const fallbackUrl = (fileName) => `${import.meta.env.BASE_URL}product-fallbacks/${fileName}`;

export function getProductImageFallback(product) {
  const assetName = normalize(String(product?.cloudinaryId || '').split('/').pop());
  const productName = normalize(product?.name);
  const exact = exactImages.get(assetName) || exactImages.get(productName);
  if (exact) return fallbackUrl(exact);

  const description = `${product?.name || ''} ${product?.category || ''}`;
  const match = categoryImages.find(([pattern]) => pattern.test(description));
  return match ? fallbackUrl(match[1]) : '';
}

export function applyImageFallback(event, fallbackSrc) {
  const image = event.currentTarget;
  if (!fallbackSrc || image.dataset.fallbackApplied === 'true') return;
  image.dataset.fallbackApplied = 'true';
  image.src = fallbackSrc;
}
