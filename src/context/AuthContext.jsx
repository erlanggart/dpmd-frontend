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

	const [token, setToken] = useState(() => {
		return localStorage.getItem("authToken");
	});

	// Fungsi untuk menyimpan data saat login
	const login = (userData, authToken) => {
		localStorage.setItem("user", JSON.stringify(userData));
		localStorage.setItem("authToken", authToken);
		setUser(userData);
		setToken(authToken);
	};

	// Fungsi untuk menghapus data saat logout
	const logout = () => {
		localStorage.removeItem("user");
		localStorage.removeItem("authToken");
		setUser(null);
		setToken(null);
	};

	// Nilai yang akan dibagikan ke semua komponen
	const value = {
		user,
		token,
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
