// Uji logika klien Jelajah (Bangun Kabupaten) tanpa peramban: modul dibundel dengan esbuild
// lalu dijalankan di Node dengan localStorage tiruan. Jalankan: npm run test:jelajah
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const akar = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/features/jelajah");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uji-jelajah-"));
const impor = (f) => JSON.stringify(path.join(akar, f).split(path.sep).join("/"));

// shim dimuat paling awal: modul permainan membaca localStorage saat diimpor
fs.writeFileSync(
	path.join(tmp, "shim.js"),
	`const isi = new Map();
globalThis.localStorage = {
	getItem: (k) => (isi.has(k) ? isi.get(k) : null),
	setItem: (k, v) => void isi.set(k, String(v)),
	removeItem: (k) => void isi.delete(k),
};
globalThis.window ??= globalThis;
globalThis.document ??= { addEventListener() {}, removeEventListener() {}, visibilityState: "visible" };`,
);
fs.writeFileSync(
	path.join(tmp, "entri.js"),
	`import "./shim.js";
export * as B from ${impor("bangunWilayah.js")};
export * as P from ${impor("pancing.js")};
export * as R from ${impor("rekorWilayah.js")};
export * as K from ${impor("basket.js")};
export * as S from ${impor("jelajahStore.js")};
export { POTENSI } from ${impor("potensiWilayah.js")};`,
);
// pelaporan pemakaian tidak relevan di uji: api diganti rintisan
const rintisApi = {
	name: "rintis-api",
	setup(b) {
		b.onResolve({ filter: /\/api$/ }, () => ({ path: "api", namespace: "rintis" }));
		b.onLoad({ filter: /.*/, namespace: "rintis" }, () => ({ contents: "export default { post: () => Promise.resolve() };", loader: "js" }));
	},
};
const keluar = path.join(tmp, "paket.mjs");
await build({
	entryPoints: [path.join(tmp, "entri.js")],
	bundle: true,
	platform: "node",
	format: "esm",
	outfile: keluar,
	plugins: [rintisApi],
	define: { "import.meta.env.DEV": "true" },
	logLevel: "error",
});
const { B, P, R, K, S, POTENSI } = await import(pathToFileURL(keluar).href);

const nama = Object.keys(POTENSI)[0];
const kosongkanKoin = () => P.bayarKoin(P.ambilKoleksi().poin);
const setBintang = (n) => localStorage.setItem("jelajah:gameWilayah:v2", JSON.stringify({ [POTENSI[nama].game]: { xp: 0, rekor: {}, bintang: { [nama]: n } } }));

// tanpa bintang: ditolak
kosongkanKoin();
P.tambahKoin(10000);
assert.equal(B.naikBumdes(nama).ok, false, "tanpa bintang tidak boleh naik");
assert.equal(B.bangunKec(nama).lv, 0);

// bintang cukup tetapi koin kurang
setBintang(1);
assert.equal(R.semuaBintang()[nama], 1);
kosongkanKoin();
P.tambahKoin(B.TINGKAT_BUMDES[1].biaya - 1);
assert.equal(B.naikBumdes(nama).ok, false, "koin kurang tidak boleh naik");
P.tambahKoin(1);
assert.equal(B.naikBumdes(nama).ok, true);
assert.equal(B.bangunKec(nama).lv, 1);
assert.ok(P.ambilKoleksi().poin < B.TINGKAT_BUMDES[1].biaya, "biaya tingkat 1 dipotong (sisa hanya bonus pencapaian)");

// tingkat 2 butuh dua bintang
kosongkanKoin();
P.tambahKoin(B.TINGKAT_BUMDES[2].biaya);
assert.equal(B.naikBumdes(nama).ok, false, "satu bintang belum cukup untuk tingkat 2");
setBintang(2);
assert.equal(B.naikBumdes(nama).ok, true);
assert.equal(B.bangunKec(nama).lv, 2);

