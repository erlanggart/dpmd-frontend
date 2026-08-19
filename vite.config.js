import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';

// Read package.json to get version
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const appVersion = packageJson.version;
const buildDate = new Date().toISOString();

// pdf.js 6.x men-decode gambar JBIG2/JPEG2000 lewat WASM. File wasm-nya ada di
// node_modules/pdfjs-dist/wasm dan harus disajikan via URL (parameter `wasmUrl`).
// Plugin ini menyalinnya ke dist/pdfjs-wasm saat build dan menyajikannya saat dev,
// sehingga halaman PDF hasil scan (JBIG2) tidak gagal render / tampil kosong.
function pdfjsWasmPlugin() {
	const wasmDir = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/wasm');
	const mime = (f) => (path.extname(f) === '.wasm' ? 'application/wasm' : 'text/javascript');
	return {
		name: 'pdfjs-wasm-assets',
		buildStart() {
			if (!fs.existsSync(wasmDir)) return;
			for (const f of fs.readdirSync(wasmDir)) {
				if (!/\.(wasm|js)$/.test(f)) continue;
				this.emitFile({ type: 'asset', fileName: `pdfjs-wasm/${f}`, source: fs.readFileSync(path.join(wasmDir, f)) });
			}
		},
		configureServer(server) {
			server.middlewares.use('/pdfjs-wasm', (req, res, next) => {
				const fp = path.join(wasmDir, decodeURIComponent((req.url || '').split('?')[0]));
				if (fp.startsWith(wasmDir) && fs.existsSync(fp) && fs.statSync(fp).isFile()) {
					res.setHeader('Content-Type', mime(fp));
					fs.createReadStream(fp).pipe(res);
				} else next();
			});
		},
	};
}

// https://vite.dev/config/
export default defineConfig({
	define: {
		'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
		'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildDate),
	},
	esbuild: {
		drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
	},
	build: {
		chunkSizeWarningLimit: 1500,
		rollupOptions: {
			output: {
				// Pisahkan pustaka berat ke chunk sendiri: bundle awal lebih kecil,
				// dan tiap pustaka di-cache terpisah (tak perlu unduh ulang saat update kecil).
				manualChunks(id) {
					if (!id.includes('node_modules')) return undefined;
					// React core dijaga satu chunk agar urutan inisialisasi aman.
					if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react-vendor';
					if (id.includes('face-api')) return 'faceapi';
					if (id.includes('mediasoup')) return 'mediasoup';
					if (id.includes('@mediapipe')) return 'mediapipe';
					if (id.includes('leaflet')) return 'leaflet';
					if (id.includes('xlsx')) return 'xlsx';
					if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf';
					if (id.includes('pdfjs-dist')) return 'pdfjs';
					if (id.includes('fabric')) return 'fabric';
					if (id.includes('chart.js') || id.includes('recharts') || id.includes('d3-')) return 'charts';
					if (id.includes('framer-motion')) return 'motion';
					return undefined;
				},
			},
		},
	},
	plugins: [
		react(),
		tailwindcss(),
		pdfjsWasmPlugin(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			includeAssets: ['favicon.ico', 'robots.txt', 'logo-dpmd.png', 'logo-dpmd-96.png', 'logo-dpmd-192.png', 'logo-dpmd-512.png', 'dpmd.mp3'],
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2,mp3}'],
				// Exclude static file paths from navigateFallback to let nginx/backend handle them
				navigateFallbackDenylist: [/^\/api\//, /^\/storage\//, /^\/uploads\//, /^\/public\//, /\/version\.json$/],
				// Custom SW will be injected by inject-custom-sw.js script
				runtimeCaching: [
					{
						// Submit daftar hadir HJB-544: jika koneksi putus, request POST diantri
						// ke IndexedDB (Background Sync) dan dikirim ulang otomatis saat online.
						urlPattern: /\/api\/event-attendance\/public\/register/i,
						handler: 'NetworkOnly',
						method: 'POST',
						options: {
							backgroundSync: {
								name: 'attendance-register-queue',
								options: {
									maxRetentionTime: 60 * 24 * 7 // simpan antrian hingga 7 hari (dalam menit)
								}
							}
						}
					},
					{
						// Config daftar hadir HJB-544: simpan lama & sajikan instan dari cache
						// agar halaman tetap terbuka saat koneksi booth buruk/putus.
						urlPattern: /\/api\/event-attendance\/public\/config/i,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'event-config-cache',
							expiration: {
								maxEntries: 4,
								maxAgeSeconds: 60 * 60 * 24 * 14 // 14 hari (cukup untuk durasi event)
							},
							cacheableResponse: {
								statuses: [200]
							}
						}
					},
					{
						// Endpoint sesi TIDAK BOLEH disajikan dari cache. Kunci cache Workbox
						// hanya URL — header Authorization diabaikan — sehingga response milik
						// akun sebelumnya di perangkat yang sama bisa terpakai oleh akun yang
						// sedang login: identitas user tertukar dan popup "Ganti Password
						// Wajib" menyala padahal sandinya sudah bukan bawaan.
						// Harus berada SEBELUM aturan /api/ umum di bawah; Workbox memakai
						// rute pertama yang cocok.
						urlPattern: /\/api\/auth\//i,
						handler: 'NetworkOnly'
					},
					{
						// Tanpa domain agar tetap cocok setelah pindah ke dpmd.bogorkab.go.id.
						// JANGAN diberi jangkar ^: Workbox mencocokkan regex ini ke URL
						// lengkap (href), sehingga ^\/api\/ tidak akan pernah cocok. Tanpa
						// jangkar, kecocokan di tengah href hanya diterima untuk request
						// same-origin — persis yang kita mau.
						urlPattern: /\/api\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 // 1 hour
							},
							cacheableResponse: {
								statuses: [200]
							}
						}
					},
					{
						urlPattern: /\/(storage|uploads|public)\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'media-cache',
							expiration: {
								maxEntries: 200,
								maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
							},
							cacheableResponse: {
								statuses: [200]
							}
						}
					}
				]
			},
			manifest: {
				name: 'DPMD Kabupaten Bogor',
				short_name: 'DPMD',
				description: 'Sistem Informasi Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor',
				theme_color: '#ffffff',
				background_color: '#ffffff',
				display: 'standalone',
				orientation: 'any',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/logo-dpmd.png?v=2',
						sizes: 'any',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/logo-dpmd-192.png?v=2',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/logo-dpmd-512.png?v=2',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/logo-dpmd-96.png?v=2',
						sizes: '96x96',
						type: 'image/png',
						purpose: 'any'
					}
				]
			},
			devOptions: {
				enabled: false // Disabled for production build
			}
		})
	],
	server: {
		// Dengarkan semua antarmuka jaringan, bukan hanya localhost, agar HP di
		// Wi-Fi yang sama bisa membuka dev server (dipakai menguji scan QR label).
		host: true,
		proxy: {
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
				secure: false,
			},
			"/storage": {
				target: "http://localhost:3001",
				changeOrigin: true,
			},
		},
	},
});
