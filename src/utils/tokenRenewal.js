/**
 * Perpanjangan token bergulir.
 *
 * Sesi di aplikasi ini permanen, tapi JWT-nya berumur 7 hari — tanpa mekanisme
 * perpanjangan, user terlempar keluar sekali seminggu di tengah pemakaian.
 * Server mengirim token baru lewat header `X-Renewed-Token` saat sisa umurnya
 * menipis; yang perlu dilakukan klien hanya menukarnya di tempat penyimpanan.
 *
 * Dipakai bersama oleh semua instance axios yang membawa token, supaya
 * perpanjangan tidak hilang hanya karena request-nya lewat instance yang lain.
 */

/** Baca muatan JWT. Bagian tengahnya base64url, bukan base64 biasa. */
const bacaMuatanJwt = (token) => {
	const bagian = token.split(".")[1];
	if (!bagian) return null;
	const base64 = bagian.replace(/-/g, "+").replace(/_/g, "/");
	const berpadding = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
	return JSON.parse(atob(berpadding));
};

/**
 * Simpan token yang diperpanjang server, bila ada, dari sebuah response axios.
 * Aman dipanggil untuk response apa pun — tanpa header itu fungsi ini tak
 * melakukan apa-apa.
 */
export const simpanTokenBaru = (response) => {
	const tokenBaru = response?.headers?.["x-renewed-token"];
	if (!tokenBaru) return;

	try {
		// Response /api bisa dilayani dari cache service worker, dan cache itu tidak
		// ikut dibersihkan saat logout. Tanpa pemeriksaan ini, response lama milik
		// akun sebelumnya di perangkat yang sama bisa menukar token akun yang
		// sedang aktif. Token hanya dipakai kalau pemiliknya memang user ini.
		const pemilik = bacaMuatanJwt(tokenBaru);
		const userSekarang = JSON.parse(localStorage.getItem("user") || "{}");
		if (!userSekarang?.id || String(pemilik?.id) !== String(userSekarang.id)) return;

		localStorage.setItem("expressToken", tokenBaru);

		const sesiStr = localStorage.getItem("authSession");
		if (sesiStr) {
			const sesi = JSON.parse(sesiStr);
			sesi.token = tokenBaru;
			sesi.lastActivity = Date.now();
			localStorage.setItem("authSession", JSON.stringify(sesi));
			// Cadangan IndexedDB ikut disegarkan lewat pencadangan berkala yang
			// membaca authSession, jadi cukup beri tahu tab/komponen lain.
			window.dispatchEvent(new CustomEvent("sessionUpdated", { detail: sesi }));
		}
	} catch {
		// Penyimpanan bisa penuh atau diblokir; token lama masih berlaku, jadi
		// kegagalan di sini tidak boleh mengganggu response yang sedang jalan.
	}
};

export default simpanTokenBaru;
