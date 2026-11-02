import { AIR } from "./kawasanData";

// Situ Pemda: dermaga spot mancing, perahu dayung, dan bantuan geometri perairan.
// Semua koordinat adegan (meter); tinggi relatif halaman (TANAH) seperti Kawasan.jsx.

export const AIR_Y = -0.45; // permukaan air situ
export const DEK_Y = 0.12; // papan dermaga, sejajar bibir talud

const pasangan = (f) => {
	const p = [];
	for (let i = 0; i < f.length; i += 2) p.push([f[i], f[i + 1]]);
	return p;
};
const luas = (p) => p.reduce((s, [x, z], i) => s + x * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * z, 0) / 2;

// Situ = perairan terluas di data kawasan.
export const SITU = AIR.map(pasangan).sort((a, b) => Math.abs(luas(b)) - Math.abs(luas(a)))[0];

export function diSitu(x, z) {
	let ya = false;
	for (let i = 0, j = SITU.length - 1; i < SITU.length; j = i++) {
		const [xi, zi] = SITU[i];
		const [xj, zj] = SITU[j];
		if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ya = !ya;
	}
	return ya;
}

// Titik terdekat di garis tepi situ dari (x, z), beserta jaraknya.
function tepiTerdekat(x, z) {
	let best = { jarak: Infinity, x: 0, z: 0 };
	for (let i = 0, j = SITU.length - 1; i < SITU.length; j = i++) {
		const [ax, az] = SITU[j];
		const dx = SITU[i][0] - ax;
		const dz = SITU[i][1] - az;
		const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
		const qx = ax + dx * t;
		const qz = az + dz * t;
		const jarak = Math.hypot(x - qx, z - qz);
		if (jarak < best.jarak) best = { jarak, x: qx, z: qz };
	}
	return best;
}

// Jarak titik ke garis tepi situ (dipakai sebagai "kedalaman": makin ke tengah makin dalam).
export const jarakKeTepi = (x, z) => tepiTerdekat(x, z).jarak;

// Memancing dari pinggir situ: berdiri di darat ≤ 3,5 m dari tepi (bukan di dermaga),
// menghadap ke air. Mengembalikan arah hadap, atau null bila terlalu jauh.
export function titikTepi(x, z) {
	if (diSitu(x, z) || dermagaDi(x, z)) return null;
	const t = tepiTerdekat(x, z);
	if (t.jarak > 3.5) return null;
	return { x, z, rot: Math.atan2(t.x - x, t.z - z) };
}

// ---------- dermaga ----------

// Jembatan kayu dari tepi ke tengah situ, berujung panggung lebar tempat memancing.
// Koordinat lokal: s = menjorok ke air dari garis tepi, w = ke samping.
export const BAGIAN_DERMAGA = [
	{ s0: -1.6, s1: 12, w: 1.2 }, // titian
	{ s0: 11.5, s1: 17, w: 3.6 }, // panggung pancing
];
const UJUNG_S = 17;

// Tepi terdekat dari titik perkiraan → titik pangkal & arah menjorok (normal ke dalam air).
function pangkal([tx, tz]) {
	let best = null;
	for (let i = 0; i < SITU.length; i++) {
		const a = SITU[i];
		const b = SITU[(i + 1) % SITU.length];
		const dx = b[0] - a[0];
		const dz = b[1] - a[1];
		const L = Math.hypot(dx, dz);
		const t = Math.max(0.2, Math.min(0.8, ((tx - a[0]) * dx + (tz - a[1]) * dz) / (L * L)));
		const q = [a[0] + dx * t, a[1] + dz * t];
		const d = Math.hypot(q[0] - tx, q[1] - tz);
		if (!best || d < best.d) best = { d, q, ux: dx / L, uz: dz / L };
	}
	let n = [-best.uz, best.ux];
	if (!diSitu(best.q[0] + n[0], best.q[1] + n[1])) n = [-n[0], -n[1]];
	return { x: best.q[0], z: best.q[1], nx: n[0], nz: n[1] };
}

