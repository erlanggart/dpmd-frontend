import api from "../api";

// Helper function to get current user role and determine if admin context
const getAdminContext = () => {
	// Get user from localStorage or auth context
	const userData = localStorage.getItem("user");
	if (!userData) return null;

	try {
		const user = JSON.parse(userData);
		const isAdmin = ["superadmin", "pemberdayaan_masyarakat", "pmd"].includes(
			user.role
		);
		return isAdmin ? user : null;
	} catch {
		return null;
	}
};

// ================================
// RW CRUD Operations
// ================================

export const createRW = (desaId, data) => {
	return api.post(`/desa/rw`, { ...data, desa_id: desaId });
};

export const updateRW = (rwId, data) => {
	return api.put(`/desa/rw/${rwId}`, data);
};

export const deleteRW = (rwId) => {
	return api.delete(`/desa/rw/${rwId}`);
};

export const getRWById = (rwId) => {
	const adminUser = getAdminContext();
	if (adminUser) {
		// Use admin endpoint for admin users
		return api.get(`/admin/rw/${rwId}`);
	}
	// Use desa endpoint for desa users
	return api.get(`/desa/rw/${rwId}`);
};

// ================================
// Posyandu CRUD Operations
// ================================

export const createPosyandu = (desaId, data) => {
	return api.post(`/desa/posyandu`, { ...data, desa_id: desaId });
};

export const updatePosyandu = (posyanduId, data) => {
	return api.put(`/desa/posyandu/${posyanduId}`, data);
};

export const deletePosyandu = (posyanduId) => {
	return api.delete(`/desa/posyandu/${posyanduId}`);
};

export const getPosyanduById = (posyanduId) => {
	const adminUser = getAdminContext();
	if (adminUser) {
		// Use admin endpoint for admin users
		return api.get(`/admin/posyandu/${posyanduId}`);
	}
	// Use desa endpoint for desa users
	return api.get(`/desa/posyandu/${posyanduId}`);
};

// ================================
// Karang Taruna CRUD Operations
// ================================

export const createKarangTaruna = (desaId, data) => {
	return api.post(`/desa/karang-taruna`, { ...data, desa_id: desaId });
};

export const updateKarangTaruna = (ktId, data) => {
	return api.put(`/desa/karang-taruna/${ktId}`, data);
};

export const deleteKarangTaruna = (ktId) => {
	return api.delete(`/desa/karang-taruna/${ktId}`);
};

export const getKarangTarunaById = (ktId) => {
	const adminUser = getAdminContext();
	if (adminUser) {
		// Use admin endpoint for admin users
		return api.get(`/admin/karang-taruna/${ktId}`);
	}
	// Use desa endpoint for desa users
	return api.get(`/desa/karang-taruna/${ktId}`);
};

// ================================
// LPM CRUD Operations
// ================================

export const createLPM = (desaId, data) => {
	return api.post(`/desa/lpm`, { ...data, desa_id: desaId });
};

export const updateLPM = (lpmId, data) => {
	return api.put(`/desa/lpm/${lpmId}`, data);
};

export const deleteLPM = (lpmId) => {
	return api.delete(`/desa/lpm/${lpmId}`);
};

export const getLPMById = (lpmId) => {
	const adminUser = getAdminContext();
	if (adminUser) {
		// Use admin endpoint for admin users
		return api.get(`/admin/lpm/${lpmId}`);
	}
	// Use desa endpoint for desa users
	return api.get(`/desa/lpm/${lpmId}`);
};

// ================================
// Satlinmas CRUD Operations
// ================================

export const createSatlinmas = (desaId, data) => {
	return api.post(`/desa/satlinmas`, { ...data, desa_id: desaId });
};

export const updateSatlinmas = (satlinmasId, data) => {
	return api.put(`/desa/satlinmas/${satlinmasId}`, data);
};

export const deleteSatlinmas = (satlinmasId) => {
	return api.delete(`/desa/satlinmas/${satlinmasId}`);
};

export const getSatlinmasById = (satlinmasId) => {
	const adminUser = getAdminContext();
	if (adminUser) {
		// Use admin endpoint for admin users
		return api.get(`/admin/satlinmas/${satlinmasId}`);
	}
	// Use desa endpoint for desa users
	return api.get(`/desa/satlinmas/${satlinmasId}`);
};

// ================================
// PKK CRUD Operations
// ================================

export const createPKK = (desaId, data) => {
	return api.post(`/desa/pkk`, { ...data, desa_id: desaId });
};

export const updatePKK = (pkkId, data) => {
	return api.put(`/desa/pkk/${pkkId}`, data);
};

export const deletePKK = (pkkId) => {
	return api.delete(`/desa/pkk/${pkkId}`);
};

export const getPKKById = (pkkId) => {
	const adminUser = getAdminContext();
	if (adminUser) {
		// Use admin endpoint for admin users
		return api.get(`/admin/pkk/${pkkId}`);
	}
	// Use desa endpoint for desa users
	return api.get(`/desa/pkk/${pkkId}`);
};

// ================================
// Pengurus Operations
// ================================

export const createPengurus = (kelembagaanType, kelembagaanId, data) => {
	return api.post(
		`/desa/pengurus`,
		{
			...data,
			kelembagaan_type: kelembagaanType,
			kelembagaan_id: kelembagaanId,
		},
		{
			headers: {
				"Content-Type": "multipart/form-data",
			},
		}
	);
};

export const updatePengurus = (pengurusId, data) => {
	return api.post(`/desa/pengurus/${pengurusId}`, data, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};

export const deletePengurus = (pengurusId) => {
	return api.delete(`/desa/pengurus/${pengurusId}`);
};

export const getPengurusByKelembagaan = (kelembagaanType, kelembagaanId) => {
	return api.get(`/desa/pengurus`, {
		params: {
			kelembagaan_type: kelembagaanType,
			kelembagaan_id: kelembagaanId,
		},
	});
};
