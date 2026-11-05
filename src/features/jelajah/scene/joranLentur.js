// Penekuk joran 8 ruas (lihat ModelJoran.jsx): ruas dekat ujung menekuk paling banyak.
export const N_RUAS = 8;

// bagian tekukan tiap ruas, jumlahnya 1
const BOBOT = (() => {
	const b = Array.from({ length: N_RUAS }, (_, i) => (i + 1) ** 1.7);
	const total = b.reduce((a, c) => a + c, 0);
	return b.map((c) => c / total);
})();

// sudut: kemiringan pangkal; lentur: total tekukan ke depan (rad); sisi: tekukan ke samping (rad)
export function lenturkanJoran(ruas, sudut, lentur, sisi = 0) {
	for (let i = 0; i < N_RUAS; i++) {
		const g = ruas[i];
		if (!g) continue;
		g.rotation.x = (i === 0 ? sudut : 0) + lentur * BOBOT[i];
		g.rotation.z = -sisi * BOBOT[i];
	}
}

// Pangkal joran di rangka tokoh berdiri: gagang di depan perut, sedikit ke sisi kiri supaya kenop
// engkol terjangkau tangan kanan. Dipakai bersama agar joran & tangan tokoh selalu bertemu.
export const PANGKAL_JORAN = { x: 0.14, y: 1.12, z: 0.28 };
// joran ikut terangkat bersama lengan, dan maju-mundur mengikuti bahu saat badan condong
export const ANGKAT_JORAN = 0.2;
export const CONDONG_JORAN = 0.53;
// kenop engkol dari pangkal joran; r = jari-jari putarannya (lihat ModelJoran)
export const KENOP_JORAN = { x: -0.05, y: 0.115, z: 0.092, r: 0.074 };
// kemiringan joran bila tidak ada gaya.sudut (tokoh tamu lain, fase menunggu)
export const SUDUT_JORAN_TAMU = 0.95;
