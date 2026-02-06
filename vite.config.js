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

// https://vite.dev/config/
export default defineConfig({
	define: {
		'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
		'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildDate),
	},
	plugins: [
		react(), 
		tailwindcss(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			includeAssets: ['favicon.ico', 'robots.txt', 'logo-bogor.png', 'dpmd.mp3'],
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2,mp3}'],
				// Custom SW will be injected by inject-custom-sw.js script
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/api\.dpmdbogorkab\.id\/api\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 // 1 hour
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^https:\/\/api\.dpmdbogorkab\.id\/(storage|uploads|public)\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'media-cache',
							expiration: {
								maxEntries: 200,
								maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					}
				]
			},
			manifest: {
				name: 'DPMD Kabupaten Bogor',
				short_name: 'DPMD',
				description: 'Sistem Informasi Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor',
				theme_color: '#2563EB',
				background_color: '#2563EB',
				display: 'fullscreen',
				orientation: 'any',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/logo-bogor.png',
						sizes: 'any',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			devOptions: {
				enabled: false // Disabled for production build
			}
		})
	],
	server: {
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
