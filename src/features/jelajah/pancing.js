import { useSyncExternalStore } from "react";
import { diSitu, jarakKeTepi, perahuBebas } from "./scene/situ";
import { suasana } from "./scene/suasana";
import { hentikanLaga, hentikanRiang, laguLaga, putarLaga, putarRiang } from "./musikJelajah";
import { suara } from "./suaraPancing";
import { catat, tambahXp } from "./progres";

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
	{ nama: "Biasa", warna: "#94a3b8", bobot: 60, tenaga: 0.55, stamina: 6.5, sentak: 0.18, reaksi: 0.85, poin: 10, zona: [0.34, 0.9], regen: 0.1, lari: 0.06, colek: 3 },
	{ nama: "Langka", warna: "#3b82f6", bobot: 26, tenaga: 0.8, stamina: 12, sentak: 0.28, reaksi: 0.72, poin: 25, zona: [0.4, 0.88], regen: 0.35, lari: 0.13, colek: 4 },
	{ nama: "Epik", warna: "#a855f7", bobot: 10, tenaga: 1.02, stamina: 19, sentak: 0.36, reaksi: 0.58, poin: 60, zona: [0.46, 0.85], regen: 0.6, lari: 0.19, colek: 5 },
	{ nama: "Monster", warna: "#ef4444", bobot: 2.6, tenaga: 1.22, stamina: 27, sentak: 0.45, reaksi: 0.48, poin: 120, zona: [0.52, 0.82], regen: 0.9, lari: 0.25, colek: 6 },
	{ nama: "Legenda", warna: "#f59e0b", bobot: 0.4, tenaga: 1.42, stamina: 31, sentak: 0.5, reaksi: 0.4, poin: 300, zona: [0.56, 0.8], regen: 0.9, lari: 0.27, colek: 7 },
];

