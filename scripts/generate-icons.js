import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Read SVG files
const icon192Svg = readFileSync(join(iconsDir, 'icon-192x192.svg'));
const icon512Svg = readFileSync(join(iconsDir, 'icon-512x512.svg'));

// Generate PNG icons
const sizes = [
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
];

async function generateIcons() {
  console.log('Generating PNG icons from SVG...');
  
  for (const { name, size } of sizes) {
    const svgBuffer = size <= 192 ? icon192Svg : icon512Svg;
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, name));
    console.log(`  ✓ Generated ${name}`);
  }
  
  // Generate apple-touch-icon
  await sharp(icon192Svg)
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('  ✓ Generated apple-touch-icon.png');
  
  // Generate favicon.ico (multi-size)
  const faviconPng = await sharp(icon192Svg)
    .resize(32, 32)
    .png()
    .toBuffer();
  
  // For simplicity, just create a 32x32 favicon.png
  await sharp(icon192Svg)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon-32x32.png'));
  console.log('  ✓ Generated favicon-32x32.png');
  
  await sharp(icon192Svg)
    .resize(16, 16)
    .png()
    .toFile(join(publicDir, 'favicon-16x16.png'));
  console.log('  ✓ Generated favicon-16x16.png');
  
  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);