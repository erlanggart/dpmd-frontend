import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

/**
 * Custom hook to fetch and update user profile with complete relations
 * Automatically fetches profile data on mount
 */
export const useUserProfile = () => {
	const { user, login } = useAuth();

	useEffect(() => {
		const fetchProfile = async () => {
			// Only fetch if user exists but doesn't have complete desa data
			if (user && user.role === "desa" && !user.desa) {
				try {
					const response = await api.get("/auth/profile");
					
					if (response.data.success) {
						const profileData = response.data.data;
						
						// Update user context with complete profile data
						const token = localStorage.getItem("expressToken");
						login(profileData, null, token);
						
						console.log("✅ Profile updated with desa data:", profileData);
					}
				} catch (error) {
					console.error("Failed to fetch user profile:", error);
				}
			}
		};

		fetchProfile();
	}, [user, login]);

	return user;
};
