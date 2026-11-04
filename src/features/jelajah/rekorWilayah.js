/*
 * Rekor & tingkat game potensi wilayah (disimpan di perangkat).
 * - xp per game: dari nilai penjualan; tingkat membuka peningkatan
 * - rekor per kecamatan: skor panen beruntun terbaik. Skor dihitung dari mutu,
 *   kombo, dan ketepatan, jadi tidak bisa didapat dengan menimbun hasil, dan
 *   adil antar komoditas karena harga tidak ikut dihitung.
 * - bintang per kecamatan: dari rekor itu
 */

const KUNCI = "jelajah:gameWilayah:v2";
const KUNCI_LAMA = "jelajah:gameWilayah:v1";

/* xp minimum untuk tiap tingkat (tingkat 1 = indeks 0) */
export const AMBANG_TINGKAT = [0, 250, 700, 1400, 2500, 4000, 6000, 9000];
/* skor panen beruntun untuk bintang 1, 2, 3 */
export const AMBANG_BINTANG = [15, 60, 140];

function baca() {
	try {
		const d = JSON.parse(localStorage.getItem(KUNCI));
		if (d) return d;
		// rekor lama berupa nilai penjualan, tidak sebanding; hanya xp yang dibawa
		const lama = JSON.parse(localStorage.getItem(KUNCI_LAMA)) || {};
		return Object.fromEntries(Object.entries(lama).map(([g, v]) => [g, { xp: v.xp || 0, rekor: {}, bintang: {} }]));
	} catch { return {}; }
}
function tulis(d) {
	try { localStorage.setItem(KUNCI, JSON.stringify(d)); } catch { /* mode privat */ }
}
const dataGame = (d, game) => (d[game] = d[game] || { xp: 0, rekor: {}, bintang: {} });

export function tingkatDari(xp) {
	let t = 1;
	AMBANG_TINGKAT.forEach((a, i) => { if (xp >= a) t = i + 1; });
	return t;
}

export const bintangSkor = (skor) => AMBANG_BINTANG.filter((a) => skor >= a).length;

/** { xp, tingkat, kemajuan 0..1 ke tingkat berikutnya, rekor, bintang, ambangBerikut } */
export function infoGame(game, kecamatan) {
	const g = baca()[game] || {};
	const xp = g.xp || 0;
	const tingkat = tingkatDari(xp);
	const dari = AMBANG_TINGKAT[tingkat - 1], ke = AMBANG_TINGKAT[tingkat];
	const bintang = g.bintang?.[kecamatan] || 0;
	return {
		xp,
		tingkat,
		kemajuan: ke ? (xp - dari) / (ke - dari) : 1,
		rekor: g.rekor?.[kecamatan] || 0,
		bintang,
		ambangBerikut: AMBANG_BINTANG[bintang] ?? null,
	};
}

/** Bintang terbanyak di seluruh kecamatan & game (untuk peta). */
export function bintangKecamatan(kecamatan) {
	const d = baca();
	return Math.max(0, ...Object.values(d).map((g) => g.bintang?.[kecamatan] || 0));
}

export function tambahXpGame(game, nilai) {
	const d = baca();
	const g = dataGame(d, game);
	g.xp = Math.round(g.xp + nilai);
	tulis(d);
}

/** Catat skor panen beruntun; mengembalikan bintang baru bila bertambah. */
export function catatRekor(game, kecamatan, skor) {
	const d = baca();
	const g = dataGame(d, game);
	if (skor <= (g.rekor[kecamatan] || 0)) return { bintangBaru: 0 };
	const lama = g.bintang[kecamatan] || 0;
	const baru = Math.max(lama, bintangSkor(skor));
	g.rekor[kecamatan] = skor;
	g.bintang[kecamatan] = baru;
	tulis(d);
	return { bintangBaru: baru > lama ? baru : 0 };
}

/** Bintang terbanyak tiap kecamatan di semua game: { kecamatan: bintang } (sekali baca penyimpanan). */
export function semuaBintang() {
	const hasil = {};
	for (const g of Object.values(baca())) {
		for (const [kec, b] of Object.entries(g?.bintang || {})) hasil[kec] = Math.max(hasil[kec] || 0, b || 0);
	}
	return hasil;
}

/** Tingkat tiap game: { idGame: tingkat } (sekali baca penyimpanan). */
export function tingkatSemuaGame() {
	return Object.fromEntries(Object.entries(baca()).map(([game, g]) => [game, tingkatDari(g?.xp || 0)]));
}
