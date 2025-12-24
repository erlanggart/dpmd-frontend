// Script to generate PWA icons from logo-bogor.png
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, '../public/logo-bogor.png');
const outputDir = path.join(__dirname, '../public');

const sizes = [
  { size: 96, name: 'logo-96.png' },
  { size: 192, name: 'logo-192.png' },
  { size: 512, name: 'logo-512.png' }
];

console.log('📱 Generating PWA Icons from logo-bogor.png...\n');

async function generateIcons() {
  for (const { size, name } of sizes) {
    try {
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent
        })
        .png()
        .toFile(path.join(outputDir, name));
      
      console.log(`✅ Generated: ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Error generating ${name}:`, error.message);
    }
  }
  
  console.log('\n✨ All icons generated successfully!');
}

generateIcons().catch(console.error);
