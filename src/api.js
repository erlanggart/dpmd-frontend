// src/api.js
import axios from "axios";
import { API_ENDPOINTS } from "./config/apiConfig";

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
		const publicEndpoints = ['/login', '/auth/login', '/register', '/auth/check-vpn'];
		const isPublicEndpoint = publicEndpoints.some(pub => config.url?.includes(pub));
		
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
