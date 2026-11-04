require('dotenv').config({ path: require('node:path').resolve(__dirname, '..', '.env'), override: true });

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const cloudinary = require('cloudinary').v2;

const frontendRoot = path.resolve(__dirname, '..', '..', 'frontend');
const sourcePath = path.join(frontendRoot, 'kyraastyle.com', 'men-only.js');
const manifestPath = path.join(__dirname, '..', 'template-cloudinary-manifest.json');

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env before migrating lookbook images.');
}

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

async function main() {
  const [source, manifestText] = await Promise.all([fs.readFile(sourcePath, 'utf8'), fs.readFile(manifestPath, 'utf8')]);
  const manifest = JSON.parse(manifestText);
  const imageFiles = [...new Set([...source.matchAll(/imageFile:\s*'([^']+\.avif)'/g)].map((match) => match[1]))];
  let updated = source;

  for (const imageFile of imageFiles) {
    const reference = `../images/Insta_Img/${imageFile}`;
    let asset = manifest[reference];
    if (!asset?.url) {
      const filePath = path.join(frontendRoot, 'images', 'Insta_Img', imageFile);
      const digest = crypto.createHash('sha256').update(reference).digest('hex').slice(0, 16);
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: `kryaastyle/template/${digest}-avif`, resource_type: 'image', overwrite: false, unique_filename: false, use_filename: false,
      });
      asset = { publicId: result.public_id, url: result.secure_url };
      manifest[reference] = asset;
    }
    const marker = `imageFile: '${imageFile}',`;
    updated = updated.replace(marker, `${marker}\n        imageUrl: '${asset.url}',`);
  }

  await Promise.all([
    fs.writeFile(sourcePath, updated),
    fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`),
  ]);
  console.log(`Migrated ${imageFiles.length} women’s lookbook images to Cloudinary.`);
}

main().catch((error) => {
  console.error(`Women lookbook migration failed: ${error.message}`);
  process.exitCode = 1;
});
