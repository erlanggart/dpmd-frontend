// src/components/bidang/bidangFormat.js
// Pemformat kecil untuk halaman bidang. Dipisah dari BidangUI.jsx karena
// berkas komponen hanya boleh mengekspor komponen (aturan react-refresh).

/** Warna lencana aksi pada log aktivitas. */
export const warnaAksi = (aksi) => {
	const peta = {
		create: 'text-emerald-700 bg-emerald-50',
		update: 'text-blue-700 bg-blue-50',
		delete: 'text-red-700 bg-red-50',
		approve: 'text-violet-700 bg-violet-50',
		reject: 'text-orange-700 bg-orange-50',
		upload: 'text-teal-700 bg-teal-50',
		download: 'text-slate-700 bg-slate-100',
	};
	return peta[aksi] || 'text-slate-700 bg-slate-100';
};

/** "3 jam yang lalu" — jatuh ke tanggal penuh setelah seminggu. */
export const waktuRelatif = (nilai) => {
	const tanggal = new Date(nilai);
	if (Number.isNaN(tanggal.getTime())) return '-';
	const selisih = Math.floor((Date.now() - tanggal) / 1000);

	if (selisih < 60) return 'Baru saja';
	if (selisih < 3600) return `${Math.floor(selisih / 60)} menit yang lalu`;
	if (selisih < 86400) return `${Math.floor(selisih / 3600)} jam yang lalu`;
	if (selisih < 604800) return `${Math.floor(selisih / 86400)} hari yang lalu`;

	return tanggal.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const angka = (n) => Number(n ?? 0).toLocaleString('id-ID');

/** Angka yang boleh kosong — dibedakan dari nol, jadi tidak mengarang capaian. */
export const angkaAtau = (n, pengganti = '—') =>
	n === null || n === undefined ? pengganti : Number(n).toLocaleString('id-ID');

export const rupiahRingkas = (n) =>
	n !== null && n !== undefined && n > 0
		? new Intl.NumberFormat('id-ID', {
				style: 'currency',
				currency: 'IDR',
				notation: 'compact',
				maximumFractionDigits: 2,
		  }).format(n)
		: 'Rp —';

export const tanggalPanjang = (nilai) => {
	const tanggal = new Date(nilai);
	if (Number.isNaN(tanggal.getTime())) return '-';
	return tanggal.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Lencana aksi pada timeline: titik, keping, dan namanya dalam bahasa Indonesia. */
const TONE_AKSI = {
	create: { dot: '#0ca30c', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60', label: 'Dibuat' },
	update: { dot: '#2a78d6', chip: 'bg-blue-50 text-blue-700 ring-blue-200/60', label: 'Diperbarui' },
	delete: { dot: '#e34948', chip: 'bg-red-50 text-red-700 ring-red-200/60', label: 'Dihapus' },
	approve: { dot: '#4a3aa7', chip: 'bg-violet-50 text-violet-700 ring-violet-200/60', label: 'Disetujui' },
	reject: { dot: '#eb6834', chip: 'bg-orange-50 text-orange-700 ring-orange-200/60', label: 'Ditolak' },
	upload: { dot: '#0891b2', chip: 'bg-cyan-50 text-cyan-700 ring-cyan-200/60', label: 'Unggah' },
	download: { dot: '#898781', chip: 'bg-slate-100 text-slate-600 ring-slate-200/60', label: 'Unduh' },
};

export const toneAksi = (aksi) => TONE_AKSI[aksi] || TONE_AKSI.update;
