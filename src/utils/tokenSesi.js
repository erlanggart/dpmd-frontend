/**
 * Satu pintu untuk membaca token sesi.
 *
 * Token disimpan di dua tempat: state AuthContext (memori) dan localStorage.
 * Browser boleh membuang localStorage kapan saja. Dulu penjaga rute membaca
 * memori sementara layout dan api.js hanya membaca localStorage; begitu
 * localStorage kosong, penjaga rute mengirim user ke dashboard, layout
 * melemparnya kembali ke "/", dan "/" mengirimnya ke dashboard lagi — sambil
 * setiap putaran menembak API tanpa token. Satu HP bisa mengirim ~100 request
 * per detik dan menghabiskan jatah rate limit sekantor (2026-10-02).
 *
 * Semua yang memutuskan "sudah login atau belum" dan semua yang memasang
 * header Authorization wajib lewat sini, supaya jawabannya tidak bisa berbeda.
 */

const KUNCI = "expressToken";
// Sama dengan LOGOUT_FLAG_KEY di sessionPersistence.js.
const TANDA_LOGOUT = "dpmd_logged_out";

let tokenMemori = null;

/** Dipanggil AuthProvider setiap render dengan token di state-nya. */
export const setTokenMemori = (token) => {
	tokenMemori = token || null;
};

/**
 * Token sesi aktif: localStorage, atau memori bila localStorage sudah dibuang
 * browser. Dalam kasus kedua localStorage ditulis ulang supaya instance axios
 * lain dan tab lain ikut melihatnya.
 */
export const ambilToken = () => {
	let tersimpan = null;
	try {
		tersimpan = localStorage.getItem(KUNCI);
	} catch {
		// localStorage bisa diblokir (mode privat); andalkan memori.
	}
	if (tersimpan) return tersimpan;
	if (!tokenMemori) return null;

	try {
		// Logout sedang/sudah berjalan: jangan hidupkan lagi token yang baru dihapus.
		if (localStorage.getItem(TANDA_LOGOUT)) return null;
		localStorage.setItem(KUNCI, tokenMemori);
	} catch {
		// Tetap kembalikan token memori walau gagal ditulis.
	}
	return tokenMemori;
};
