// Post-build script: Inject custom SW import into generated sw.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swPath = path.join(__dirname, '..', 'dist', 'sw.js');

if (fs.existsSync(swPath)) {
	let swContent = fs.readFileSync(swPath, 'utf-8');
	
	// Add importScripts at the beginning (after initial code)
	const importStatement = `\nimportScripts('sw-custom.js');\n`;
	
	// Insert after self.define check
	swContent = swContent.replace(
		'self.skipWaiting(),',
		`${importStatement}self.skipWaiting(),`
	);
	
	fs.writeFileSync(swPath, swContent, 'utf-8');
	console.log('✅ Custom SW import injected into sw.js');
} else {
	console.error('❌ dist/sw.js not found');
	process.exit(1);
}
