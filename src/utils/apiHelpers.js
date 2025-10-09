// Helper utilities for API endpoint selection based on user role and context

/**
 * Get current user from localStorage
 */
export const getCurrentUser = () => {
	const userData = localStorage.getItem("user");
	if (!userData) return null;

	try {
		return JSON.parse(userData);
	} catch {
		return null;
	}
};

/**
 * Check if current user is admin (superadmin, pemberdayaan_masyarakat, pmd)
 */
export const isAdminUser = () => {
	const user = getCurrentUser();
	return (
		user && ["superadmin", "pemberdayaan_masyarakat", "pmd"].includes(user.role)
	);
};

/**
 * Check if current user is desa user
 */
export const isDesaUser = () => {
	const user = getCurrentUser();
	return user && user.role === "desa";
};

/**
 * Get desa_id from URL params when in admin context
 * Pattern: /kelembagaan/admin/{desaId} or similar admin routes
 */
export const getDesaIdFromUrl = () => {
	const path = window.location.pathname;
	// Try different patterns for admin routes
	const patterns = [
		/\/kelembagaan\/admin\/([^\/]+)/, // /kelembagaan/admin/{desaId}
		/\/admin\/desa\/([^\/]+)/, // /admin/desa/{desaId}
		/\/dashboard\/admin\/([^\/]+)/, // /dashboard/admin/{desaId}
	];

	for (const pattern of patterns) {
		const match = path.match(pattern);
		if (match) return match[1];
	}

	return null;
};

/**
 * Get appropriate API endpoint prefix based on user role and context
 */
export const getApiPrefix = () => {
	if (isAdminUser()) {
		return "admin";
	}
	return "desa";
};

/**
 * Get appropriate base endpoint for CRUD operations
 * @param {string} resource - Resource name (rw, rt, pengurus, etc.)
 * @param {string} operation - Operation type (list, create, show, update, delete)
 */
export const getEndpoint = (resource, operation = "list") => {
	const prefix = getApiPrefix();

	// Handle special cases for sub-resources like pengurus/by-kelembagaan
	const baseResource = resource.split("/")[0];

	// For admin users, some operations use different patterns
	if (prefix === "admin") {
		switch (operation) {
			case "list":
			case "show":
			case "update":
			case "delete":
				// Admin endpoints: /admin/{resource}
				return `/${prefix}/${resource}`;
			case "create":
				// Create operations usually go through desa endpoints even for admin
				// Exception: pengurus sub-resources should still use admin for admin users
				if (baseResource === "pengurus" && resource.includes("/")) {
					return `/${prefix}/${resource}`;
				}
				return `/desa/${resource}`;
			default:
				return `/${prefix}/${resource}`;
		}
	}

	// For desa users, always use desa prefix
	return `/desa/${resource}`;
};

/**
 * Get parameters for admin requests (includes desa_id when needed)
 */
export const getAdminParams = (additionalParams = {}) => {
	if (!isAdminUser()) return additionalParams;

	const desaId = getDesaIdFromUrl();
	return desaId ? { desa_id: desaId, ...additionalParams } : additionalParams;
};

/**
 * Make API call with automatic endpoint selection
 * @param {string} resource - Resource name
 * @param {string} operation - Operation type
 * @param {string|null} id - Resource ID (for show/update/delete)
 * @param {object} data - Request data (for create/update)
 * @param {object} config - Additional axios config
 */
export const makeApiCall = (
	api,
	resource,
	operation,
	id = null,
	data = null,
	config = {}
) => {
	const endpoint = getEndpoint(resource, operation);
	const params = getAdminParams(config.params || {});
	const finalConfig = { ...config, params };

	switch (operation) {
		case "list":
			return api.get(endpoint, finalConfig);
		case "create":
			return api.post(endpoint, data, finalConfig);
		case "show":
			return api.get(`${endpoint}/${id}`, finalConfig);
		case "update":
			return api.put(`${endpoint}/${id}`, data, finalConfig);
		case "delete":
			return api.delete(`${endpoint}/${id}`, finalConfig);
		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
};
