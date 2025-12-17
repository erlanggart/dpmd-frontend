import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo-kab.png');

// Icon sizes to generate
const sizes = [
  { size: 192, name: 'icon-192x192.png', type: 'any' },
  { size: 512, name: 'icon-512x512.png', type: 'any' },
  { size: 192, name: 'icon-192x192-maskable.png', type: 'maskable' },
  { size: 512, name: 'icon-512x512-maskable.png', type: 'maskable' }
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons from logo-kab.png...\n');

  // Check if logo-kab.png exists
  if (!fs.existsSync(logoPath)) {
    console.error('❌ Error: logo-kab.png not found in public folder!');
    process.exit(1);
  }

  try {
    // Get logo dimensions
    const metadata = await sharp(logoPath).metadata();
    console.log(`📏 Logo dimensions: ${metadata.width}x${metadata.height}`);

    for (const { size, name, type } of sizes) {
      const outputPath = path.join(publicDir, name);
      
      console.log(`\n🔧 Generating ${name} (${type})...`);
      
      // For maskable icons, add padding and white background for safe area
      if (type === 'maskable') {
        const paddedSize = Math.round(size * 0.7); // 70% of total size for logo
        
        await sharp(logoPath)
          .resize(paddedSize, paddedSize, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .extend({
            top: Math.round((size - paddedSize) / 2),
            bottom: Math.round((size - paddedSize) / 2),
            left: Math.round((size - paddedSize) / 2),
            right: Math.round((size - paddedSize) / 2),
            background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for maskable
          })
          .png({
            compressionLevel: 9,
            adaptiveFiltering: true,
            force: true
          })
          .toFile(outputPath);
      } else {
        // For 'any' icons, keep transparent background and ensure no white pixels
        await sharp(logoPath)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fully transparent
            withoutEnlargement: false
          })
          .png({
            compressionLevel: 9,
            adaptiveFiltering: true,
            force: true,
            palette: false // Disable palette to maintain true RGBA
          })
          .toFile(outputPath);
      }
      
      const stats = fs.statSync(outputPath);
      console.log(`   ✅ Created: ${name} (${(stats.size / 1024).toFixed(2)} KB)`);
    }

    console.log('\n✨ All icons generated successfully!');
    console.log('\nGenerated files:');
    sizes.forEach(({ name }) => {
      console.log(`   - public/${name}`);
    });

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
