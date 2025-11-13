import api from "../api";

// ================================
// ADMIN/PMD KELEMBAGAAN ENDPOINTS
// ================================

/**
 * Get desa detail information (admin access)
 */
export const getDesaDetail = (desaId) => {
	return api.get(`/admin/desa-detail/${desaId}`);
};

/**
 * Get all kelembagaan data for a specific desa (admin access)
 * Now uses single optimized backend endpoint
 */
export const getDesaKelembagaanAll = async (desaId) => {
	try {
		const response = await api.get(`/admin/desa-detail/${desaId}`);
		return response.data;
	} catch (error) {
		console.error("Error fetching kelembagaan data:", error);
		throw error;
	}
};

/**
 * Get RW data for a specific desa (admin access)
 */
export const getDesaRW = (desaId) => {
	return api.get(`/admin/desa/${desaId}/rw`);
};

/**
 * Get Posyandu data for a specific desa (admin access)
 */
export const getDesaPosyandu = (desaId) => {
	return api.get(`/admin/desa/${desaId}/posyandu`);
};

/**
 * Get Karang Taruna data for a specific desa (admin access)
 */
export const getDesaKarangTaruna = (desaId) => {
	return api.get(`/admin/desa/${desaId}/karang-taruna`);
};

/**
 * Get LPM data for a specific desa (admin access)
 */
export const getDesaLPM = (desaId) => {
	return api.get(`/admin/desa/${desaId}/lpm`);
};

/**
 * Get Satlinmas data for a specific desa (admin access)
 */
export const getDesaSatlinmas = (desaId) => {
	return api.get(`/admin/desa/${desaId}/satlinmas`);
};

/**
 * Get PKK data for a specific desa (admin access)
 */
export const getDesaPKK = (desaId) => {
	return api.get(`/admin/desa/${desaId}/pkk`);
};

// ================================
// DESA KELEMBAGAAN ENDPOINTS
// ================================

/**
 * Get RW data for logged in desa user
 */
export const getRWForDesa = () => {
	return api.get("/desa/rw");
};

/**
 * Get Posyandu data for logged in desa user
 */
export const getPosyanduForDesa = () => {
	return api.get("/desa/posyandu");
};

/**
 * Get Karang Taruna data for logged in desa user
 */
export const getKarangTarunaForDesa = () => {
	return api.get("/desa/karang-taruna");
};

/**
 * Get LPM data for logged in desa user
 */
export const getLPMForDesa = () => {
	return api.get("/desa/lpm");
};

/**
 * Get Satlinmas data for logged in desa user
 */
export const getSatlinmasForDesa = () => {
	return api.get("/desa/satlinmas");
};

/**
 * Get PKK data for logged in desa user
 */
export const getPKKForDesa = () => {
	return api.get("/desa/pkk");
};

// ================================
// GENERAL KELEMBAGAAN ENDPOINTS
// ================================

/**
 * Get all kelembagaan summary data
 */
export const getKelembagaanSummary = () => {
	return api.get("/kelembagaan/summary");
};

/**
 * Get kelembagaan summary for specific desa
 */
export const getKelembagaanSummaryByDesa = (desaId) => {
	return api.get(`/kelembagaan/summary/${desaId}`);
};

/**
 * Get kelembagaan data by kecamatan
 */
export const getKelembagaanByKecamatan = (kecamatanId) => {
	return api.get(`/kelembagaan/kecamatan/${kecamatanId}`);
};

/**
 * Get comprehensive kelembagaan index data
 */
export const getKelembagaanIndex = () => {
	return api.get("/kelembagaan");
};
