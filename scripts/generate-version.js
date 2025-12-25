// Generate version.json file for PWA version checking
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Create version info
const versionInfo = {
  version: packageJson.version,
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

console.log('✅ version.json generated successfully');
console.log(`   Version: ${versionInfo.version}`);
console.log(`   Build Date: ${versionInfo.buildDate}`);
