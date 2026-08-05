import {
	FileArchive,
	FileAudio,
	FileCode,
	FileImage,
	FileSpreadsheet,
	FileText,
	FileVideo,
	File as FileIcon,
} from "lucide-react";

/** Ukuran berkas dalam satuan yang enak dibaca. */
export const formatUkuran = (bytes) => {
	const n = Number(bytes || 0);
	if (n === 0) return "0 B";
	const satuan = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), satuan.length - 1);
	const nilai = n / 1024 ** i;
	return `${nilai >= 10 || i === 0 ? Math.round(nilai) : nilai.toFixed(1)} ${satuan[i]}`;
};

export const formatTanggal = (nilai) => {
	if (!nilai) return "-";
	const d = new Date(nilai);
	if (Number.isNaN(d.getTime())) return "-";
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(d);
};

// Pengelompokan ikon per jenis berkas. Warna sengaja dibatasi: dokumen kantor
// dapat penanda warna karena itu yang paling sering dicari mata, sisanya slate.
const JENIS = [
	{ ekst: ["pdf"], icon: FileText, warna: "text-rose-600", label: "PDF" },
	{ ekst: ["doc", "docx", "odt", "rtf"], icon: FileText, warna: "text-slate-700", label: "Dokumen" },
	{ ekst: ["xls", "xlsx", "csv", "ods"], icon: FileSpreadsheet, warna: "text-emerald-600", label: "Spreadsheet" },
	{ ekst: ["ppt", "pptx", "odp"], icon: FileText, warna: "text-amber-600", label: "Presentasi" },
	{ ekst: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"], icon: FileImage, warna: "text-slate-600", label: "Gambar" },
	{ ekst: ["mp4", "mkv", "mov", "avi", "webm"], icon: FileVideo, warna: "text-slate-600", label: "Video" },
	{ ekst: ["mp3", "wav", "ogg", "m4a"], icon: FileAudio, warna: "text-slate-600", label: "Audio" },
	{ ekst: ["zip", "rar", "7z", "tar", "gz"], icon: FileArchive, warna: "text-slate-600", label: "Arsip" },
	{ ekst: ["js", "ts", "json", "xml", "html", "css", "sql"], icon: FileCode, warna: "text-slate-600", label: "Kode" },
];

export const jenisBerkas = (namaAtauEkst = "") => {
	const ekst = String(namaAtauEkst).split(".").pop().toLowerCase();
	return (
		JENIS.find((j) => j.ekst.includes(ekst)) || {
			icon: FileIcon,
			warna: "text-slate-400",
			label: "Berkas",
		}
	);
};

/** Berkas yang bisa dipratinjau langsung di peramban. */
export const bisaDipratinjau = (berkas) => {
	const mime = String(berkas?.mime || "");
	return mime.startsWith("image/") || mime === "application/pdf";
};

export const BIDANG_DRIVE = {
	2: { slug: "sekretariat", nama: "Sekretariat" },
	3: { slug: "spked", nama: "Sarana Prasarana Kewilayahan & Ekonomi Desa" },
	4: { slug: "kkd", nama: "Kekayaan dan Keuangan Desa" },
	5: { slug: "pmd", nama: "Pemberdayaan Masyarakat Desa" },
	6: { slug: "pemdes", nama: "Pemerintahan Desa" },
};
