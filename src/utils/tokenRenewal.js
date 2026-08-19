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

import axios from "axios";
import { API_ENDPOINTS } from "../config/apiConfig";

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

/** Tulis token ke localStorage + authSession dan beri tahu AuthContext. */
const pasangToken = (token) => {
	localStorage.setItem("expressToken", token);
	const sesiStr = localStorage.getItem("authSession");
	if (!sesiStr) return;
	const sesi = JSON.parse(sesiStr);
	sesi.token = token;
	sesi.lastActivity = Date.now();
	localStorage.setItem("authSession", JSON.stringify(sesi));
	window.dispatchEvent(new CustomEvent("sessionUpdated", { detail: sesi }));
};

// Beberapa request bisa gagal 401 berbarengan; cukup satu permintaan pembaruan
// yang benar-benar berangkat, sisanya menunggu hasil yang sama.
let pembaruanBerjalan = null;

/**
 * Tukar token yang sudah kedaluwarsa dengan token baru.
 *
 * Perpanjangan bergulir lewat header X-Renewed-Token hanya bekerja selama user
 * membuka aplikasi dalam masa berlaku token. Kalau PWA didiamkan lebih lama dari
 * itu, tokennya keburu mati — dan tanpa jalur ini user terlempar keluar padahal
 * tidak pernah menekan keluar.
 *
 * Kembalian:
 *   { status: 'baru', token }   → token berhasil ditukar, request boleh diulang
 *   { status: 'ditolak', code } → server menyatakan sesi ini memang habis
 *   { status: 'gagal' }         → jaringan bermasalah; sesi JANGAN dibuang
 */
export const perbaruiSesiKedaluwarsa = async () => {
	if (pembaruanBerjalan) return pembaruanBerjalan;

	pembaruanBerjalan = (async () => {
		const tokenLama = localStorage.getItem("expressToken");
		if (!tokenLama || tokenLama === "VPN_ACCESS_TOKEN") {
			return { status: "ditolak", code: "SESSION_INVALID" };
		}

		try {
			// Instance sendiri, tanpa interceptor — kalau tidak, kegagalan di sini
			// akan memicu penanganan 401 yang justru memanggil fungsi ini lagi.
			const res = await axios.post(
				`${API_ENDPOINTS.EXPRESS_BASE}/auth/renew`,
				{ token: tokenLama },
				{ headers: { "Content-Type": "application/json" }, timeout: 20000 },
			);

			const tokenBaru = res.data?.data?.token;
			if (!tokenBaru) return { status: "gagal" };

			pasangToken(tokenBaru);
			return { status: "baru", token: tokenBaru };
		} catch (error) {
			// Hanya jawaban tegas dari server yang boleh dianggap sesi habis.
			// Jaringan putus, server sedang mati, atau timeout bukan alasan
			// mengeluarkan user.
			if (error.response?.status === 401) {
				return { status: "ditolak", code: error.response.data?.code, message: error.response.data?.message };
			}
			return { status: "gagal" };
		}
	})();

	try {
		return await pembaruanBerjalan;
	} finally {
		pembaruanBerjalan = null;
	}
};

export default simpanTokenBaru;
