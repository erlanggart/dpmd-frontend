// src/api.js
import axios from "axios";
import { getBaseURL, API_ENDPOINTS } from "./config/apiConfig";

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
		
		// Skip token for public auth endpoints
		const publicEndpoints = ['/login', '/auth/login', '/register'];
		const isPublicEndpoint = publicEndpoints.some(pub => config.url?.includes(pub));
		
		if (!isPublicEndpoint) {
			// Use single token (expressToken)
			const token = localStorage.getItem("expressToken");
				
			if (token) {
				config.headers["Authorization"] = `Bearer ${token}`;
			}
		}
		
		return config;
	},
	(error) => Promise.reject(error)
);

api.interceptors.response.use(
	(response) => response,
	(error) => {
		// Check if error is 401
		if (error.response && error.response.status === 401) {
			// Only redirect if NOT on login page
			if (window.location.pathname !== "/login") {
				localStorage.removeItem("expressToken");
				localStorage.removeItem("user");
				window.location.href = "/login";
			}
		}

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
	formData.append("_method", "PUT"); // Method override for Express
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
