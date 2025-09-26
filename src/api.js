// src/api.js
import axios from "axios";

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
	timeout: 10000,
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

export const getAparaturDesa = (params) => {
	return api.get("/aparatur-desa", { params });
};

export const getAparaturDesaById = (id) => {
	return api.get(`/aparatur-desa/${id}`);
};

// Helper to build FormData
const buildFormData = (data) => {
	const formData = new FormData();
	for (const key in data) {
		if (data[key] !== null && data[key] !== undefined) {
			// If the value is a File object and its name is empty, it's likely an empty dropzone field.
			if (data[key] instanceof File && !data[key].name) {
				continue;
			}
			formData.append(key, data[key]);
		}
	}
	return formData;
};

export const createAparaturDesa = (data) => {
	const formData = buildFormData(data);
	return api.post("/aparatur-desa", formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};

export const updateAparaturDesa = (id, data) => {
	const formData = buildFormData(data);
	// Laravel expects POST for multipart/form-data updates
	formData.append("_method", "PUT");
	return api.post(`/aparatur-desa/${id}`, formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};

export const deleteAparaturDesa = (id) => {
	return api.delete(`/aparatur-desa/${id}`);
};

// We also need to fetch produk hukum for the form's select input
export const getProdukHukumList = (params) => {
	return api.get("/produk-hukum", { params });
};

export default api;
