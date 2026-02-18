// Generate version.json file for PWA version checking
// Uses a unique build hash so each deployment is detectable
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Generate unique build hash from timestamp + random bytes
const buildHash = crypto.createHash('md5')
  .update(Date.now().toString() + crypto.randomBytes(8).toString('hex'))
  .digest('hex')
  .slice(0, 12);

// Create version info
const versionInfo = {
  version: packageJson.version,
  buildHash,
  buildDate: new Date().toISOString(),
  name: packageJson.name
};

// Write to dist/version.json
const distPath = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

const versionJsonPath = path.join(distPath, 'version.json');
fs.writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2));

// Inject build hash into the already-built index.html as a meta tag
const indexPath = path.join(distPath, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');
  html = html.replace(
    '</head>',
    `<meta name="build-hash" content="${buildHash}">\n</head>`
  );
  fs.writeFileSync(indexPath, html);
  console.log(`   Injected build hash into index.html`);
}

console.log('✅ version.json generated successfully');
console.log(`   Version: ${versionInfo.version}`);
console.log(`   Build Hash: ${buildHash}`);
console.log(`   Build Date: ${versionInfo.buildDate}`);
