import { JALAN } from "./kawasanData";
import { pasangan } from "./kawasanBantu";

// Jaringan jalan kawasan (data OSM) untuk lalu lintas & pejalan kaki di luar jalan depan
// kantor: tiap ruas punya panjang kumulatif, sambungan di kedua ujungnya, dan titik muncul.

// Ruas jalan utama, sedang, & kecil (gang/setapak tidak dilewati kendaraan).
export const JALUR = JALAN.filter(([j]) => j <= 2)
	.map(([j, lebar, f]) => {
		const p = pasangan(f);
		const cum = [0];
		for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
		return { p, cum, panjang: cum[cum.length - 1], lebar, besar: j <= 1, sambung: [[], []] };
	})
	.filter((r) => r.panjang > 12);

// Sambungan: ujung ruas yang berdekatan (< 4 m) dianggap persimpangan.
JALUR.forEach((a, ia) => {
	[0, 1].forEach((ua) => {
		const qa = ua ? a.p[a.p.length - 1] : a.p[0];
		JALUR.forEach((b, ib) => {
			if (ia === ib) return;
			[0, 1].forEach((ub) => {
				const qb = ub ? b.p[b.p.length - 1] : b.p[0];
				if (Math.hypot(qa[0] - qb[0], qa[1] - qb[1]) < 4) a.sambung[ua].push({ j: ib, ujung: ub });
			});
		});
	});
});

// Titik muncul tiap ±15 m di sepanjang semua ruas.
export const TITIK_MUNCUL = JALUR.flatMap((r, j) => Array.from({ length: Math.max(1, Math.floor(r.panjang / 15)) }, (_, i) => ({ j, s: 7 + i * 15 })).filter((t) => t.s < r.panjang - 2));

// Posisi & arah di ruas j pada jarak s dari pangkalnya.
export function titikDi(j, s, hasil = {}) {
	const r = JALUR[j];
	let i = 1;
	while (i < r.cum.length - 1 && r.cum[i] < s) i++;
	const a = r.p[i - 1];
	const b = r.p[i];
	const pj = r.cum[i] - r.cum[i - 1] || 1;
	const u = Math.max(0, Math.min(1, (s - r.cum[i - 1]) / pj));
	hasil.x = a[0] + (b[0] - a[0]) * u;
	hasil.z = a[1] + (b[1] - a[1]) * u;
	hasil.dx = (b[0] - a[0]) / pj;
	hasil.dz = (b[1] - a[1]) / pj;
	return hasil;
}

// Ruas lanjutan di ujung (0 = pangkal, 1 = ujung) ruas j: { j, s, arah } atau null.
export function lanjutDi(j, ujung, syarat = () => true) {
	const pilihan = JALUR[j].sambung[ujung].filter((c) => syarat(JALUR[c.j]));
	if (!pilihan.length) return null;
	const c = pilihan[Math.floor(Math.random() * pilihan.length)];
	return { j: c.j, s: c.ujung ? JALUR[c.j].panjang : 0, arah: c.ujung ? -1 : 1 };
}

// Daftar kendaraan lalu lintas (jalan depan kantor & kawasan) untuk suara mesin terdekat.
// Isinya objek { x, z, laju, jenis, tampak? } yang digerakkan pemiliknya.
export const KENDARAAN_LALIN = new Set();
