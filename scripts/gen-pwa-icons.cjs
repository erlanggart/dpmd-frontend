const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '..', 'public', 'logo-dpmd.png');
const OUT_DIR = path.join(__dirname, '..', 'public');

const sizes = [96, 192, 512];

async function generate() {
  // Read source into buffer first (so we can overwrite the file safely)
  const sourceBuffer = fs.readFileSync(SOURCE);

  for (const size of sizes) {
    const padding = Math.round(size * 0.1);
    const logoSize = size - padding * 2;

    const logo = await sharp(sourceBuffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 255 }
      }
    })
      .composite([{ input: logo, gravity: 'centre' }])
      .png()
      .toFile(path.join(OUT_DIR, `logo-dpmd-${size}.png`));

    console.log(`Generated logo-dpmd-${size}.png`);
  }

  // Also overwrite the main logo-dpmd.png with black bg
  const padding = Math.round(512 * 0.1);
  const logoSize = 512 - padding * 2;

  const logo = await sharp(sourceBuffer)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 255 }
    }
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(path.join(OUT_DIR, 'logo-dpmd.png'));

  console.log('Generated logo-dpmd.png (main)');
  console.log('Done!');
}

generate().catch(console.error);
