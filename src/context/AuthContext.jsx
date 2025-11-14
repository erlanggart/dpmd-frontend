// src/context/AuthContext.jsx
import React, { createContext, useContext, useState } from "react";

// 1. Membuat Context
const AuthContext = createContext(null);

// 2. Membuat Provider (Penyedia Data)
export const AuthProvider = ({ children }) => {
	// Mengambil data dari localStorage saat pertama kali dimuat
	const [user, setUser] = useState(() => {
		const storedUser = localStorage.getItem("user");
		return storedUser ? JSON.parse(storedUser) : null;
	});

	// Express token - single source of authentication
	const [expressToken, setExpressToken] = useState(() => {
		return localStorage.getItem("expressToken");
	});

	// Fungsi untuk menyimpan data saat login (Express-only)
	const login = (userData, _deprecated = null, expressAuthToken = null) => {
		localStorage.setItem("user", JSON.stringify(userData));
		setUser(userData);

		// Save Express token (primary authentication)
		if (expressAuthToken) {
			localStorage.setItem("expressToken", expressAuthToken);
			setExpressToken(expressAuthToken);
		}
	};

	// Fungsi untuk menghapus data saat logout
	const logout = () => {
		localStorage.removeItem("user");
		localStorage.removeItem("expressToken");
		setUser(null);
		setExpressToken(null);
	};

	// Nilai yang akan dibagikan ke semua komponen
	const value = {
		user,
		token: expressToken, // Alias for compatibility
		expressToken,
		login,
		logout,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. Membuat Custom Hook (useAuth)
// Ini adalah "jalan pintas" untuk menggunakan context
export const useAuth = () => {
	return useContext(AuthContext);
};
