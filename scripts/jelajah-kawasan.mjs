// Membangun src/features/jelajah/scene/kawasanData.js — kawasan Kompleks Perkantoran
// Pemda Kabupaten Bogor (Cibinong) di sekeliling kantor DPMD: tapak gedung, jalan,
// Situ Pemda, taman, sungai, dan pepohonan. Sumber: OpenStreetMap (ODbL).
//
//   node scripts/jelajah-kawasan.mjs
//
// Unduhan OSM disimpan di folder temp, jadi menjalankan ulang (mis. setelah mengubah
// GESER_X) tidak mengunduh lagi. Hapus berkas jelajah-osm-*.osm di temp untuk data baru.
//
// Kerangka koordinat adegan: gedung DPMD di (0, 0), menghadap +z ke Jl. KSR Dadi
// Kusmayadi (di OSM: "Jalan Raya Cikaret") yang as-nya di z = 35,6. +x = arah barat
// sepanjang jalan, +z ≈ utara. Jalan nyata miring ±11° dari timur–barat, jadi peta
// diputar supaya jalan itu sejajar sumbu x seperti jalan buatan tangan di adegan.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DI_SINI = path.dirname(fileURLToPath(import.meta.url));
const KELUARAN = path.join(DI_SINI, "../src/features/jelajah/scene/kawasanData.js");

// Titik presensi kantor (sama dengan KANTOR_LAT/LNG di absensi.controller.js).
const ACUAN = { lat: -6.47553948391432, lon: 106.8276556221009 };
// Kemiringan Jl. KSR Dadi Kusmayadi di depan kantor (regresi titik-titik jalan ±100 m).
const PUTAR = (-11.3 * Math.PI) / 180;
// As jalan nyata 11,4 m di selatan titik presensi; di adegan as jalan di z = 35,6.
const GESER_Z = 47;
// Gedung DPMD 22 m di timur titik presensi: Kesbangpol (Jl. KSR Dadi Kusmayadi No. 41)
// jadi tetangga sebelah kanan, Situ Pemda di belakang kiri.
const GESER_X = 22;

// Wilayah yang dibangun (koordinat adegan). Mencakup Kantor Bupati, Setda, DPRD,
// alun-alun, Masjid Baitul Faizin, Stadion Persikabo, Situ Pemda, Jl. Tegar Beriman beserta
// Polres & Kejaksaan di seberangnya, dan permukiman di barat Jl. Bersih.
const WILAYAH = { x0: -190, x1: 640, z0: -720, z1: 170 };
// Halaman DPMD & jalan buatan tangan: fitur OSM di sini dibuang supaya tidak menimpa.
const HALAMAN = { x0: -17, x1: 22.4, z0: -24, z1: 28.6 };
const JALAN_DEPAN = { x0: -61, x1: 61, z0: 29, z1: 42 };
// Pohon buatan tangan di sekitar halaman; pohon kawasan tidak ditanam di sini.
const LUAR_LAMA = { x0: -36, x1: 36, z0: -24, z1: 48 };

const UNDUH = [
	[106.8190, -6.4845, 106.8245, -6.4725],
	[106.8245, -6.4845, 106.8302, -6.4725],
];

// ---------- unduh & urai OSM ----------

async function unduh([a, b, c, d]) {
	const berkas = path.join(os.tmpdir(), `jelajah-osm-${a}_${b}_${c}_${d}.osm`);
	if (fs.existsSync(berkas) && fs.readFileSync(berkas, "utf8").trimEnd().endsWith("</osm>")) return fs.readFileSync(berkas, "utf8");
	for (let i = 1; i <= 5; i++) {
		try {
			const r = await fetch(`https://api.openstreetmap.org/api/0.6/map?bbox=${a},${b},${c},${d}`, { headers: { "User-Agent": "dpmd-jelajah-kawasan/1.0" } });
			const teks = await r.text();
			if (r.ok && teks.trimEnd().endsWith("</osm>")) {
				fs.writeFileSync(berkas, teks);
				return teks;
			}
			console.warn(`unduhan ${i} terpotong (${teks.length} bita), mengulang…`);
		} catch (e) {
			console.warn(`unduhan ${i} gagal: ${e.message}`);
		}
	}
	throw new Error("gagal mengunduh data OSM");
}

const entitas = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
function tag(s) {
	const t = {};
	for (const m of s.matchAll(/<tag k="([^"]+)" v="([^"]*)"/g)) t[m[1]] = entitas(m[2]);
	return t;
}

