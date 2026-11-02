import {
	BadgeCheck, Banknote, BookOpen, Building2, CalendarDays, CircleQuestionMark, FileText, Handshake,
	Info, KeyRound, Map as Peta, Phone, Star, Store, Users, Wallet,
} from "lucide-react";

/**
 * Ikon kategori Helpdesk. Kuncinya sama dengan daftar IKON di
 * dpmd-fahri-express/src/controllers/helpdesk.controller.js — server menolak
 * kunci di luar daftar ini.
 */
export const IKON_KATEGORI = {
	tanya: CircleQuestionMark,
	info: Info,
	uang: Banknote,
	dompet: Wallet,
	toko: Store,
	dokumen: FileText,
	jabat: Handshake,
	orang: Users,
	lencana: BadgeCheck,
	buku: BookOpen,
	kunci: KeyRound,
	gedung: Building2,
	peta: Peta,
	kalender: CalendarDays,
	telepon: Phone,
	bintang: Star,
};

export const ikonKategori = (kunci) => IKON_KATEGORI[kunci] || CircleQuestionMark;

export const LABEL_TINGKAT = { kecamatan: "Kecamatan", bidang: "Bidang DPMD", dpmd: "DPMD" };

export const STATUS_TIKET = {
	baru: { label: "Menunggu", kelas: "bg-amber-50 text-amber-700 ring-amber-200" },
	diproses: { label: "Diproses", kelas: "bg-sky-50 text-sky-700 ring-sky-200" },
	dijawab: { label: "Dijawab", kelas: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
	selesai: { label: "Selesai", kelas: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export const waktu = (s) => (s ? new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "");

/** Pesan galat dari server, atau pesan koneksi bila server tidak menjawab. */
export const pesanGalat = (err, aksi) =>
	err?.response?.data?.message || (err?.response ? `Gagal ${aksi}. Coba lagi.` : `Gagal ${aksi}. Periksa koneksi internet lalu coba lagi.`);