// bentuk: tinggi/lebar badan relatif panjang; ekor "garpu" | "bulat" | "pisau" | "belut".
// k = faktor gemuk Fulton (berat g = k · panjang cm³ / 100) untuk menghitung panjang.
export const IKAN = [
	{ id: "nila", nama: "Nila", latin: "Oreochromis niloticus", kelas: 0, kg: [0.2, 1.3], k: 1.6, warna: { punggung: "#5b6b62", perut: "#c9cfc4", sirip: "#7c5a5a" }, bentuk: { tinggi: 0.42, lebar: 0.16, ekor: "bulat", belang: true }, kisah: "Penghuni paling ramah Situ Pemda. Hampir semua pemancing di sini memulai dari nila." },
	{ id: "mujair", nama: "Mujair", latin: "Oreochromis mossambicus", kelas: 0, kg: [0.15, 0.8], k: 1.7, warna: { punggung: "#3f4a45", perut: "#a9b3a5", sirip: "#4b3b3b" }, bentuk: { tinggi: 0.44, lebar: 0.17, ekor: "bulat" }, kisah: "Sepupu nila yang lebih gelap dan lebih rakus. Sering menyambar umpan duluan." },
	{ id: "tawes", nama: "Tawes", latin: "Barbonymus gonionotus", kelas: 0, kg: [0.2, 1.1], k: 1.4, warna: { punggung: "#8a8f7a", perut: "#e8e4d0", sirip: "#d6b25a" }, bentuk: { tinggi: 0.36, lebar: 0.13, ekor: "garpu" }, kisah: "Sisiknya berkilau keperakan saat diangkat dari air." },
	{ id: "sepat", nama: "Sepat Rawa", latin: "Trichogaster trichopterus", kelas: 0, kg: [0.05, 0.3], k: 2.0, warna: { punggung: "#6b7c5c", perut: "#d8dcc4", sirip: "#8a7a4a" }, bentuk: { tinggi: 0.45, lebar: 0.12, ekor: "bulat", tutul: true }, kisah: "Ikan kecil penghuni rawa dan pinggiran situ. Umpan apa saja disambarnya." },
	{ id: "betok", nama: "Betok", latin: "Anabas testudineus", kelas: 0, kg: [0.05, 0.35], k: 1.8, warna: { punggung: "#4d5a3a", perut: "#c9c49a", sirip: "#6b5a3a" }, bentuk: { tinggi: 0.36, lebar: 0.16, ekor: "bulat" }, kisah: "Si pemanjat yang bisa bertahan lama di darat. Duri siripnya tajam, hati-hati memegangnya." },
	{ id: "wader", nama: "Wader Pari", latin: "Rasbora argyrotaenia", kelas: 0, kg: [0.02, 0.12], k: 1.0, warna: { punggung: "#8a9a8a", perut: "#f1f5f9", sirip: "#c2b28a" }, bentuk: { tinggi: 0.26, lebar: 0.1, ekor: "garpu", kilau: true }, kisah: "Gerombolan wader berkilau perak berenang dekat permukaan. Gurih digoreng kering." },
	{ id: "lele", nama: "Lele", latin: "Clarias batrachus", kelas: 0, kg: [0.3, 2.6], k: 0.75, warna: { punggung: "#3a3328", perut: "#8f8572", sirip: "#2e2820" }, bentuk: { tinggi: 0.2, lebar: 0.18, ekor: "bulat", kumis: true }, kisah: "Licin dan berkumis. Bersembunyi di lumpur dasar situ." },
	{ id: "mas", nama: "Ikan Mas", latin: "Cyprinus carpio", kelas: 1, kg: [1, 7], k: 1.7, warna: { punggung: "#d97706", perut: "#fbbf24", sirip: "#ea580c" }, bentuk: { tinggi: 0.4, lebar: 0.17, ekor: "garpu", kumis: true }, kisah: "Ikan mas keemasan, lambang rezeki. Tarikannya panjang dan kuat." },
	{ id: "gurame", nama: "Gurame", latin: "Osphronemus goramy", kelas: 1, kg: [1, 5.5], k: 2.0, warna: { punggung: "#7b6d6d", perut: "#e3c9c9", sirip: "#9b7b6b" }, bentuk: { tinggi: 0.55, lebar: 0.15, ekor: "bulat" }, kisah: "Bertubuh lebar dan tenang, tapi pantang menyerah begitu kail tertancap." },
	{ id: "gabus", nama: "Ikan Gabus", latin: "Channa striata", kelas: 1, kg: [0.5, 3.5], k: 0.9, warna: { punggung: "#3a3a2c", perut: "#bfb7a0", sirip: "#4a3f30" }, bentuk: { tinggi: 0.2, lebar: 0.16, ekor: "bulat", belang: true }, sifat: { lompat: true }, kisah: "Predator lumpur yang rakus. Sering menyambar umpan lalu melompat keluar air." },
	{ id: "bawal", nama: "Bawal Air Tawar", latin: "Colossoma macropomum", kelas: 1, kg: [1, 6], k: 2.4, warna: { punggung: "#4b5563", perut: "#f1a7a7", sirip: "#3f3f46" }, bentuk: { tinggi: 0.58, lebar: 0.14, ekor: "garpu" }, kisah: "Berbadan bundar pipih dengan perut kemerahan. Giginya mirip gigi manusia!" },
	{ id: "baung", nama: "Baung", latin: "Hemibagrus nemurus", kelas: 1, kg: [0.5, 4], k: 0.85, warna: { punggung: "#6b5b45", perut: "#e6dcc8", sirip: "#8a7255" }, bentuk: { tinggi: 0.22, lebar: 0.15, ekor: "garpu", kumis: true }, kisah: "Lele sungai berkumis panjang. Paling aktif menjelang magrib." },
	{ id: "jelawat", nama: "Jelawat", latin: "Leptobarbus hoevenii", kelas: 1, kg: [1, 8], k: 1.1, warna: { punggung: "#7c8a6a", perut: "#f5f0dc", sirip: "#d97757" }, bentuk: { tinggi: 0.3, lebar: 0.14, ekor: "garpu" }, kisah: "Sirip merahnya menyala. Larinya kencang begitu merasakan kail." },
	{ id: "patin", nama: "Patin", latin: "Pangasius hypophthalmus", kelas: 1, kg: [2, 12], k: 1.0, warna: { punggung: "#5d6b78", perut: "#dfe5ea", sirip: "#6b7785" }, bentuk: { tinggi: 0.27, lebar: 0.15, ekor: "garpu", kumis: true }, kisah: "Perenang cepat dari perairan dalam. Larinya bisa menghabiskan senar." },
	{ id: "toman", nama: "Toman Raksasa", latin: "Channa micropeltes", kelas: 2, kg: [4, 19], k: 0.9, warna: { punggung: "#2f3b2a", perut: "#c7a46a", sirip: "#b4532a" }, bentuk: { tinggi: 0.24, lebar: 0.16, ekor: "bulat", belang: true }, sifat: { lompat: true }, kisah: "Predator ganas bergigi tajam. Suka melompat menyentak kail." },
	{ id: "belida", nama: "Belida", latin: "Chitala lopis", kelas: 2, kg: [3, 13], k: 0.7, warna: { punggung: "#8b8f98", perut: "#e7e9ee", sirip: "#9aa0aa" }, bentuk: { tinggi: 0.32, lebar: 0.1, ekor: "pisau", tutul: true }, kisah: "Ikan pisau bertutul yang langka. Gerakannya meliuk seperti pita." },
	{ id: "hampala", nama: "Hampala Belang", latin: "Hampala macrolepidota", kelas: 2, kg: [2, 8], k: 1.2, warna: { punggung: "#5b6b4a", perut: "#e9e4cf", sirip: "#e05a2a" }, bentuk: { tinggi: 0.32, lebar: 0.14, ekor: "garpu", belang: true }, sifat: { lompat: true }, kisah: "Sebarau buas bersirip jingga dengan belang hitam di badan. Sambarannya keras." },
	{ id: "koi", nama: "Koi Kohaku", latin: "Cyprinus rubrofuscus", kelas: 2, kg: [3, 15], k: 1.8, warna: { punggung: "#f8fafc", perut: "#fef2f2", sirip: "#ef4444" }, bentuk: { tinggi: 0.36, lebar: 0.18, ekor: "garpu", kumis: true, tutul: true, kilau: true }, kisah: "Koi merah-putih yang lepas dari kolam rumah dinas dan tumbuh besar di situ." },
	{ id: "redtail", nama: "Redtail Catfish", latin: "Phractocephalus hemioliopterus", kelas: 2, kg: [10, 40], k: 1.0, warna: { punggung: "#27272a", perut: "#fef3c7", sirip: "#dc2626" }, bentuk: { tinggi: 0.24, lebar: 0.22, ekor: "garpu", kumis: true }, syarat: { jauh: 8 }, kisah: "Lele Amazon berekor merah. Menunggu di perairan dalam, lalu menarik seperti truk." },
	{ id: "tapah", nama: "Tapah", latin: "Wallago leeri", kelas: 2, kg: [8, 35], k: 0.55, warna: { punggung: "#6b7280", perut: "#e5e7eb", sirip: "#9ca3af" }, bentuk: { tinggi: 0.2, lebar: 0.12, ekor: "pisau", kumis: true }, syarat: { malam: true }, kisah: "Lele raksasa bermulut lebar. Berburu dalam gelap di dasar situ." },
	{ id: "arapaima", nama: "Arapaima Purba", latin: "Arapaima gigas", kelas: 3, kg: [40, 165], k: 0.95, warna: { punggung: "#3e4a3a", perut: "#9aa38c", sirip: "#b91c1c" }, bentuk: { tinggi: 0.22, lebar: 0.17, ekor: "bulat", sisikMerah: true }, sifat: { lompat: true }, syarat: { jauh: 10 }, kisah: "Raksasa bersisik merah dari zaman purba. Konon lepas dari kolam kolektor dan tumbuh liar di situ." },
	{ id: "siluman", nama: "Lele Siluman", latin: "Clarias phantasma", kelas: 3, kg: [30, 95], k: 0.8, warna: { punggung: "#111317", perut: "#3a3f47", sirip: "#0b0c0f" }, bentuk: { tinggi: 0.2, lebar: 0.2, ekor: "bulat", kumis: true, mataNyala: "#39ff88" }, syarat: { malam: true, jauh: 8 }, kisah: "Hanya muncul saat malam. Matanya menyala hijau di bawah permukaan air." },
	{ id: "belut", nama: "Belut Listrik Raksasa", latin: "Electrophorus voltai", kelas: 3, kg: [15, 45], k: 0.22, warna: { punggung: "#2c3530", perut: "#e0a53a", sirip: "#1e2622" }, bentuk: { tinggi: 0.09, lebar: 0.09, ekor: "belut" }, sifat: { setrum: true }, syarat: { jauh: 14 }, kisah: "Menyimpan listrik ratusan volt. Lepaskan gulungan saat ia menyetrum!" },
	{ id: "gar", nama: "Alligator Gar", latin: "Atractosteus spatula", kelas: 3, kg: [40, 130], k: 0.45, warna: { punggung: "#4b5a3c", perut: "#c9c2a0", sirip: "#5a4a2e" }, bentuk: { tinggi: 0.14, lebar: 0.13, ekor: "bulat", tutul: true, duri: true }, sifat: { lompat: true }, syarat: { jauh: 12 }, kisah: "Ikan bermoncong buaya dengan sisik sekeras zirah. Diduga dibuang pemelihara ke situ bertahun-tahun lalu." },
	{ id: "sidat", nama: "Sidat Marmer Raksasa", latin: "Anguilla marmorata", kelas: 3, kg: [10, 25], k: 0.25, warna: { punggung: "#4a4a2a", perut: "#d6c78a", sirip: "#3a3a20" }, bentuk: { tinggi: 0.09, lebar: 0.1, ekor: "belut", tutul: true }, syarat: { malam: true, jauh: 6 }, kisah: "Belut laut yang mudik ke air tawar. Licin, kuat, dan hanya keluar malam hari." },
	{ id: "dewa", nama: "Ikan Dewa Kancra", latin: "Tor soro", kelas: 4, kg: [10, 40], k: 1.4, warna: { punggung: "#3f5a52", perut: "#d9e4dc", sirip: "#7a8a6a" }, bentuk: { tinggi: 0.3, lebar: 0.15, ekor: "garpu", kumis: true, kilau: true }, syarat: { jauh: 14 }, kisah: "Ikan keramat dari mata air Kuningan. Konon siapa yang menangkapnya akan selalu beruntung." },
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
		if (d && typeof d === "object") return { koleksi: d.koleksi || {}, poin: d.poin || 0, tangkapan: d.tangkapan || 0, joran: d.joran || 0, joranPunya: d.joranPunya, joranPakai: d.joranPakai, senar: d.senar || 0 };
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return { koleksi: {}, poin: 0, tangkapan: 0, joran: 0 };
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
// ---------- perlengkapan memancing: joran (jenis) & senar (tingkat) ----------
// Joran dibeli lalu dipilih untuk dipakai; tiap jenis punya keunggulan sendiri:
//   cepat = pengali lama menunggu sambaran (0,6 = ikan datang ±1,7× lebih cepat);
//   hoki  = pengali peluang ikan Epik ke atas (premium);
//   gulung = pengali tenaga ketukan; lebar = pelebaran zona tegangan "pas".
// Senar di-upgrade berurutan: kuat = batas tegangan sebelum putus, panjang = senar (m).
export const JORAN = [
	{ id: "bambu", nama: "Joran Bambu", harga: 0, cepat: 1, hoki: 1, gulung: 1, lebar: 0, warna: "#a16207", ujung: "#dc2626", ket: "Joran warisan kakek. Cukup untuk ikan biasa." },
	{ id: "fiber", nama: "Joran Fiber", harga: 300, cepat: 0.9, hoki: 1.1, gulung: 1.07, lebar: 0.02, warna: "#1f2937", ujung: "#dc2626", ket: "Lentur & ringan — serba sedikit lebih baik." },
	{ id: "karbon", nama: "Joran Karbon", harga: 900, cepat: 0.8, hoki: 1.25, gulung: 1.14, lebar: 0.035, warna: "#0f172a", ujung: "#22d3ee", ket: "Kaku & peka: gulungan cepat, ikan besar lebih sering." },
	{ id: "kilat", nama: "Joran Casting Kilat", harga: 1200, cepat: 0.5, hoki: 1, gulung: 1.1, lebar: 0.02, warna: "#0369a1", ujung: "#fde047", ket: "Spesialis cepat: umpan disambar 2× lebih cepat — panen ikan." },
	{ id: "titanium", nama: "Joran Titanium Pro", harga: 2200, cepat: 0.7, hoki: 1.45, gulung: 1.22, lebar: 0.05, warna: "#94a3b8", ujung: "#f97316", ket: "Joran turnamen: cepat, kuat, dan sering disambar ikan premium." },
	{ id: "dasar", nama: "Joran Dasar Monster", harga: 3500, cepat: 1.15, hoki: 2.3, gulung: 1.18, lebar: 0.04, warna: "#3f2a1d", ujung: "#ef4444", ket: "Spesialis premium: sabar menunggu, yang datang ikan-ikan monster." },
	{ id: "naga", nama: "Joran Naga Emas", harga: 5000, cepat: 0.6, hoki: 1.9, gulung: 1.32, lebar: 0.07, warna: "#ca8a04", ujung: "#facc15", ket: "Legenda para pemancing: cepat & ikan langka seolah datang sendiri." },
];
export const JORAN_PER_ID = Object.fromEntries(JORAN.map((j) => [j.id, j]));
export const SENAR = [
	{ nama: "Senar Nilon 0,25 mm", harga: 0, kuat: 1, panjang: 45, warna: "#f1f5f9" },
	{ nama: "Senar Nilon Kuat 0,35 mm", harga: 200, kuat: 1.12, panjang: 48, warna: "#e0f2fe" },
	{ nama: "Senar PE Anyam ×4", harga: 600, kuat: 1.28, panjang: 52, warna: "#bbf7d0" },
	{ nama: "Senar PE Anyam ×8", harga: 1500, kuat: 1.45, panjang: 56, warna: "#fde68a" },
	{ nama: "Senar Fluorocarbon Pro", harga: 3000, kuat: 1.62, panjang: 62, warna: "#c4b5fd" },
	{ nama: "Senar Kevlar Naga", harga: 6000, kuat: 1.85, panjang: 70, warna: "#fca5a5" },
];
// Simpanan lama (simpanan.joran = tingkat 0–4 dari daftar berurutan dulu) dipindahkan:
// joran yang dulu terbeli tetap dimiliki & tingkat senar ikut naik setara.
const JORAN_LAMA = ["bambu", "fiber", "karbon", "titanium", "naga"];
function pindahkanSimpananLama() {
	if (simpanan.joranPakai) return;
	const lama = Math.max(0, Math.min(4, simpanan.joran || 0));
	simpanan.joranPunya = JORAN_LAMA.slice(0, lama + 1);
	simpanan.joranPakai = JORAN_LAMA[lama];
	simpanan.senar = lama;
}
pindahkanSimpananLama();

export const joranKini = () => JORAN_PER_ID[simpanan.joranPakai] || JORAN[0];
export const senarKini = () => SENAR[Math.min(SENAR.length - 1, simpanan.senar || 0)];
export const tingkatSenar = () => Math.min(SENAR.length - 1, simpanan.senar || 0);
export const punyaJoran = (id) => id === "bambu" || (simpanan.joranPunya || []).includes(id);
export const zonaKini = (kelas) => {
	const [b, a] = KELAS[kelas].zona;
	const l = joranKini().lebar;
	return [b - l, Math.min(0.97, a + l)];
};
// Beli (bila belum punya) lalu langsung dipakai.
export function pakaiJoran(id) {
	const j = JORAN_PER_ID[id];
	if (!j) return "Joran tidak dikenal";
	if (!punyaJoran(id)) {
		if (!bayarKoin(j.harga)) return "Koin belum cukup (perlu 🪙 " + j.harga + ")";
		simpanan.joranPunya = [...(simpanan.joranPunya || []), id];
	}
	simpanan.joranPakai = id;
	simpan();
	return null;
}
export function upgradeSenar() {
	const berikut = SENAR[tingkatSenar() + 1];
	if (!berikut) return "Senar sudah yang terbaik";
	if (!bayarKoin(berikut.harga)) return "Koin belum cukup (perlu 🪙 " + berikut.harga + ")";
	simpanan.senar = tingkatSenar() + 1;
	simpan();
	return null;
}

// Koin dari sumber lain (peti hadiah).
export function tambahKoin(n) {
	simpanan.poin += n;
	simpan();
}
export const ambilKoleksi = () => simpanan;
export const dengarKoleksi = (f) => (pendengarKoleksi.add(f), () => pendengarKoleksi.delete(f));
export const useKoleksi = () =>
	useSyncExternalStore(
		(f) => (pendengarKoleksi.add(f), () => pendengarKoleksi.delete(f)),
		() => simpanan,
	);

// ---------- keadaan permainan ----------

export const FASE_PANCING = ["siap", "lempar", "tunggu", "gigit", "tarik", "dapat", "gagal"];

// ---------- jam ikan lapar ----------
// Periode singkat ikan sedang lapar: sambaran 2× lebih cepat & ikan premium lebih sering.
// Dihitung dari jam (slot 12 menit) sehingga sama untuk semua tamu jelajah bersama.
const SLOT_LAPAR = 12 * 60 * 1000;
function acakSlot(slot, k) {
	let h = Math.imul(slot ^ 0x85ebca6b, 2654435761) ^ Math.imul(k + 7, 40503);
	h = Math.imul(h ^ (h >>> 15), 2246822507);
	h = Math.imul(h ^ (h >>> 13), 3266489909);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// { aktif, sisa (ms), berikut (ms sampai mulai, bila tidak aktif & ada di slot ini) }
export function jamLapar(waktu = Date.now()) {
	const slot = Math.floor(waktu / SLOT_LAPAR);
	if (acakSlot(slot, 0) > 0.35) return { aktif: false };
	const mulai = slot * SLOT_LAPAR + acakSlot(slot, 1) * 5 * 60000;
	const selesai = mulai + (3 + acakSlot(slot, 2) * 2) * 60000;
	if (waktu >= mulai && waktu < selesai) return { aktif: true, sisa: selesai - waktu };
	return { aktif: false, berikut: waktu < mulai ? mulai - waktu : null };
}

// rating ukuran 1–3 bintang dari letak berat dalam rentang jenisnya
export const bintangUkuran = (ikan, kg) => {
	const b = (kg - ikan.kg[0]) / (ikan.kg[1] - ikan.kg[0] || 1);
	return b >= 0.7 ? 3 : b >= 0.35 ? 2 : 1;
};

export const pancing = {
	combo: 0, // tangkapan beruntun tanpa gagal (pengali koin)
	perfect: false, // sentakan sangat cepat saat ikan menyambar
	aktif: false,
	perahu: false,
	asal: { x: 0, z: 0, rot: 0 }, // posisi pemancing & arah hadap dasar
	aim: 0, // putaran bidikan relatif arah hadap
	fase: "siap",
	t: 0,
	// masukan dari UI: tahan (mengayun lemparan), ketukan (jumlah tekan-lepas), arah
	tahan: false,
	ketukan: 0,
	arah: 0, // A/D atau analog: −1 kiri … 1 kanan
	arahMouse: 0, // posisi mouse relatif tengah layar (−1 kiri … 1 kanan)
	ayun: 0, // arah joran saat adu tarik (dihaluskan); ikan ikut terseret ke arah ini
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
	// tarikan sakti: terisi selama tegangan dijaga di zona hijau; penuh = satu hentakan besar
	kuasa: 0,
	habisi: false, // ikan sudah lemas (<20% tenaga): gulungan jauh lebih kuat
	detakLagi: 0,
	// efek layar (dibaca HUD & kamera): kilat warna, dorongan zoom, gerak lambat, teks sorakan
	kilat: 0,
	warnaKilat: "#ffffff",
	dorong: 0,
	lambat: 0,
	sorak: null, // { teks, warna, id }
	hentakT: 99, // detik sejak tarikan sakti (animasi tubuh menyentak)
	// gaya tubuh pemancing, dihaluskan tiap frame oleh Pancingan.jsx & dibaca Tokoh.jsx
	gaya: { condong: 0, lengan: 0, engkol: 0, putar: 0, lutut: 0, lompat: 0 },
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
let urutSorak = 0;
// Teks besar di tengah layar + kilat & dorongan kamera untuk momen penting.
function sorak(teks, warna = "#fde047", kilat = 0.5, dorong = 0.6) {
	const p = pancing;
	p.sorak = { teks, warna, id: ++urutSorak };
	p.kilat = Math.max(p.kilat, kilat);
	p.warnaKilat = warna;
	p.dorong = Math.max(p.dorong, dorong);
	beritahu();
}
function getarHp(pola) {
	try {
		navigator.vibrate?.(pola);
	} catch {
		/* tidak didukung */
	}
}

export function percik(x, z, besar = 1) {
	pancing.cipratan.push({ x, z, besar, t0: performance.now() / 1000 });
	if (pancing.cipratan.length > 12) pancing.cipratan.shift();
}

// Arah joran: bidikan + ayunan ke kiri/kanan saat adu tarik (ikan ikut terseret).
const arahLempar = () => pancing.asal.rot + pancing.aim - pancing.ayun * 0.3;
export const arahJoran = arahLempar;
// Ujung joran kira-kira 1,4 m di depan pemancing.
export function ujungJoran() {
	const a = arahLempar();
	return { x: pancing.asal.x + Math.sin(a) * 1.4, z: pancing.asal.z + Math.cos(a) * 1.4 };
}

export function mulaiPancing({ x, z, rot, perahu }) {
	Object.assign(pancing, { aktif: true, perahu: !!perahu, asal: { x, z, rot }, aim: 0, tahan: false, arah: 0, hasil: null, ikan: null, cipratan: [], kuasa: 0, habisi: false, kilat: 0, dorong: 0, lambat: 0, sorak: null });
	keFase("siap", { teks: "Tahan untuk mengayun joran, lepas untuk melempar", jenis: "info" });
}

export function berhentiPancing() {
	hentikanLaga();
	hentikanRiang();
	pancing.aktif = false;
	pancing.ikan = null;
	pancing.hasil = null;
	keFase("siap", null);
}

// Pemain mengayuh perahu / bergeser: posisi pemancing ikut.
export const geserAsal = (x, z, rot) => Object.assign(pancing.asal, { x, z, rot });

export function lanjutPancing() {
	hentikanRiang();
	pancing.hasil = null;
	pancing.ikan = null;
	keFase("siap", { teks: "Lempar lagi! Makin jauh ke tengah, makin besar ikannya", jenis: "info" });
}

function gagal(teks) {
	hentikanLaga();
	pancing.combo = 0;
	suara("lepas");
	pancing.ikan = null;
	keFase("gagal", { teks, jenis: "buruk" });
}

// Pelampung (sudah) di air: pilih ikan berikutnya lalu tunggu sambarannya.
function mulaiTunggu(teks, jenis) {
	const p = pancing;
	const calon = pilihIkan(jarakKeTepi(p.pelampung.x, p.pelampung.z));
	p.ikanTunggu = calon;
	const kls = KELAS[calon.ikan.kelas];
	const cepat = (malam() ? 0.85 : 1) * (p.sempurna ? 0.8 : 1) * (1 + calon.ikan.kelas * 0.3) * (jamLapar().aktif ? 0.5 : 1) * (suasana.hujan > 0.5 ? 0.8 : 1); // ikan lebih aktif saat hujan
	// ikan butuh waktu menemukan umpan; makin dalam & makin besar makin lama
	p.tungguSampai = acak(4.5, 11) * cepat * joranKini().cepat;
	const n = Math.floor(Math.random() * (kls.colek + 1));
	p.colekBunyi = -1;
	p.colek = false;
	p.colekan = Array.from({ length: n }, () => acak(0.8, p.tungguSampai - 0.6)).sort((a, b) => a - b);
	keFase("tunggu", { teks, jenis });
}

// Ikan lolos (telat/terlalu cepat menyentak) tapi umpan masih di kail: pelampung
// dibiarkan di tempatnya dan menunggu ikan berikutnya — tidak perlu melempar ulang.
function lepasTapiTunggu(teks) {
	pancing.combo = 0;
	suara("lepas");
	pancing.ikan = null;
	pancing.pelampung.y = 0;
	mulaiTunggu(teks, "buruk");
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
	if (jamLapar().aktif) kalikan([1, 1, 1.3, 1.6, 1.8]);
	const hoki = joranKini().hoki;
	kalikan([1, 1, Math.sqrt(hoki), hoki, hoki * 1.1]);
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
	p.kilat = Math.max(0, p.kilat - dt * 3);
	// adu tarik: joran diarahkan dengan mouse (atau A/D / analog) — lawan arah lari ikan
	const masukan = p.fase === "tarik" ? (p.arah !== 0 ? p.arah : p.arahMouse) : 0;
	p.ayun += (masukan - p.ayun) * (1 - Math.exp(-6 * dt));
	p.dorong = Math.max(0, p.dorong - dt * 2.2);
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
			mulaiTunggu("Tunggu pelampung tenggelam… jangan tergoda colekan!", "info");
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
			if (p.colek) return lepasTapiTunggu("Terlalu cepat! Ikannya cuma mencolek lalu kabur — umpan masih di air, tunggu lagi");
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
			// tanpa tanda seru: isyaratnya senar menegang & pelampung terseret ikan (Pancingan.jsx)
			p.getar = Math.max(p.getar, 0.5);
			p.dorong = Math.max(p.dorong, 0.35);
			keFase("gigit", { teks: "Senar menegang… sentak sekarang", jenis: "besar" });
		}
		return;
	}

	if (p.fase === "gigit") {
		if (tekan) {
			const k = KELAS[p.ikan.kelas];
			const besar = (p.kg - p.ikan.kg[0]) / (p.ikan.kg[1] - p.ikan.kg[0] || 1);
			p.besar = besar;
			// sentakan cepat = kail menancap kuat; terlambat = kail hanya tersangkut di bibir
			p.kailKuat = p.t < p.jendela * 0.45;
			// PERFECT STRIKE: sentakan secepat kilat — ikan kaget & lebih cepat lelah, koin +15%
			p.perfect = p.t < p.jendela * 0.3;
			p.kendor = 0;
			p.tegurKendor = false;
			p.staminaMaks = k.stamina * (0.75 + 0.5 * besar);
			p.stamina = p.staminaMaks * (p.perfect ? 0.85 : 1);
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
			p.habisi = false;
			p.detakLagi = 0;
			p.kuasa = p.perfect ? 0.35 : 0;
			p.ikanPos = { x: p.pelampung.x, z: p.pelampung.z };
			percik(p.pelampung.x, p.pelampung.z, 1.1 + p.ikan.kelas * 0.3);
			getarHp(p.perfect ? [50, 30, 90] : 50);
			p.getar = 0.4;
			suara("kail");
			// strike! musik sendu berganti backsound laga
			putarLaga(p.ikan.kelas);
			const teks = p.perfect
				? "⚡ PERFECT STRIKE! Ikan kaget & cepat lelah"
				: !p.kailKuat
				? "Kail cuma tersangkut di bibir — jaga senar tetap tegang!"
				: p.ikan.kelas >= 3
					? "Sesuatu yang SANGAT BESAR menarik senar!"
					: p.ikan.kelas === 2
						? "Tarikannya kuat sekali! Ketuk berulang untuk menggulung"
						: "Kena! Ketuk berulang untuk menggulung";
			if (p.perfect) p.getar = Math.max(p.getar, 0.8);
			if (p.perfect) sorak("PERFECT STRIKE!", "#38bdf8", 0.8, 1);
			else sorak("STRIKE!", "#fde047", 0.35, 0.7);
			return keFase("tarik", { teks, jenis: p.ikan.kelas >= 3 || p.perfect ? "besar" : "baik" });
		}
		if (p.t > p.jendela) return lepasTapiTunggu("Kurang cepat — ikannya lepas. Umpan masih di air, tunggu sambaran berikutnya");
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
	const jr = joranKini();
	const sn = senarKini();
	const [zonaBawah, zonaAtas] = zonaKini(p.ikan.kelas);
	// laju mengetuk: tiap ketukan menambah, meluruh ±1 detik bila berhenti (±7 ketukan/dtk ≈ 1)
	p.gulung = Math.min(1.3, p.gulung * Math.exp(-2.4 * dt) + ketukBaru * 0.28 * jr.gulung);
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
		getarHp([120, 60, 160]);
		sorak("MENGAMUK!", "#ef4444", 0.45, 0.9);
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
				p.kuasa = Math.min(1, p.kuasa + 0.15);
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
	// ikan yang lebih berat (dalam rentang jenisnya) menarik lebih kuat
	const tarikan = k.tenaga * (0.85 + 0.3 * (p.besar || 0)) * (0.4 + 0.6 * sisa) * (p.sentak > 0 ? 1.6 : 1) * (p.lari > 0 ? 2.0 : 1) * (p.amuk > 0 ? 1.3 : 1);
	// makin jauh joran diarahkan, makin kuat efeknya
	const kuatArah = Math.min(1, Math.abs(p.ayun));
	const lawan = kuatArah > 0.2 && Math.sign(p.ayun) === -p.arahIkan;
	const ikut = kuatArah > 0.2 && Math.sign(p.ayun) === p.arahIkan;

	// --- tegangan senar (dengan getaran kepala ikan yang menggeleng) ---
	let target = tarikan * 0.14 + gl * (0.25 + tarikan * 0.45);
	if (lawan) target -= 0.1 * kuatArah;
	if (ikut) target += 0.12 * kuatArah;
	if (p.peristiwa && menggulung) target += 0.9 * gl;
	if (p.habisi) target *= 0.85;
	p.tegang += (target - p.tegang) * (1 - Math.exp(-4 * dt));
	p.geleng = Math.sin(p.t * 13.7) * Math.sin(p.t * 3.1) * k.tenaga * 0.07 * (menggulung ? 1 : 0.4);
	const tegangan = p.tegang + p.geleng;

	// --- panjang senar: menggulung melawan tarikan; dilepas = senar ditarik keluar (rem senar) ---
	p.jarak -= gl * (1.6 + 1.6 * (1 - sisa)) * (1 - 0.6 * sisa) * (tegangan > 1 ? 0.2 : 1) * (p.lari > 0 ? 0.3 : 1) * (p.habisi ? 1.8 : 1) * dt;
	p.jarak += tarikan * (1.0 - 0.7 * gl) * 0.8 * dt;

	// --- tenaga ikan: terkuras di zona pas, pulih bila senar kendor ---
	p.pulih = false;
	if (menggulung && tegangan >= zonaBawah) {
		const diZona = tegangan <= zonaAtas;
		p.stamina -= (diZona ? 1 : 1.25) * (lawan ? 1 + 0.6 * kuatArah : 1) * (0.4 + 0.6 * gl) * dt;
		// meteran tarikan sakti terisi selama tegangan dijaga di zona hijau (±9 detik)
		if (diZona && p.kuasa < 1) {
			p.kuasa = Math.min(1, p.kuasa + dt * 0.11);
			if (p.kuasa >= 1) {
				suara("kuasa");
				pesanSaja("⚡ TARIKAN SAKTI siap! Pakai sekarang", "baik");
			}
		}
	} else if (tegangan < zonaBawah * 0.85 && k.regen > 0 && sisa < 1) {
		p.stamina = Math.min(p.staminaMaks, p.stamina + k.regen * dt);
		p.pulih = true;
	}
	p.stamina = Math.max(0, p.stamina);
	// ikan lemas: saatnya menghabisi
	if (!p.habisi && p.stamina / p.staminaMaks < 0.2) {
		p.habisi = true;
		suara("habisi");
		laguLaga(1.12);
		sorak("HABISI!", "#f59e0b", 0.4, 0.8);
		pesanSaja("Ikan lemas! Ketuk secepatnya — gulungan 2× lebih kuat", "besar");
	}
	// detak jantung saat senar hampir putus
	p.detakLagi -= dt;
	if ((tegangan >= 1 || p.bahaya > 0.2) && p.detakLagi <= 0) {
		suara("detak");
		p.detakLagi = Math.max(0.42, 0.75 - p.bahaya * 0.4);
	}

	// --- putus / habis senar / dapat ---
	if (tegangan >= 1) p.bahaya += dt * (p.lari > 0 ? 1.6 : 1);
	else p.bahaya = Math.max(0, p.bahaya - dt * 0.8);
	if (p.bahaya > 0.75 * sn.kuat) {
		suara("putus");
		return gagal(p.ikan.kelas >= 3 ? `Senar putus! ${p.ikan.nama} kembali ke kedalaman…` : "Senar putus! Tegangan terlalu tinggi");
	}
	if (p.jarak > sn.panjang) return gagal("Senar habis tertarik — ikannya kabur");
	// senar kendor terlalu lama (di luar saat ikan lari/melompat) = ikan menggeleng lepas dari kail
	if (tegangan < zonaBawah * 0.7 && !(p.lari > 0) && !p.peristiwa) {
		p.kendor += dt;
		if (p.kendor > 0.8 && !p.tegurKendor) {
			p.tegurKendor = true;
			pesanSaja("Senar kendor! Gulung lagi sebelum kail lepas", "buruk");
		}
		if (p.kendor > (p.kailKuat ? 3.2 : 1.8)) return gagal("Senar kendor terlalu lama — kail terlepas dari mulut ikan");
	} else {
		p.kendor = Math.max(0, p.kendor - dt * 1.5);
		if (p.kendor === 0) p.tegurKendor = false;
	}

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

// TARIKAN SAKTI (F / tombol ⚡): meteran penuh = satu hentakan besar — ikan terseret mendekat,
// tenaganya terkuras, lari/lompat/amukan terhenti, senar aman kembali.
export function tarikanSakti() {
	const p = pancing;
	if (p.fase !== "tarik" || p.kuasa < 1) return false;
	const [zb, za] = zonaKini(p.ikan.kelas);
	p.kuasa = 0;
	p.stamina = Math.max(0, p.stamina - p.staminaMaks * 0.3);
	p.jarak = Math.max(2.4, p.jarak - Math.min(6, p.jarak * 0.35));
	p.lari = 0;
	p.peristiwa = null;
	p.amuk = 0;
	p.bahaya = 0;
	p.kendor = 0;
	p.tegang = (zb + za) / 2;
	p.getar = 1;
	p.lambat = 0.45;
	p.hentakT = 0;
	percik(p.ikanPos.x, p.ikanPos.z, 1.7 + p.ikan.kelas * 0.3);
	suara("hentak");
	getarHp([40, 30, 160]);
	sorak("TARIKAN SAKTI!", "#38bdf8", 0.9, 1.3);
	return true;
}

const SORAK_DAPAT = ["DAPAT!", "LANGKA!", "EPIK!", "MONSTER!", "LEGENDA!"];

function dapat() {
	const p = pancing;
	const ikan = p.ikan;
	const lama = simpanan.koleksi[ikan.id];
	const baru = !lama;
	const rekor = !baru && p.kg > lama.terberat;
	// poin tumbuh dengan akar berat: ikan monster tetap jauh lebih berharga, tapi tidak meledak
	p.combo += 1;
	// pengali koin: combo tangkapan beruntun (maks ×1,5) & perfect strike (+15%)
	const pengali = (1 + Math.min(p.combo - 1, 5) * 0.1) * (p.perfect ? 1.15 : 1);
	const poin = Math.round(KELAS[ikan.kelas].poin * (1 + Math.sqrt(p.kg)) * (p.sempurna ? 1.2 : 1) * pengali);
	simpanan.koleksi = {
		...simpanan.koleksi,
		[ikan.id]: { jumlah: (lama?.jumlah || 0) + 1, terberat: Math.max(lama?.terberat || 0, p.kg), pertama: lama?.pertama || Date.now() },
	};
	simpanan.poin += poin;
	simpanan.tangkapan += 1;
	simpan();
	catat("ikan");
	if (ikan.kelas >= 1) catat("ikanLangka");
	tambahXp(Math.round(poin * 0.6));
	p.hasil = { ikan, kg: p.kg, cm: panjangCm(ikan, p.kg), baru, rekor, poin, total: simpanan.poin, combo: p.combo, perfect: p.perfect, pengali, bintang: bintangUkuran(ikan, p.kg), lapar: jamLapar().aktif };
	percik(p.ikanPos.x, p.ikanPos.z, 1.4 + ikan.kelas * 0.3);
	// backsound Ajojing / Mancing Mania; fanfare sintetis bila berkasnya tak bisa diputar
	// laga selesai: musik riang "selamat" selama kartu hasil tampil
	hentikanLaga();
	putarRiang();
	suara("tangkap");
	p.lambat = 0.5;
	p.getar = Math.max(p.getar, 0.6);
	getarHp(ikan.kelas >= 3 ? [80, 40, 80, 40, 200] : [60, 40, 90]);
	sorak(SORAK_DAPAT[ikan.kelas], KELAS[ikan.kelas].warna, 0.7, 1);
	keFase("dapat", null);
}