const NODE = new Map();
const WAY = new Map();
function urai(xml) {
	for (const m of xml.matchAll(/<node id="(\d+)"[^>]*?lat="([-\d.]+)" lon="([-\d.]+)"(?:\/>|>([\s\S]*?)<\/node>)/g)) {
		NODE.set(m[1], { lat: +m[2], lon: +m[3], tag: tag(m[4] || "") });
	}
	for (const m of xml.matchAll(/<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g)) {
		WAY.set(m[1], { id: m[1], nd: [...m[2].matchAll(/<nd ref="(\d+)"/g)].map((a) => a[1]), tag: tag(m[2]) });
	}
}

// ---------- proyeksi ke koordinat adegan ----------

const M_LAT = 110574;
const M_LON = 111320 * Math.cos((ACUAN.lat * Math.PI) / 180);
const COS = Math.cos(PUTAR);
const SIN = Math.sin(PUTAR);
function ke({ lat, lon }) {
	const e = (lon - ACUAN.lon) * M_LON;
	const n = (lat - ACUAN.lat) * M_LAT;
	return [GESER_X - (COS * e + SIN * n), -SIN * e + COS * n + GESER_Z];
}

const bulat = (v) => Math.round(v * 10) / 10;
const titikWay = (w) => w.nd.map((id) => NODE.get(id)).filter(Boolean).map(ke);
const tertutup = (w) => w.nd.length > 3 && w.nd[0] === w.nd[w.nd.length - 1];
const di = (r, [x, z]) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const pusat = (p) => p.reduce((s, q) => [s[0] + q[0] / p.length, s[1] + q[1] / p.length], [0, 0]);
function luas(p) {
	let s = 0;
	for (let i = 0; i < p.length; i++) {
		const [x1, z1] = p[i];
		const [x2, z2] = p[(i + 1) % p.length];
		s += x1 * z2 - x2 * z1;
	}
	return s / 2;
}
function dalamPoligon([x, z], p) {
	let ya = false;
	for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
		const [xi, zi] = p[i];
		const [xj, zj] = p[j];
		if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ya = !ya;
	}
	return ya;
}
function jarakRuas([x, z], [ax, az], [bx, bz]) {
	const dx = bx - ax;
	const dz = bz - az;
	const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
	return Math.hypot(x - ax - dx * t, z - az - dz * t);
}
// Buang titik yang hampir segaris (< 0,25 m dari garis tetangganya) untuk memperkecil data.
function sederhanakan(p, tutup) {
	if (p.length <= (tutup ? 4 : 2)) return p;
	const hasil = [];
	for (let i = 0; i < p.length; i++) {
		const a = i ? p[i - 1] : tutup ? p[p.length - 1] : null;
		const b = i < p.length - 1 ? p[i + 1] : tutup ? p[0] : null;
		if (a && b && jarakRuas(p[i], a, b) < 0.25) continue;
		hasil.push(p[i]);
	}
	return hasil.length >= (tutup ? 3 : 2) ? hasil : p;
}
const datar = (p) => p.flatMap(([x, z]) => [bulat(x), bulat(z)]);
// Poligon dibuat berlawanan arah jarum jam (dilihat dari atas, sumbu x kanan, z ke bawah layar).
const ccw = (p) => (luas(p) < 0 ? [...p].reverse() : p);

// ---------- nama tampilan ----------

