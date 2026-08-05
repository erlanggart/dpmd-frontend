import {
	AlignLeft,
	CalendarDays,
	CheckSquare,
	ChevronDownSquare,
	Clock,
	Circle,
	Heading,
	Minus,
	Paperclip,
	Type,
} from "lucide-react";

/**
 * Satu sumber kebenaran untuk tipe pertanyaan.
 *
 * Editor, halaman pengisian, dan halaman respons semuanya membaca dari sini;
 * kalau daftarnya disalin ke tiap halaman, menambah satu tipe berarti mengubah
 * tiga berkas dan pasti ada yang ketinggalan.
 *
 * `kunci` HARUS sama persis dengan ENUM `formulir_pertanyaan.tipe` di database.
 */
export const TIPE_PERTANYAAN = [
	{ kunci: "jawaban_singkat", label: "Jawaban singkat", icon: Type, punyaOpsi: false },
	{ kunci: "paragraf", label: "Paragraf", icon: AlignLeft, punyaOpsi: false },
	{ kunci: "pilihan_ganda", label: "Pilihan ganda", icon: Circle, punyaOpsi: true },
	{ kunci: "kotak_centang", label: "Kotak centang", icon: CheckSquare, punyaOpsi: true },
	{ kunci: "dropdown", label: "Dropdown", icon: ChevronDownSquare, punyaOpsi: true },
	{ kunci: "skala_linier", label: "Skala linier", icon: Minus, punyaOpsi: false },
	{ kunci: "tanggal", label: "Tanggal", icon: CalendarDays, punyaOpsi: false },
	{ kunci: "waktu", label: "Waktu", icon: Clock, punyaOpsi: false },
	{ kunci: "unggah_berkas", label: "Unggah berkas", icon: Paperclip, punyaOpsi: false },
	{ kunci: "bagian", label: "Judul & keterangan", icon: Heading, punyaOpsi: false },
];

export const infoTipe = (kunci) =>
	TIPE_PERTANYAAN.find((t) => t.kunci === kunci) || TIPE_PERTANYAAN[0];

export const TIPE_PILIHAN = ["pilihan_ganda", "kotak_centang", "dropdown"];

/** Nilai kosong yang sesuai bentuk jawaban tiap tipe. */
export const jawabanKosong = (tipe) => (tipe === "kotak_centang" ? [] : "");

/**
 * Penanda sementara untuk "Lainnya" yang sudah dicentang tapi teksnya belum
 * diisi. Hanya hidup di dalam browser: dibuang sebelum jawaban dikirim, karena
 * bagi server ia tidak berbeda dari jawaban bebas mana pun dan akan tersimpan
 * apa adanya sebagai "__lainnya__".
 */
export const NILAI_LAINNYA = "__lainnya__";

/** Apakah pertanyaan ini menampung jawaban? `bagian` hanya pemisah berjudul. */
export const bisaDijawab = (tipe) => tipe !== "bagian";

export const LABEL_STATUS = {
	draf: "Draf",
	terbit: "Menerima respons",
	ditutup: "Ditutup",
};

export const formatTanggal = (nilai) => {
	if (!nilai) return "-";
	const d = new Date(nilai);
	if (Number.isNaN(d.getTime())) return "-";
	return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export const formatWaktu = (nilai) => {
	if (!nilai) return "-";
	const d = new Date(nilai);
	if (Number.isNaN(d.getTime())) return "-";
	return d.toLocaleString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

export const formatUkuran = (bytes) => {
	const n = Number(bytes) || 0;
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
	return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Ubah jawaban apa pun jadi teks untuk tabel dan ekspor.
 * Kotak centang tersimpan sebagai daftar; sisanya sudah berupa teks.
 */
export const jawabanKeTeks = (nilai) => {
	if (nilai === null || nilai === undefined || nilai === "") return "";
	if (Array.isArray(nilai)) return nilai.join(", ");
	return String(nilai);
};

/**
 * Nilai `datetime-local` untuk <input>, dari ISO yang dikirim server.
 * Dipakai di panel setelan batas waktu.
 */
export const keInputWaktuLokal = (iso) => {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
		d.getMinutes()
	)}`;
};
