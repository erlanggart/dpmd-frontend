import { useSyncExternalStore } from "react";
import { diSitu, jarakKeTepi, perahuBebas } from "./scene/situ";
import { suasana } from "./scene/suasana";
import { hentikanJingle, putarJingle } from "./musikJelajah";
import { suara } from "./suaraPancing";

// Game memancing di Situ Pemda. Logika murni (tanpa React/three): Pancingan.jsx memanggil
// `tickPancing` tiap frame, GamePancing.jsx membaca `pancing` untuk HUD.
//
// Alur: siap (bidik & tahan untuk mengayun) → lempar → tunggu (ada colekan palsu) →
// gigit (ketuk tepat waktu!) → tarik (KETUK berulang untuk menggulung — ditahan tidak
// menggulung; jaga tegangan senar, lawan arah lari ikan, berhenti mengetuk saat ikan
// lari/melompat/menyetrum) → dapat. Gagal → kembali siap.

// ---------- ikan ----------

// zona = rentang tegangan "pas" (makin sempit makin sulit); regen = tenaga ikan pulih per
// detik saat senar kendor; lari = peluang per detik ikan kabur menarik senar.
export const KELAS = [
	{ nama: "Biasa", warna: "#94a3b8", bobot: 60, tenaga: 0.5, stamina: 5, sentak: 0.14, reaksi: 1.0, poin: 10, zona: [0.32, 0.92], regen: 0, lari: 0.04, colek: 2 },
	{ nama: "Langka", warna: "#3b82f6", bobot: 26, tenaga: 0.75, stamina: 9, sentak: 0.24, reaksi: 0.85, poin: 25, zona: [0.38, 0.9], regen: 0.25, lari: 0.1, colek: 3 },
	{ nama: "Epik", warna: "#a855f7", bobot: 10, tenaga: 0.98, stamina: 15, sentak: 0.32, reaksi: 0.68, poin: 60, zona: [0.44, 0.87], regen: 0.5, lari: 0.16, colek: 4 },
	{ nama: "Monster", warna: "#ef4444", bobot: 2.6, tenaga: 1.2, stamina: 23, sentak: 0.42, reaksi: 0.55, poin: 120, zona: [0.5, 0.84], regen: 0.8, lari: 0.22, colek: 5 },
	{ nama: "Legenda", warna: "#f59e0b", bobot: 0.4, tenaga: 1.42, stamina: 26, sentak: 0.48, reaksi: 0.45, poin: 300, zona: [0.54, 0.82], regen: 0.8, lari: 0.24, colek: 6 },
];