const SINGKATAN = new Set(["DPRD", "UKM", "BPN", "KPP", "PMI", "MUI", "BAZNAS", "SAMSAT", "KLPBJ", "TNKB", "PBB", "BPJS", "BPBD", "DPMPTSP", "PDI", "PPP", "KNPI", "RSUD", "DP3AKB", "PU", "KORPRI", "BIG", "SIM", "DPD", "SMP", "SMA", "SD", "TK", "RS", "BRI", "BNI", "BJB", "ATM", "UPT", "UPTD", "KODIM", "POLRES", "SPBU"]);
const KECIL = new Set(["dan", "di", "ke", "dari", "untuk", "yang"]);
function rapikanNama(n) {
	return n
		.replace(/\s+/g, " ")
		.trim()
		.split(" ")
		.map((k, i) => {
			const besar = k.toUpperCase();
			if (SINGKATAN.has(besar.replace(/[^A-Z0-9]/g, ""))) return besar;
			if (i && KECIL.has(k.toLowerCase())) return k.toLowerCase();
			return k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
		})
		.join(" ")
		.replace(/Kabupaten Bogor$|Kab\.? Bogor$/i, "")
		.trim();
}
// Nama yang di OSM salah ketik / terlalu panjang / kurang jelas.
const NAMA = {
	"222859670": "Kantor Bupati Bogor",
	"222859672": "Sekretariat Daerah",
	"222860443": "Gedung DPRD Kabupaten Bogor",
	"222860449": "Rumah Dinas Bupati",
	"405053053": "Rumah Dinas Wakil Bupati",
	"405035053": "Rumah Dinas Wakil Bupati",
	"1035896682": "Badan Kesbangpol",
	"1035896771": "Badan Kesbangpol",
	"223221064": "Dinas Tata Ruang dan Pertanahan",
	"578436750": "Bappedalitbang",
	"578436759": "DPMPTSP",
	"578436744": "Dinas PUPR",
	"578436747": "Dinas PUPR",
	"222860447": "Satpol PP",
	"222860441": "Dinas Perdagangan & Perindustrian",
	"222440798": "Gedung KORPRI",
	"222860442": "Inspektorat",
	"306871019": "Masjid Baitul Faizin",
	"405038544": "Dinas Pendidikan",
	"844452564": "Dinas Pendidikan",
	"405038545": "KLPBJ",
	"224711029": "Dinas Pertanian dan Kehutanan",
	"844452586": "Dinas Pertanian dan Peternakan",
	"224315949": "Kantor Aset (BPKAD)",
	"222860445": "Kantor Perhutani",
	"224315950": "KPP Pratama Cibinong",
	"844452579": "KPP Pratama Cibinong",
	"207905931": "SAMSAT Kabupaten Bogor",
	"207905928": "SAMSAT Drive Thru",
	"207905933": null,
	"207905930": null,
	"578436756": "Gedung Kesenian",
	"578436748": "Dinas Kesehatan",
	"578436749": "Dinas Kesehatan",
	"224315955": "Polres Bogor",
	"224315951": "Kejaksaan Negeri",
	"578436751": "Kejaksaan Negeri",
	"844404000": "BAZNAS",
	"222410966": "Stadion Mini Persikabo",
	"222860448": "Alun-Alun Kabupaten Bogor",
	"31068762": "Situ Pemda",
	"224193805": "Taman Siliwangi",
	"1427440914": "Taman Situ Plaza",
	"223225723": "Kantor Pos",
	"223225724": "Kantor Telkom",
	"578436765": null,
	"1177750197": null,
	"405035049": null,
	"578437737": null,
};
// Titik (node) bernama di dalam gedung tak bernama: namanya dipinjam gedung itu.
const NAMA_NODE = {
	"DINAS KETENAGAKERJAAN KABUPATEN BOGOR": "Dinas Tenaga Kerja",
	"DEPARTEMEN AGAMA KABUPATEN BOGOR": "Kantor Kemenag",
	"DINAS SOSIAL KABUPATEN BOGOR": "Dinas Sosial",
	"MUI KABUPATEN BOGOR": "MUI",
	"PENGADILAN AGAMA KABUPATEN BOGOR": "Pengadilan Agama",
	"KANTOR KEPEGAWAIAN DAERAH KABUPATEN BOGOR": "BKPSDM",
	"DINAS PEMADAM KEBAKARAN KABUPATEN BOGOR": "Dinas Pemadam Kebakaran",
	"Dinas Tata Bangunan dan Pemukiman Kabupaten Bogor": "Dinas Perumahan & Permukiman",
	"Dinas Kebersihan dan Pertamanan Kabupaten Bogor": "Dinas Lingkungan Hidup",
};
// Nama gedung di OSM (huruf besar) yang perlu dibakukan; sekaligus menyamakan dengan
// nama dari titik POI supaya tidak muncul dua papan untuk satu kantor.
const NAMA_TEKS = {
	DINSOS: "Dinas Sosial",
	DISNAKER: "Dinas Tenaga Kerja",
	KEMENAG: "Kantor Kemenag",
	"BPKAD KAB.BOGOR": "BPKAD",
	"BPKSDM KABB.BOGOR": "BKPSDM",
	"KANTOR DISUMKM": "Dinas Koperasi & UKM",
	"DP3AKB KAB.BOGOR": "DP3AKB",
	"KANTOR ARSIP DAN PERPUSTAKAAN": "Dinas Arsip & Perpustakaan",
	"MESJID ABURRAHMAH BIN AUF": "Masjid Abdurrahman bin Auf",
	"KANTOR PBB PRATAMA": "Kantor PBB Pratama",
	"LAP TENIS TEGAR BERIMAN": "Lapangan Tenis",
	"KODIM KAB BOGOR": "Kodim 0621",
	"SATPAS CIBINONG": "Satpas SIM Cibinong",
	"PMI KAB.BOGOR": "PMI",
};
const namaDari = (n) => (n ? NAMA_TEKS[n.toUpperCase()] || rapikanNama(n) : null);
// Partai & usaha kecil tidak diberi papan nama; gedungnya tetap digambar.
const TANPA_LABEL = /partai|golkar|demokrat|pdi|ppp|knpi|warkop|kantin|workshop|toko|warung|ex samsat|^rm.|sekber/i;

