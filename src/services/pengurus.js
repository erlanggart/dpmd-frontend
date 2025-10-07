import api from "../api";

// Map slug type to fully-qualified Laravel model class for polymorphic field
export const mapTypeToModel = (type) => {
	const map = {
		rw: "App\\Models\\Rw",
		rt: "App\\Models\\Rt",
		posyandu: "App\\Models\\Posyandu",
		"karang-taruna": "App\\Models\\KarangTaruna",
		lpm: "App\\Models\\Lpm",
		pkk: "App\\Models\\Pkk",
		satlinmas: "App\\Models\\Satlinmas",
	};
	return map[type] || null;
};

export const listPengurus = () => api.get("/desa/pengurus");

// Lightweight pengurus list by kelembagaan (only essential data)
export const getPengurusByKelembagaan = (type, id) => {
	const model = mapTypeToModel(type);
	return api.get("/desa/pengurus/by-kelembagaan", {
		params: {
			kelembagaan_type: model,
			kelembagaan_id: id,
		},
	});
};

// Get pengurus history (inactive)
export const getPengurusHistory = (type, id) => {
	const model = mapTypeToModel(type);
	return api.get("/desa/pengurus/history", {
		params: {
			kelembagaan_type: model,
			kelembagaan_id: id,
		},
	});
};

// Get detailed pengurus data
export const getPengurusDetail = (id) => api.get(`/desa/pengurus/${id}`);

// Update pengurus status
export const updatePengurusStatus = (id, status, endDate = null) => {
	return api.put(`/desa/pengurus/${id}/status`, {
		status_jabatan: status,
		tanggal_akhir_jabatan: endDate,
	});
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
	if (isMultipart) {
		return api.post("/desa/pengurus", data, {
			headers: { "Content-Type": "multipart/form-data" },
		});
	}
	return api.post("/desa/pengurus", data);
};

export const updatePengurus = (id, data, opts = {}) => {
	const isMultipart = data instanceof FormData || opts.multipart;
	if (isMultipart) {
		return api.post(
			`/desa/pengurus/${id}`,
			(() => {
				const fd = data instanceof FormData ? data : new FormData();
				if (!(data instanceof FormData)) {
					Object.entries(data || {}).forEach(([k, v]) => fd.append(k, v));
				}
				fd.append("_method", "PUT");
				return fd;
			})(),
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);
	}
	return api.put(`/desa/pengurus/${id}`, data);
};

export const deletePengurus = (id) => api.delete(`/desa/pengurus/${id}`);

// Get pengurus by ID
export const getPengurusById = (id) => api.get(`/desa/pengurus/${id}`);
