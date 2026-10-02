// Bantuan bersama halaman Video Desa (bidang & halaman unggah desa).
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { tautanUnggah } from "../../../api/videoDesaApi";

export const LABEL_ORIENTASI = {
	bebas: "Bebas",
	lanskap: "Lanskap 16:9 (videotron)",
	potret: "Potret 9:16 (Reels/TikTok)",
};

export const LABEL_STATUS_KIRIMAN = {
	masuk: "Belum ditinjau",
	disetujui: "Disetujui",
	ditolak: "Ditolak",
};

/** Tahap pemeriksaan keamanan oleh server sebelum video bisa diputar. */
export const LABEL_PROSES = {
	antre: "Antre diperiksa",
	diproses: "Sedang diperiksa",
	siap: "Lolos pemeriksaan",
	gagal: "Gagal pemeriksaan",
};

export const formatUkuran = (byte) => {
	const n = Number(byte) || 0;
	if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
	if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(n >= 100 * 1024 ** 2 ? 0 : 1)} MB`;
	if (n >= 1024) return `${Math.round(n / 1024)} KB`;
	return `${n} B`;
};

export const formatDurasi = (detik) => {
	if (detik === null || detik === undefined || Number.isNaN(Number(detik))) return null;
	const t = Math.round(Number(detik));
	const m = Math.floor(t / 60);
	const s = t % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
};

export const formatWaktu = (nilai) => {
	if (!nilai) return "-";
	const d = new Date(nilai);
	if (Number.isNaN(d.getTime())) return "-";
	return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/** Nilai untuk <input type="datetime-local"> dari tanggal server. */
export const keInputWaktu = (nilai) => {
	if (!nilai) return "";
	const d = new Date(nilai);
	if (Number.isNaN(d.getTime())) return "";
	const p = (x) => String(x).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Orientasi sebuah video dari resolusinya, atau null bila tidak diketahui. */
export const orientasiVideo = (lebar, tinggi) => {
	if (!lebar || !tinggi) return null;
	if (lebar > tinggi) return "lanskap";
	if (tinggi > lebar) return "potret";
	return "persegi";
};

/**
 * Catatan ketidaksesuaian kiriman terhadap arahan permintaan. Arahan tidak
 * memblokir unggahan; tugas daftar ini hanya membuat penyimpangannya kelihatan.
 */
export const catatanKesesuaian = (kiriman, permintaan) => {
	const catatan = [];
	const o = orientasiVideo(kiriman.lebar, kiriman.tinggi);
	if (permintaan.orientasi !== "bebas" && o && o !== permintaan.orientasi) {
		catatan.push(`Orientasi ${o}, diminta ${permintaan.orientasi}`);
	}
	if (permintaan.maks_durasi_detik && kiriman.durasi_detik && kiriman.durasi_detik > permintaan.maks_durasi_detik + 1) {
		catatan.push(`Durasi ${formatDurasi(kiriman.durasi_detik)}, maks ${formatDurasi(permintaan.maks_durasi_detik)}`);
	}
	if (kiriman.tinggi && Math.min(kiriman.lebar, kiriman.tinggi) < 720) {
		catatan.push("Resolusi di bawah 720p");
	}
	return catatan;
};

/** Salin tautan unggah; tampilkan tautannya bila clipboard ditolak (http tanpa TLS). */
export const salinTautanUnggah = async (token) => {
	const tautan = tautanUnggah(token);
	try {
		await navigator.clipboard.writeText(tautan);
		toast.success("Tautan unggah disalin. Bagikan ke desa.");
	} catch {
		await Swal.fire({ title: "Tautan unggah video", text: tautan, confirmButtonColor: "#0f172a" });
	}
};
