// src/services/api.js
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

// --- Kecamatan dan Desa ---
export const getKecamatans = () => {
	return api.get('/kecamatans');
};

export const getDesasByKecamatan = (kecamatanId) => {
	return api.get(`/desas/by-kecamatan/${kecamatanId}`);
};

export const getAllDesas = () => {
	return api.get('/desas');
};

// --- Produk Hukum ---
export const getProdukHukums = async (pageOrParams = {}, search = "") => {
	try {
		// Support both old style (page, search) and new style (params object)
		if (typeof pageOrParams === 'number') {
			// Old style: getProdukHukums(page, search)
			const response = await api.get(`/produk-hukum?page=${pageOrParams}&search=${search}`);
			return response;
		}
		// New style: getProdukHukums({ page, search, ... })
		const response = await api.get('/produk-hukum', { params: pageOrParams });
		return response;
	} catch (error) {
		console.error('Error fetching produk hukum:', error);
		throw error;
	}
};

export const getProdukHukumById = async (id) => {
	try {
		const response = await api.get(`/produk-hukum/${id}`);
		return response;
	} catch (error) {
		console.error('Error fetching produk hukum by id:', error);
		throw error;
	}
};

export const createProdukHukum = async (data) => {
	try {
		const formData = new FormData();
		for (const key in data) {
			formData.append(key, data[key]);
		}
		const response = await api.post('/produk-hukum', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});
		return response;
	} catch (error) {
		console.error('Error creating produk hukum:', error);
		throw error;
	}
};

export const updateProdukHukum = async (id, data) => {
	try {
		const formData = new FormData();
		for (const key in data) {
			formData.append(key, data[key]);
		}
		formData.append("_method", "PUT"); // Laravel needs this for file uploads in updates
		const response = await api.post(`/produk-hukum/${id}`, formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});
		return response;
	} catch (error) {
		console.error('Error updating produk hukum:', error);
		throw error;
	}
};

export const deleteProdukHukum = async (id) => {
	try {
		const response = await api.delete(`/produk-hukum/${id}`);
		return response;
	} catch (error) {
		console.error('Error deleting produk hukum:', error);
		throw error;
	}
};

export const updateProdukHukumStatus = async (id, status_peraturan) => {
	try {
		const response = await api.put(`/produk-hukum/${id}/status`, { status_peraturan });
		return response;
	} catch (error) {
		console.error('Error updating produk hukum status:', error);
		throw error;
	}
};

export default api;