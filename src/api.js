// src/api.js
import axios from "axios";

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
	timeout: 30000, // Increased timeout to 30 seconds for heavy queries
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
	},
});

api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("authToken");
		if (token) {
			config.headers["Authorization"] = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

api.interceptors.response.use(
	(response) => response,
	(error) => {
		// Cek jika error adalah 401
		if (error.response && error.response.status === 401) {
			// TAMBAHKAN PENGECEKAN INI:
			// Hanya redirect jika kita TIDAK sedang di halaman login.
			if (window.location.pathname !== "/login") {
				localStorage.removeItem("authToken");
				localStorage.removeItem("user");
				window.location.href = "/login";
			}
		}

		// Kembalikan error agar bisa ditangani oleh komponen (seperti LoginPage)
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
	const formData = new FormData();
	for (const key in data) {
		formData.append(key, data[key]);
	}
	formData.append("_method", "PUT"); // Laravel needs this for file uploads in updates
	return api.post(`/produk-hukum/${id}`, formData, {
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

export const getPersonilByBidang = (bidangId) => {
	return api.get(`/personil/${bidangId}`);
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