// kas menumpuk paling lama KAS_MAKS_JAM
const asli = Date.now;
const t0 = asli();
Date.now = () => t0 + 3600000;
assert.equal(B.kasTersedia(nama), B.TINGKAT_BUMDES[2].kas, "kas satu jam");
Date.now = () => t0 + 100 * 3600000;
assert.equal(B.kasTersedia(nama), B.KAS_MAKS_JAM * B.TINGKAT_BUMDES[2].kas, "kas dibatasi KAS_MAKS_JAM");
Date.now = asli;

// pesanan harian: deterministik dan hanya bisa selesai sekali
const a = B.pesananHariIni();
const b = B.pesananHariIni();
assert.ok(a.length > 0 && a.length <= 3);
assert.deepEqual(a, b);
assert.ok(a.every((p) => !p.selesai));
const sebelum = B.totalPesanan();
assert.equal(B.selesaikanPesanan(a[0].id), true);
assert.equal(B.selesaikanPesanan(a[0].id), false, "pesanan tidak bisa dua kali");
assert.equal(B.totalPesanan(), sebelum + 1);
assert.equal(B.pesananHariIni()[0].selesai, true);
assert.equal(B.selesaikanPesanan("tidak-ada"), false);

// skorBangun().kec hanya memuat kecamatan dengan tingkat > 0
const { kec } = B.skorBangun();
assert.deepEqual(kec, { [nama]: 2 });

// AUTO: koin kecil, ikan Monster ke atas jauh lebih jarang daripada manual
const hitungBesar = (otomatis, kolam = false) => {
	Object.assign(P.pancing, { otomatis, kolam, perahu: true, sempurna: false });
	let besar = 0;
	for (let i = 0; i < 40000; i++) if (P.pilihIkan(25).ikan.kelas >= (kolam ? 4 : 3)) besar++;
	return besar;
};
assert.ok(P.PENGALI_KOIN_AUTO <= 0.3, "koin AUTO kecil");
const manual = hitungBesar(false);
const auto = hitungBesar(true);
assert.ok(auto < manual * 0.3, `AUTO ${auto} harus jauh di bawah manual ${manual}`);
assert.ok(hitungBesar(true, true) < hitungBesar(false, true) * 0.5, "Legenda di kolam lebih jarang saat AUTO");
Object.assign(P.pancing, { otomatis: false, kolam: false, perahu: false });

