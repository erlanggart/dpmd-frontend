import api from "../api";

export const getAparaturDesa = (page = 1, search = "") => {
	return api.get(`/desa/aparatur-desa?page=${page}&search=${search}`);
};

export const getAparaturDesaById = (id) => {
	return api.get(`/desa/aparatur-desa/${id}`);
};

export const createAparaturDesa = (data) => {
	return api.post("/desa/aparatur-desa", data, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};

export const updateAparaturDesa = (id, data) => {
	return api.post(`/desa/aparatur-desa/${id}`, data, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};

export const deleteAparaturDesa = (id) => {
	return api.delete(`/desa/aparatur-desa/${id}`);
};

// Rekonsiliasi arsip Dapur Desa: daftar konflik + orang yang belum ada di data desa.
export const getRekonsiliasiDapurDesa = () => {
	return api.get("/desa/aparatur-desa/dapur-desa");
};

// keputusan: "dapur" (pakai arsip) atau "desa" (pertahankan isian desa).
export const putuskanDapurDesa = (dapurId, keputusan) => {
	return api.post(`/desa/aparatur-desa/dapur-desa/${dapurId}/putuskan`, { keputusan });
};

export const tambahSemuaBaruDapurDesa = () => {
	return api.post("/desa/aparatur-desa/dapur-desa/tambah-semua-baru");
};

export const getProdukHukumList = (params) => {
	return api.get("/desa/produk-hukum", { params });
};

export const getProdukHukums = (page = 1, search = "") => {
	return api.get(`/desa/produk-hukum?page=${page}&search=${search}`);
};

export const getProdukHukumById = (id) => {
	return api.get(`/desa/produk-hukum/${id}`);
};

export const createProdukHukum = (data) => {
	return api.post("/desa/produk-hukum", data, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};

export const updateProdukHukum = (id, data) => {
	return api.put(`/desa/produk-hukum/${id}`, data, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};

export const deleteProdukHukum = (id) => {
	return api.delete(`/desa/produk-hukum/${id}`);
};
