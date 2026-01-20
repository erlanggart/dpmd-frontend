import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

// Create context
export const EditModeContext = createContext();

// Custom hook to use edit mode
export const useEditMode = () => {
	const context = useContext(EditModeContext);
	if (!context) {
		throw new Error("useEditMode must be used within EditModeProvider");
	}
	return context;
};

/**
 * Context untuk mengatur mode edit kelembagaan dan pengurus
 * Hanya superadmin dan pemberdayaan_masyarakat yang bisa toggle
 * State disimpan di database agar tersinkron di semua device
 */
export const EditModeProvider = ({ children }) => {
	const [isEditMode, setIsEditMode] = useState(false);
	const [loading, setLoading] = useState(true);

	// Fetch edit mode status dari database saat mount
	useEffect(() => {
		const fetchEditMode = async () => {
			try {
				const response = await api.get("/app-settings/kelembagaan_edit_mode");
				if (response.data.success) {
					setIsEditMode(response.data.data.value);
				}
			} catch (error) {
				console.error("Error fetching edit mode:", error);
				// Fallback to localStorage if API fails
				const saved = localStorage.getItem("kelembagaan_edit_mode");
				setIsEditMode(saved === "true");
			} finally {
				setLoading(false);
			}
		};

		fetchEditMode();
	}, []);

	// Update edit mode ke database
	const toggleEditMode = async () => {
		try {
			const newValue = !isEditMode;
			const response = await api.put("/app-settings/kelembagaan_edit_mode", {
				value: newValue,
			});

			if (response.data.success) {
				setIsEditMode(newValue);
				// Backup to localStorage
				localStorage.setItem("kelembagaan_edit_mode", newValue.toString());
			}
		} catch (error) {
			console.error("Error updating edit mode:", error);
			// If API fails, still update locally
			const newValue = !isEditMode;
			setIsEditMode(newValue);
			localStorage.setItem("kelembagaan_edit_mode", newValue.toString());
		}
	};

	const enableEditMode = async () => {
		try {
			const response = await api.put("/app-settings/kelembagaan_edit_mode", {
				value: true,
			});

			if (response.data.success) {
				setIsEditMode(true);
				localStorage.setItem("kelembagaan_edit_mode", "true");
			}
		} catch (error) {
			console.error("Error enabling edit mode:", error);
			setIsEditMode(true);
			localStorage.setItem("kelembagaan_edit_mode", "true");
		}
	};

	const disableEditMode = async () => {
		try {
			const response = await api.put("/app-settings/kelembagaan_edit_mode", {
				value: false,
			});

			if (response.data.success) {
				setIsEditMode(false);
				localStorage.setItem("kelembagaan_edit_mode", "false");
			}
		} catch (error) {
			console.error("Error disabling edit mode:", error);
			setIsEditMode(false);
			localStorage.setItem("kelembagaan_edit_mode", "false");
		}
	};

	return (
		<EditModeContext.Provider
			value={{
				isEditMode,
				loading,
				toggleEditMode,
				enableEditMode,
				disableEditMode,
			}}
		>
			{children}
		</EditModeContext.Provider>
	);
};
