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

export const getProdukHukumList = (params) => {
	return api.get("/desa/produk-hukum", { params });
};
