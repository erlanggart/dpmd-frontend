// Script to generate PWA icons from logo-kab.png without background
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📱 Generating PWA Icons from logo-kab.png...');
console.log('');
console.log('⚠️  Manual Steps Required:');
console.log('1. Install Sharp library: npm install sharp --save-dev');
console.log('2. Run this script again: node scripts/generate-pwa-icons.js');
console.log('');
console.log('Or use online tool:');
console.log('1. Open https://realfavicongenerator.net/');
console.log('2. Upload: public/logo-kab.png');
console.log('3. Download 192x192 and 512x512 PNG');
console.log('4. Replace public/icon-192x192.png and public/icon-512x512.png');
console.log('');

// Try to use sharp if installed
let sharp;
try {
  sharp = (await import('sharp')).default;
  
  const logoPath = path.join(__dirname, '../public/logo-kab.png');
  const outputDir = path.join(__dirname, '../public');
  
  const sizes = [
    { size: 192, name: 'icon-192x192.png' },
    { size: 512, name: 'icon-512x512.png' }
  ];
  
  sizes.forEach(async ({ size, name }) => {
    try {
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(path.join(outputDir, name));
      
      console.log(`✅ Generated: ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Error generating ${name}:`, error.message);
    }
  });
  
  console.log('');
  console.log('✅ PWA icons generated successfully!');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.log('❌ Sharp not installed. Install it first:');
    console.log('   npm install sharp --save-dev');
  } else {
    console.error('❌ Error:', error.message);
  }
}
