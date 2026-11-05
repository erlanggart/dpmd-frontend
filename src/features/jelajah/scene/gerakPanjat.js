// Gerak memanjat (dari air ke tepi, melewati pagar) dan jalan jongkok.
// Pose ditulis di "bingkai bibir": y = tinggi relatif bibir, z = maju dari bibir, lalu sudut
// sendi dihitung dengan IK dua ruas supaya tangan benar-benar di bibir dan kaki di pijakan.
// Sudut mengikuti Tokoh.jsx: rotation.x negatif = ke depan, lutut positif, siku negatif.

const PINGGUL = 0.9;
const PAHA = 0.42;
const BETIS = 0.42;
const LENGAN_ATAS = 0.29;
const LENGAN_BAWAH = 0.28;
const PINGGUL_KE_BAHU = 0.53;
const SOL = 0.06; // pergelangan kaki di atas sol sepatu
export const LAMA_PANJAT = 1.9; // detik

// [u, pinggul y, z, condong, sol kiri y, z, sol kanan y, z, tangan y, z]
const KUNCI_TEPI = [
	[0, -0.87, -0.6, 0.05, -1.7, -0.66, -1.7, -0.52, -0.05, -0.2], // mengapung, tangan meraih
	[0.16, -0.82, -0.3, 0.08, -1.65, -0.38, -1.62, -0.2, 0.03, 0.1], // tangan di bibir
	[0.3, -0.7, -0.3, 0.12, -1.45, -0.5, -1.38, -0.18, 0.03, 0.1], // ancang-ancang, kaki menekuk
	[0.52, -0.32, -0.22, 0.35, -1.05, -0.45, -1, -0.12, 0.03, 0.1], // menarik badan keluar air
	[0.68, 0.1, -0.06, 0.95, -0.65, -0.38, -0.3, -0.1, 0.03, 0.18], // menekan, dada melewati bibir
	[0.8, 0.42, 0.05, 1.05, -0.25, -0.3, 0.02, 0.02, 0.12, 0.42], // kaki kanan menapak bibir
	[0.9, 0.66, 0.3, 0.55, 0.05, -0.02, 0, 0.3, 0.4, 0.55], // bangkit, kaki kiri menyusul
	[1, 0.9, 0.6, 0, 0, 0.5, 0, 0.7, 0.87, 0.62], // berdiri
];

const kunciPagar = (T) => {
	const kakiNaik = Math.max(-T, -0.85);
	return [
		[0, -T + PINGGUL, -0.55, 0, -T, -0.62, -T, -0.48, -T + 0.87, -0.52], // berdiri di depan pagar
		[0.14, -T + 0.78, -0.52, 0.22, -T, -0.62, -T, -0.48, 0.02, -0.06], // merendah, tangan di puncak
		[0.3, -0.38, -0.42, 0.4, kakiNaik, -0.42, Math.max(-T, -0.62), -0.2, 0.02, -0.03], // kaki memanjat dinding
		[0.46, 0.02, -0.18, 0.85, -0.55, -0.38, -0.18, -0.1, 0.02, 0.08], // badan naik ke puncak
		[0.58, 0.28, 0.02, 1.05, -0.08, -0.32, 0.14, 0.4, 0.04, 0.18], // kaki depan melewati puncak
		[0.7, 0.12, 0.32, 0.45, 0.12, 0, -0.55, 0.5, 0.05, 0.3], // kaki belakang menyusul
		[0.91, -T + 0.62, 0.58, 0.28, -T, 0.48, -T, 0.7, -T + 0.72, 0.82], // mendarat, lutut meredam
		[1, -T + PINGGUL, 0.6, 0, -T, 0.5, -T, 0.7, -T + 0.87, 0.62], // berdiri
	];
};

const SIMPAN = new Map([[0, KUNCI_TEPI]]);
const kunciUntuk = (T) => {
	if (!SIMPAN.has(T)) SIMPAN.set(T, kunciPagar(T));
	return SIMPAN.get(T);
};
const catmull = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);

// Pose pada u (0..1); T = 0 berarti tepi air, selain itu tinggi pagar.
export function posePanjat(T, u) {
	const k = kunciUntuk(T);
	let i = 0;
	while (i < k.length - 2 && u > k[i + 1][0]) i++;
	const t = Math.min(1, Math.max(0, (u - k[i][0]) / (k[i + 1][0] - k[i][0])));
	const [a, b, c, d] = [k[Math.max(0, i - 1)], k[i], k[i + 1], k[Math.min(k.length - 1, i + 2)]];
	const q = b.slice(1).map((_, n) => catmull(a[n + 1], b[n + 1], c[n + 1], d[n + 1], t));
	// lengkung kurva tidak boleh membawa sol menembus tanah saat mendarat
	if (T) q[3] = Math.max(q[3], -T);
	if (T) q[5] = Math.max(q[5], -T);
	return q;
}

// IK dua ruas menuju titik (dy, dz) dari pangkal. tekuk 1 = lutut ke depan, -1 = siku ke belakang.
// Hasil: [sudut ruas atas, sudut sendi].
export function ikDuaRuas(dy, dz, L1, L2, tekuk) {
	const d = Math.max(Math.abs(L1 - L2) + 0.001, Math.min(L1 + L2 - 0.001, Math.hypot(dy, dz)));
	const arah = Math.atan2(-dz, -dy);
	const alfa = Math.acos(Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
	const beta = Math.PI - Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))));
	return [arah - tekuk * alfa, tekuk * beta];
}

