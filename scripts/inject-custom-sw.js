// Post-build script: Inject custom SW code at END of generated sw.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swPath = path.join(__dirname, '..', 'dist', 'sw.js');
const customSwPath = path.join(__dirname, '..', 'public', 'sw-custom.js');

console.log('[Inject Custom SW] Starting...');

if (!fs.existsSync(swPath)) {
	console.error('❌ Service Worker not found at:', swPath);
	process.exit(1);
}

if (!fs.existsSync(customSwPath)) {
	console.error('❌ Custom SW code not found at:', customSwPath);
	process.exit(1);
}

// Read files
let swContent = fs.readFileSync(swPath, 'utf-8');
const customSwContent = fs.readFileSync(customSwPath, 'utf-8');

// Inject at END of file (after all Workbox code)
swContent = swContent.trimEnd() + '\n\n// === CUSTOM PUSH NOTIFICATION HANDLER ===\n' + customSwContent + '\n// === END CUSTOM CODE ===\n';

fs.writeFileSync(swPath, swContent, 'utf-8');
console.log('✅ Custom SW code injected successfully!');
console.log('   Added', customSwContent.length, 'bytes to END of sw.js');
