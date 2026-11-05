import { useSyncExternalStore } from "react";
import { diSitu, jarakKeTepi, perahuBebas } from "./scene/situ";
import { diAirKolam, jarakKeTepiKolam } from "./scene/kolamMonsterData";
import { suasana } from "./scene/suasana";
import { hentikanLaga, hentikanRiang, laguLaga, putarLaga, putarRiang } from "./musikJelajah";
import { suara } from "./suaraPancing";
import { catat, tambahXp } from "./progres";
import { IKAN_TAMBAHAN } from "./ikanTambahan";
import { tutorialBaru } from "./tutorial";

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
	{ nama: "Biasa", warna: "#94a3b8", bobot: 72, tenaga: 0.55, stamina: 6.5, sentak: 0.18, reaksi: 0.85, poin: 10, zona: [0.34, 0.9], regen: 0.1, lari: 0.06, colek: 3 },
	{ nama: "Langka", warna: "#3b82f6", bobot: 20, tenaga: 0.8, stamina: 12, sentak: 0.28, reaksi: 0.72, poin: 25, zona: [0.4, 0.88], regen: 0.35, lari: 0.13, colek: 4 },
	{ nama: "Epik", warna: "#a855f7", bobot: 6.5, tenaga: 1.02, stamina: 19, sentak: 0.36, reaksi: 0.58, poin: 60, zona: [0.46, 0.85], regen: 0.6, lari: 0.19, colek: 5 },
	{ nama: "Monster", warna: "#ef4444", bobot: 1.3, tenaga: 1.22, stamina: 27, sentak: 0.45, reaksi: 0.48, poin: 120, zona: [0.52, 0.82], regen: 0.9, lari: 0.25, colek: 6 },
	{ nama: "Legenda", warna: "#f59e0b", bobot: 0.2, tenaga: 1.42, stamina: 31, sentak: 0.5, reaksi: 0.4, poin: 300, zona: [0.56, 0.8], regen: 0.9, lari: 0.27, colek: 7 },
];

