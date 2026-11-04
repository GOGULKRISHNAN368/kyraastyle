require('dotenv').config({ path: require('node:path').resolve(__dirname, '..', '.env'), override: true });

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const cloudinary = require('cloudinary').v2;

const frontendRoot = path.resolve(__dirname, '..', '..', 'frontend');
const sourceFiles = [
  path.join(frontendRoot, 'kyraastyle.com', 'index.html'),
  path.join(frontendRoot, 'kyraastyle.com', 'men-only.js'),
  path.join(frontendRoot, 'kyraastyle.com', 'kryaa-loader.js'),
];
const manifestPath = path.join(__dirname, '..', 'template-cloudinary-manifest.json');
const referencePattern = /\.\.\/(?:image|images|assets)\/[A-Za-z0-9_%()./-]+\.(?:png|jpe?g|webp|avif|gif|svg)(?:\?[^"'`\s)]+)?/gi;

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env before migrating template images.');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function localPathFromReference(reference) {
  const cleanReference = decodeURIComponent(reference.split('?')[0]);
  const filePath = path.resolve(frontendRoot, cleanReference.replace(/^\.\.\//, ''));
  if (!filePath.startsWith(`${frontendRoot}${path.sep}`)) throw new Error(`Unsafe template image path: ${reference}`);
  return filePath;
}

function publicIdFor(reference) {
  const digest = crypto.createHash('sha256').update(reference).digest('hex').slice(0, 16);
  const extension = path.extname(reference.split('?')[0]).replace('.', '').toLowerCase() || 'image';
  return `kryaastyle/template/${digest}-${extension}`;
}

async function readManifest() {
  try { return JSON.parse(await fs.readFile(manifestPath, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

async function uploadTemplateImage(reference, manifest) {
  if (manifest[reference]?.url) return manifest[reference].url;
  const filePath = localPathFromReference(reference);
  await fs.access(filePath);
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: publicIdFor(reference),
    resource_type: 'image',
    overwrite: false,
    unique_filename: false,
    use_filename: false,
  });
  manifest[reference] = { publicId: result.public_id, url: result.secure_url };
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return result.secure_url;
}

async function main() {
  const files = await Promise.all(sourceFiles.map(async (file) => ({ file, text: await fs.readFile(file, 'utf8') })));
  const references = [...new Set(files.flatMap(({ text }) => [...text.matchAll(referencePattern)].map((match) => match[0])))];
  const manifest = await readManifest();
  console.log(`Migrating ${references.length} homepage template images to Cloudinary...`);
  const replacements = new Map();
  for (const [index, reference] of references.entries()) {
    const url = await uploadTemplateImage(reference, manifest);
    replacements.set(reference, url);
    console.log(`${index + 1}/${references.length} uploaded`);
  }
  for (const { file, text } of files) {
    let updated = text;
    for (const [reference, url] of replacements) updated = updated.split(reference).join(url);
    if (updated !== text) await fs.writeFile(file, updated);
  }
  console.log(`Done. ${references.length} template image references now use Cloudinary delivery URLs.`);
}

main().catch((error) => {
  console.error(`Template image migration failed: ${error.message}`);
  process.exitCode = 1;
});
