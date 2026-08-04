// src/components/prolap/prolapFormat.js
// Konstanta warna, pemformat angka, dan pengunduh CSV untuk halaman Prolap.
// Dipisah dari ProlapUI.jsx karena berkas komponen hanya boleh mengekspor
// komponen (aturan react-refresh di proyek ini).

// Palet kategorikal tervalidasi — sama untuk semua halaman Prolap. Nomor slot
// menempel ke entitasnya (jenis lembaga, sumber dana, deret keuangan), bukan ke
// urutan tampil, supaya menyaring satu hal tidak mengecat ulang sisanya.
export const SLOT_COLOR = {
	1: '#2a78d6',
	2: '#eb6834',
	3: '#1baf7a',
	4: '#eda100',
	5: '#e87ba4',
	6: '#008300',
	7: '#4a3aa7',
	8: '#e34948',
};
export const PRIMARY = '#2a78d6';

// Warna status dipisah dari palet seri dan selalu berpasangan dengan ikon/label.
export const STATUS_WARNA = { baik: '#0ca30c', sedang: '#fab219', kurang: '#e34948', netral: '#c9c7c0' };

// ============================================================
// Format
// ============================================================
export const fmt = (n) => Number(n ?? 0).toLocaleString('id-ID');

export const persenTeks = (n) => `${String(Number(n ?? 0)).replace('.', ',')}%`;

export const rupiahRingkas = (n) => {
	const value = Number(n ?? 0);
	const abs = Math.abs(value);
	const cut = (d, s) => `Rp ${(value / d).toFixed(1).replace('.', ',')} ${s}`;
	if (abs >= 1e12) return cut(1e12, 'T');
	if (abs >= 1e9) return cut(1e9, 'M');
	if (abs >= 1e6) return cut(1e6, 'Jt');
	if (abs >= 1e3) return `Rp ${Math.round(value / 1e3)} Rb`;
	return `Rp ${fmt(value)}`;
};

export const rupiahPenuh = (n) => `Rp ${fmt(Math.round(Number(n ?? 0)))}`;

export const waktuAmbil = (iso) => {
	if (!iso) return '-';
	const tanggal = new Date(iso);
	if (Number.isNaN(tanggal.getTime())) return '-';
	return tanggal.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** Unduh CSV dengan BOM supaya Excel membaca UTF-8. */
export const unduhCsv = (namaBerkas, header, baris) => {
	if (!baris.length) return;
	const csv = [header, ...baris]
		.map((row) => row.map((sel) => `"${String(sel ?? '').replace(/"/g, '""')}"`).join(','))
		.join('\n');
	const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
	const tautan = document.createElement('a');
	tautan.href = url;
	tautan.download = namaBerkas;
	tautan.click();
	URL.revokeObjectURL(url);
};
