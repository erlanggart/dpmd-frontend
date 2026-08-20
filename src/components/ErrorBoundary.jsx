import { Component } from "react";

/**
 * Penangkap error terakhir untuk seluruh pohon rute.
 *
 * Tanpa ini satu exception saat render — atau satu `lazy()` yang gagal diunduh —
 * membuat React melepas seluruh pohon komponen, dan yang tersisa di layar hanya
 * halaman putih tanpa keterangan sampai user menyegarkan sendiri. Di HP dengan
 * sinyal timbul-tenggelam, chunk yang gagal diunduh adalah kejadian sehari-hari,
 * jadi kondisi ini sering muncul justru pada user yang paling sulit menolongnya.
 */

// Chunk yang hilang bukan bug kode: berkasnya ada, unduhannya yang putus, atau
// deploy baru mengganti nama berkasnya sementara tab ini masih memegang daftar
// lama. Memuat ulang halaman menyelesaikannya.
const ERROR_CHUNK_GAGAL = [
	"failed to fetch dynamically imported module",
	"error loading dynamically imported module",
	"importing a module script failed",
	"loading chunk",
	"loading css chunk",
];

const MUAT_ULANG_KEY = "dpmd_reload_chunk";

// Jarak minimal antar muat-ulang otomatis. Penanda waktu dipakai, bukan sekadar
// ada/tidaknya penanda: boundary ini mount lebih dulu dan baru gagal kemudian
// (chunk diminta saat berpindah rute), jadi penanda yang dibersihkan saat mount
// selalu sudah hilang ketika kegagalan berikutnya datang — hasilnya halaman
// memuat ulang tanpa henti dan user hanya melihat layar putih berkedip.
const MUAT_ULANG_JEDA_MS = 30_000;

const adalahChunkGagal = (error) => {
	const pesan = String(error?.message || error || "").toLowerCase();
	return ERROR_CHUNK_GAGAL.some((petunjuk) => pesan.includes(petunjuk));
};

/** Baru boleh memuat ulang kalau muat-ulang otomatis terakhir sudah cukup lama. */
const bolehMuatUlang = () => {
	try {
		const terakhir = Number(sessionStorage.getItem(MUAT_ULANG_KEY)) || 0;
		return Date.now() - terakhir > MUAT_ULANG_JEDA_MS;
	} catch {
		// Tanpa sessionStorage tidak ada cara mencegah putaran; jangan muat ulang.
		return false;
	}
};

class ErrorBoundary extends Component {
	state = { error: null };

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		console.error("[ErrorBoundary] Render gagal:", error, info?.componentStack);

		// Chunk yang gagal diunduh biasanya sembuh dengan sekali muat ulang. Kalau
		// setelah itu gagal lagi dalam waktu dekat, masalahnya bukan unduhan yang
		// putus — hentikan dan tampilkan pesan supaya user tidak terjebak di
		// halaman yang memuat ulang terus-menerus.
		if (adalahChunkGagal(error) && bolehMuatUlang()) {
			try {
				sessionStorage.setItem(MUAT_ULANG_KEY, String(Date.now()));
			} catch {
				// Tidak akan terjadi: bolehMuatUlang() sudah gagal lebih dulu.
			}
			window.location.reload();
		}
	}

	render() {
		const { error } = this.state;
		if (!error) return this.props.children;

		// Pemanggil boleh memilih tampilan penggantinya sendiri — termasuk `null`
		// untuk komponen sampingan seperti popup global, yang kalau gagal cukup
		// tidak muncul dan tidak boleh menutupi seluruh layar.
		if (this.props.fallback !== undefined) return this.props.fallback;

		const chunkGagal = adalahChunkGagal(error);

		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
				<div className="w-full max-w-md text-center">
					<h1 className="text-lg font-semibold text-slate-900">
						{chunkGagal ? "Gagal memuat halaman" : "Terjadi kesalahan"}
					</h1>
					<p className="mt-2 text-sm text-slate-600">
						{chunkGagal
							? "Sebagian aplikasi gagal diunduh, biasanya karena koneksi terputus. Coba muat ulang."
							: "Halaman ini berhenti bekerja. Muat ulang untuk melanjutkan."}
					</p>
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
					>
						Muat ulang
					</button>
					<p className="mt-6 break-words text-xs text-slate-400">{String(error?.message || error)}</p>
				</div>
			</div>
		);
	}
}

export default ErrorBoundary;
