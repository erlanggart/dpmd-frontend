import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(), 
		tailwindcss(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.ico', 'robots.txt'],
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
						src: '/logo-bogor.png',
						sizes: 'any',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}'],
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
			devOptions: {
				enabled: false
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
