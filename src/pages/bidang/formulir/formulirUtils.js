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
 * Kelompokkan respons per hari untuk grafik tren.
 *
 * Hari tanpa respons tetap dikembalikan sebagai nol: kalau dilewati begitu saja,
 * jeda seminggu tergambar serapat jeda sehari dan kurvanya berbohong.
 */
export const responsPerHari = (respons) => {
	if (!respons.length) return [];
	const kunci = (d) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

	const hitung = new Map();
	for (const r of respons) {
		const d = new Date(r.dikirim_pada);
		if (Number.isNaN(d.getTime())) continue;
		const k = kunci(d);
		hitung.set(k, (hitung.get(k) || 0) + 1);
	}
	if (!hitung.size) return [];

	const tanggal = [...hitung.keys()].sort();
	const akhir = new Date(`${tanggal[tanggal.length - 1]}T00:00:00`);
	const hasil = [];
	for (let d = new Date(`${tanggal[0]}T00:00:00`); d <= akhir; d.setDate(d.getDate() + 1)) {
		const k = kunci(d);
		hasil.push({
			kunci: k,
			label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
			jumlah: hitung.get(k) || 0,
		});
	}
	return hasil;
};

/**
 * Nama tiap titik pada skala linier.
 *
 * Yang tersimpan cuma angkanya; keterangan ujungnya ada di pengaturan dan hanya
 * berlaku untuk titik pertama dan terakhir. Tanpa ini, legenda grafik hanya
 * berbunyi "1 2 3 4" dan pembaca rekap harus menebak arah mana yang bagus.
 */
export const labelTitikSkala = (pengaturan = {}, sebaran = []) =>
	sebaran.map((d, i) => {
		if (i === 0 && pengaturan.label_min) return `${d.label} · ${pengaturan.label_min}`;
		if (i === sebaran.length - 1 && pengaturan.label_maks) return `${d.label} · ${pengaturan.label_maks}`;
		return d.label;
	});

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
