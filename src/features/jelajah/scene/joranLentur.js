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
