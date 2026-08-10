import axios from "axios";
import api from "../api";
import { API_ENDPOINTS } from "../config/apiConfig";
import { simpanTokenBaru } from "../utils/tokenRenewal";

/**
 * Formulir per bidang (seperti Google Forms).
 *
 * Endpoint pengelolaan memakai instance `api` biasa (butuh login). Endpoint
 * pengisian publik TIDAK — lihat `apiPublik` di bawah.
 */

/**
 * Instance terpisah untuk jalur publik.
 *
 * `api` punya interceptor yang melempar pengguna keluar begitu ada balasan 401.
 * Di halaman pengisian itu salah sasaran: tamu memang tidak punya sesi, dan
 * formulir yang mewajibkan login menjawab 401 — dengan interceptor itu, tamu
 * yang membuka tautan justru dilempar ke halaman depan tanpa penjelasan.
 * Tokennya tetap dikirim bila ada, supaya pengguna yang sudah login dikenali.
 */
const apiPublik = axios.create({
	baseURL: API_ENDPOINTS.EXPRESS_BASE,
	timeout: 60000,
});

apiPublik.interceptors.request.use((config) => {
	const token = localStorage.getItem("expressToken");
	if (token && token !== "VPN_ACCESS_TOKEN") {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Tanpa interceptor 401 — itu justru alasan instance ini ada. Yang tetap perlu
// diikuti hanya perpanjangan token, supaya pengguna yang sudah login tidak
// kehilangan token barunya saat request-nya kebetulan lewat jalur ini.
apiPublik.interceptors.response.use((response) => {
	simpanTokenBaru(response);
	return response;
});

// ---------- Pengelolaan ----------
export const getDaftarFormulir = (bidangId) => api.get(`/formulir/bidang/${bidangId}`);

export const buatFormulir = (bidangId, judul) => api.post(`/formulir/bidang/${bidangId}`, { judul });

export const getFormulir = (id) => api.get(`/formulir/${id}`);

export const ubahFormulir = (id, data) => api.patch(`/formulir/${id}`, data);

export const simpanPertanyaan = (id, pertanyaan) => api.put(`/formulir/${id}/pertanyaan`, { pertanyaan });

export const duplikatFormulir = (id) => api.post(`/formulir/${id}/duplikat`);

export const hapusFormulir = (id) => api.delete(`/formulir/${id}`);

// ---------- Respons ----------
export const getRespons = (id) => api.get(`/formulir/${id}/respons`);

export const getRingkasan = (id) => api.get(`/formulir/${id}/ringkasan`);

export const hapusRespons = (responsId) => api.delete(`/formulir/respons/${responsId}`);

/**
 * Unduh lampiran jawaban.
 *
 * Lewat blob, bukan <a href> langsung: endpointnya butuh header Authorization
 * sedangkan navigasi browser biasa tidak mengirimkannya.
 */
export const unduhBerkasFormulir = async (berkasId, namaBerkas) => {
	const res = await api.get(`/formulir/berkas/${berkasId}/unduh`, { responseType: "blob" });
	const url = URL.createObjectURL(res.data);
	const a = document.createElement("a");
	a.href = url;
	a.download = namaBerkas;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
};

/** Ekspor seluruh respons sebagai CSV. */
export const eksporRespons = async (id, judul) => {
	const res = await api.get(`/formulir/${id}/ekspor`, { responseType: "blob" });
	const url = URL.createObjectURL(res.data);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${(judul || "formulir").replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "formulir"}.csv`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
};

// ---------- Pengisian (publik) ----------
export const getFormulirPublik = (token) => apiPublik.get(`/formulir/publik/${token}`);

/**
 * Kirim jawaban.
 *
 * Selalu multipart, bahkan saat tidak ada lampiran: satu jalur pengiriman lebih
 * mudah dipercaya daripada dua yang bercabang berdasarkan ada-tidaknya berkas.
 * Jawaban dititipkan sebagai satu field JSON; lampiran memakai nama field
 * "berkas_<id pertanyaan>" agar server tahu berkas itu milik pertanyaan mana.
 */
export const kirimFormulir = (token, jawaban, berkas = {}, namaResponden = "") => {
	const form = new FormData();
	form.append("jawaban", JSON.stringify(jawaban));
	if (namaResponden) form.append("nama_responden", namaResponden);

	Object.entries(berkas).forEach(([pertanyaanId, daftar]) => {
		(daftar || []).forEach((f) => form.append(`berkas_${pertanyaanId}`, f));
	});

	return apiPublik.post(`/formulir/publik/${token}/kirim`, form, {
		headers: { "Content-Type": "multipart/form-data" },
	});
};

/** Tautan yang dibagikan ke responden. */
export const tautanFormulir = (token) => `${window.location.origin}/f/${token}`;