// bentuk: tinggi/lebar badan relatif panjang; ekor "garpu" | "bulat" | "pisau" | "belut".
// k = faktor gemuk Fulton (berat g = k · panjang cm³ / 100) untuk menghitung panjang.
export const IKAN = [
	{ id: "nila", nama: "Nila", latin: "Oreochromis niloticus", kelas: 0, kg: [0.2, 1.3], k: 1.6, warna: { punggung: "#5b6b62", perut: "#c9cfc4", sirip: "#7c5a5a" }, bentuk: { tinggi: 0.42, lebar: 0.16, ekor: "bulat", belang: true }, kisah: "Penghuni paling ramah Situ Pemda. Hampir semua pemancing di sini memulai dari nila." },
	{ id: "mujair", nama: "Mujair", latin: "Oreochromis mossambicus", kelas: 0, kg: [0.15, 0.8], k: 1.7, warna: { punggung: "#3f4a45", perut: "#a9b3a5", sirip: "#4b3b3b" }, bentuk: { tinggi: 0.44, lebar: 0.17, ekor: "bulat" }, kisah: "Sepupu nila yang lebih gelap dan lebih rakus. Sering menyambar umpan duluan." },
	{ id: "tawes", nama: "Tawes", latin: "Barbonymus gonionotus", kelas: 0, kg: [0.2, 1.1], k: 1.4, warna: { punggung: "#8a8f7a", perut: "#e8e4d0", sirip: "#d6b25a" }, bentuk: { tinggi: 0.36, lebar: 0.13, ekor: "garpu" }, kisah: "Sisiknya berkilau keperakan saat diangkat dari air." },
	{ id: "lele", nama: "Lele", latin: "Clarias batrachus", kelas: 0, kg: [0.3, 2.6], k: 0.75, warna: { punggung: "#3a3328", perut: "#8f8572", sirip: "#2e2820" }, bentuk: { tinggi: 0.2, lebar: 0.18, ekor: "bulat", kumis: true }, kisah: "Licin dan berkumis. Bersembunyi di lumpur dasar situ." },
	{ id: "mas", nama: "Ikan Mas", latin: "Cyprinus carpio", kelas: 1, kg: [1, 7], k: 1.7, warna: { punggung: "#d97706", perut: "#fbbf24", sirip: "#ea580c" }, bentuk: { tinggi: 0.4, lebar: 0.17, ekor: "garpu", kumis: true }, kisah: "Ikan mas keemasan, lambang rezeki. Tarikannya panjang dan kuat." },
	{ id: "gurame", nama: "Gurame", latin: "Osphronemus goramy", kelas: 1, kg: [1, 5.5], k: 2.0, warna: { punggung: "#7b6d6d", perut: "#e3c9c9", sirip: "#9b7b6b" }, bentuk: { tinggi: 0.55, lebar: 0.15, ekor: "bulat" }, kisah: "Bertubuh lebar dan tenang, tapi pantang menyerah begitu kail tertancap." },
	{ id: "patin", nama: "Patin", latin: "Pangasius hypophthalmus", kelas: 1, kg: [2, 12], k: 1.0, warna: { punggung: "#5d6b78", perut: "#dfe5ea", sirip: "#6b7785" }, bentuk: { tinggi: 0.27, lebar: 0.15, ekor: "garpu", kumis: true }, kisah: "Perenang cepat dari perairan dalam. Larinya bisa menghabiskan senar." },
	{ id: "toman", nama: "Toman Raksasa", latin: "Channa micropeltes", kelas: 2, kg: [4, 19], k: 0.9, warna: { punggung: "#2f3b2a", perut: "#c7a46a", sirip: "#b4532a" }, bentuk: { tinggi: 0.24, lebar: 0.16, ekor: "bulat", belang: true }, sifat: { lompat: true }, kisah: "Predator ganas bergigi tajam. Suka melompat menyentak kail." },
	{ id: "belida", nama: "Belida", latin: "Chitala lopis", kelas: 2, kg: [3, 13], k: 0.7, warna: { punggung: "#8b8f98", perut: "#e7e9ee", sirip: "#9aa0aa" }, bentuk: { tinggi: 0.32, lebar: 0.1, ekor: "pisau", tutul: true }, kisah: "Ikan pisau bertutul yang langka. Gerakannya meliuk seperti pita." },
	{ id: "arapaima", nama: "Arapaima Purba", latin: "Arapaima gigas", kelas: 3, kg: [40, 165], k: 0.95, warna: { punggung: "#3e4a3a", perut: "#9aa38c", sirip: "#b91c1c" }, bentuk: { tinggi: 0.22, lebar: 0.17, ekor: "bulat", sisikMerah: true }, sifat: { lompat: true }, syarat: { jauh: 10 }, kisah: "Raksasa bersisik merah dari zaman purba. Konon lepas dari kolam kolektor dan tumbuh liar di situ." },
	{ id: "siluman", nama: "Lele Siluman", latin: "Clarias phantasma", kelas: 3, kg: [30, 95], k: 0.8, warna: { punggung: "#111317", perut: "#3a3f47", sirip: "#0b0c0f" }, bentuk: { tinggi: 0.2, lebar: 0.2, ekor: "bulat", kumis: true, mataNyala: "#39ff88" }, syarat: { malam: true, jauh: 8 }, kisah: "Hanya muncul saat malam. Matanya menyala hijau di bawah permukaan air." },
	{ id: "belut", nama: "Belut Listrik Raksasa", latin: "Electrophorus voltai", kelas: 3, kg: [15, 45], k: 0.22, warna: { punggung: "#2c3530", perut: "#e0a53a", sirip: "#1e2622" }, bentuk: { tinggi: 0.09, lebar: 0.09, ekor: "belut" }, sifat: { setrum: true }, syarat: { jauh: 14 }, kisah: "Menyimpan listrik ratusan volt. Lepaskan gulungan saat ia menyetrum!" },
	{ id: "arwana", nama: "Arwana Naga Emas", latin: "Scleropages aureus", kelas: 4, kg: [8, 28], k: 1.05, warna: { punggung: "#b8860b", perut: "#ffe08a", sirip: "#d4380d" }, bentuk: { tinggi: 0.26, lebar: 0.12, ekor: "bulat", kumis: true, kilau: true }, sifat: { lompat: true }, syarat: { jauh: 12, sempurna: true }, kisah: "Ikan naga pembawa keberuntungan. Sisik emasnya memantulkan cahaya seperti api." },
	{ id: "raja", nama: "Raja Situ", latin: "Rex situensis", kelas: 4, kg: [220, 480], k: 1.5, warna: { punggung: "#1f3d2b", perut: "#6f8a5b", sirip: "#7f1d1d" }, bentuk: { tinggi: 0.38, lebar: 0.22, ekor: "garpu", duri: true, kumis: true, mataNyala: "#ff3b3b" }, sifat: { lompat: true, setrum: false }, syarat: { perahu: true, jauh: 20 }, kisah: "Penguasa Situ Pemda yang hanya jadi cerita pemancing tua. Hanya mau melawan dari perahu, jauh di tengah situ." },
];
export const IKAN_PER_ID = Object.fromEntries(IKAN.map((i) => [i.id, i]));