// ---------- susun ----------

const JENIS_GEDUNG = ["rumah", "kantor", "masjid", "atap", "rs", "niaga", "gudang"];
const LANTAI_KHUSUS = { "222859670": 4, "222859672": 3, "222860443": 3, "222860449": 2, "306871019": 2, "578436756": 2 };
const JENIS_JALAN = ["utama", "sedang", "kecil", "gang", "setapak"];
const LEBAR_JALAN = { primary: 8, secondary: 7, tertiary: 6.5, unclassified: 5, residential: 4.5, living_street: 4, service: 3.5, track: 3, pedestrian: 3, footway: 1.6, path: 1.4, cycleway: 1.6, steps: 1.6 };
const JENIS_AREA = ["taman", "lapangan", "stadion", "plaza", "parkir", "lapanganKeras"];

function hash(s) {
	let h = 2166136261;
	for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return (h >>> 0) / 4294967296;
}

function susun() {
	const gedung = [];
	const jalan = [];
	const area = [];
	const air = [];
	const sungai = [];
	const label = [];
	const sudahLabel = new Set();

	const pasangLabel = (teks, x, z, y, jenis) => {
		const kunci = `${teks}`;
		if (!teks || TANPA_LABEL.test(teks)) return;
		// nama sama di gedung bertetangga (mis. dua massa Dinkes) cukup satu papan
		for (const l of label) if (l[0] === teks && Math.hypot(l[1] - x, l[2] - z) < 80) return;
		sudahLabel.add(kunci);
		label.push([teks, bulat(x), bulat(z), bulat(y), jenis]);
	};

	for (const w of WAY.values()) {
		const t = w.tag;
		const p0 = titikWay(w);
		if (p0.length < 2) continue;
		const c = pusat(p0);
		if (!di(WILAYAH, c)) continue;

		// --- gedung ---
		const gd = t.building || (["public_building", "townhall", "police", "courthouse"].includes(t.amenity) && !t.landuse ? "yes" : null);
		if (gd && tertutup(w) && !t.landuse) {
			const p = ccw(sederhanakan(p0.slice(0, -1), true));
			if (p.some((q) => di(HALAMAN, q)) || di(HALAMAN, c)) continue;
			const ls = Math.abs(luas(p));
			if (ls < 6) continue;
			let jenis = "rumah";
			if (gd === "roof" || t.amenity === "fuel") jenis = "atap";
			else if (gd === "mosque" || t.amenity === "place_of_worship") jenis = "masjid";
			else if (gd === "hospital" || t.amenity === "hospital") jenis = "rs";
			else if (["commercial", "retail", "shop"].includes(gd)) jenis = "niaga";
			else if (["industrial", "warehouse", "garage", "garages"].includes(gd)) jenis = "gudang";
			else if (t.office || t.amenity || t.government || ["office", "public", "government", "civic", "school"].includes(gd) || t.name || ls > 260) jenis = "kantor";
			let lantai = +t["building:levels"] || 0;
			if (LANTAI_KHUSUS[w.id]) lantai = LANTAI_KHUSUS[w.id];
			if (!lantai) lantai = jenis === "rumah" ? (hash(w.id) < 0.22 ? 2 : 1) : jenis === "kantor" ? (ls > 900 ? 3 : 2) : jenis === "rs" ? 3 : jenis === "niaga" ? 2 : 1;
			lantai = Math.min(6, Math.max(1, Math.round(lantai)));
			gedung.push([JENIS_GEDUNG.indexOf(jenis), lantai, datar(p), w.id]);
			const nama = w.id in NAMA ? NAMA[w.id] : namaDari(t.name);
			if (nama) pasangLabel(nama, ...c, lantai * 3.4 + 3.2, 0);
			continue;
		}

		// --- perairan ---
		if (t.natural === "water" && tertutup(w)) {
			air.push(datar(ccw(sederhanakan(p0.slice(0, -1), true))));
			const nama = w.id in NAMA ? NAMA[w.id] : t.name;
			if (nama) pasangLabel(nama, ...c, 2.2, 1);
			// Situ memanjang ±500 m; satu papan lagi di ujung utara, dekat kantor DPMD.
			const utara = p0.filter((q) => q[1] > -90);
			if (nama && utara.length > 3) label.push([nama, ...pusat(utara).map(bulat), 2.2, 1]);
			continue;
		}
		if (t.waterway && !t.tunnel && !tertutup(w)) {
			const lebar = t.waterway === "river" ? 7 : t.waterway === "stream" || t.waterway === "canal" ? 2.6 : 1.2;
			sungai.push([lebar, datar(sederhanakan(p0, false))]);
			continue;
		}

		// --- area datar ---
		let jenisArea = null;
		if (["park", "garden", "playground", "recreation_ground"].includes(t.leisure) || ["grass", "village_green", "recreation_ground"].includes(t.landuse)) jenisArea = "taman";
		else if (t.leisure === "pitch") jenisArea = t.sport === "tennis" || t.sport === "basketball" ? "lapanganKeras" : "lapangan";
		else if (t.leisure === "stadium") jenisArea = "stadion";
		else if (t.highway === "pedestrian" && t.area === "yes") jenisArea = "plaza";
		else if (t.amenity === "parking" && tertutup(w)) jenisArea = "parkir";
		if (jenisArea && tertutup(w)) {
			const p = ccw(sederhanakan(p0.slice(0, -1), true));
			if (di(HALAMAN, c)) continue;
			area.push([JENIS_AREA.indexOf(jenisArea), datar(p)]);
			const nama = w.id in NAMA ? NAMA[w.id] : jenisArea !== "lapangan" || t.sport === "tennis" ? namaDari(t.name) : null;
			if (nama) pasangLabel(nama, ...c, jenisArea === "stadion" ? 7 : 3, 1);
			continue;
		}

		// --- jalan ---
		const hw = t.highway;
		if (hw && LEBAR_JALAN[hw] && t.area !== "yes" && t.tunnel !== "yes") {
			let lebar = LEBAR_JALAN[hw];
			const est = parseFloat(t.est_width || t.width);
			if (est && hw !== "footway") lebar = Math.min(10, Math.max(3, est * 0.85));
			const jenis =
				["primary", "secondary"].includes(hw) ? "utama" : ["tertiary", "unclassified"].includes(hw) ? "sedang" : ["residential", "living_street"].includes(hw) ? "kecil" : ["service", "track"].includes(hw) ? "gang" : "setapak";
			// potong bagian yang masuk halaman DPMD / jalan buatan tangan
			let ruas = [];
			const p = sederhanakan(p0, false);
			for (let i = 0; i < p.length; i++) {
				const buang = (q) => di(HALAMAN, q) || di(JALAN_DEPAN, q);
				if (buang(p[i])) {
					if (ruas.length >= 2) jalan.push([JENIS_JALAN.indexOf(jenis), bulat(lebar), datar(ruas)]);
					// titik terakhir di luar dipertahankan sebagai ujung supaya jalan menyambung ke tepi
					ruas = [];
					continue;
				}
				ruas.push(p[i]);
			}
			if (ruas.length >= 2) jalan.push([JENIS_JALAN.indexOf(jenis), bulat(lebar), datar(ruas)]);
		}
	}

	// Nama dari titik POI yang jatuh di dalam gedung tak berlabel.
	for (const n of NODE.values()) {
		const nama = NAMA_NODE[n.tag.name];
		if (!nama) continue;
		const q = ke(n);
		if (!di(WILAYAH, q) || di(HALAMAN, q)) continue;
		const g = gedung.find((g) => dalamPoligon(q, pasangan(g[2])));
		pasangLabel(nama, ...q, g ? g[1] * 3.4 + 3.2 : 4, 0);
	}

	return { gedung, jalan, area, air, sungai, label };
}

