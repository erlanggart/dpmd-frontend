import { AREA_PER_ID, LOBI, RUANGAN, cariArea, titikDepanPetugas } from "./kantorConfig";
import { DAUN_PINTU, PEGAWAI, PEJALAN, tabrak, tanggaDi } from "./scene/layout";

// Menempatkan pegawai DPMD sungguhan (dari /api/public/pegawai-kantor) ke dalam
// kantor 3D: Kepala Dinas memimpin rapat pimpinan di Ruang Halimun, petugas layanan
// tiap bidang di meja layanan, staf di meja bidangnya (sisanya rapat, berdiskusi,
// atau berjalan), satpam berjaga, petugas kebersihan mengepel & menyapu.
//
// Data hanya berisi nama, jabatan, bidang, dan status; wajah tidak diketahui, jadi
// penampilan (kulit, rambut, kerudung, kacamata) diturunkan dari nama supaya tetap
// sama di setiap kunjungan. Jenis kelamin juga ditebak dari nama (lihat tebakPerempuan).

const norm = (s) => (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();

function kelas(p) {
	const j = norm(p.jabatan);
	const b = norm(p.bidang);
	const st = norm(p.status_kepegawaian);
	const es = norm(p.eselon);
	// eselon "III.a" juga diawali "ii" — tanpa (?!i) Kabid terbaca Kepala Dinas
	if (/kepala dinas/.test(j) || /^ii(?!i)/.test(es)) return "kadis";
	if (/sekretaris( dinas)?$/.test(j)) return "sekdis";
	if (/kepala bidang|^kabid/.test(j)) return "kabid";
	if (/kasubag|kasubbag|kepala sub ?bag/.test(j)) return "kasubag";
	if (/ketua tim/.test(j)) return "ketuaTim";
	if (b.includes("keamanan") || /keamanan|satpam/.test(j)) return "satpam";
	if (b.includes("kebersihan") || /kebersihan|cleaning/.test(j)) return "kebersihan";
	if (b.includes("alih daya") || st.includes("alih daya") || /alih daya/.test(j)) return "tad";
	return "staf";
}

function ruangDari(p) {
	const b = norm(p.bidang);
	const teks = `${norm(p.sub_bidang)} ${norm(p.jabatan)}`;
	if (b.includes("sarana")) return "spked";
	if (b.includes("kekayaan")) return "kkd";
	if (b.includes("pemberdayaan")) return "pmd";
	if (b.includes("pemerintahan")) return "pemdes";
	if (b.includes("sekretariat")) {
		if (/arsip/.test(teks)) return "arsip";
		if (/keuangan|bendahara/.test(teks)) return "keuangan";
		if (/program|perencana|pelapor|prolap/.test(teks)) return "prolap";
		return "sekretariat*";
	}
	return null;
}

const NAMA_BIDANG = {
	sekretariat: "Sekretariat",
	arsip: "Ruang Arsip",
	prolap: "Sub Bagian Prolap",
	keuangan: "Sub Bagian Keuangan",
	spked: "Bidang SPKED",
	kkd: "Bidang KKD",
	pmd: "Bidang PMD",
	pemdes: "Bidang Pemdes",
};

function rapikanJabatan(o) {
	const j = (o.jabatan || "").replace(/\s+/g, " ").trim();
	if (j && j !== "-") {
		// "PENELAAH TEKNIS KEBIJAKAN" → "Penelaah Teknis Kebijakan"
		return j === j.toUpperCase() ? j.toLowerCase().replace(/\b\w/g, (h) => h.toUpperCase()) : j;
	}
	if (o.kelas === "kadis") return "Kepala Dinas";
	if (o.kelas === "satpam") return "Petugas Keamanan";
	if (o.kelas === "kebersihan") return "Petugas Kebersihan";
	if (o.kelas === "tad") return "Tenaga Alih Daya";
	return o.ruang && NAMA_BIDANG[o.ruang] ? `Staf ${NAMA_BIDANG[o.ruang]}` : "Staf DPMD";
}

// ---------- penampilan dari nama ----------

function hash(s) {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
function acakDari(teks) {
	let s = hash(teks) % 2147483646 || 1;
	return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// Jenis kelamin ditebak dari NAMA saja (kolom jenis_kelamin di data tidak dipakai).
// Gelar dibuang dulu; tiap kata dinilai lewat kamus nama Indonesia/Sunda dan akhiran
// khas. Kata pertama berbobot ganda karena nama panggilan paling menentukan.
const KATA_PEREMPUAN = new Set(
	"siti sri dewi rina rini rika nina lisna lusiana asti atika chintia cintia lea putri vivi ayulia denna irmawati mira carissa noviani erma diah lina parlina neneng endarti feni mainy rani aini aisyah nabila mariyam nurjana ayu desy desi sandra mela mimah rizkia safitri cesaria yuni yuli fitri lia euis iis tuti eni eli ela santi novi ika ratna ratih wulan indah dina nia tika tina mega maya yanti susi ida imas enok cucu lilis nining nunung titin ina nurul annisa nisa intan citra vina devi sinta nadia anisa endah eva evi fani irma lusi nova reni rosa tia vera wina yeni yunita hj hajah ibu".split(" "),
);
const KATA_LAKI = new Set(
	"muhammad muhamad mohammad moh moch mochamad muh ahmad achmad agus asep dedi deden budi ujang andi dadang yusuf rudi rahmat rachmat hendra iwan dodi eko joko bambang herman arif irfan fajar ridwan hasan husen abdul aziz yayan yanto heru hadi dani rendi riki wahyu yoga bayu dimas fikri gilang ilham iqbal jajang ruslan saepul syaiful taufik taufiq ucup wawan yudi zaenal ari aris dicky didik toni tono h haji drs hadijana fahri fariz fhadli holid mawardi firman harif alan darul ferdi imam cahyo devin carles lukman suhada ardhi beni erwin umar syukur basri munandar hari prasetia prasetya bastian zakaria aryasatya hylmi mas cecep nurdin sukarmin igo".split(" "),
);
const AKHIRAN_PEREMPUAN = /(wati|yati|ningsih|ningrum|sih|iani|yani|iana|anti|arti|iah|itri|tiwi|ria|issa|ine|lestari)$/;
const AKHIRAN_LAKI = /(wan|man|udin|din|to|adi|udi|syah|ansyah|iansyah|ullah|anto|arto|ipto)$/;
const GELAR = /^(s|m|a|d|dr|drs|dra|ir|h|hj|r|st|se|sh|mm|ma|md|ak|ap|ip|pd|kom|sos|psi|tr|tp|ik|pwk|si|amd|map|mpa)$/;

function tebakPerempuan(o) {
	const kata = norm(o.nama)
		.replace(/[^a-z .,']/g, " ")
		.split(/[\s,]+/)
		.filter(Boolean);
	let skor = 0;
	let urut = 0;
	for (const mentah of kata) {
		const bersih = mentah.replace(/[.']/g, "");
		if (!bersih) continue;
		// "H." / "Hj." (haji/hajah) dihitung, gelar akademik lain diabaikan.
		if (bersih === "hj") {
			skor += 2;
			continue;
		}
		if (bersih === "h" && mentah.endsWith(".")) {
			skor -= 2;
			continue;
		}
		if (mentah.includes(".") || GELAR.test(bersih)) continue;
		const bobot = urut === 0 ? 2 : 1;
		urut++;
		if (KATA_PEREMPUAN.has(bersih)) skor += 1.5 * bobot;
		else if (KATA_LAKI.has(bersih)) skor -= 1.5 * bobot;
		else if (AKHIRAN_PEREMPUAN.test(bersih)) skor += 1 * bobot;
		else if (AKHIRAN_LAKI.test(bersih)) skor -= 1 * bobot;
	}
	return skor > 0;
}

const KULIT = ["#e2b48c", "#d3a378", "#c08d63", "#b07a50", "#d9ad85"];
const RAMBUT = ["#15100c", "#21180f", "#2e2116", "#3a2a1c"];
const JILBAB = ["#d9c7a4", "#7b5a3a", "#5a4637", "#a8875c", "#2f4a3a", "#7d2f3d", "#3b4a6b", "#c9a77a"];

function penampilanOrang(o, ekstra = {}) {
	const r = acakDari(o.nama || "pegawai");
	const perempuan = tebakPerempuan(o);
	const seragam = { satpam: "satpam", kebersihan: "kebersihan", tad: "kemeja" }[o.kelas] || "pdh";
	return {
		seragam,
		perempuan,
		kulit: KULIT[Math.floor(r() * KULIT.length)],
		rambut: RAMBUT[Math.floor(r() * RAMBUT.length)],
		jilbab: perempuan && r() < 0.85 ? JILBAB[Math.floor(r() * JILBAB.length)] : null,
		kacamata: r() < 0.22,
		rok: perempuan && seragam !== "kebersihan" && seragam !== "satpam" && r() < 0.5,
		...ekstra,
	};
}

// ---------- titik berdiri tambahan bila kursi habis ----------

function titikBerdiriBaru(area, terpakai) {
	const r = area.rect;
	const diArea = (x, z) => cariArea(x, z, area.lantai)?.id === area.id;
	const pintu = DAUN_PINTU.filter((d) => d.lantai === area.lantai);
	const tamu = [LOBI, ...RUANGAN].filter((a) => a.lantai === area.lantai).map(titikDepanPetugas);
	const hasil = [];
	for (let z = r.z0 + 0.6; z <= r.z1 - 0.6; z += 0.7) {
		for (let x = r.x0 + 0.6; x <= r.x1 - 0.6; x += 0.7) {
			if (!diArea(x, z) || tabrak(x, z, area.lantai, 0.5) || tanggaDi(x, z)) continue;
			if (pintu.some((d) => Math.hypot(d.x - x, d.z - z) < 1.7)) continue;
			if (tamu.some((t) => Math.hypot(t.x - x, t.z - z) < 1.8)) continue;
			if (terpakai.some((t) => t.lantai === area.lantai && Math.hypot(t.x - x, t.z - z) < 1.1)) continue;
			hasil.push({ x, z });
		}
	}
	return hasil;
}

// ---------- penyusun utama ----------

export function susunPenghuni(data) {
	const slot = PEGAWAI.map((s) => ({ ...s, isi: null }));
	const pejalan = PEJALAN.map((p) => ({ ...p, isi: null }));

	// Tanpa data: isian bawaan (orang tanpa nama), seperti sebelumnya.
	if (!Array.isArray(data) || !data.length) {
		return {
			orang: slot.filter((s) => s.terisi),
			pejalan: PEJALAN,
			petugas: {},
			adaData: false,
		};
	}

	const orang = data
		.filter((p) => p && p.nama)
		.map((p) => {
			const o = { ...p, nama: p.nama.replace(/\s+/g, " ").trim() };
			o.kelas = kelas(o);
			o.ruang = ruangDari(o);
			return o;
		});
	// Staf Sekretariat tanpa sub bagian dibagi rata ke Sekretariat, Prolap, Keuangan.
	let giliran = 0;
	for (const o of orang) {
		if (o.ruang !== "sekretariat*") continue;
		o.ruang = ["sekretariat", "prolap", "keuangan"][giliran++ % 3];
	}
	for (const o of orang) o.jabatanTampil = rapikanJabatan(o);

	const bebas = new Set(orang);
	const ambil = (pred) => {
		for (const o of bebas) if (pred(o)) return o;
		return null;
	};
	const taruh = (o, s, ekstra = {}) => {
		bebas.delete(o);
		s.isi = { o, penampilan: penampilanOrang(o, { ...ekstra }) };
	};
	const slotBebas = (pred) => slot.find((s) => !s.isi && pred(s));

	// 1. Rapat pimpinan di Halimun: Kadis memimpin; Sekdis, Kabid, Kasubag, Ketua Tim ikut.
	const kadis = ambil((o) => o.kelas === "kadis");
	const kepalaHalimun = slotBebas((s) => s.area === "halimun" && s.jenis === "kepalaRapat");
	if (kadis && kepalaHalimun) taruh(kadis, kepalaHalimun);
	for (const k of ["sekdis", "kabid", "kasubag", "ketuaTim"]) {
		for (let o = ambil((x) => x.kelas === k); o; o = ambil((x) => x.kelas === k)) {
			const s = slotBebas((t) => t.area === "halimun" && t.jenis === "rapat");
			if (!s) break;
			taruh(o, s);
		}
	}

	// 2. Petugas layanan tiap bidang & resepsionis.
	const petugas = {};
	for (const r of RUANGAN) {
		const o =
			ambil((x) => x.ruang === r.id && x.kelas === "staf" && /layanan|pelayanan/i.test(x.jabatan || "")) ||
			ambil((x) => x.ruang === r.id && (x.kelas === "staf" || x.kelas === "tad"));
		if (o) {
			bebas.delete(o);
			petugas[r.id] = { nama: o.nama, jabatan: o.jabatanTampil, penampilan: penampilanOrang(o) };
		}
	}
	const resepsionis =
		ambil((o) => o.kelas === "tad" && tebakPerempuan(o)) || ambil((o) => o.kelas === "tad") || ambil((o) => o.ruang === "sekretariat");
	if (resepsionis) {
		bebas.delete(resepsionis);
		petugas.lobi = { nama: resepsionis.nama, jabatan: resepsionis.jabatanTampil, penampilan: penampilanOrang(resepsionis) };
	}

	// 3. Satpam & kebersihan ke pos masing-masing (diam dulu, lalu yang berkeliling).
	for (const [k, jenis] of [
		["satpam", "jaga"],
		["kebersihan", "bersih"],
	]) {
		for (let o = ambil((x) => x.kelas === k); o; o = ambil((x) => x.kelas === k)) {
			const s = slotBebas((t) => t.jenis === jenis);
			if (s) {
				taruh(o, s, { alat: s.penampilan.alat });
				continue;
			}
			const j = pejalan.find((p) => !p.isi && p.jenis === jenis);
			if (j) {
				bebas.delete(o);
				j.isi = { o, penampilan: penampilanOrang(o, { alat: j.penampilan.alat }) };
				continue;
			}
			break;
		}
	}

	// 4. Tenaga alih daya: ajudan pimpinan dan dapur dulu.
	for (const jenis of ["ajudan", "dapur"]) {
		const o = ambil((x) => x.kelas === "tad") || ambil((x) => x.ruang === "sekretariat" && x.kelas === "staf");
		const s = slotBebas((t) => t.jenis === jenis);
		if (o && s) taruh(o, s);
	}

	// 5. Staf & TAD ke meja bidangnya.
	const ruangUntuk = (o) => o.ruang || "sekretariat";
	for (const o of [...bebas]) {
		if (!["staf", "tad", "ketuaTim", "kabid", "kasubag", "sekdis", "kadis"].includes(o.kelas)) continue;
		const s = slotBebas((t) => t.jenis === "meja" && t.area === ruangUntuk(o));
		if (s) taruh(o, s);
	}

	// 6. Sisa staf: rapat di Pangrango/Salak, lalu berjalan membawa map, lalu berdiri
	//    berdiskusi di ruang bidangnya (atau lorong lantainya).
	for (const o of [...bebas]) {
		if (!["staf", "tad", "ketuaTim", "kabid", "kasubag", "sekdis", "kadis"].includes(o.kelas)) continue;
		const s =
			slotBebas((t) => (t.area === "pangrango" || t.area === "salak") && t.jenis === "kepalaRapat") ||
			slotBebas((t) => (t.area === "pangrango" || t.area === "salak" || t.area === "halimun") && t.jenis === "rapat");
		if (s) {
			taruh(o, s);
			continue;
		}
		const j = pejalan.find((p) => !p.isi && p.jenis === "staf");
		if (j) {
			bebas.delete(o);
			j.isi = { o, penampilan: penampilanOrang(o, { map: true }) };
		}
	}

	// 7. Masih ada sisa (termasuk satpam/kebersihan berlebih): berdiri di ruangnya.
	const tambahan = [];
	const terpakai = () => [...slot.filter((s) => s.isi || s.jenis === "tamu"), ...tambahan];
	// Urutan cadangan: ruang sendiri, lalu area terbuka di lantai yang sama.
	const CADANGAN = ["aula2", "lorong1", "belakang1", "lobi"];
	for (const o of [...bebas]) {
		const id = o.kelas === "satpam" ? "lobi" : o.kelas === "kebersihan" ? "lorong1" : ruangUntuk(o);
		const asal = AREA_PER_ID[id] || LOBI;
		const urutan = [id, ...CADANGAN.filter((c) => AREA_PER_ID[c].lantai === asal.lantai), ...CADANGAN];
		let area = null;
		let t = null;
		for (const c of urutan) {
			area = AREA_PER_ID[c];
			// Ruang bidang paling banyak 4 orang berdiri supaya tidak berdesakan.
			if (!CADANGAN.includes(c) && tambahan.filter((x) => x.area === c).length >= 4) continue;
			t = titikBerdiriBaru(area, terpakai())[0];
			if (t) break;
		}
		if (!t) continue;
		const kelasPose = o.kelas === "kebersihan" ? { pose: "jalan", aktivitas: "mengepel" } : { pose: "diam", aktivitas: o.kelas === "satpam" ? "jaga" : "diskusi" };
		const s = {
			x: t.x,
			z: t.z,
			rot: Math.atan2((area.rect.x0 + area.rect.x1) / 2 - t.x, (area.rect.z0 + area.rect.z1) / 2 - t.z),
			lantai: area.lantai ?? 0,
			area: area.id,
			jenis: "berdiri",
			...kelasPose,
		};
		tambahan.push(s);
		taruh(o, s, o.kelas === "kebersihan" ? { alat: "pel" } : o.kelas === "satpam" ? {} : { map: true });
	}

	const keOrang = (s) => ({
		...s,
		penampilan: s.isi.penampilan,
		nama: s.isi.o.nama,
		jabatan: s.isi.o.jabatanTampil,
	});
	return {
		orang: [
			...slot.filter((s) => s.isi).map(keOrang),
			...tambahan.map(keOrang),
			// pengunjung (warga) tetap anonim
			...slot.filter((s) => s.jenis === "tamu"),
		],
		pejalan: pejalan.filter((p) => p.isi).map((p) => ({ ...p, penampilan: p.isi.penampilan, nama: p.isi.o.nama, jabatan: p.isi.o.jabatanTampil })),
		petugas,
		adaData: true,
		jumlah: orang.length,
		tertampung: orang.length - bebas.size,
	};
}