export const DERMAGA = [
	{ id: "utara", nama: "Dermaga Utara", kira: [-60, 0], perahu: [3.3, -3.3] },
	{ id: "rumdin", nama: "Dermaga Rumah Dinas", kira: [20, -300], perahu: [3.3] },
	{ id: "plaza", nama: "Dermaga Situ Plaza", kira: [0, -490], perahu: [3.3] },
].map((d) => {
	const p = pangkal(d.kira);
	return { ...d, ...p, rot: Math.atan2(p.nx, p.nz) };
});

// lokal (s, w) dermaga d → dunia
export const keDuniaDermaga = (d, s, w) => ({ x: d.x + d.nx * s + d.nz * w, z: d.z + d.nz * s - d.nx * w });
const keLokal = (d, x, z) => {
	const dx = x - d.x;
	const dz = z - d.z;
	return { s: dx * d.nx + dz * d.nz, w: dx * d.nz - dz * d.nx };
};

// Dermaga yang diinjak lingkaran (x, z, r) seluruhnya, atau null.
export function dermagaDi(x, z, r = 0) {
	for (const d of DERMAGA) {
		const { s, w } = keLokal(d, x, z);
		for (const b of BAGIAN_DERMAGA) if (s >= b.s0 && s <= b.s1 - r && Math.abs(w) <= b.w - r) return d;
	}
	return null;
}

// Di panggung ujung dermaga (tempat memancing)?
export function diPanggung(x, z) {
	for (const d of DERMAGA) {
		const { s, w } = keLokal(d, x, z);
		const b = BAGIAN_DERMAGA[1];
		if (s >= b.s0 && s <= b.s1 && Math.abs(w) <= b.w) return d;
	}
	return null;
}

// Titik berdiri memancing: tepi depan panggung, mengikuti posisi samping pemain.
export function titikPancing(d, x, z) {
	const { w } = keLokal(d, x, z);
	return { ...keDuniaDermaga(d, UJUNG_S - 0.55, Math.max(-3, Math.min(3, w))), rot: d.rot };
}

// Titik dermaga terdekat dari perahu (untuk turun), bila cukup dekat.
export function titikTurun(x, z) {
	let best = null;
	for (const d of DERMAGA) {
		const { s, w } = keLokal(d, x, z);
		for (const b of BAGIAN_DERMAGA) {
			const ss = Math.max(Math.max(b.s0, 0.5), Math.min(b.s1 - 0.5, s));
			const ww = Math.max(-b.w + 0.45, Math.min(b.w - 0.45, w));
			const jarak = Math.hypot(s - ss, w - ww);
			if (!best || jarak < best.jarak) best = { jarak, ...keDuniaDermaga(d, ss, ww), rot: d.rot + Math.PI };
		}
	}
	return best && best.jarak < 3.4 ? best : null;
}

// Perahu boleh di sini? Di dalam situ, tidak menyentuh tepi, dan tidak menabrak dermaga.
export function perahuBebas(x, z, r) {
	if (!diSitu(x, z) || jarakKeTepi(x, z) < r + 0.3) return false;
	for (const d of DERMAGA) {
		const { s, w } = keLokal(d, x, z);
		for (const b of BAGIAN_DERMAGA) if (s > b.s0 - r && s < b.s1 + r && Math.abs(w) < b.w + r) return false;
	}
	return true;
}

// Perahu tertambat di samping titian (celah pagar), melintang dengan haluan menjauhi
// titian, jadi bisa langsung didayung ke situ lepas.
export const PERAHU = DERMAGA.flatMap((d) =>
	d.perahu.map((w) => ({ ...keDuniaDermaga(d, 6.5, w), rot: w > 0 ? Math.atan2(d.nz, -d.nx) : Math.atan2(-d.nz, d.nx) })),
);

// Papan nama melayang (digambar bersama label kawasan).
export const LABEL_SITU = DERMAGA.map((d) => {
	const p = keDuniaDermaga(d, 0, 0);
	return [`🎣 Spot Mancing · ${d.nama}`, p.x, p.z, 3.6, 1];
});
