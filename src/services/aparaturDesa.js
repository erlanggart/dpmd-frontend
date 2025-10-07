import api from "../api";

export const getAparaturDesa = () => {
	return api.get("/aparatur-desa");
};
