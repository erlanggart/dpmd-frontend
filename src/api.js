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
export default api;