export const panjangCm = (ikan, kg) => Math.round(Math.cbrt((100 * kg * 1000) / ikan.k));

export function syaratTeks(ikan) {
	const s = ikan.syarat || {};
	const t = [];
	if (s.malam) t.push("hanya malam hari");
	if (s.perahu) t.push("hanya dari perahu");
	if (s.jauh) t.push(`perairan dalam (≥ ${s.jauh} m dari tepi)`);
	if (s.sempurna) t.push("hanya dengan lemparan sempurna");
	return t.join(", ");
}

// ---------- koleksi (tersimpan di perangkat) ----------

const KUNCI = "jelajah-pancing-v1";
function bacaSimpanan() {
	try {
		const d = JSON.parse(localStorage.getItem(KUNCI));
		if (d && typeof d === "object") return { koleksi: d.koleksi || {}, poin: d.poin || 0, tangkapan: d.tangkapan || 0 };
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return { koleksi: {}, poin: 0, tangkapan: 0 };
}
let simpanan = bacaSimpanan();
const pendengarKoleksi = new Set();
function simpan() {
	try {
		localStorage.setItem(KUNCI, JSON.stringify(simpanan));
	} catch {
		/* abaikan */
	}
	simpanan = { ...simpanan };
	pendengarKoleksi.forEach((f) => f());
}
// Koin = poin hasil memancing, dibelanjakan di minimarket depan kantor.
export function bayarKoin(n) {
	if (simpanan.poin < n) return false;
	simpanan.poin -= n;
	simpan();
	return true;
}
export const useKoleksi = () =>
	useSyncExternalStore(
		(f) => (pendengarKoleksi.add(f), () => pendengarKoleksi.delete(f)),
		() => simpanan,
	);

// ---------- keadaan permainan ----------

export const FASE_PANCING = ["siap", "lempar", "tunggu", "gigit", "tarik", "dapat", "gagal"];

export const pancing = {
	aktif: false,
	perahu: false,
	asal: { x: 0, z: 0, rot: 0 }, // posisi pemancing & arah hadap dasar
	aim: 0, // putaran bidikan relatif arah hadap
	fase: "siap",
	t: 0,
	// masukan dari UI: tahan (mengayun lemparan), ketukan (jumlah tekan-lepas), arah
	tahan: false,
	ketukan: 0,
	arah: 0,
	gulung: 0, // laju mengetuk yang dihaluskan, 0..1+
	// siap / lempar
	tenaga: 0,
	sempurna: false,
	pelampung: { x: 0, y: 0, z: 0 },
	dari: { x: 0, y: 0, z: 0 },
	tujuan: { x: 0, z: 0 },
	durasiLempar: 1,
	// tunggu / gigit
	tungguSampai: 0,
	colekan: [],
	colekBunyi: -1,
	colek: false,
	jendela: 1,
	// tarik
	ikan: null,
	kg: 0,
	jarak: 0,
	tegang: 0,
	bahaya: 0,
	stamina: 1,
	staminaMaks: 1,
	arahIkan: 1,
	gantiArah: 0,
	samping: 0,
	sentak: 0,
	amuk: 0,
	amukTahap: 0,
	peristiwa: null, // { jenis: "lompat" | "setrum", t, dur, lepas }
	ikanPos: { x: 0, z: 0 },
	getar: 0,
	// hasil
	hasil: null,
	pesan: null, // { teks, jenis: "info" | "baik" | "buruk" | "besar" }
	cipratan: [], // [{ x, z, besar, t0 }] dikonsumsi Pancingan.jsx
};

let versi = 0;
const pendengar = new Set();
function beritahu() {
	versi++;
	pendengar.forEach((f) => f());
}
// Render ulang UI hanya saat fase/pesan/hasil berubah; batang-batang dibaca langsung per frame.
export const usePancing = () =>
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => versi,
	);

