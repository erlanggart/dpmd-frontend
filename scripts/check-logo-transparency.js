import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo-kab.png');

async function checkTransparency() {
  try {
    const metadata = await sharp(logoPath).metadata();
    
    console.log('📸 Logo Metadata:');
    console.log(`   Size: ${metadata.width}x${metadata.height}`);
    console.log(`   Format: ${metadata.format}`);
    console.log(`   Channels: ${metadata.channels}`);
    console.log(`   Has Alpha: ${metadata.hasAlpha}`);
    console.log(`   Space: ${metadata.space}`);
    
    if (!metadata.hasAlpha) {
      console.log('\n⚠️  WARNING: Logo tidak punya alpha channel (tidak transparent)');
      console.log('💡 Solusi: Gunakan logo PNG dengan background transparent');
    } else {
      console.log('\n✅ Logo sudah punya alpha channel (transparent)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTransparency();