// Sudut sendi lokal untuk Tokoh.jsx saat memanjat.
export function sudutPanjat(T, u) {
	const [hy, hz, c, ly, lz, ry, rz, ty, tz] = posePanjat(T, u);
	const [ki, kiB] = ikDuaRuas(ly + SOL - hy, lz - hz, PAHA, BETIS, 1);
	const [ka, kaB] = ikDuaRuas(ry + SOL - hy, rz - hz, PAHA, BETIS, 1);
	const [ta, tb] = ikDuaRuas(ty - hy - PINGGUL_KE_BAHU * Math.cos(c), tz - hz - PINGGUL_KE_BAHU * Math.sin(c), LENGAN_ATAS, LENGAN_BAWAH, -1);
	return { c, turun: 0, ki: ki - c, kiB, ka: ka - c, kaB, ta: ta - c, tb, ayun: 0 };
}

// Sudut sendi jalan jongkok: pinggul rendah, sol tetap menapak, langkah pendek.
export function sudutJongkok(fase, laju) {
	const turun = 0.38;
	const c = 0.38;
	const m = Math.min(1, laju / 0.7);
	const s = Math.sin(fase) * 0.2 * m;
	const angkat = Math.cos(fase) * 0.07 * m;
	const [ki, kiB] = ikDuaRuas(Math.max(0, angkat) + SOL - (PINGGUL - turun), s + 0.06, PAHA, BETIS, 1);
	const [ka, kaB] = ikDuaRuas(Math.max(0, -angkat) + SOL - (PINGGUL - turun), -s - 0.1, PAHA, BETIS, 1);
	return { c, turun, ki: ki - c, kiB, ka: ka - c, kaB, ta: -0.42, tb: -0.85, ayun: s * 0.9 };
}

// Posisi akar tokoh (kaki) saat memanjat; selisih titik mulai/mendarat nyata dengan pose kunci
// dihabiskan di awal dan akhir gerakan. md = hasil cariPagar / naikDariAir.
export function akarPanjat(md, dt) {
	md.t += dt;
	const u = Math.min(1, md.t / LAMA_PANJAT);
	const kini = posePanjat(md.tinggi, u);
	const awal = posePanjat(md.tinggi, 0);
	const akhir = posePanjat(md.tinggi, 1);
	const fAwal = Math.max(0, 1 - u / 0.2);
	// dimulai sejak melewati puncak: mendarat jauh berarti melayang jauh, bukan bergeser di tanah
	const fAkhir = Math.max(0, (u - 0.58) / 0.42);
	const yAkar = (q) => md.bibirY + q[0] - PINGGUL;
	const z = kini[1] + (md.z0 - awal[1]) * fAwal + (md.z1 - akhir[1]) * fAkhir;
	return { u, x: md.x + md.hx * z, y: yAkar(kini) + (md.y0 - yAkar(awal)) * fAwal + (md.y1 - yAkar(akhir)) * fAkhir, z: md.z + md.hz * z };
}

// Pagar yang sedang dihadapi (≤ 0,9 m) dan bisa dilewati, atau null. daftar = kotak tipis
// { x0, x1, z0, z1, tinggi }; bisa(x, z) = tinggi pijakan di titik mendarat, null bila terhalang.
export function cariPagar(daftar, x, y, z, rot, bisa) {
	const hx = Math.sin(rot);
	const hz = Math.cos(rot);
	for (const k of daftar) {
		const lintasX = k.x1 - k.x0 < k.z1 - k.z0;
		const h = lintasX ? hx : hz;
		if (Math.abs(h) < 0.6) continue;
		const [a0, a1, pos, lain, b0, b1] = lintasX ? [k.x0, k.x1, x, z, k.z0, k.z1] : [k.z0, k.z1, z, x, k.x0, k.x1];
		if (lain < b0 || lain > b1) continue;
		const arah = Math.sign(h);
		const celah = arah > 0 ? a0 - pos : pos - a1;
		if (celah < -0.01 || celah > 0.9) continue;
		const tengah = (a0 + a1) / 2;
		// di balik pagar bisa ada bak tanaman: mendarat di titik bebas pertama, melewatinya
		let turun = null;
		let y1 = null;
		for (const jauh of [0.5, 0.8, 1.1, 1.4, 1.7]) {
			const t = tengah + arah * ((a1 - a0) / 2 + jauh);
			y1 = lintasX ? bisa(t, z) : bisa(x, t);
			if (y1 !== null) {
				turun = t;
				break;
			}
		}
		if (turun === null) continue;
		return {
			x: lintasX ? tengah : x,
			z: lintasX ? z : tengah,
			hx: lintasX ? arah : 0,
			hz: lintasX ? 0 : arah,
			rot: lintasX ? (arah * Math.PI) / 2 : arah > 0 ? 0 : Math.PI,
			tinggi: k.tinggi,
			z0: -Math.abs(pos - tengah),
			z1: Math.abs(turun - tengah),
			y0: y,
			y1,
			bibirY: y + k.tinggi,
			t: 0,
		};
	}
	return null;
}