const acak = (a, b) => a + Math.random() * (b - a);
const malam = () => suasana.malam > 0.5;

// Satu tekan-lepas tombol (Spasi / tombol 🎣). Dihitung sendiri, bukan dari `tahan`,
// supaya ketukan cepat yang jatuh di antara dua frame tidak hilang.
export const ketuk = () => pancing.ketukan++;

function keFase(f, pesan) {
	pancing.fase = f;
	pancing.t = 0;
	if (pesan !== undefined) pancing.pesan = pesan;
	beritahu();
}
function pesanSaja(teks, jenis = "info") {
	pancing.pesan = { teks, jenis, id: versi + 1 };
	beritahu();
}
function percik(x, z, besar = 1) {
	pancing.cipratan.push({ x, z, besar, t0: performance.now() / 1000 });
	if (pancing.cipratan.length > 12) pancing.cipratan.shift();
}

const arahLempar = () => pancing.asal.rot + pancing.aim;
// Ujung joran kira-kira 1,4 m di depan pemancing.
export function ujungJoran() {
	const a = arahLempar();
	return { x: pancing.asal.x + Math.sin(a) * 1.4, z: pancing.asal.z + Math.cos(a) * 1.4 };
}

export function mulaiPancing({ x, z, rot, perahu }) {
	Object.assign(pancing, { aktif: true, perahu: !!perahu, asal: { x, z, rot }, aim: 0, tahan: false, arah: 0, hasil: null, ikan: null, cipratan: [] });
	keFase("siap", { teks: "Tahan untuk mengayun joran, lepas untuk melempar", jenis: "info" });
}

export function berhentiPancing() {
	hentikanJingle();
	pancing.aktif = false;
	pancing.ikan = null;
	pancing.hasil = null;
	keFase("siap", null);
}

// Pemain mengayuh perahu / bergeser: posisi pemancing ikut.
export const geserAsal = (x, z, rot) => Object.assign(pancing.asal, { x, z, rot });

export function lanjutPancing() {
	pancing.hasil = null;
	pancing.ikan = null;
	keFase("siap", { teks: "Lempar lagi! Makin jauh ke tengah, makin besar ikannya", jenis: "info" });
}

function gagal(teks) {
	suara("lepas");
	pancing.ikan = null;
	keFase("gagal", { teks, jenis: "buruk" });
}

// ---------- memilih ikan saat menyambar ----------

function pilihIkan(jauh) {
	const m = malam();
	const kali = [1, 1, 1, 1, 1];
	const kalikan = (arr) => arr.forEach((v, i) => (kali[i] *= v));
	if (jauh > 18) kalikan([0.8, 1, 1.4, 2.2, 2.6]);
	else if (jauh > 10) kalikan([0.9, 1, 1.2, 1.5, 1.6]);
	else kalikan([1, 1, 0.9, 0.6, 0.45]);
	if (m) kalikan([1, 1, 1.2, 1.8, 1.6]);
	if (pancing.perahu) kalikan([1, 1, 1.1, 1.3, 1.5]);
	if (pancing.sempurna) kalikan([1, 1, 1.25, 1.5, 1.6]);
	const layak = (ikan) => {
		const s = ikan.syarat || {};
		return (!s.malam || m) && (!s.perahu || pancing.perahu) && (!s.jauh || jauh >= s.jauh) && (!s.sempurna || pancing.sempurna);
	};
	const bobot = KELAS.map((k, i) => (IKAN.some((f) => f.kelas === i && layak(f)) ? k.bobot * kali[i] : 0));
	let r = Math.random() * bobot.reduce((a, b) => a + b, 0);
	let kelas = 0;
	for (let i = 0; i < bobot.length; i++) {
		if ((r -= bobot[i]) <= 0) {
			kelas = i;
			break;
		}
	}
	const calon = IKAN.filter((f) => f.kelas === kelas && layak(f));
	const ikan = calon[Math.floor(Math.random() * calon.length)];
	// berat condong ke ringan; ekor beratnya jarang
	const kg = ikan.kg[0] + (ikan.kg[1] - ikan.kg[0]) * Math.pow(Math.random(), 2.2);
	return { ikan, kg: Math.round(kg * 100) / 100 };
}

