import api from "../api";

// RW
export const listRw = () => api.get("/desa/rw");
export const createRw = (data) => api.post("/desa/rw", data);
export const getRw = (id) => api.get(`/desa/rw/${id}`);
export const updateRw = (id, data) => api.put(`/desa/rw/${id}`, data);
export const deleteRw = (id) => api.delete(`/desa/rw/${id}`);

// RT
export const listRt = () => api.get("/desa/rt");
export const createRt = (data) => api.post("/desa/rt", data);
export const getRt = (id) => api.get(`/desa/rt/${id}`);
export const updateRt = (id, data) => api.put(`/desa/rt/${id}`, data);
export const deleteRt = (id) => api.delete(`/desa/rt/${id}`);

// Posyandu (multiple allowed)
export const listPosyandu = () => api.get("/desa/posyandu");
export const createPosyandu = (data) => api.post("/desa/posyandu", data);
export const getPosyandu = (id) => api.get(`/desa/posyandu/${id}`);
export const updatePosyandu = (id, data) =>
	api.put(`/desa/posyandu/${id}`, data);
export const deletePosyandu = (id) => api.delete(`/desa/posyandu/${id}`);

// Singleton-ish kelembagaan helpers (we treat first item as the formed entity)
export const listKarangTaruna = () => api.get("/desa/karang-taruna");
export const createKarangTaruna = (data) =>
	api.post("/desa/karang-taruna", data);
export const updateKarangTaruna = (id, data) =>
	api.put(`/desa/karang-taruna/${id}`, data);
export const deleteKarangTaruna = (id) =>
	api.delete(`/desa/karang-taruna/${id}`);

export const listLpm = () => api.get("/desa/lpm");
export const createLpm = (data) => api.post("/desa/lpm", data);
export const updateLpm = (id, data) => api.put(`/desa/lpm/${id}`, data);
export const deleteLpm = (id) => api.delete(`/desa/lpm/${id}`);

export const listPkk = () => api.get("/desa/pkk");
export const createPkk = (data) => api.post("/desa/pkk", data);
export const updatePkk = (id, data) => api.put(`/desa/pkk/${id}`, data);
export const deletePkk = (id) => api.delete(`/desa/pkk/${id}`);

// Satlinmas
export const listSatlinmas = () => api.get("/desa/satlinmas");
export const createSatlinmas = (data) => api.post("/desa/satlinmas", data);
export const updateSatlinmas = (id, data) =>
	api.put(`/desa/satlinmas/${id}`, data);
export const deleteSatlinmas = (id) => api.delete(`/desa/satlinmas/${id}`);

// Kelembagaan Summary - Lightweight endpoint for counts only
export const getKelembagaanSummary = () => api.get("/desa/kelembagaan/summary");
export const getKelembagaanDetailedSummary = () =>
	api.get("/desa/kelembagaan/detailed-summary");

// Toggle Status Functions
export const toggleKelembagaanStatus = (type, id, status) => {
	const endpoint = `/desa/${type}/${id}`;
	return api.put(endpoint, { status_kelembagaan: status });
};

export const toggleKelembagaanVerification = (type, id, status) => {
	const endpoint = `/desa/${type}/${id}`;
	return api.put(endpoint, { status_verifikasi: status });
};
