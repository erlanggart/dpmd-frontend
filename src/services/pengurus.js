import api from "../api";
import {
	makeApiCall,
	getEndpoint,
	getAdminParams,
} from "../utils/apiHelpers";

// Map slug type to table name for polymorphic field (Prisma uses table names)
export const mapTypeToModel = (type) => {
	const map = {
		rw: "rws",
		rt: "rts",
		posyandu: "posyandus",
		"karang-taruna": "karang_tarunas",
		lpm: "lpms",
		pkk: "pkks",
		satlinmas: "satlinmas",
	};
	return map[type] || null;
};

export const listPengurus = () => makeApiCall(api, "pengurus", "list");

// Lightweight pengurus list by kelembagaan (only essential data)
export const getPengurusByKelembagaan = (type, id, desaId = null) => {
	const model = mapTypeToModel(type);
	
	const baseParams = {
		pengurusable_type: model,
		pengurusable_id: id,
	};

	// Add desa_id if provided (for superadmin access)
	if (desaId) {
		baseParams.desa_id = desaId;
	}

	const endpoint = getEndpoint("pengurus/by-kelembagaan", "list");
	// FIXED: Pass baseParams as third argument (additionalParams)
	const params = getAdminParams("pengurus", "list", baseParams);

	return api.get(endpoint, { params });
};

// Get pengurus history (inactive)
export const getPengurusHistory = (type, id, desaId = null) => {
	const model = mapTypeToModel(type);
	const baseParams = {
		pengurusable_type: model,
		pengurusable_id: id,
	};

	// Add desa_id if provided (for superadmin access)
	if (desaId) {
		baseParams.desa_id = desaId;
	}

	const endpoint = getEndpoint("pengurus/history", "list");
	// FIXED: Pass baseParams as third argument (additionalParams)
	const params = getAdminParams("pengurus", "list", baseParams);

	return api.get(endpoint, { params });
};

// Get detailed pengurus data
export const getPengurusDetail = (id, desaId = null) => {
	const baseParams = desaId ? { desa_id: desaId } : {};
	return makeApiCall(api, "pengurus", "show", id, null, { params: baseParams });
};

// Update pengurus status
export const updatePengurusStatus = (
	id,
	status,
	endDate = null,
	desaId = null
) => {
	const baseParams = desaId ? { desa_id: desaId } : {};
	// FIXED: Pass baseParams as third argument
	const params = getAdminParams("pengurus", "update", baseParams);

	// Status update always uses desa endpoint
	return api.put(
		`/desa/pengurus/${id}/status`,
		{
			status_jabatan: status,
			tanggal_akhir_jabatan: endDate,
		},
		{ params }
	);
};

// Legacy function - kept for compatibility but now uses new endpoint
export const getPengurusByKelembagaanLegacy = async (type, id) => {
	const model = mapTypeToModel(type);
	const res = await api.get("/desa/pengurus");
	const items = res?.data?.data || [];
	const filtered = items.filter(
		(p) =>
			p.pengurusable_type === model && String(p.pengurusable_id) === String(id)
	);

	// Return in the same format as the original API response
	return {
		data: {
			data: filtered,
		},
	};
};

export const addPengurus = (data, opts = {}) => {
	const isMultipart = data instanceof FormData || opts.multipart;
	const { desaId } = opts;

	// Add desa_id for superadmin access
	const baseParams = desaId ? { desa_id: desaId } : {};
	// FIXED: Pass baseParams as third argument
	const params = getAdminParams("pengurus", "create", baseParams);

	const config = {
		params,
		...(isMultipart && { headers: { "Content-Type": "multipart/form-data" } }),
	};

	return makeApiCall(api, "pengurus", "create", null, data, config);
};

export const updatePengurus = (id, data, opts = {}) => {
	const isMultipart = data instanceof FormData || opts.multipart;
	const { desaId } = opts;

	// Add desa_id for superadmin access
	const baseParams = desaId ? { desa_id: desaId } : {};
	// FIXED: Pass baseParams as third argument
	const params = getAdminParams("pengurus", "update", baseParams);

	if (isMultipart) {
		// For multipart, use POST with _method override for Express
		const endpoint = getEndpoint("pengurus", "update");
		const fd = data instanceof FormData ? data : new FormData();
		if (!(data instanceof FormData)) {
			Object.entries(data || {}).forEach(([k, v]) => fd.append(k, v));
		}
		fd.append("_method", "PUT");

		return api.post(`${endpoint}/${id}`, fd, {
			headers: { "Content-Type": "multipart/form-data" },
			params,
		});
	}

	return makeApiCall(api, "pengurus", "update", id, data, { params });
};

export const deletePengurus = (id) =>
	makeApiCall(api, "pengurus", "delete", id);

// Get pengurus by ID
export const getPengurusById = (id, desaId = null) => {
	const baseParams = desaId ? { desa_id: desaId } : {};
	return makeApiCall(api, "pengurus", "show", id, null, { params: baseParams });
};