// ---------- tick ----------

let tahanLalu = false;
let ketukanLalu = 0;

export function tickPancing(dt) {
	const p = pancing;
	if (!p.aktif) return;
	p.t += dt;
	const ketukBaru = p.ketukan - ketukanLalu;
	ketukanLalu = p.ketukan;
	const tekan = ketukBaru > 0 || (p.tahan && !tahanLalu); // baru ditekan
	const lepas = !p.tahan && tahanLalu;
	tahanLalu = p.tahan;
	p.getar = Math.max(0, p.getar - dt * 2.5);
	const o = ujungJoran();

	if (p.fase === "siap") {
		// bidik dengan kiri/kanan
		const batas = p.perahu ? 1.3 : 1.05;
		p.aim = Math.max(-batas, Math.min(batas, p.aim - p.arah * dt * 1.1));
		if (p.tahan) {
			// tenaga naik-turun: tahan di puncak untuk lemparan sempurna
			p.tenaga = 1 - Math.abs(((p.t * 0.85) % 2) - 1);
			if (tekan) {
				p.t = 0;
				p.tenaga = 0;
				suara("ayun");
			}
		} else if (lepas && p.tenaga > 0.04) {
			let d = 4 + p.tenaga * 17;
			const a = arahLempar();
			const ok = (dd) => {
				const x = o.x + Math.sin(a) * dd;
				const z = o.z + Math.cos(a) * dd;
				return perahuBebas(x, z, 0.2);
			};
			while (d > 3 && !ok(d)) d -= 0.5;
			if (d <= 3) {
				p.tenaga = 0;
				pesanSaja("Terlalu dekat tepi atau dermaga — putar arah lemparan (◀ ▶)", "buruk");
				return;
			}
			p.sempurna = p.tenaga > 0.93;
			p.tujuan = { x: o.x + Math.sin(a) * d, z: o.z + Math.cos(a) * d };
			p.dari = { x: o.x, y: 2.6, z: o.z };
			p.durasiLempar = 0.45 + d * 0.035;
			p.tenaga = 0;
			suara("lempar");
			keFase("lempar", p.sempurna ? { teks: "LEMPARAN SEMPURNA! Ikan besar lebih mungkin datang", jenis: "baik" } : null);
		} else if (!p.tahan) p.tenaga = 0;
		return;
	}

	if (p.fase === "lempar") {
		const f = Math.min(1, p.t / p.durasiLempar);
		p.pelampung.x = p.dari.x + (p.tujuan.x - p.dari.x) * f;
		p.pelampung.z = p.dari.z + (p.tujuan.z - p.dari.z) * f;
		p.pelampung.y = p.dari.y * (1 - f) + Math.sin(f * Math.PI) * (2 + p.durasiLempar * 2);
		if (f >= 1) {
			p.pelampung.y = 0;
			percik(p.tujuan.x, p.tujuan.z, 0.6);
			suara("cebur");
			const calon = pilihIkan(jarakKeTepi(p.tujuan.x, p.tujuan.z));
			p.ikanTunggu = calon;
			const kls = KELAS[calon.ikan.kelas];
			const cepat = (malam() ? 0.85 : 1) * (p.sempurna ? 0.8 : 1) * (1 + calon.ikan.kelas * 0.3);
			p.tungguSampai = acak(2.5, 7.5) * cepat;
			const n = Math.floor(Math.random() * (kls.colek + 1));
			p.colekBunyi = -1;
			p.colekan = Array.from({ length: n }, () => acak(0.8, p.tungguSampai - 0.6)).sort((a, b) => a - b);
			keFase("tunggu", { teks: "Tunggu pelampung tenggelam… jangan tergoda colekan!", jenis: "info" });
		}
		return;
	}

	if (p.fase === "tunggu") {
		const i = p.colekan.findIndex((c) => p.t > c && p.t < c + 0.35);
		p.colek = i >= 0;
		if (p.colek && p.colekBunyi !== i) {
			p.colekBunyi = i;
			suara("colek");
		}
		if (tekan) {
			if (p.colek) return gagal("Terlalu cepat! Ikannya cuma mencolek lalu kabur");
			suara("gulung");
			return keFase("siap", { teks: "Senar digulung. Lempar lagi!", jenis: "info" });
		}
		if (p.t >= p.tungguSampai) {
			const { ikan, kg } = p.ikanTunggu || pilihIkan(jarakKeTepi(p.pelampung.x, p.pelampung.z));
			p.ikan = ikan;
			p.kg = kg;
			p.jendela = KELAS[ikan.kelas].reaksi;
			percik(p.pelampung.x, p.pelampung.z, 0.8 + ikan.kelas * 0.3);
			suara("sambar");
			try {
				navigator.vibrate?.(ikan.kelas >= 3 ? [80, 40, 120] : 60);
			} catch {
				/* tidak didukung */
			}
			keFase("gigit", { teks: "SAMBAR! Tekan sekarang!", jenis: "besar" });
		}
		return;
	}

	if (p.fase === "gigit") {
		if (tekan) {
			const k = KELAS[p.ikan.kelas];
			const besar = (p.kg - p.ikan.kg[0]) / (p.ikan.kg[1] - p.ikan.kg[0] || 1);
			p.staminaMaks = k.stamina * (0.75 + 0.5 * besar);
			p.stamina = p.staminaMaks;
			p.jarak = Math.hypot(p.pelampung.x - o.x, p.pelampung.z - o.z) + 2;
			p.tegang = 0.35;
			p.bahaya = 0;
			p.arahIkan = Math.random() < 0.5 ? -1 : 1;
			p.gantiArah = acak(1.5, 3);
			p.samping = 0;
			p.sentak = 0;
			p.amuk = 0;
			p.amukTahap = 0;
			p.peristiwa = null;
			p.lari = 0;
			p.pulih = false;
			p.gulung = 0;
			p.ikanPos = { x: p.pelampung.x, z: p.pelampung.z };
			p.getar = 0.4;
			suara("kail");
			const teks = p.ikan.kelas >= 3 ? "Sesuatu yang SANGAT BESAR menarik senar!" : p.ikan.kelas === 2 ? "Tarikannya kuat sekali! Ketuk berulang untuk menggulung" : "Kena! Ketuk berulang untuk menggulung";
			return keFase("tarik", { teks, jenis: p.ikan.kelas >= 3 ? "besar" : "baik" });
		}
		if (p.t > p.jendela) return gagal("Kurang cepat — ikannya melepas umpan");
		return;
	}

	if (p.fase === "tarik") return tarik(dt, o, ketukBaru);

	if (p.fase === "gagal" && p.t > 1.8) keFase("siap", { teks: "Tahan untuk mengayun joran, lepas untuk melempar", jenis: "info" });
}

