// Generate PNG icons from Logo Kabupaten Bogor
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [192, 512];
const publicDir = path.join(__dirname, 'public');
const logoPath = path.join(__dirname, 'public', 'logo-kab.png');

// Generate icons from logo-kab.png
sizes.forEach(async (size) => {
  try {
    await sharp(logoPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, `icon-${size}x${size}.png`));
    console.log(`✓ Generated icon-${size}x${size}.png from logo-kab.png`);
  } catch (error) {
    console.error(`✗ Error generating icon-${size}x${size}.png:`, error);
  }
});
