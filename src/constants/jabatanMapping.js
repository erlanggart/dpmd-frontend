/**
 * Jabatan Mapping Constants
 * 
 * File ini berisi semua mapping jabatan untuk setiap tipe kelembagaan.
 * Digunakan oleh berbagai komponen seperti PengurusForm, PengurusJabatanList, dll.
 * 
 * Centralized management untuk memudahkan maintenance dan konsistensi data.
 */

// Mapping jabatan berdasarkan tipe kelembagaan
export const JABATAN_MAPPING = {
	rw: [
		"Ketua RW",
		"Sekretaris RW",
		"Bendahara RW",
		"Seksi Kesejahteraan Sosial",
		"Seksi Pembangunan",
		"Seksi Ketentraman dan Ketertiban",
	],
	rt: [
		"Ketua RT",
		"Sekretaris RT",
		"Bendahara RT",
		"Seksi Kesejahteraan Sosial",
		"Seksi Pemuda, Olahraga, dan Kesenian",
		"Seksi Pembangunan",
		"Seksi Kependudukan",
		"Seksi Ketentraman dan Ketertiban",
	],
	posyandu: [
		"Ketua Posyandu",
		"Sekretaris Posyandu",
		"Bendahara Posyandu",
		"Ketua Bidang Kesehatan",
        "Ketua Bidang Sosial",
        "Ketua Bidang Pendidikan",
        "Ketua Bidang Pekerjaan Umum (PU)",
        "Ketua Bidang Perumahan Rakyat",
        "Ketua Bidang Ketertiban Umum & Perlindungan Masyarakat",
		"Kader Posyandu",
		
	],
	satlinmas: [
		"Kepala Satlinmas",
        "Kepala Pelaksana",
        "Komandan Regu Kesiapsiagaan dan Kewaspadaan Dini",
        "Komandan Regu Pengamanan",
        "Komandan Regu Pertolongan Pertama pada Korban Bencana dan Kebakaran",
        "Komandan Regu Penyelamatan dan Evakuasi",
        "Komandan Regu Dapur Umum",
        "Anggota Satlinmas",
	],
	lpm: [
		"Ketua LPM",
		"Sekretaris LPM",
		"Bendahara LPM",
		"Ketua Bidang Pendidikan",
        "Ketua Bidang Kesehatan",
        "Ketua Bidang Perekonomian dan Pembangunan",
        "Ketua Bidang Pemuda dan Olahraga",
        "Ketua Bidang Keagamaan",
        "Ketua Bidang Pemberdayaan Perempuan",
        "Ketua Bidang Kesejahteraan Sosial",
        "Anggota"
	],
	"karang-taruna": [
		"Ketua Karang Taruna",
		"Wakil Ketua Karang Taruna",
		"Sekretaris Karang Taruna",
		"Seksi Pendidikan dan Pelatihan",
        "Seksi Usaha Kesejahteraan Sosial",
        "Seksi Pengabdian Masyarakat",
        "Seksi Usaha Ekonomi Produktif",
        "Seksi Olahraga",
        "Seksi Kesnian",
        "Seksi Pembinaan Mental/Kerohanian",
		"Anggota",
	],
	pkk: [
		"Ketua PKK",
		"Wakil Ketua PKK",
		"Sekretaris PKK",
		"Bendahara PKK",
		"Ketua Pokja I ",
		"Ketua Pokja II ",
		"Ketua Pokja III ",
		"Ketua Pokja IV ",
        "Sekretaris Pokja I ",
        "Sekretaris Pokja II ",
        "Sekretaris Pokja III ",
        "Sekretaris Pokja IV ", 
        "Bendahara Pokja I ",
        "Bendahara Pokja II ",
        "Bendahara Pokja III ",
        "Bendahara Pokja IV ",
        "Anggota Pokja I ",
        "Anggota Pokja II ",
        "Anggota Pokja III ",
        "Anggota Pokja IV ",
	],
};

// Default jabatan jika tipe tidak ditemukan
export const DEFAULT_JABATAN = [
	"Ketua",
	"Wakil Ketua",
	"Sekretaris",
	"Bendahara",
	"Anggota",
];

