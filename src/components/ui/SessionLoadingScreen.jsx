/**
 * Layar tunggu selama sesi dipulihkan (localStorage → IndexedDB).
 *
 * Setiap penjaga rute harus menampilkan sesuatu selama pemeriksaan itu jalan.
 * Sebelumnya rute `/` mengembalikan `null` sambil menunggu, dengan catatan bahwa
 * "splash screen di index.html yang menanganinya" — padahal index.html tidak
 * pernah punya splash screen. Karena `start_url` PWA adalah `/`, setiap kali
 * aplikasi dibuka dari layar utama user menatap halaman putih kosong sampai
 * pemeriksaan sesi selesai, dan seterusnya kalau pemeriksaan itu tersendat.
 */
const SessionLoadingScreen = () => (
	<div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
		<div className="text-center">
			<div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
			<p className="text-white/80 text-sm font-medium">Memuat...</p>
		</div>
	</div>
);

export default SessionLoadingScreen;
