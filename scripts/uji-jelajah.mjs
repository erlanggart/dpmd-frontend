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
const { B, P, R, POTENSI } = await import(pathToFileURL(keluar).href);

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

fs.rmSync(tmp, { recursive: true, force: true });
console.log("uji-jelajah: semua lulus");
