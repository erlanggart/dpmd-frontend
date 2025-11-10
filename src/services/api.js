// src/services/api.js
import axios from "axios";

const api = axios.create({
	baseURL: "http://127.0.0.1:3001/api",
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
	},
});

api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("expressToken");
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
				localStorage.removeItem("expressToken");
				localStorage.removeItem("user");
				window.location.href = "/login";
			}
		}

		// Kembalikan error agar bisa ditangani oleh komponen (seperti LoginPage)
		return Promise.reject(error);
	}
);

// Helper functions for location data
export const getKecamatans = async () => {
	try {
		const response = await api.get('/kecamatans');
		console.log('🔍 Raw kecamatan response:', response);
		return response; // Return full axios response
	} catch (error) {
		console.error('Error fetching kecamatans:', error);
		throw error;
	}
};

export const getDesasByKecamatan = async (kecamatanId) => {
	try {
		const response = await api.get(`/desas/kecamatan/${kecamatanId}`);
		console.log('🔍 Raw desa response:', response);
		return response; // Return full axios response
	} catch (error) {
		console.error('Error fetching desas:', error);
		throw error;
	}
};

export default api;