function tarik(dt, o, ketukBaru) {
	const p = pancing;
	const k = KELAS[p.ikan.kelas];
	const sisa = p.stamina / p.staminaMaks;
	const sifat = p.ikan.sifat || {};
	const [zonaBawah, zonaAtas] = k.zona;
	// laju mengetuk: tiap ketukan menambah, meluruh ±1 detik bila berhenti (±7 ketukan/dtk ≈ 1)
	p.gulung = Math.min(1.3, p.gulung * Math.exp(-2.4 * dt) + ketukBaru * 0.3);
	const gl = Math.min(1, p.gulung);
	const menggulung = gl > 0.25;
	for (let i = 0; i < Math.min(ketukBaru, 2); i++) suara("klik");

	// --- ikan berganti arah lari ---
	p.gantiArah -= dt;
	if (p.gantiArah <= 0) {
		p.arahIkan = -p.arahIkan;
		p.gantiArah = acak(1.2, 3.2) * (1.2 - p.ikan.kelas * 0.12);
	}
	// --- sentakan kepala ---
	if (p.sentak > 0) p.sentak -= dt;
	else if (Math.random() < k.sentak * (p.amuk > 0 ? 2 : 1) * dt) {
		p.sentak = acak(0.5, 1.0);
		p.getar = Math.max(p.getar, 0.35);
		suara("sentak");
	}
	// --- ikan LARI: menarik senar jauh; gulungan harus dilepas ---
	if (p.lari > 0) {
		p.lari -= dt;
		if (Math.random() < dt * 14) suara("klik");
	} else if (!p.peristiwa && Math.random() < k.lari * (p.amuk > 0 ? 1.8 : 1) * (0.35 + 0.65 * sisa) * dt) {
		p.lari = acak(1.0, 2.0) * (0.7 + 0.6 * sisa);
		p.getar = Math.max(p.getar, 0.5);
		suara("lari");
		pesanSaja("IKAN LARI! Berhenti mengetuk, biarkan senar keluar", "besar");
	}
	// --- amukan monster di 2/3 & 1/3 tenaga ---
	if (p.ikan.kelas >= 3 && p.amukTahap < 2 && sisa < (p.amukTahap === 0 ? 0.66 : 0.33)) {
		p.amukTahap++;
		p.amuk = 3.5;
		p.getar = 1;
		suara("amuk");
		pesanSaja(`${p.ikan.nama.toUpperCase()} MENGAMUK! Jaga tegangan!`, "besar");
	}
	if (p.amuk > 0) p.amuk -= dt;
	// --- lompat / setrum: lepaskan gulungan! ---
	if (p.peristiwa) {
		const e = p.peristiwa;
		e.t += dt;
		if (!menggulung) e.lepas += dt;
		if (e.t >= e.dur) {
			if (e.lepas / e.dur > 0.65) {
				p.stamina -= p.staminaMaks * 0.12;
				pesanSaja(e.jenis === "lompat" ? "Bagus! Ikan kelelahan setelah melompat" : "Selamat dari setrum! Ikan melemah", "baik");
			}
			p.peristiwa = null;
		}
	} else if (p.lari <= 0 && sisa < 0.85 && ((sifat.lompat && Math.random() < 0.09 * dt) || (sifat.setrum && Math.random() < 0.13 * dt))) {
		const jenis = sifat.setrum ? "setrum" : "lompat";
		p.peristiwa = { jenis, t: 0, dur: jenis === "lompat" ? 1.1 : 1.0, lepas: 0 };
		p.getar = Math.max(p.getar, 0.6);
		if (jenis === "lompat") percik(p.ikanPos.x, p.ikanPos.z, 1.3 + p.ikan.kelas * 0.2);
		suara(jenis);
		pesanSaja(jenis === "lompat" ? "IKAN MELOMPAT! Berhenti mengetuk!" : "SETRUM! Berhenti mengetuk!", "besar");
	}

	// --- gaya tarik ikan: makin lelah makin lemah; berlari jauh lebih kuat ---
	const tarikan = k.tenaga * (0.4 + 0.6 * sisa) * (p.sentak > 0 ? 1.6 : 1) * (p.lari > 0 ? 2.0 : 1) * (p.amuk > 0 ? 1.3 : 1);
	const lawan = p.arah !== 0 && Math.sign(p.arah) === -p.arahIkan;
	const ikut = p.arah !== 0 && Math.sign(p.arah) === p.arahIkan;

	// --- tegangan senar (dengan getaran kepala ikan yang menggeleng) ---
	let target = tarikan * 0.14 + gl * (0.25 + tarikan * 0.45);
	if (lawan) target -= 0.1;
	if (ikut) target += 0.12;
	if (p.peristiwa && menggulung) target += 0.9 * gl;
	p.tegang += (target - p.tegang) * (1 - Math.exp(-4 * dt));
	p.geleng = Math.sin(p.t * 13.7) * Math.sin(p.t * 3.1) * k.tenaga * 0.07 * (menggulung ? 1 : 0.4);
	const tegangan = p.tegang + p.geleng;

	// --- panjang senar: menggulung melawan tarikan; dilepas = senar ditarik keluar (rem senar) ---
	p.jarak -= gl * (1.6 + 1.6 * (1 - sisa)) * (1 - 0.6 * sisa) * (tegangan > 1 ? 0.2 : 1) * (p.lari > 0 ? 0.3 : 1) * dt;
	p.jarak += tarikan * (1.0 - 0.7 * gl) * 0.8 * dt;

	// --- tenaga ikan: terkuras di zona pas, pulih bila senar kendor ---
	p.pulih = false;
	if (menggulung && tegangan >= zonaBawah) {
		const diZona = tegangan <= zonaAtas;
		p.stamina -= (diZona ? 1 : 1.25) * (lawan ? 1.6 : 1) * (0.4 + 0.6 * gl) * dt;
	} else if (tegangan < zonaBawah * 0.85 && k.regen > 0 && sisa < 1) {
		p.stamina = Math.min(p.staminaMaks, p.stamina + k.regen * dt);
		p.pulih = true;
	}
	p.stamina = Math.max(0, p.stamina);

	// --- putus / habis senar / dapat ---
	if (tegangan >= 1) p.bahaya += dt * (p.lari > 0 ? 1.6 : 1);
	else p.bahaya = Math.max(0, p.bahaya - dt * 0.8);
	if (p.bahaya > 0.75) {
		suara("putus");
		return gagal(p.ikan.kelas >= 3 ? `Senar putus! ${p.ikan.nama} kembali ke kedalaman…` : "Senar putus! Tegangan terlalu tinggi");
	}
	if (p.jarak > 45) return gagal("Senar habis tertarik — ikannya kabur");

	// --- posisi ikan di air (untuk percikan & pelampung) ---
	const a = arahLempar();
	const tujuanSamping = p.arahIkan * Math.min(6, p.jarak * 0.38);
	p.samping += Math.sign(tujuanSamping - p.samping) * Math.min(Math.abs(tujuanSamping - p.samping), (p.lari > 0 ? 3 : 1.6) * dt);
	const x = o.x + Math.sin(a) * p.jarak + Math.cos(a) * p.samping;
	const z = o.z + Math.cos(a) * p.jarak - Math.sin(a) * p.samping;
	if (diSitu(x, z)) p.ikanPos = { x, z };
	else {
		p.arahIkan = -p.arahIkan;
		p.jarak = Math.min(p.jarak, Math.hypot(p.ikanPos.x - o.x, p.ikanPos.z - o.z));
	}
	if (Math.random() < dt * (1 + p.tegang * 2 + (p.lari > 0 ? 4 : 0))) percik(p.ikanPos.x, p.ikanPos.z, 0.35 + p.ikan.kelas * 0.12);

	if (p.jarak <= 2.2) dapat();
}

