// Format & perhitungan kecil untuk halaman aparatur akun kecamatan.

const basisHost = () => {
	const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api';
	return apiBase.replace(/\/?api\/?$/, '');
};

export const fotoUrl = (nama) => (nama ? `${basisHost()}/uploads/aparatur_desa_files/${nama}` : null);

export const inisial = (nama = '') =>
	String(nama)
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((k) => k[0])
		.join('')
		.toUpperCase() || '?';

export const labelKelamin = (v) => (v === 'Perempuan' ? 'Perempuan' : v ? 'Laki-laki' : null);

export const tanggalPanjang = (v) =>
	v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

export const usiaDari = (tanggal, sekarang = new Date()) => {
	if (!tanggal) return null;
	const lahir = new Date(tanggal);
	if (Number.isNaN(lahir.getTime())) return null;
	let usia = sekarang.getFullYear() - lahir.getFullYear();
	const belumUlangTahun =
		sekarang.getMonth() < lahir.getMonth() ||
		(sekarang.getMonth() === lahir.getMonth() && sekarang.getDate() < lahir.getDate());
	if (belumUlangTahun) usia -= 1;
	return usia >= 0 && usia < 120 ? usia : null;
};

/** Kelompok usia, berurut muda → tua. */
export const KELOMPOK_USIA = [
	{ label: '< 30', min: 0, maks: 29 },
	{ label: '30–39', min: 30, maks: 39 },
	{ label: '40–49', min: 40, maks: 49 },
	{ label: '50–59', min: 50, maks: 59 },
	{ label: '60+', min: 60, maks: 200 },
];

// UU 6/2014 Pasal 53: perangkat desa diberhentikan setelah berusia 60 tahun.
// Hanya berlaku untuk PERANGKAT desa, bukan kepala desa atau BPD.
export const BATAS_USIA_PERANGKAT = 60;

export const isKepalaDesa = (a) => /kepala\s*desa|^\s*kades\b/i.test(a.jabatan || '');
export const isSekdes = (a) => /sekretaris\s*desa|^\s*sekdes\b/i.test(a.jabatan || '');
