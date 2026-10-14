import api from "../api";

// Helper function untuk mendapatkan context admin
// const getAdminContext = () => {
// 	const userData = localStorage.getItem("user");
// 	if (!userData) return null;

// 	try {
// 		const user = JSON.parse(userData);
// 		const isAdmin = ["superadmin", "pemberdayaan_masyarakat", "pmd"].includes(
// 			user.role
// 		);
// 		return isAdmin ? user : null;
// 	} catch {
// 		return null;
// 	}
// };

// Service untuk kelembagaan PMD (admin level)
export const kelembagaanApi = {
	// Mendapatkan data kelembagaan per kecamatan dan desa
	getKelembagaanData: async () => {
		try {
			const response = await api.get("/kelembagaan");
			return response.data;
		} catch (error) {
			console.error("Error fetching kelembagaan data:", error);
			throw error;
		}
	},

	// Mendapatkan summary kelembagaan kabupaten
	getSummary: async () => {
		try {
			const response = await api.get("/kelembagaan/summary");
			return response.data;
		} catch (error) {
			console.error("Error fetching kelembagaan summary:", error);
			throw error;
		}
	},

	// Mendapatkan data kelembagaan per desa (untuk admin)
	getDesaKelembagaan: async (desaId) => {
		try {
			const response = await api.get(`/admin/desa/${desaId}/kelembagaan`);
			return response.data;
		} catch (error) {
			console.error(`Error fetching desa ${desaId} kelembagaan:`, error);
			throw error;
		}
	},

	// Mendapatkan statistik kelembagaan dengan filter status aktif
	getDetailedSummary: async () => {
		try {
			const response = await api.get("/desa/kelembagaan/detailed-summary");
			return response.data;
		} catch (error) {
			console.error("Error fetching detailed summary:", error);
			throw error;
		}
	},

	// Mendapatkan statistik tahunan kelembagaan
	getStatistikTahunan: async () => {
		try {
			const response = await api.get("/kelembagaan/statistik-tahunan");
			return response.data;
		} catch (error) {
			console.error("Error fetching statistik tahunan:", error);
			throw error;
		}
	},

	// Tren verifikasi lembaga per hari, `hari` terakhir
	getTrenVerifikasiHarian: async (hari = 30) => {
		const response = await api.get("/kelembagaan/tren-verifikasi-harian", { params: { hari } });
		return response.data;
	},

	// Capaian verifikasi tiap desa, dirinci per lembaga
	getCapaianVerifikasiPerDesa: async () => {
		const response = await api.get("/kelembagaan/capaian-verifikasi/per-desa");
		return response.data;
	},

	// Desa yang punya permasalahan data kelembagaan / produk hukum
	getPermasalahanDesa: async () => {
		const response = await api.get("/kelembagaan/capaian-verifikasi/permasalahan");
		return response.data;
	},

	// Rekap verifikator + riwayat verifikasi. hari=0 berarti seluruh waktu.
	getAktivitasVerifikator: async (params) => {
		const response = await api.get("/kelembagaan/capaian-verifikasi/aktivitas", { params });
		return response.data;
	},
};

export default kelembagaanApi;
