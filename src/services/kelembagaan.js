import api from "../api";
import {
	makeApiCall,
	getAdminParams,
} from "../utils/apiHelpers";

// RW
export const listRw = () => makeApiCall(api, "rw", "list");
export const createRw = (data) => makeApiCall(api, "rw", "create", null, data);
export const getRw = (id) => makeApiCall(api, "rw", "show", id);
export const updateRw = (id, data) =>
	makeApiCall(api, "rw", "update", id, data);
export const deleteRw = (id) => makeApiCall(api, "rw", "delete", id);

// RT
export const listRt = () => makeApiCall(api, "rt", "list");
export const createRt = (data) => makeApiCall(api, "rt", "create", null, data);
export const getRt = (id) => makeApiCall(api, "rt", "show", id);
export const updateRt = (id, data) =>
	makeApiCall(api, "rt", "update", id, data);
export const deleteRt = (id) => makeApiCall(api, "rt", "delete", id);

// Posyandu (multiple allowed)
export const listPosyandu = () => makeApiCall(api, "posyandu", "list");
export const createPosyandu = (data) =>
	makeApiCall(api, "posyandu", "create", null, data);
export const getPosyandu = (id) => makeApiCall(api, "posyandu", "show", id);
export const updatePosyandu = (id, data) =>
	makeApiCall(api, "posyandu", "update", id, data);
export const deletePosyandu = (id) =>
	makeApiCall(api, "posyandu", "delete", id);

// Singleton-ish kelembagaan helpers (we treat first item as the formed entity)
export const listKarangTaruna = () => makeApiCall(api, "karang-taruna", "list");
export const createKarangTaruna = (data) =>
	makeApiCall(api, "karang-taruna", "create", null, data);
export const getKarangTaruna = (id) =>
	makeApiCall(api, "karang-taruna", "show", id);
export const updateKarangTaruna = (id, data) =>
	makeApiCall(api, "karang-taruna", "update", id, data);
export const deleteKarangTaruna = (id) =>
	makeApiCall(api, "karang-taruna", "delete", id);

export const listLpm = () => makeApiCall(api, "lpm", "list");
export const createLpm = (data) =>
	makeApiCall(api, "lpm", "create", null, data);
export const getLpm = (id) => makeApiCall(api, "lpm", "show", id);
export const updateLpm = (id, data) =>
	makeApiCall(api, "lpm", "update", id, data);
export const deleteLpm = (id) => makeApiCall(api, "lpm", "delete", id);

export const listPkk = () => makeApiCall(api, "pkk", "list");
export const createPkk = (data) =>
	makeApiCall(api, "pkk", "create", null, data);
export const getPkk = (id) => makeApiCall(api, "pkk", "show", id);
export const updatePkk = (id, data) =>
	makeApiCall(api, "pkk", "update", id, data);
export const deletePkk = (id) => makeApiCall(api, "pkk", "delete", id);

// Satlinmas
export const listSatlinmas = () => makeApiCall(api, "satlinmas", "list");
export const createSatlinmas = (data) =>
	makeApiCall(api, "satlinmas", "create", null, data);
export const getSatlinmas = (id) => makeApiCall(api, "satlinmas", "show", id);
export const updateSatlinmas = (id, data) =>
	makeApiCall(api, "satlinmas", "update", id, data);
export const deleteSatlinmas = (id) =>
	makeApiCall(api, "satlinmas", "delete", id);

// Kelembagaan Summary - Lightweight endpoint for counts only
export const getKelembagaanSummary = () => api.get("/desa/kelembagaan/summary");
export const getKelembagaanDetailedSummary = () =>
	api.get("/desa/kelembagaan/detailed-summary");

// Toggle Status Functions - menggunakan endpoint yang sesuai dengan role
export const toggleKelembagaanStatus = (type, id, status) => {
	const endpoint = `/kelembagaan/${type}/${id}/toggle-status`;
	const params = getAdminParams();
	return api.put(endpoint, { status_kelembagaan: status }, { params });
};

export const toggleKelembagaanVerification = (type, id, status) => {
	const endpoint = `/kelembagaan/${type}/${id}/toggle-verification`;
	const params = getAdminParams();
	return api.put(endpoint, { status_verifikasi: status }, { params });
};