const pasangan = (f) => {
	const p = [];
	for (let i = 0; i < f.length; i += 2) p.push([f[i], f[i + 1]]);
	return p;
};

// ---------- pepohonan ----------

// Indeks grid sederhana untuk uji "titik ini kosong?" saat menanam pohon.
function indeks(daftar, ukuran = 20) {
	const sel = new Map();
	daftar.forEach((d) => {
		const xs = d.p.map((q) => q[0]);
		const zs = d.p.map((q) => q[1]);
		d.kotak = [Math.min(...xs) - d.r, Math.max(...xs) + d.r, Math.min(...zs) - d.r, Math.max(...zs) + d.r];
		for (let i = Math.floor(d.kotak[0] / ukuran); i <= Math.floor(d.kotak[1] / ukuran); i++) {
			for (let j = Math.floor(d.kotak[2] / ukuran); j <= Math.floor(d.kotak[3] / ukuran); j++) {
				const k = `${i},${j}`;
				if (!sel.has(k)) sel.set(k, []);
				sel.get(k).push(d);
			}
		}
	});
	return (q) => sel.get(`${Math.floor(q[0] / ukuran)},${Math.floor(q[1] / ukuran)}`) || [];
}

function tanam({ gedung, jalan, area, air, sungai }) {
	let biji = 20251102;
	const acak = () => ((biji = (biji * 16807) % 2147483647) - 1) / 2147483646;

	const halang = indeks([
		...gedung.map((g) => ({ p: pasangan(g[2]), r: 2.2, poli: true })),
		...air.map((a) => ({ p: pasangan(a), r: 2.5, poli: true })),
		...area.filter((a) => [1, 2, 3, 5].includes(a[0])).map((a) => ({ p: pasangan(a[1]), r: 1, poli: true })),
		...jalan.map((j) => ({ p: pasangan(j[2]), r: j[1] / 2 + 1.6, poli: false })),
		...sungai.map((s) => ({ p: pasangan(s[1]), r: s[0] / 2 + 1.2, poli: false })),
	]);
	const pohon = [];
	const dekatPohon = new Map();
	const kosong = (q, jarakPohon) => {
		if (!di(WILAYAH, q) || di(LUAR_LAMA, q)) return false;
		for (const d of halang(q)) {
			if (q[0] < d.kotak[0] || q[0] > d.kotak[1] || q[1] < d.kotak[2] || q[1] > d.kotak[3]) continue;
			if (d.poli && dalamPoligon(q, d.p)) return false;
			for (let i = 0; i < d.p.length - (d.poli ? 0 : 1); i++) if (jarakRuas(q, d.p[i], d.p[(i + 1) % d.p.length]) < d.r) return false;
		}
		const i = Math.floor(q[0] / 8);
		const j = Math.floor(q[1] / 8);
		for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const t of dekatPohon.get(`${i + a},${j + b}`) || []) if (Math.hypot(t[0] - q[0], t[1] - q[1]) < jarakPohon) return false;
		return true;
	};
	const tambah = (q, s) => {
		pohon.push([bulat(q[0]), bulat(q[1]), Math.round(s * 100) / 100]);
		const k = `${Math.floor(q[0] / 8)},${Math.floor(q[1] / 8)}`;
		if (!dekatPohon.has(k)) dekatPohon.set(k, []);
		dekatPohon.get(k).push(q);
	};
	// Tanam di sepanjang garis/tepi tiap `jarak` m dengan geser ke samping `geser`.
	const sepanjang = (p, tutup, jarak, geser, s0) => {
		const n = p.length;
		for (let i = 0; i < (tutup ? n : n - 1); i++) {
			const a = p[i];
			const b = p[(i + 1) % n];
			const pj = Math.hypot(b[0] - a[0], b[1] - a[1]);
			const ux = (b[0] - a[0]) / pj;
			const uz = (b[1] - a[1]) / pj;
			for (let d = jarak / 2; d < pj; d += jarak) {
				for (const sisi of geser) {
					const q = [a[0] + ux * d - uz * sisi + (acak() - 0.5) * 1.5, a[1] + uz * d + ux * sisi + (acak() - 0.5) * 1.5];
					if (kosong(q, 5)) tambah(q, s0 + acak() * 0.5);
				}
			}
		}
	};

	// 1. Tepi Situ: deretan pohon peneduh di bantaran (poligon ccw → kanan = luar).
	for (const a of air) sepanjang(pasangan(a), true, 7, [-5.5], 1.0);
	// 2. Pohon peneduh di kedua sisi jalan utama & sedang.
	for (const j of jalan) if (j[0] <= 1) sepanjang(pasangan(j[2]), false, 11, [j[1] / 2 + 2.4, -(j[1] / 2 + 2.4)], 0.95);
	// 3. Taman & alun-alun: tepi dan sebagian dalam.
	for (const a of area) {
		if (a[0] !== 0) continue;
		const p = pasangan(a[1]);
		sepanjang(p, true, 8, [3], 1.0);
		const xs = p.map((q) => q[0]);
		const zs = p.map((q) => q[1]);
		const ls = Math.abs(luas(p));
		for (let k = 0; k < ls / 160; k++) {
			const q = [Math.min(...xs) + acak() * (Math.max(...xs) - Math.min(...xs)), Math.min(...zs) + acak() * (Math.max(...zs) - Math.min(...zs))];
			if (dalamPoligon(q, p) && kosong(q, 7)) tambah(q, 0.9 + acak() * 0.6);
		}
	}
	// 4. Lahan kosong & pekarangan: sebaran acak yang tidak terlalu rapat.
	const w = WILAYAH;
	for (let k = 0; k < 9000 && pohon.length < 2600; k++) {
		const q = [w.x0 + acak() * (w.x1 - w.x0), w.z0 + acak() * (w.z1 - w.z0)];
		if (kosong(q, 9)) tambah(q, 0.75 + acak() * 0.7);
	}
	return pohon;
}

