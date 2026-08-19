// src/api.js
import axios from "axios";
import { API_ENDPOINTS } from "./config/apiConfig";
import { performFullLogout } from "./utils/sessionPersistence";
import { simpanTokenBaru, perbaruiSesiKedaluwarsa } from "./utils/tokenRenewal";

// Flag to prevent multiple simultaneous logouts
let isLoggingOut = false;

/**
 * Hentikan sesi dan kembalikan user ke halaman login.
 *
 * HANYA boleh dipanggil kalau server benar-benar menyatakan sesi ini habis —
 * bukan karena jaringan bermasalah, bukan karena satu request gagal. Sesi di
 * aplikasi ini permanen: user tidak boleh keluar kecuali dia menekan keluar
 * atau memang sudah tidak berhak masuk.
 */
const hentikanSesi = (pesan) => {
	if (isLoggingOut) return;
	if (window.location.pathname === "/login" || window.location.pathname === "/") return;

	isLoggingOut = true;
	try {
		sessionStorage.setItem("authNotice", pesan);
	} catch {
		// sessionStorage bisa diblokir (mode privat); abaikan saja.
	}

	performFullLogout()
		.then(() => {
			window.location.href = "/login";
		})
		.finally(() => {
			isLoggingOut = false;
		});
};

const api = axios.create({
	baseURL: API_ENDPOINTS.EXPRESS_BASE, // Express only
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
	},
});

api.interceptors.request.use(
	(config) => {
		// All endpoints use Express now
		config.baseURL = API_ENDPOINTS.EXPRESS_BASE;
		
		// Skip token for public auth endpoints and VPN check
		const publicEndpoints = ['/auth/login', '/auth/register', '/auth/check-vpn'];
		const isPublicEndpoint = publicEndpoints.some(pub => config.url?.startsWith(pub) || config.url?.endsWith(pub));
		
		if (!isPublicEndpoint) {
			// Use single token (expressToken)
			const token = localStorage.getItem("expressToken");
				
			// Skip VPN_ACCESS_TOKEN - don't send to backend
			if (token && token !== 'VPN_ACCESS_TOKEN') {
				config.headers["Authorization"] = `Bearer ${token}`;
			}
			
			// Add VPN secret for VPN users accessing VPN-protected routes
			const user = JSON.parse(localStorage.getItem("user") || "{}");
			const vpnSecret = sessionStorage.getItem('vpn_secret');
			
			if (user.role === 'vpn_access' && vpnSecret && config.url?.includes('/vpn-core')) {
				config.headers['x-vpn-secret'] = vpnSecret;
			}

			// Auto-inject desa_id for admin users on specific endpoints
			const adminRoles = ['super_admin', 'superadmin', 'admin', 'kepala_dinas', 'sekretaris_dinas', 'kepala_bidang', 'pegawai', 'pemberdayaan_masyarakat', 'pmd'];
			if (user?.role && adminRoles.includes(user.role)) {
				// Get desa_id from current URL path (for admin viewing specific desa)
				const path = window.location.pathname;
				const match = path.match(/\/kelembagaan\/admin\/([^/]+)/);
				
				if (match && match[1]) {
					const desaId = match[1];
					
					// Add desa_id to query params for endpoints that need it
					const needsDesaId = [
						'/produk-hukum',
						'/pengurus',
						'/bumdes'
					];
					
					const needsInjection = needsDesaId.some(endpoint => config.url?.includes(endpoint));
					
					if (needsInjection && !config.params?.desa_id) {
						config.params = { ...config.params, desa_id: desaId };
					}
				}
			}
		}
		
		return config;
	},
	(error) => Promise.reject(error)
);

api.interceptors.response.use(
	(response) => {
		simpanTokenBaru(response);
		return response;
	},
	async (error) => {
		// Skip cancelled/aborted requests — don't trigger logout for stale navigated-away requests
		if (axios.isCancel(error) || error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED') {
			return Promise.reject(error);
		}

		// Permintaan yang memang tidak membawa token — endpoint publik seperti
		// pengisian formulir tamu — bisa membalas 401 tanpa ada hubungannya dengan
		// sesi yang sedang berjalan. Melempar user keluar karena itu salah alamat.
		const membawaToken = Boolean(error.config?.headers?.Authorization);

		if (error.response?.status !== 401 || !membawaToken) {
			return Promise.reject(error);
		}

		// Role di database berubah (mis. akun desa dijadikan Admin Desa). Ini
		// keputusan admin, bukan sesi yang rusak — token lama memang harus mati dan
		// user wajib login ulang. Alasannya disimpan supaya halaman login bisa
		// menjelaskan, bukan sekadar melempar user keluar tanpa keterangan.
		if (error.response.data?.code === "ROLE_CHANGED") {
			hentikanSesi(
				error.response.data.message ||
					"Hak akses akun Anda telah diperbarui. Silakan login kembali.",
			);
			return Promise.reject(error);
		}

		// Sisanya: token kedaluwarsa atau ditolak. Sesi di aplikasi ini permanen,
		// jadi jangan langsung melempar user keluar — tukar dulu tokennya diam-diam
		// lalu ulangi request yang gagal. User tidak melihat apa-apa.
		if (!error.config.__sudahDiperbarui) {
			const hasil = await perbaruiSesiKedaluwarsa();

			if (hasil.status === "baru") {
				error.config.__sudahDiperbarui = true;
				// Interceptor request akan memasang token terbaru dari localStorage.
				return api.request(error.config);
			}

			if (hasil.status === "ditolak") {
				hentikanSesi(hasil.message || "Sesi Anda sudah berakhir. Silakan login kembali.");
				return Promise.reject(error);
			}
		}

		// Pembaruan gagal karena jaringan/server, bukan karena sesinya habis.
		// Biarkan sesi apa adanya: user tetap di dalam aplikasi dan request ini
		// bisa dicoba lagi nanti. Mengeluarkan user di sini persis bug yang
		// membuat PWA terasa "keluar sendiri".
		return Promise.reject(error);
	}
);

// --- Produk Hukum ---
export const getProdukHukums = (page = 1, search = "") => {
	return api.get(`/produk-hukum?page=${page}&search=${search}`);
};

export const createProdukHukum = (data) => {
	const formData = new FormData();
	for (const key in data) {
		formData.append(key, data[key]);
	}
	return api.post("/produk-hukum", formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};

export const updateProdukHukum = (id, data) => {
	return api.put(`/produk-hukum/${id}`, data, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};

export const deleteProdukHukum = (id) => {
	return api.delete(`/produk-hukum/${id}`);
};


// --- Perjadin ---
export const getPerjadinBidang = () => {
	return api.get("/bidang");
};

export const getPegawaiByBidang = (bidangId) => {
	return api.get(`/pegawai/${bidangId}`);
};

export const getKegiatan = () => {
	return api.get("/kegiatan");
};

export const createKegiatan = (data) => {
	return api.post("/kegiatan", data);
};

export const updateKegiatan = (id, data) => {
	return api.put(`/kegiatan/${id}`, data);
};

export const deleteKegiatan = (id) => {
	return api.delete(`/kegiatan/${id}`);
};

export const getStatistikPerjadin = (periode = 'minggu') => {
	return api.get(`/perjadin/statistik-perjadin?periode=${periode}`);
};

export default api;