/**
 * Get jabatan options untuk select/dropdown
 * @param {string} kelembagaanType - Tipe kelembagaan (rw, rt, posyandu, dll)
 * @returns {Array} Array of objects dengan value dan label
 */
export const getJabatanOptions = (kelembagaanType) => {
	const jabatanList = JABATAN_MAPPING[kelembagaanType] || DEFAULT_JABATAN;
	
	return jabatanList.map((jabatan) => ({
		value: jabatan,
		label: jabatan,
	}));
};

/**
 * Get jabatan list (array of strings)
 * @param {string} kelembagaanType - Tipe kelembagaan (rw, rt, posyandu, dll)
 * @returns {Array} Array of strings
 */
export const getJabatanList = (kelembagaanType) => {
	return JABATAN_MAPPING[kelembagaanType] || DEFAULT_JABATAN;
};

/**
 * Get display name untuk jabatan (dapat dikustomisasi di masa depan)
 * @param {string} jabatan - Nama jabatan
 * @returns {string} Display name
 */
export const getDisplayJabatan = (jabatan) => {
	// Untuk sekarang return as-is, bisa dikustomisasi nanti jika perlu
	return jabatan;
};

/**
 * Check if jabatan exists in specific kelembagaan type
 * @param {string} kelembagaanType - Tipe kelembagaan
 * @param {string} jabatan - Nama jabatan
 * @returns {boolean} True jika jabatan valid untuk tipe kelembagaan
 */
export const isValidJabatan = (kelembagaanType, jabatan) => {
	const jabatanList = getJabatanList(kelembagaanType);
	return jabatanList.includes(jabatan);
};

/**
 * Get color gradient untuk jabatan (untuk styling)
 * @param {string} jabatanName - Nama jabatan
 * @returns {string} Tailwind gradient class
 */
export const getJabatanColor = (jabatanName) => {
	const lowerJabatan = jabatanName.toLowerCase();

    if (lowerJabatan.includes("bidang") ) {
		return "from-yellow-400 to-yellow-500";
	}
	
	if (lowerJabatan.includes("ketua") && !lowerJabatan.includes("wakil")) {
		return "from-yellow-400 to-orange-500";
	}
    if (lowerJabatan.includes("kepala")) {
		return "from-yellow-400 to-orange-500";
	}
	if (lowerJabatan.includes("wakil")) {
		return "from-blue-400 to-indigo-500";
	}
	if (lowerJabatan.includes("sekretaris")) {
		return "from-green-400 to-emerald-500";
	}
	if (lowerJabatan.includes("bendahara")) {
		return "from-purple-400 to-violet-500";
	}
	if (lowerJabatan.includes("koordinator") || lowerJabatan.includes("komandan")) {
		return "from-cyan-400 to-blue-500";
	}
	if (lowerJabatan.includes("seksi")) {
		return "from-pink-400 to-rose-500";
	}
	if (lowerJabatan.includes("pokja")) {
		return "from-amber-400 to-orange-500";
	}
	
	return "from-gray-400 to-slate-500";
};

/**
 * Get icon name untuk jabatan (untuk react-icons)
 * @param {string} jabatanName - Nama jabatan
 * @returns {string} Icon identifier
 */
export const getJabatanIconType = (jabatanName) => {
	const lowerJabatan = jabatanName.toLowerCase();
	
	if (lowerJabatan.includes("ketua") && !lowerJabatan.includes("wakil") ) {
		return "crown"; // LuCrown
	}
	if (lowerJabatan.includes("sekretaris")) {
		return "file-text"; // LuFileText
	}
	if (lowerJabatan.includes("bendahara")) {
		return "wallet"; // LuWallet
	}
	if (lowerJabatan.includes("koordinator") || lowerJabatan.includes("komandan")) {
		return "shield"; // LuShield
	}
	
	return "user"; // LuUser
};

// Export default untuk backward compatibility
export default {
	JABATAN_MAPPING,
	DEFAULT_JABATAN,
	getJabatanOptions,
	getJabatanList,
	getDisplayJabatan,
	isValidJabatan,
	getJabatanColor,
	getJabatanIconType,
};