// ---------- tulis ----------

for (const b of UNDUH) urai(await unduh(b));
const data = susun();
data.pohon = tanam(data);

const s = (v) => JSON.stringify(v);
const isi = `// DIBANGKITKAN OTOMATIS oleh scripts/jelajah-kawasan.mjs — jangan diubah tangan.
// Kawasan Kompleks Perkantoran Pemda Kabupaten Bogor di sekitar kantor DPMD.
// Data peta © kontributor OpenStreetMap, lisensi ODbL (openstreetmap.org/copyright).
//
// Koordinat adegan (meter): gedung DPMD di (0, 0), +x barat sepanjang jalan depan,
// +z ≈ utara. Poligon ditulis datar [x0, z0, x1, z1, ...].

// Batas jelajah (pemain & kendaraan tidak bisa keluar).
export const BATAS_KAWASAN = ${s(WILAYAH)};
// Arah utara di adegan (radian dari +z, searah jarum jam dilihat dari atas).
export const SUDUT_UTARA = ${bulat(PUTAR * 1000) / 1000};

export const JENIS_GEDUNG = ${s(JENIS_GEDUNG)};
// [jenis, jumlah lantai, poligon tapak]
export const GEDUNG = [
${data.gedung.map((g) => `\t${s(g.slice(0, 3))},`).join("\n")}
];

export const JENIS_JALAN = ${s(JENIS_JALAN)};
// [jenis, lebar, garis as]
export const JALAN = [
${data.jalan.map((j) => `\t${s(j)},`).join("\n")}
];

export const JENIS_AREA = ${s(JENIS_AREA)};
// [jenis, poligon]
export const AREA = [
${data.area.map((a) => `\t${s(a)},`).join("\n")}
];

// Situ & kolam (poligon)
export const AIR = [
${data.air.map((a) => `\t${s(a)},`).join("\n")}
];

// [lebar, garis as]
export const SUNGAI = [
${data.sungai.map((a) => `\t${s(a)},`).join("\n")}
];

// [x, z, skala]
export const POHON_KAWASAN = ${s(data.pohon)};

// [teks, x, z, tinggi, jenis (0 gedung, 1 area)]
export const LABEL = [
${data.label.map((l) => `\t${s(l)},`).join("\n")}
];
`;
fs.writeFileSync(KELUARAN, isi);
console.log(
	`gedung ${data.gedung.length}, jalan ${data.jalan.length}, area ${data.area.length}, air ${data.air.length}, sungai ${data.sungai.length}, pohon ${data.pohon.length}, label ${data.label.length} → ${(isi.length / 1024).toFixed(0)} KB`,
);
for (const l of data.label) console.log("  ", l[0], l[1], l[2]);
for (const g of data.gedung) {
	const p = pasangan(g[2]);
	if (p.some((q) => di(LUAR_LAMA, q))) console.log("   di halaman lama:", g[3], pusat(p).map(bulat));
}
