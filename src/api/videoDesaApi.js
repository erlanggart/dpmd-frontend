import axios from "axios";
import api from "../api";
import { API_ENDPOINTS } from "../config/apiConfig";
import { ambilToken } from "../utils/tokenSesi";

/**
 * Video Desa: bidang meminta video dari desa lewat tautan publik.
 *
 * Pengelolaan memakai `api` biasa (butuh login). Halaman unggah desa memakai
 * instance terpisah tanpa interceptor 401 — alasannya sama dengan formulir:
 * tamu memang tidak punya sesi, dan tidak boleh dilempar ke halaman login.
 */
const apiPublik = axios.create({ baseURL: API_ENDPOINTS.EXPRESS_BASE, timeout: 60000 });

apiPublik.interceptors.request.use((config) => {
	// Bila yang membuka akun desa yang sedang login, desanya terkunci otomatis.
	const token = ambilToken();
	if (token && token !== "VPN_ACCESS_TOKEN") config.headers.Authorization = `Bearer ${token}`;
	return config;
});

// ---------- Pengelolaan ----------
export const getDaftarPermintaan = (bidangId) => api.get(`/video-desa/bidang/${bidangId}`);
export const buatPermintaan = (bidangId, data) => api.post(`/video-desa/bidang/${bidangId}`, data);
export const getPermintaan = (id) => api.get(`/video-desa/${id}`);
export const ubahPermintaan = (id, data) => api.patch(`/video-desa/${id}`, data);
export const hapusPermintaan = (id) => api.delete(`/video-desa/${id}`);
export const tinjauKiriman = (id, status, catatan) => api.patch(`/video-desa/kiriman/${id}`, { status, catatan });
export const hapusKiriman = (id) => api.delete(`/video-desa/kiriman/${id}`);

/**
 * Tautan putar & unduh bertanda tangan (berumur 3 jam). Server mengembalikan
 * path "/api/..."; di sini dijadikan absolut terhadap alamat backend, karena
 * saat pengembangan backend ada di origin lain (localhost:3001).
 */
export const getTautanVideo = async (kirimanId) => {
	const r = await api.get(`/video-desa/kiriman/${kirimanId}/tautan`);
	const asal = API_ENDPOINTS.EXPRESS_BASE.replace(/\/api\/?$/, "");
	return { putar: asal + r.data.data.putar, unduh: asal + r.data.data.unduh };
};

/** Tautan yang dibagikan ke desa. Pendek (/v/...) karena ditempel di WhatsApp. */
export const tautanUnggah = (token) => `${window.location.origin}/v/${token}`;

// ---------- Unggah (publik) ----------
export const getHalamanUnggah = (token) => apiPublik.get(`/video-desa/publik/${token}`);

const mulaiUnggah = (token, data) => apiPublik.post(`/video-desa/publik/${token}/unggah`, data);
const statusUnggah = (token, uploadId) => apiPublik.get(`/video-desa/publik/${token}/unggah/${uploadId}`);
const kirimPotongan = (token, uploadId, indeks, blob, signal, onUploadProgress) =>
	apiPublik.put(`/video-desa/publik/${token}/unggah/${uploadId}/${indeks}`, blob, {
		headers: { "Content-Type": "application/octet-stream" },
		timeout: 5 * 60 * 1000,
		signal,
		onUploadProgress,
	});
const selesaiUnggah = (token, uploadId) =>
	apiPublik.post(`/video-desa/publik/${token}/unggah/${uploadId}/selesai`, {}, { timeout: 5 * 60 * 1000 });
export const batalUnggah = (token, uploadId) =>
	apiPublik.delete(`/video-desa/publik/${token}/unggah/${uploadId}`).catch(() => {});

const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

/** Galat yang layak diulang: jaringan putus, server sibuk, atau 5xx. */
const bisaDiulang = (e) => !e.response || e.response.status >= 500 || e.response.status === 429 || e.response.status === 409;

/**
 * Unggah satu video per potongan.
 *
 * Tiap potongan diulang hingga MAKS_ULANG kali dengan jeda yang makin panjang;
 * setelah gagal, posisi diambil ulang dari server (potongan yang ternyata sudah
 * diterima tidak dikirim dua kali). Sinyal di desa sering hilang sebentar —
 * tanpa ini satu putus 2 detik menggagalkan unggahan ratusan MB.
 *
 * `onKemajuan({ terkirim, total })` dipanggil setiap kali byte bertambah.
 */
const MAKS_ULANG = 8;

export const unggahVideo = async ({ token, berkas, isian, onKemajuan, onSesi, signal }) => {
	const awal = await mulaiUnggah(token, { ...isian, nama_berkas: berkas.name, ukuran: berkas.size });
	const { upload_id: uploadId, ukuran_potongan: potong, jumlah_potongan: jumlah } = awal.data.data;
	onSesi?.(uploadId);

	let indeks = 0;
	while (indeks < jumlah) {
		if (signal?.aborted) throw new DOMException("Dibatalkan", "AbortError");
		const dari = indeks * potong;
		const blob = berkas.slice(dari, Math.min(berkas.size, dari + potong));

		let percobaan = 0;
		for (;;) {
			try {
				await kirimPotongan(token, uploadId, indeks, blob, signal, (ev) =>
					onKemajuan?.({ terkirim: Math.min(berkas.size, dari + (ev.loaded || 0)), total: berkas.size })
				);
				indeks += 1;
				break;
			} catch (e) {
				if (signal?.aborted || axios.isCancel(e)) throw new DOMException("Dibatalkan", "AbortError");
				percobaan += 1;
				if (!bisaDiulang(e) || percobaan > MAKS_ULANG) throw e;
				await tunggu(Math.min(30000, 1000 * 2 ** (percobaan - 1)));
				try {
					const st = await statusUnggah(token, uploadId);
					indeks = st.data.data.diterima;
					break;
				} catch {
					// Status juga gagal (masih putus) — coba lagi potongan yang sama.
				}
			}
		}
		onKemajuan?.({ terkirim: Math.min(berkas.size, indeks * potong), total: berkas.size });
	}

	const hasil = await selesaiUnggah(token, uploadId);
	return hasil.data.data;
};