// --- basket: peluang terasa, lintasan tepat, laga selalu berakhir, koin hanya dari angka pemain ---
assert.ok(K.peluangPemain(0.8, 3, 0) > 0.9, "rilis sempurna hampir pasti masuk");
assert.ok(K.peluangPemain(0.2, 3, 0) < 0.4, "rilis buruk jauh lebih sering meleset");
assert.ok(K.peluangPemain(0.8, 3, 1) < K.peluangPemain(0.8, 3, 0), "dijaga menurunkan peluang");
{
	const a = { x: -58, y: 2.15, z: 18 };
	const T = 1.1;
	const v = K.lintasan(a, K.RIM[0], T);
	assert.ok(Math.abs(a.y + v.vy * T - 4.9 * T * T - K.RIM[0].y) < 1e-9, "parabola tiba setinggi ring");
}
const lagaBot = (kerja) => {
	const koinAwal = P.ambilKoleksi().poin;
	K.mulaiBasket();
	S.kendali.teleport = null;
	Object.assign(S.posisi, { x: -58, z: 20.5, rot: Math.PI, udara: false });
	let t = 0;
	while (K.basket.fase !== "selesai" && t < 400) {
		kerja(K.basket);
		K.majukanBasket(1 / 30);
		t += 1 / 30;
	}
	assert.equal(K.basket.fase, "selesai", "laga berakhir");
	assert.ok(K.basket.skor.pemain !== K.basket.skor.lawan, "tidak ada hasil seri");
	assert.equal(P.ambilKoleksi().poin - koinAwal, K.basket.koinLaga, "koin dompet = koin laga");
	const hasil = { ...K.basket.skor, koin: K.basket.koinLaga, menang: K.basket.pemenang === "pemain" };
	K.tutupBasket();
	return hasil;
};
// bot rajin: mendekati ring lawan bola, melepas tepat di zona; merebut dan mengejar bola lepas
const botRajin = (b) => {
	const p = S.posisi;
	const tuju = (x, z) => {
		const d = Math.hypot(x - p.x, z - p.z) || 1;
		const s = Math.min(d, (b.bidik ? 0 : 5) / 30);
		p.x += ((x - p.x) / d) * s;
		p.z += ((z - p.z) / d) * s;
	};
	if (b.pegang === "pemain") {
		if (b.bidik) {
			if (b.isi >= 0.78) K.lepasAksi();
		} else if (Math.hypot(K.RIM[0].x - p.x, K.RIM[0].z - p.z) < 3.5) K.tekanAksi();
		else tuju(K.RIM[0].x, K.RIM[0].z);
	} else if (b.pegang === "lawan") {
		tuju(b.lawan.x, b.lawan.z);
		K.tekanAksi();
	} else if (b.bola.mode === "bebas") tuju(b.bola.x, b.bola.z);
};
const hasilRajin = Array.from({ length: 30 }, () => lagaBot(botRajin));
const menangRajin = hasilRajin.filter((h) => h.menang).length;
assert.ok(hasilRajin.every((h) => h.pemain % 1 === 0 && h.koin >= h.pemain * 3), "koin bertambah sesuai angka");
assert.ok(menangRajin >= 18, `pemain yang rapi harus lebih sering menang (${menangRajin}/30)`);
assert.ok(menangRajin < 30 || hasilRajin.some((h) => h.lawan > 0), "lawan tetap sempat mencetak");
// bot biasa: lebih lambat, sering meleset dari zona, jarang merebut: lawan harus jadi tantangan nyata
const botBiasa = (b) => {
	const p = S.posisi;
	const tuju = (x, z) => {
		const d = Math.hypot(x - p.x, z - p.z) || 1;
		const s = Math.min(d, (b.bidik ? 0 : 3.6) / 30);
		p.x += ((x - p.x) / d) * s;
		p.z += ((z - p.z) / d) * s;
	};
	if (b.pegang === "pemain") {
		if (b.bidik) {
			b.lepasDi ??= Math.random() < 0.5 ? 0.78 : 0.45 + Math.random() * 0.7;
			if (b.isi >= b.lepasDi) {
				K.lepasAksi();
				b.lepasDi = null;
			}
		} else if (Math.hypot(K.RIM[0].x - p.x, K.RIM[0].z - p.z) < 5) K.tekanAksi();
		else tuju(K.RIM[0].x, K.RIM[0].z);
	} else if (b.pegang === "lawan") {
		tuju(b.lawan.x, b.lawan.z);
		if (Math.random() < 0.03) K.tekanAksi();
	} else if (b.bola.mode === "bebas") tuju(b.bola.x, b.bola.z);
};
const hasilBiasa = Array.from({ length: 30 }, () => lagaBot(botBiasa));
const menangBiasa = hasilBiasa.filter((h) => h.menang).length;
const rata = (d, k) => (d.reduce((a, h) => a + h[k], 0) / d.length).toFixed(1);
console.log(`basket: rajin ${rata(hasilRajin, "pemain")}:${rata(hasilRajin, "lawan")}; biasa menang ${menangBiasa}/30, ${rata(hasilBiasa, "pemain")}:${rata(hasilBiasa, "lawan")}, koin ${rata(hasilBiasa, "koin")}`);
assert.ok(menangBiasa >= 3 && menangBiasa <= 27, `pemain biasa harus bisa menang & kalah (${menangBiasa}/30)`);
// bot diam: lawan harus mengambil bola dan menang
const hasilDiam = lagaBot(() => {});
assert.ok(!hasilDiam.menang && hasilDiam.koin === 0, "diam saja = kalah tanpa koin");
console.log(`basket: bot rajin menang ${menangRajin}/30, contoh skor ${hasilRajin[0].pemain}:${hasilRajin[0].lawan}, koin ${hasilRajin[0].koin}; diam ${hasilDiam.pemain}:${hasilDiam.lawan}`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log("uji-jelajah: semua lulus");
