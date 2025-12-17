import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo-kab.png');

async function removeWhiteBackground() {
  try {
    console.log('🔍 Analyzing logo-kab.png...\n');
    
    const metadata = await sharp(logoPath).metadata();
    console.log(`Original: ${metadata.width}x${metadata.height}, channels: ${metadata.channels}, hasAlpha: ${metadata.hasAlpha}`);
    
    // Remove white background by making it transparent
    // This will convert near-white pixels to transparent
    await sharp(logoPath)
      .removeAlpha() // First remove any existing alpha
      .ensureAlpha() // Add alpha channel
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        // Process pixel by pixel to make white/near-white pixels transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // If pixel is white or near-white (R,G,B > 240), make it transparent
          if (r > 240 && g > 240 && b > 240) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
          } else {
            data[i + 3] = 255; // Keep alpha at 255 (opaque)
          }
        }
        
        // Save the processed image
        return sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        })
        .png()
        .toFile(path.join(publicDir, 'logo-kab-no-bg.png'));
      });
    
    console.log('\n✅ Created: logo-kab-no-bg.png (with transparent background)');
    console.log('💡 You can replace logo-kab.png with this file if needed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

removeWhiteBackground();
