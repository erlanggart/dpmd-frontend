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
		"KETUA RW",
		"SEKRETARIS RW",
		"BENDAHARA RW",
		"SEKSI KESEJAHTERAAN SOSIAL",
		"SEKSI PEMBANGUNAN",
		"SEKSI KETENTRAMAN DAN KETERTIBAN",
	],
	rt: [
		"KETUA RT",
		"SEKRETARIS RT",
		"BENDAHARA RT",
		"SEKSI KESEJAHTERAAN SOSIAL",
		"SEKSI PEMUDA, OLAHRAGA, DAN KESENIAN",
		"SEKSI PEMBANGUNAN",
		"SEKSI KEPENDUDUKAN",
		"SEKSI KETENTRAMAN DAN KETERTIBAN",
	],
	posyandu: [
		"KETUA POSYANDU",
		"SEKRETARIS POSYANDU",
		"BENDAHARA POSYANDU",
		"KETUA BIDANG KESEHATAN",
		"KETUA BIDANG SOSIAL",
		"KETUA BIDANG PENDIDIKAN",
		"KETUA BIDANG PEKERJAAN UMUM (PU)",
		"KETUA BIDANG PERUMAHAN RAKYAT",
		"KETUA BIDANG KETERTIBAN UMUM & PERLINDUNGAN MASYARAKAT",
		"KADER POSYANDU",
	],
	satlinmas: [
		"KEPALA SATLINMAS",
		"KEPALA PELAKSANA",
		"KOMANDAN REGU KESIAPSIAGAAN DAN KEWASPADAAN DINI",
		"KOMANDAN REGU PENGAMANAN",
		"KOMANDAN REGU PERTOLONGAN PERTAMA PADA KORBAN BENCANA DAN KEBAKARAN",
		"KOMANDAN REGU PENYELAMATAN DAN EVAKUASI",
		"KOMANDAN REGU DAPUR UMUM",
		"ANGGOTA SATLINMAS",
	],
	lpm: [
		"KETUA LPM",
		"SEKRETARIS LPM",
		"BENDAHARA LPM",
		"KETUA BIDANG PENDIDIKAN",
		"KETUA BIDANG KESEHATAN",
		"KETUA BIDANG PEREKONOMIAN DAN PEMBANGUNAN",
		"KETUA BIDANG PEMUDA DAN OLAHRAGA",
		"KETUA BIDANG KEAGAMAAN",
		"KETUA BIDANG PEMBERDAYAAN PEREMPUAN",
		"KETUA BIDANG KESEJAHTERAAN SOSIAL",
		"ANGGOTA",
	],
	"karang-taruna": [
		"KETUA KARANG TARUNA",
		"WAKIL KETUA KARANG TARUNA",
		"SEKRETARIS KARANG TARUNA",
		"SEKSI PENDIDIKAN DAN PELATIHAN",
		"SEKSI USAHA KESEJAHTERAAN SOSIAL",
		"SEKSI PENGABDIAN MASYARAKAT",
		"SEKSI USAHA EKONOMI PRODUKTIF",
		"SEKSI OLAHRAGA",
		"SEKSI KESNIAN",
		"SEKSI PEMBINAAN MENTAL/KEROHANIAN",
		"ANGGOTA",
	],
	pkk: [
		"KETUA PKK",
		"WAKIL KETUA PKK",
		"SEKRETARIS PKK",
		"BENDAHARA PKK",
		"KETUA POKJA I",
		"KETUA POKJA II",
		"KETUA POKJA III",
		"KETUA POKJA IV",
		"SEKRETARIS POKJA I",
		"SEKRETARIS POKJA II",
		"SEKRETARIS POKJA III",
		"SEKRETARIS POKJA IV",
		"BENDAHARA POKJA I",
		"BENDAHARA POKJA II",
		"BENDAHARA POKJA III",
		"BENDAHARA POKJA IV",
		"ANGGOTA POKJA I",
		"ANGGOTA POKJA II",
		"ANGGOTA POKJA III",
		"ANGGOTA POKJA IV",
	],
};

// Default jabatan jika tipe tidak ditemukan
export const DEFAULT_JABATAN = [
	"KETUA",
	"WAKIL KETUA",
	"SEKRETARIS",
	"BENDAHARA",
	"ANGGOTA",
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
 * Get display name untuk jabatan (title case for proper display)
 * @param {string} jabatan - Nama jabatan
 * @returns {string} Display name in title case
 */
export const getDisplayJabatan = (jabatan) => {
	if (!jabatan) return '';
	// Convert to title case: "KETUA RW" -> "Ketua Rw" -> keep specific abbreviations uppercase
	return jabatan
		.toLowerCase()
		.replace(/\b\w/g, (c) => c.toUpperCase())
		// Preserve common abbreviations
		.replace(/\bRw\b/g, 'RW')
		.replace(/\bRt\b/g, 'RT')
		.replace(/\bPkk\b/g, 'PKK')
		.replace(/\bLpm\b/g, 'LPM')
		.replace(/\b\(Pu\)\b/g, '(PU)')
		.replace(/\bDan\b/g, 'dan')
		.replace(/\bDari\b/g, 'dari')
		.replace(/\bPada\b/g, 'pada')
		.replace(/\bDi\b/g, 'di');
};

/**
 * Check if jabatan exists in specific kelembagaan type
 * @param {string} kelembagaanType - Tipe kelembagaan
 * @param {string} jabatan - Nama jabatan
 * @returns {boolean} True jika jabatan valid untuk tipe kelembagaan
 */
export const isValidJabatan = (kelembagaanType, jabatan) => {
	const jabatanList = getJabatanList(kelembagaanType);
	const upperJabatan = jabatan?.toUpperCase()?.trim();
	return jabatanList.some(j => j.toUpperCase().trim() === upperJabatan);
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