function dapat() {
	const p = pancing;
	const ikan = p.ikan;
	const lama = simpanan.koleksi[ikan.id];
	const baru = !lama;
	const rekor = !baru && p.kg > lama.terberat;
	// poin tumbuh dengan akar berat: ikan monster tetap jauh lebih berharga, tapi tidak meledak
	const poin = Math.round(KELAS[ikan.kelas].poin * (1 + Math.sqrt(p.kg)) * (p.sempurna ? 1.2 : 1));
	simpanan.koleksi = {
		...simpanan.koleksi,
		[ikan.id]: { jumlah: (lama?.jumlah || 0) + 1, terberat: Math.max(lama?.terberat || 0, p.kg), pertama: lama?.pertama || Date.now() },
	};
	simpanan.poin += poin;
	simpanan.tangkapan += 1;
	simpan();
	p.hasil = { ikan, kg: p.kg, cm: panjangCm(ikan, p.kg), baru, rekor, poin, total: simpanan.poin };
	percik(p.ikanPos.x, p.ikanPos.z, 1.4 + ikan.kelas * 0.3);
	// backsound Ajojing / Mancing Mania; fanfare sintetis bila berkasnya tak bisa diputar
	if (!putarJingle(ikan.kelas)) suara(ikan.kelas >= 3 ? "jaya" : "dapat");
	else suara("cebur");
	keFase("dapat", null);
}