// bentuk: tinggi/lebar badan relatif panjang; ekor "garpu" | "bulat" | "pisau" | "belut".
// k = faktor gemuk Fulton (berat g = k · panjang cm³ / 100) untuk menghitung panjang.
const IKAN_DASAR = [
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
	// --- penghuni eksklusif Kolam Monster DPMD (kolam: true — tidak ada di situ) ---
	{ id: "goliath", nama: "Goliath Tigerfish", latin: "Hydrocynus goliath", kelas: 3, kolam: true, kg: [20, 70], k: 1.15, warna: { punggung: "#4b5563", perut: "#e5e7eb", sirip: "#dc2626" }, bentuk: { tinggi: 0.3, lebar: 0.14, ekor: "garpu", belang: true, kilau: true }, sifat: { lompat: true }, kisah: "Harimau air dari Sungai Kongo bergigi seperti taring. Didatangkan khusus untuk Kolam Monster DPMD." },
	{ id: "piraiba", nama: "Piraiba Raksasa", latin: "Brachyplatystoma filamentosum", kelas: 3, kolam: true, kg: [50, 140], k: 0.85, warna: { punggung: "#57534e", perut: "#e7e5e4", sirip: "#78716c" }, bentuk: { tinggi: 0.2, lebar: 0.18, ekor: "garpu", kumis: true }, kisah: "Lele Amazon seukuran manusia. Tarikannya rendah dan berat seperti jangkar." },
	{ id: "mekong", nama: "Lele Raksasa Mekong", latin: "Pangasianodon gigas", kelas: 4, kolam: true, kg: [120, 300], k: 1.0, warna: { punggung: "#475569", perut: "#e2e8f0", sirip: "#64748b" }, bentuk: { tinggi: 0.27, lebar: 0.19, ekor: "garpu" }, kisah: "Ikan air tawar terbesar di dunia, langka di alam. Babon idaman setiap peserta lomba kolam." },
	{ id: "beluga", nama: "Sturgeon Beluga", latin: "Huso huso", kelas: 4, kolam: true, kg: [150, 400], k: 0.7, warna: { punggung: "#64748b", perut: "#f1f5f9", sirip: "#475569" }, bentuk: { tinggi: 0.18, lebar: 0.16, ekor: "garpu", duri: true }, sifat: { lompat: true }, kisah: "Ikan purba berzirah penghasil kaviar. Penguasa Kolam Monster DPMD." },
];
// Urut kelas (sort stabil) supaya album tersusun dari Biasa sampai Legenda.
export const IKAN = [...IKAN_DASAR, ...IKAN_TAMBAHAN].sort((a, b) => a.kelas - b.kelas);
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
		if (d && typeof d === "object") return { koleksi: d.koleksi || {}, poin: d.poin || 0, tangkapan: d.tangkapan || 0, joran: d.joran || 0, joranPunya: d.joranPunya, joranPakai: d.joranPakai, senar: d.senar || 0, senarPunya: d.senarPunya, pelampungPunya: d.pelampungPunya, pelampungPakai: d.pelampungPakai };
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
// Senar dibeli & dipilih bebas (simpanan.senar = indeks yang dipakai, senarPunya = yang dimiliki):
// kuat = batas tegangan sebelum putus, panjang = senar (m).
export const JORAN = [
	{ id: "bambu", nama: "Joran Bambu", harga: 0, cepat: 1, hoki: 1, gulung: 1, lebar: 0, warna: "#a16207", ujung: "#dc2626", ket: "Joran warisan kakek. Cukup untuk ikan biasa." },
	{ id: "pring", nama: "Joran Pring Muda", harga: 150, cepat: 0.95, hoki: 1.05, gulung: 1.03, lebar: 0.01, warna: "#65a30d", ujung: "#f59e0b", ket: "Bambu pring muda yang lentur — sedikit lebih peka dari bambu biasa." },
	{ id: "fiber", nama: "Joran Fiber", harga: 300, cepat: 0.9, hoki: 1.1, gulung: 1.07, lebar: 0.02, warna: "#1f2937", ujung: "#dc2626", ket: "Lentur & ringan — serba sedikit lebih baik." },
	{ id: "teleskop", nama: "Joran Teleskop", harga: 600, cepat: 0.85, hoki: 1.1, gulung: 1.1, lebar: 0.025, warna: "#475569", ujung: "#38bdf8", ket: "Ruas bisa dipanjangkan, ringan dibawa: gulungan jadi lebih bertenaga." },
	{ id: "karbon", nama: "Joran Karbon", harga: 900, cepat: 0.8, hoki: 1.25, gulung: 1.14, lebar: 0.035, warna: "#0f172a", ujung: "#22d3ee", ket: "Kaku & peka: gulungan cepat, ikan besar lebih sering." },
	{ id: "kilat", nama: "Joran Casting Kilat", harga: 1200, cepat: 0.5, hoki: 1, gulung: 1.1, lebar: 0.02, warna: "#0369a1", ujung: "#fde047", ket: "Spesialis cepat: umpan disambar 2× lebih cepat — panen ikan." },
	{ id: "spinning", nama: "Joran Spinning Lincah", harga: 1600, cepat: 0.6, hoki: 1.1, gulung: 1.18, lebar: 0.03, warna: "#7c3aed", ujung: "#f472b6", ket: "Spesialis lincah: sambaran datang cepat dan tarikan gulung terasa ringan." },
	{ id: "titanium", nama: "Joran Titanium Pro", harga: 2200, cepat: 0.7, hoki: 1.45, gulung: 1.22, lebar: 0.05, warna: "#94a3b8", ujung: "#f97316", ket: "Joran turnamen: cepat, kuat, sering disambar ikan premium." },
	{ id: "elite", nama: "Joran Karbon Elite", harga: 2800, cepat: 0.65, hoki: 1.5, gulung: 1.2, lebar: 0.05, warna: "#1e293b", ujung: "#34d399", ket: "Peka dan seimbang: ikan premium sering mampir." },
	{ id: "dasar", nama: "Joran Dasar Monster", harga: 3500, cepat: 1.15, hoki: 2.3, gulung: 1.18, lebar: 0.04, warna: "#3f2a1d", ujung: "#ef4444", ket: "Spesialis premium: sabar menunggu, yang datang ikan-ikan monster." },
	{ id: "baitcast", nama: "Joran Baitcast Berat", harga: 4200, cepat: 1, hoki: 1.7, gulung: 1.38, lebar: 0.08, warna: "#7f1d1d", ujung: "#fb923c", ket: "Tenaga gulung terbesar untuk menaklukkan ikan raksasa." },
	{ id: "naga", nama: "Joran Naga Emas", harga: 5000, cepat: 0.6, hoki: 1.9, gulung: 1.32, lebar: 0.07, warna: "#ca8a04", ujung: "#facc15", ket: "Legenda para pemancing: cepat & ikan langka seolah datang sendiri." },
	{ id: "kapal", nama: "Joran Kapal Samudra", harga: 7500, cepat: 0.55, hoki: 2, gulung: 1.35, lebar: 0.08, auto: true, warna: "#0e7490", ujung: "#fde68a", ket: "Dibuat untuk ikan terbesar: cepat, kuat, dan ikan langka sering menyambar. Bisa mode AUTO." },
	{ id: "maestro", nama: "Joran Perak Maestro", harga: 12000, cepat: 0.5, hoki: 2.4, gulung: 1.4, lebar: 0.09, auto: true, warna: "#cbd5e1", ujung: "#a78bfa", ket: "Buatan pengrajin ternama: hampir setiap sambaran berpeluang ikan besar. Bisa mode AUTO." },
	{ id: "garuda", nama: "Joran Garuda Sakti", harga: 20000, cepat: 0.45, hoki: 2.8, gulung: 1.45, lebar: 0.1, auto: true, warna: "#111827", ujung: "#ef4444", ket: "Joran pusaka tertinggi. Ikan legenda pun sulit menolak. Bisa mode AUTO." },
];
// Mode AUTO (auto pilot) hanya untuk 3 joran termahal. Koinnya 30% — memancing
// sendiri tetap paling menguntungkan.
export const PENGALI_KOIN_AUTO = 0.3;
// AUTO jauh lebih jarang mendapat ikan besar: tegang & puasnya tetap milik yang memancing sendiri.
const PELUANG_AUTO = [1, 1, 0.5, 0.15, 0.1];
// Ikan Kolam Monster milik pengelola: koin per tangkapan kecil (ikannya dijamin besar);
// hadiah besarnya ada di lomba galatama.
export const PENGALI_KOIN_KOLAM = 0.06;
export const bolehOtomatis = () => !!joranKini().auto;
export const JORAN_PER_ID = Object.fromEntries(JORAN.map((j) => [j.id, j]));
export const SENAR = [
	{ nama: "Senar Nilon 0,25 mm", harga: 0, kuat: 1, panjang: 45, warna: "#f1f5f9", pola: "mono", warna2: "#f1f5f9", opacity: 0.85, tebal: "0,25 mm" },
	{ nama: "Senar Nilon Kuat 0,35 mm", harga: 200, kuat: 1.12, panjang: 48, warna: "#e0f2fe", pola: "mono", warna2: "#e0f2fe", opacity: 0.85, tebal: "0,35 mm" },
	{ nama: "Senar PE Anyam ×4", harga: 600, kuat: 1.28, panjang: 52, warna: "#bbf7d0", pola: "anyam", warna2: "#16a34a", opacity: 0.9, tebal: "PE ×4" },
	{ nama: "Senar PE Anyam ×8", harga: 1500, kuat: 1.45, panjang: 56, warna: "#fde68a", pola: "anyam", warna2: "#d97706", opacity: 0.9, tebal: "PE ×8" },
	{ nama: "Senar Fluorocarbon Pro", harga: 3000, kuat: 1.62, panjang: 62, warna: "#c4b5fd", pola: "fluoro", warna2: "#c4b5fd", opacity: 0.35, tebal: "0,40 mm bening" },
	{ nama: "Senar Kevlar Naga", harga: 6000, kuat: 1.85, panjang: 70, warna: "#fca5a5", pola: "anyam", warna2: "#b91c1c", opacity: 0.9, tebal: "Kevlar ×8" },
	{ nama: "Senar Dyneema Pro", harga: 8000, kuat: 1.98, panjang: 76, warna: "#67e8f9", pola: "anyam", warna2: "#0e7490", opacity: 0.9, tebal: "PE ×12" },
	{ nama: "Senar Titanium Anyam", harga: 10500, kuat: 2.1, panjang: 82, warna: "#d1d5db", pola: "anyam", warna2: "#475569", opacity: 0.9, tebal: "Titanium ×12" },
	{ nama: "Senar Karbon Hitam", harga: 12500, kuat: 2.2, panjang: 86, warna: "#a5b4fc", pola: "anyam", warna2: "#312e81", opacity: 0.95, tebal: "Karbon ×16" },
	{ nama: "Senar Serat Naga Langit", harga: 15000, kuat: 2.3, panjang: 90, warna: "#fcd34d", pola: "pusaka", warna2: "#fff7ed", opacity: 1, tebal: "Pusaka ×24" },
];
// Pelampung: dibeli lalu dipilih. cepat = pengali lama menunggu sambaran; reaksi = pengali waktu
// sentak saat ikan menyambar (lebih besar = lebih longgar); hoki = pengali peluang ikan premium.
export const PELAMPUNG = [
	{ id: "bola", nama: "Pelampung Bola", harga: 0, cepat: 1, reaksi: 1, hoki: 1, warna: "#ef4444", warna2: "#f8fafc", ukuran: 1, ket: "Pelampung merah-putih standar. Tidak ada keunggulan, tidak ada kekurangan." },
	{ id: "pena", nama: "Pelampung Pena", harga: 100, cepat: 1, reaksi: 1.35, hoki: 1, warna: "#38bdf8", warna2: "#f8fafc", ukuran: 0.9, ket: "Sangat peka: sentakan terasa jelas dan waktu menyentak lebih longgar." },
	{ id: "peluru", nama: "Pelampung Peluru", harga: 250, cepat: 0.88, reaksi: 1, hoki: 1, warna: "#f59e0b", warna2: "#78350f", ukuran: 1, ket: "Tenggelam cepat ke umpan, ikan jadi lebih cepat menyambar." },
	{ id: "tembaga", nama: "Pelampung Tembaga Malam", harga: 500, cepat: 0.95, reaksi: 1.1, hoki: 1.12, warna: "#b45309", warna2: "#fde68a", ukuran: 1.05, ket: "Berkilau lembut di air gelap, menarik ikan yang lebih besar." },
	{ id: "neon", nama: "Pelampung Neon", harga: 900, cepat: 0.92, reaksi: 1.3, hoki: 1.05, warna: "#a3e635", warna2: "#18181b", ukuran: 1, ket: "Terlihat jelas dari kejauhan; sentak lebih mudah tepat waktu." },
	{ id: "kristal", nama: "Pelampung Kristal", harga: 1500, cepat: 0.85, reaksi: 1.2, hoki: 1.25, warna: "#67e8f9", warna2: "#e0f2fe", ukuran: 1.1, ket: "Bening bak kaca: cepat, peka, dan disukai ikan langka." },
	{ id: "giok", nama: "Pelampung Giok Hijau", harga: 3000, cepat: 0.8, reaksi: 1.35, hoki: 1.4, warna: "#10b981", warna2: "#064e3b", ukuran: 1.1, ket: "Batu giok bertuah: ikan premium lebih sering datang." },
	{ id: "naga", nama: "Pelampung Naga", harga: 6000, cepat: 0.72, reaksi: 1.5, hoki: 1.5, warna: "#facc15", warna2: "#b91c1c", ukuran: 1.2, ket: "Pelampung pusaka: paling cepat, paling peka, dan paling disukai ikan legenda." },
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
// Senar dulu dibeli berurutan (simpanan.senar = tingkat): semua senar sampai tingkat itu tetap dimiliki.
if (!Array.isArray(simpanan.senarPunya)) simpanan.senarPunya = Array.from({ length: Math.min(SENAR.length - 1, simpanan.senar || 0) + 1 }, (_, i) => i);

export const joranKini = () => JORAN_PER_ID[simpanan.joranPakai] || JORAN[0];
export const senarKini = () => SENAR[Math.min(SENAR.length - 1, simpanan.senar || 0)];
export const tingkatSenar = () => Math.min(SENAR.length - 1, simpanan.senar || 0);
export const punyaJoran = (id) => id === "bambu" || (simpanan.joranPunya || []).includes(id);
export const punyaSenar = (i) => i === 0 || (simpanan.senarPunya || []).includes(i);
export const PELAMPUNG_PER_ID = Object.fromEntries(PELAMPUNG.map((p) => [p.id, p]));
export const pelampungKini = () => PELAMPUNG_PER_ID[simpanan.pelampungPakai] || PELAMPUNG[0];
export const punyaPelampung = (id) => id === "bola" || (simpanan.pelampungPunya || []).includes(id);
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
// Beli (bila belum punya) lalu langsung dipakai.
export function pakaiSenar(i) {
	const sn = SENAR[i];
	if (!sn) return "Senar tidak dikenal";
	if (!punyaSenar(i)) {
		if (!bayarKoin(sn.harga)) return "Koin belum cukup (perlu 🪙 " + sn.harga + ")";
		simpanan.senarPunya = [...(simpanan.senarPunya || []), i];
	}
	simpanan.senar = i;
	simpan();
	return null;
}
export function pakaiPelampung(id) {
	const p = PELAMPUNG_PER_ID[id];
	if (!p) return "Pelampung tidak dikenal";
	if (!punyaPelampung(id)) {
		if (!bayarKoin(p.harga)) return "Koin belum cukup (perlu 🪙 " + p.harga + ")";
		simpanan.pelampungPunya = [...(simpanan.pelampungPunya || []), id];
	}
	simpanan.pelampungPakai = id;
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

// ---------- kamera memancing ----------
// standar = orang ketiga; dekat = seluruh badan dari belakang bahu; atas = dari atas
// (pemancing, senar & ikan terlihat); sinematik = kamera menyamping mengikuti ikan.
export const MODE_KAMERA = [
	{ id: "standar", nama: "Standar", ikon: "🎥" },
	{ id: "dekat", nama: "Dekat", ikon: "🧍" },
	{ id: "atas", nama: "Atas", ikon: "🛰️" },
	{ id: "sinematik", nama: "Sinematik", ikon: "🎬" },
];
const KUNCI_KAMERA = "jelajah-pancing-kamera";
const bacaKamera = () => {
	try {
		const m = localStorage.getItem(KUNCI_KAMERA);
		return MODE_KAMERA.some((k) => k.id === m) ? m : "standar";
	} catch {
		return "standar";
	}
};

// ---------- kait Kolam Monster (diisi kolamMonster.js, supaya tidak saling impor) ----------
// aksesKolam(): masih boleh memancing di kolam (tiket/lomba berlaku)?
// saatDapat(ikan, kg): tangkapan di kolam — dicatat untuk lomba.
// lombaBerjalan(): lomba sedang berlangsung (mode AUTO dilarang).
const kaitKolam = { aksesKolam: () => false, saatDapat: () => {}, lombaBerjalan: () => false };
export const aturKaitKolam = (k) => Object.assign(kaitKolam, k);

export const pancing = {
	combo: 0, // tangkapan beruntun tanpa gagal (pengali koin)
	perfect: false, // sentakan sangat cepat saat ikan menyambar
	aktif: false,
	perahu: false,
	kolam: false, // sedang memancing di Kolam Monster (bukan situ)
	otomatis: false, // mode AUTO (hanya joran kelas atas)
	arahOto: 0, // arah joran pilihan auto pilot saat adu tarik
	kamera: bacaKamera(),
	asal: { x: 0, z: 0, rot: 0 }, // posisi pemancing & arah hadap dasar
	aim: 0, // putaran bidikan relatif arah hadap
	fase: "siap",
	t: 0,
	// masukan dari UI: tahan (mengayun lemparan), ketukan (jumlah tekan-lepas), arah
	tahan: false,
	ketukan: 0,
	arah: 0, // A/D atau analog: −1 kiri … 1 kanan
	arahMouse: 0, // posisi mouse relatif tengah layar (−1 kiri … 1 kanan)
	ayun: 0, // arah joran saat menunggu & adu tarik (dihaluskan); pelampung/ikan ikut terseret
	mouseBasis: 0, // posisi mouse saat mulai menunggu — ayunan dihitung relatif darinya
	riakGeser: 0,
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
	// tarikan sakti: terisi selama tegangan dijaga di rentang pas; penuh = satu hentakan besar
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
	gaya: { condong: 0, lengan: 0, engkol: 0, putar: 0, lutut: 0, lompat: 0, balik: 0 },
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

// Boolean, bukan versi: halaman induk hanya render ulang saat adu tarik mulai/selesai.
export const useSedangTarik = () =>
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => pancing.fase === "tarik",
	);

const acak = (a, b) => a + Math.random() * (b - a);
const malam = () => suasana.malam > 0.5;

// Perairan tempat memancing sekarang: situ (luas, berperahu) atau Kolam Monster.
const diAir = (x, z) => (pancing.kolam ? diAirKolam(x, z, 0.3) : diSitu(x, z));
const kedalaman = (x, z) => (pancing.kolam ? jarakKeTepiKolam(x, z) : jarakKeTepi(x, z));
export const bebasLempar = (x, z, r) => (pancing.kolam ? diAirKolam(x, z, 0.5) : perahuBebas(x, z, r));

export function aturKamera(id) {
	if (!MODE_KAMERA.some((k) => k.id === id)) return;
	pancing.kamera = id;
	try {
		localStorage.setItem(KUNCI_KAMERA, id);
	} catch {
		/* abaikan */
	}
	beritahu();
}
export function gantiKamera() {
	const i = MODE_KAMERA.findIndex((k) => k.id === pancing.kamera);
	aturKamera(MODE_KAMERA[(i + 1) % MODE_KAMERA.length].id);
	pesanSaja(`Kamera: ${MODE_KAMERA.find((k) => k.id === pancing.kamera).nama}`);
}

// Nyalakan/matikan AUTO. Mengembalikan pesan alasan bila ditolak.
export function aturOtomatis(nyala) {
	const tolak = nyala && !bolehOtomatis() ? "🔒 AUTO hanya untuk Joran Kapal Samudra, Perak Maestro, atau Garuda Sakti" : nyala && pancing.kolam && kaitKolam.lombaBerjalan() ? "🏆 Selama lomba, memancing wajib manual" : null;
	if (tolak) {
		pesanSaja(tolak, "buruk");
		return tolak;
	}
	pancing.otomatis = !!nyala;
	pancing.tahan = false;
	pancing.arahOto = 0;
	oto.tunda = 0.4;
	pesanSaja(nyala ? "🤖 AUTO menyala — koin 30% & ikan besar jauh lebih jarang" : "AUTO mati — kendali kembali ke tanganmu", nyala ? "baik" : "info");
	return null;
}

// ---------- auto pilot ----------
// Meniru pemancing ahli: lempar mendekati tenaga penuh, abaikan colekan, sentak cepat,
// gulung menjaga tegangan di rentang pas, berhenti saat ikan lari/melompat, lawan arah
// lari ikan, pakai tarikan sakti begitu siap, lalu lanjut memancing sendiri.
const oto = { tunda: 0, target: 0.95, faseLalu: null, reaksi: 0, jedaKetuk: 0 };
function kendaliOtomatis(dt) {
	const p = pancing;
	if (p.fase !== oto.faseLalu) {
		oto.faseLalu = p.fase;
		oto.reaksi = acak(0.12, 0.28) * (KELAS[p.ikan?.kelas ?? 0]?.reaksi ?? 0.8);
		if (p.fase === "siap") {
			oto.tunda = acak(0.5, 1.1);
			p.aim = acak(-0.45, 0.45);
		}
	}
	oto.tunda -= dt;
	if (p.fase === "siap") {
		if (!p.tahan) {
			if (oto.tunda <= 0) {
				oto.target = acak(0.9, 0.99);
				p.tahan = true;
				p.ketukan++;
			}
		} else if (p.t > 0.25 && p.tenaga >= oto.target) {
			p.tahan = false;
			oto.tunda = acak(1.2, 2);
			// lemparan tertolak (terlalu dekat tepi): bidik ulang ke arah lain
			p.aim = acak(-0.6, 0.6);
		}
	} else if (p.fase === "tunggu") {
		p.tahan = false;
	} else if (p.fase === "gigit") {
		if (p.t >= oto.reaksi && oto.tunda !== -99) {
			p.ketukan++;
			oto.tunda = -99;
		}
	} else if (p.fase === "tarik") {
		oto.tunda = 0;
		p.arahOto = -p.arahIkan;
		if (p.kuasa >= 1) tarikanSakti();
		const [zb, za] = zonaKini(p.ikan.kelas);
		const tegangan = p.tegang + (p.geleng || 0);
		// saat ikan lari atau melompat/menyetrum: lepaskan gulungan
		let laju = 0;
		if (!(p.lari > 0) && !p.peristiwa) {
			if (tegangan < zb + (za - zb) * 0.25) laju = 9;
			else if (tegangan < (zb + za) / 2) laju = 6;
			else if (tegangan < za - 0.04) laju = 3;
			if (p.habisi && tegangan < za) laju = Math.max(laju, 8);
		}
		oto.jedaKetuk -= dt;
		if (laju > 0 && oto.jedaKetuk <= 0) {
			p.ketukan++;
			oto.jedaKetuk = 1 / laju;
		}
	} else if (p.fase === "dapat") {
		if (p.t > 2.6) lanjutPancing();
	}
}

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

export function mulaiPancing({ x, z, rot, perahu, kolam, duduk }) {
	Object.assign(pancing, { aktif: true, perahu: !!perahu, kolam: !!kolam, duduk: !!duduk, asal: { x, z, rot }, aim: 0, tahan: false, arah: 0, arahOto: 0, hasil: null, ikan: null, cipratan: [], kuasa: 0, habisi: false, kilat: 0, dorong: 0, lambat: 0, sorak: null });
	// AUTO tidak terbawa ke joran biasa atau ke lomba
	if (pancing.otomatis && (!bolehOtomatis() || (kolam && kaitKolam.lombaBerjalan()))) pancing.otomatis = false;
	oto.faseLalu = null;
	keFase("siap", tutorialBaru(kolam ? "pesan:kolam" : "pesan:lempar") ? {
		teks: kolam ? "🦈 Kolam Monster — isinya hanya ikan Monster & Legenda. Tahan untuk mengayun!" : "Tahan untuk mengayun joran, lepas untuk melempar",
		jenis: kolam ? "besar" : "info",
	} : null);
}

export function berhentiPancing() {
	hentikanLaga();
	hentikanRiang();
	pancing.aktif = false;
	pancing.kolam = false;
	pancing.ikan = null;
	pancing.hasil = null;
	pancing.tahan = false;
	keFase("siap", null);
}

// Pemain mengayuh perahu / bergeser: posisi pemancing ikut.
export const geserAsal = (x, z, rot) => Object.assign(pancing.asal, { x, z, rot });

export function lanjutPancing() {
	hentikanRiang();
	pancing.hasil = null;
	pancing.ikan = null;
	keFase("siap", tutorialBaru("pesan:lagi") ? { teks: "Lempar lagi! Makin jauh ke tengah, makin besar ikannya", jenis: "info" } : null);
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
	const calon = pilihIkan(kedalaman(p.pelampung.x, p.pelampung.z));
	p.ikanTunggu = calon;
	const kls = KELAS[calon.ikan.kelas];
	const cepat = (malam() ? 0.85 : 1) * (p.sempurna ? 0.8 : 1) * (1 + calon.ikan.kelas * 0.3) * (jamLapar().aktif ? 0.5 : 1) * (suasana.hujan > 0.5 ? 0.8 : 1) * (p.kolam ? 0.55 : 1); // hujan: ikan lebih aktif; kolam berbayar: padat ikan
	// ikan butuh waktu menemukan umpan; makin dalam & makin besar makin lama
	p.tungguSampai = acak(4.5, 11) * cepat * joranKini().cepat * pelampungKini().cepat;
	const n = Math.floor(Math.random() * (kls.colek + 1));
	p.colekBunyi = -1;
	p.colek = false;
	// gulung ulang pelan-pelan (seperti pemancing sungguhan), lihat fase "tunggu"
	p.menggulung = false;
	p.gulungTerakhir = -9;
	p.klikGulung = 0;
	p.colekan = Array.from({ length: n }, () => acak(0.8, p.tungguSampai - 0.6)).sort((a, b) => a - b);
	// joran mulai dari posisi diam: ayunan saat menunggu relatif dari mouse sekarang
	p.mouseBasis = p.arahMouse;
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

// Kolam Monster: hanya kelas Monster & Legenda (situ maupun eksklusif kolam), tanpa
// syarat malam/perahu/kedalaman; berat condong lebih besar daripada di situ.
export function pilihIkanKolam(hoki = joranKini().hoki * pelampungKini().hoki) {
	const auto = pancing.otomatis;
	const bobot = [0, 0, 0, 92, 8 * Math.sqrt(hoki) * (auto ? PELUANG_AUTO[4] : 1)];
	const kelas = Math.random() * (bobot[3] + bobot[4]) < bobot[3] ? 3 : 4;
	const calon = IKAN.filter((f) => f.kelas === kelas && f.id !== "raja");
	const ikan = calon[Math.floor(Math.random() * calon.length)];
	const kg = ikan.kg[0] + (ikan.kg[1] - ikan.kg[0]) * Math.pow(Math.random(), auto ? 3 : 1.5);
	return { ikan, kg: Math.round(kg * 100) / 100 };
}

export function pilihIkan(jauh) {
	if (pancing.kolam) return pilihIkanKolam();
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
	const hoki = joranKini().hoki * pelampungKini().hoki;
	kalikan([1, 1, Math.sqrt(hoki), hoki, hoki * 1.1]);
	// pengali bonus dibatasi supaya ikan langka tetap jarang (kelas Biasa/Langka boleh turun, tidak naik)
	const BATAS_BONUS = [1, 1, 3, 3.5, 4];
	const layak = (ikan) => {
		const s = ikan.syarat || {};
		return !ikan.kolam && (!s.malam || m) && (!s.perahu || pancing.perahu) && (!s.jauh || jauh >= s.jauh) && (!s.sempurna || pancing.sempurna);
	};
	const bobot = KELAS.map((k, i) => (IKAN.some((f) => f.kelas === i && layak(f)) ? k.bobot * Math.min(kali[i], BATAS_BONUS[i]) * (pancing.otomatis ? PELUANG_AUTO[i] : 1) : 0));
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
	// AUTO: masukan (tahan/ketukan/arah) disuntikkan sebelum dibaca di bawah
	if (p.otomatis) {
		p.dibantuAuto = true;
		if (!bolehOtomatis() || (p.kolam && kaitKolam.lombaBerjalan())) p.otomatis = false;
		else kendaliOtomatis(dt);
	}
	// tiket kolam habis: ikan yang sedang dilawan dituntaskan dulu, baru berhenti
	if (p.kolam && (p.fase === "siap" || p.fase === "gagal") && !kaitKolam.aksesKolam()) {
		kaitKolam.saatHabis?.();
		berhentiPancing();
		return;
	}
	const ketukBaru = p.ketukan - ketukanLalu;
	ketukanLalu = p.ketukan;
	const tekan = ketukBaru > 0 || (p.tahan && !tahanLalu); // baru ditekan
	const lepas = !p.tahan && tahanLalu;
	tahanLalu = p.tahan;
	p.getar = Math.max(0, p.getar - dt * 2.5);
	p.kilat = Math.max(0, p.kilat - dt * 3);
	// adu tarik: joran diarahkan dengan mouse (atau A/D / analog) — lawan arah lari ikan
	// Menunggu: joran digerakkan relatif dari posisi mouse awal (pelampung ikut terseret).
	const masukan = p.fase === "tarik"
		? (p.otomatis ? p.arahOto : p.arah !== 0 ? p.arah : p.arahMouse)
		: p.fase === "tunggu" ? (p.arah !== 0 ? p.arah : Math.max(-1, Math.min(1, p.arahMouse - p.mouseBasis))) : 0;
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
				return bebasLempar(x, z, 0.2);
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
		// Joran yang diayun menyeret pelampung menyusuri air ke arah ujung joran
		// (senar sedikit tergulung), seperti menggoda ikan dengan umpan.
		const a = arahLempar();
		const jarakSenar = Math.hypot(p.pelampung.x - o.x, p.pelampung.z - o.z);
		const tujuanX = o.x + Math.sin(a) * jarakSenar;
		const tujuanZ = o.z + Math.cos(a) * jarakSenar;
		const selisih = Math.hypot(tujuanX - p.pelampung.x, tujuanZ - p.pelampung.z);
		if (selisih > 0.05) {
			const langkah = Math.min(selisih, 1.6 * dt);
			const tarik = jarakSenar > 4 ? 0.12 * langkah : 0;
			let x = p.pelampung.x + ((tujuanX - p.pelampung.x) / selisih) * langkah;
			let z = p.pelampung.z + ((tujuanZ - p.pelampung.z) / selisih) * langkah;
			x -= ((x - o.x) / jarakSenar) * tarik;
			z -= ((z - o.z) / jarakSenar) * tarik;
			if (bebasLempar(x, z, 0.2)) {
				p.pelampung.x = x;
				p.pelampung.z = z;
				p.riakGeser -= dt;
				if (p.riakGeser <= 0) {
					percik(x, z, 0.18);
					p.riakGeser = 0.35;
				}
			}
		}
		const i = p.colekan.findIndex((c) => p.t > c && p.t < c + 0.35);
		p.colek = i >= 0;
		if (p.colek && p.colekBunyi !== i) {
			p.colekBunyi = i;
			suara("colek");
		}
		// Menggulung ulang: senar ditarik masuk pelan-pelan selama SPASI ditahan / diketuk,
		// pelampung menyusuri air mendekat; baru terangkat saat sudah dekat tepi. Umpan yang
		// bergerak tetap bisa disambar ikan.
		if (tekan) {
			p.gulungTerakhir = p.t;
			if (!p.menggulung) {
				if (p.colek) return lepasTapiTunggu("Terlalu cepat! Ikannya cuma mencolek lalu kabur — umpan masih di air, tunggu lagi");
				p.menggulung = true;
				pesanSaja("Menggulung senar pelan-pelan… tahan / ketuk terus. Umpan yang bergerak bisa disambar!", "info");
			}
		}
		if (p.menggulung && (p.tahan || p.t - p.gulungTerakhir < 0.35)) {
			const jarak = Math.hypot(p.pelampung.x - o.x, p.pelampung.z - o.z);
			const langkahGulung = Math.min(jarak, 1.7 * joranKini().gulung * dt);
			const nx = p.pelampung.x - ((p.pelampung.x - o.x) / (jarak || 1)) * langkahGulung;
			const nz = p.pelampung.z - ((p.pelampung.z - o.z) / (jarak || 1)) * langkahGulung;
			if (jarak - langkahGulung < 2.2 || !bebasLempar(nx, nz, 0.1)) {
				suara("gulung");
				p.menggulung = false;
				return keFase("siap", { teks: "Senar tergulung. Lempar lagi!", jenis: "info" });
			}
			p.pelampung.x = nx;
			p.pelampung.z = nz;
			p.klikGulung -= dt;
			if (p.klikGulung <= 0) {
				suara("klik");
				percik(nx, nz, 0.14);
				p.klikGulung = 0.16;
			}
		}
		if (p.t >= p.tungguSampai) {
			const { ikan, kg } = p.ikanTunggu || pilihIkan(kedalaman(p.pelampung.x, p.pelampung.z));
			p.ikan = ikan;
			p.kg = kg;
			p.jendela = KELAS[ikan.kelas].reaksi * pelampungKini().reaksi;
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
			// tangkapan yang sempat dibantu AUTO tetap dihitung AUTO, walau dimatikan sebelum ikan naik
			p.dibantuAuto = p.otomatis;
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

	if (p.fase === "gagal" && p.t > 1.8) keFase("siap", null);
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
		// meteran tarikan sakti terisi selama tegangan dijaga di rentang pas (±9 detik)
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
		getarHp(35);
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
	if (diAir(x, z)) p.ikanPos = { x, z };
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
	const pengali = (1 + Math.min(p.combo - 1, 5) * 0.1) * (p.perfect ? 1.15 : 1) * (p.dibantuAuto ? PENGALI_KOIN_AUTO : 1) * (p.kolam ? PENGALI_KOIN_KOLAM : 1);
	const poin = Math.round(KELAS[ikan.kelas].poin * (1 + Math.sqrt(p.kg)) * (p.sempurna ? 1.2 : 1) * pengali);
	// tangkapan di kolam ikut dihitung lomba (bila sedang berlangsung)
	const lomba = p.kolam ? kaitKolam.saatDapat(ikan, p.kg) : null;
	simpanan.koleksi = {
		...simpanan.koleksi,
		[ikan.id]: { jumlah: (lama?.jumlah || 0) + 1, terberat: Math.max(lama?.terberat || 0, p.kg), pertama: lama?.pertama || Date.now() },
	};
	simpanan.poin += poin;
	simpanan.tangkapan += 1;
	simpan();
	catat("ikan");
	if (ikan.kelas >= 1) catat("ikanLangka");
	if (p.kolam) catat("ikanKolam");
	tambahXp(Math.round(poin * 0.6));
	p.hasil = { ikan, kg: p.kg, cm: panjangCm(ikan, p.kg), baru, rekor, poin, total: simpanan.poin, combo: p.combo, perfect: p.perfect, pengali, bintang: bintangUkuran(ikan, p.kg), lapar: jamLapar().aktif, otomatis: p.dibantuAuto, kolam: p.kolam, lomba };
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
