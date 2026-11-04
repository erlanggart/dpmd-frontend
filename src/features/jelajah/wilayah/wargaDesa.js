import { KOMODITAS, kebun } from "../kebun";
import { usahaKini } from "../usahaWilayah";
import { tenaga } from "../tenaga";
import {
	GUDANG_KEBUN, JALAN_EW, JALAN_NS, KANDANG_AYAM, LAPANGAN, MEJA_WARUNG, MUSHOLA, PENGEPUL_KEBUN, RUTE_BAJAK, RUTE_TANDUR, TITIK_CANGKUL, TITIK_SIUMAN,
} from "../scene/kebunDesaData";

/*
 * Warga desa di dunia bertani. Tiap warga punya penampilan, kegiatan
 * (jaga warung, membajak, tandur, mencangkul, berjalan, bermain bola), dan
 * obrolan: tips bertani sesuai keadaan kebun, kadang hadiah harian.
 * Posisi terkini ditulis ke `posWarga` supaya pemain bisa menyapa.
 */

const kulit = ["#f1c9a5", "#d9ad85", "#a8754f"];
const caping = { id: "caping", warna: "#d6b56a" };
const orang = (o) => ({ seragam: "warga", rambut: "#1a120c", celana: "#2a2a2e", kulit: kulit[1], ...o });

export const WARGA = [
	{
		id: "imas", nama: "Bu Imas", peran: "Pemilik warung", kegiatan: "jaga",
		tetap: { x: MEJA_WARUNG.x + 1.1, z: MEJA_WARUNG.z, rot: -Math.PI / 2 },
		rupa: orang({ perempuan: true, baju: "#9d4edd", jilbab: "#f2c6de", rok: true, kulit: kulit[0] }),
		toko: true,
	},
	{
		id: "sobari", nama: "Pak Sobari", peran: "Pengepul hasil bumi", kegiatan: "jaga",
		tetap: { x: PENGEPUL_KEBUN.x - 0.4, z: PENGEPUL_KEBUN.z + 1.15, rot: Math.PI },
		rupa: orang({ baju: "#1f6f5c", celana: "#3b3f46", topiGaya: { id: "peci", warna: "#111827" }, kulit: kulit[2] }),
		jual: true,
	},
	{
		id: "karta", nama: "Abah Karta", peran: "Ketua kelompok tani", kegiatan: "jaga",
		tetap: { x: TITIK_SIUMAN.x - 1.4, z: TITIK_SIUMAN.z + 0.3, rot: Math.PI },
		rupa: orang({ baju: "#f5f0e1", celana: "#3f3f46", rambut: "#d6d3d1", topiGaya: { id: "peci", warna: "#1c1917" }, kulit: kulit[1] }),
		hadiah: { pupuk: 2 },
	},
	{
		id: "darsa", nama: "Pak Darsa", peran: "Petani · membajak sawah", kegiatan: "bajak",
		rute: { x0: -52, x1: -16, z: 38, laju: 0.9 },
		rupa: orang({ baju: "#64748b", celana: "#1f2937", topiGaya: caping, kulit: kulit[2] }),
	},
	{
		id: "enok", nama: "Ceu Enok", peran: "Petani · tandur padi", kegiatan: "tandur",
		rute: { x0: 4, x1: 16, z: 28.2, laju: 0.25 },
		rupa: orang({ perempuan: true, baju: "#dc6b4a", jilbab: "#3f6212", rok: true, topiGaya: caping, kulit: kulit[1] }),
		hadiah: { benih: "ubi" },
	},
	{
		id: "ujang", nama: "Mang Ujang", peran: "Petani · mencangkul", kegiatan: "cangkul",
		tetap: { x: -44, z: -2, rot: 0.6 },
		rupa: orang({ baju: "#a16207", celana: "#292524", topiGaya: caping, kulit: kulit[2] }),
	},
	{
		id: "udin", nama: "Kang Udin", peran: "Warga · jalan-jalan", kegiatan: "jalan",
		titik: [[-60, JALAN_EW.z - 1.2], [JALAN_NS.x - 1, JALAN_EW.z - 1.2], [60, JALAN_EW.z - 1.2], [JALAN_NS.x + 1, JALAN_EW.z + 1.2]],
		laju: 1.4,
		rupa: orang({ baju: "#2563eb", celana: "#1e293b", topiGaya: { id: "cap", warna: "#ef4444" }, kulit: kulit[1] }),
	},
	{
		id: "lilis", nama: "Teh Lilis", peran: "Warga · ke warung", kegiatan: "jalan",
		titik: [[JALAN_NS.x - 1, -66], [JALAN_NS.x - 1, -36], [MEJA_WARUNG.x - 1.4, MEJA_WARUNG.z - 0.6, 6], [JALAN_NS.x + 0.8, -42], [MUSHOLA.x + 2, MUSHOLA.z + 5, 5], [JALAN_NS.x - 1, -55]],
		laju: 1.2,
		rupa: orang({ perempuan: true, baju: "#0ea5e9", jilbab: "#fde68a", rok: true, kulit: kulit[0] }),
	},
	{
		id: "rafi", nama: "Rafi", peran: "Anak desa · main bola", kegiatan: "bola", kecil: true,
		lingkar: { x: (LAPANGAN.x0 + LAPANGAN.x1) / 2, z: (LAPANGAN.z0 + LAPANGAN.z1) / 2, r: 5, laju: 0.55, fase: 0 },
		rupa: orang({ baju: "#ef4444", celana: "#f8fafc", kulit: kulit[1] }),
	},
	{
		id: "nengsih", nama: "Nengsih", peran: "Anak desa · main bola", kegiatan: "bola", kecil: true,
		lingkar: { x: (LAPANGAN.x0 + LAPANGAN.x1) / 2, z: (LAPANGAN.z0 + LAPANGAN.z1) / 2, r: 5, laju: 0.55, fase: 2.4 },
		rupa: orang({ perempuan: true, baju: "#facc15", celana: "#1e40af", rambut: "#2b1d12", kulit: kulit[2] }),
	},
	{
		id: "asih", nama: "Mak Asih", peran: "Peternak ayam", kegiatan: "jaga",
		tetap: { x: KANDANG_AYAM.x - 2.4, z: KANDANG_AYAM.z + 2.2, rot: 2.4 },
		rupa: orang({ perempuan: true, baju: "#7c3aed", jilbab: "#e5e7eb", rok: true, kulit: kulit[1] }),
		hadiah: { tenaga: 20, teks: "Ieu, bawa telur rebus buat bekal. (tenaga +20)" },
	},
	{
		id: "dadang", nama: "Pak Dadang", peran: "Penjaga gudang alat", kegiatan: "jaga",
		tetap: { x: (GUDANG_KEBUN.x0 + GUDANG_KEBUN.x1) / 2 - 0.6, z: GUDANG_KEBUN.z0 - 1, rot: Math.PI },
		rupa: orang({ baju: "#334155", celana: "#1f2937", topiGaya: { id: "bandana", warna: "#b91c1c" }, kulit: kulit[2] }),
		hadiah: { koin: 15, teks: "Tadi ada yang bayar utang ke gudang. Ini bagian kamu. (🪙 +15)" },
	},
];
export const WARGA_PER_ID = Object.fromEntries(WARGA.map((w) => [w.id, w]));
/** Warga yang hadir: pembajak & penandur hanya ada di kecamatan bertani. */
export const wargaAktif = () => (usahaKini().id === "bertani" ? WARGA : WARGA.filter((w) => w.kegiatan !== "bajak" && w.kegiatan !== "tandur"));

/** Tempatkan warga sesuai tata kecamatan aktif dan peran usahanya. Panggil setelah terapkanTata. */
export function tempatkanWarga() {
	const W = WARGA_PER_ID;
	const u = usahaKini();
	const bola = { x: (LAPANGAN.x0 + LAPANGAN.x1) / 2, z: (LAPANGAN.z0 + LAPANGAN.z1) / 2 };
	W.imas.tetap = { x: MEJA_WARUNG.x + 1.1, z: MEJA_WARUNG.z, rot: -Math.PI / 2 };
	W.sobari.tetap = { x: PENGEPUL_KEBUN.x - 0.4, z: PENGEPUL_KEBUN.z + 1.15, rot: Math.PI };
	W.sobari.peran = u.pembeli.peran;
	W.karta.tetap = { x: TITIK_SIUMAN.x - 1.4, z: TITIK_SIUMAN.z + 0.3, rot: Math.PI };
	W.karta.peran = u.peran.karta;
	W.dadang.peran = u.peran.dadang;
	W.dadang.tetap = { x: (GUDANG_KEBUN.x0 + GUDANG_KEBUN.x1) / 2 - 0.6, z: GUDANG_KEBUN.z0 - 1, rot: Math.PI };
	W.asih.tetap = { x: KANDANG_AYAM.x - 2.4, z: KANDANG_AYAM.z + 2.2, rot: 2.4 };
	W.ujang.tetap = { ...TITIK_CANGKUL };
	W.darsa.rute = { ...RUTE_BAJAK, laju: 0.9 };
	W.enok.rute = { ...RUTE_TANDUR, laju: 0.25 };
	W.udin.titik = [[-60, JALAN_EW.z - 1.2], [JALAN_NS.x - 1, JALAN_EW.z - 1.2], [60, JALAN_EW.z - 1.2], [JALAN_NS.x + 1, JALAN_EW.z + 1.2]];
	W.lilis.titik = [[JALAN_NS.x - 1, -66], [JALAN_NS.x - 1, MEJA_WARUNG.z - 3], [MEJA_WARUNG.x - 1.4, MEJA_WARUNG.z - 0.6, 6], [JALAN_NS.x + 0.8, -42], [MUSHOLA.x + 2, MUSHOLA.z + 5, 5], [JALAN_NS.x - 1, -55]];
	Object.assign(W.rafi.lingkar, bola);
	Object.assign(W.nengsih.lingkar, bola);
	for (const w of WARGA) Object.assign(posWarga.get(w.id), { x: w.tetap?.x ?? 0, z: w.tetap?.z ?? 0, ngobrol: 0 });
}

// posisi terkini tiap warga (ditulis komponen Warga tiap frame)
export const posWarga = new Map(WARGA.map((w) => [w.id, { x: w.tetap?.x ?? 0, z: w.tetap?.z ?? 0, ngobrol: 0 }]));

/** Satu kalimat obrolan sesuai keadaan kebun (tips yang berguna lebih dulu). */
export function kalimatWarga(id, giliran = 0) {
	const k = KOMODITAS[kebun.komoditas];
	const kering = kebun.petak.filter((p) => p.tahap === "tanam" && p.air < 0.3).length;
	const burung = kebun.petak.filter((p) => p.burung).length;
	const siap = kebun.petak.filter((p) => p.tahap === "siap").length;
	const u = usahaKini();
	const umum = {
		imas: [
			"Mangga, mau jajan apa? Kalau lemas, makan dulu atuh, jangan sampai pingsan di sawah.",
			"Caping di warung ibu bikin nggak cepat capek kepanasan. Murah, kualitas mah juara!",
			"Pupuk kompos ibu bikin padi cepat gede. Petani sini mah pakai semua.",
		],
		sobari: [
			`Bawa ${k.nama.toLowerCase()} yang bintang tiga, harganya bagus. Rawat tanaman jangan sampai kering!`,
			"Panen beruntun cepat-cepat, hasilnya nambah. Kombo, kata anak muda mah.",
			"Pesanan di papan saya ada bonusnya. Kumpulkan dulu sebanyak itu, baru jual.",
		],
		karta: [
			"Petani teh harus rajin. Tanah dicangkul, bibit ditanam, disiram, dijaga dari hama.",
			"Ulat datang waktu tanaman masih muda. Burung pipit datang waktu sudah berisi. Usir pakai E!",
			"Kalau hujan, tanaman tersiram sendiri. Itu rezeki, manfaatkan.",
			"Naik tingkat kelompok tani, lahan kamu nanti diperluas jadi 16 petak.",
		],
		darsa: [
			"Hayu, kerbau ini sudah 12 tahun bantu Bapak membajak. Si Jalu namanya.",
			"Tanah sawah harus diolah dulu sebelum tandur, biar gembur.",
		],
		enok: [
			"Tandur mah jalannya mundur, biar bibit yang ditanam tidak keinjak.",
			"Capek mah capek, tapi lihat padi menguning teh bahagia pisan.",
		],
		ujang: [
			"Cangkul baja di warung Bu Imas, kerjanya jadi jauh lebih cepat!",
			"Orang-orangan sawah ampuh mengusir burung pipit. Pasang satu di kebun.",
		],
		udin: [
			"Punten! Mau ke mana, Kang? Saya mah jalan-jalan cari angin.",
			"Kalau sore di lapangan sana ramai anak-anak main bola.",
		],
		lilis: [
			"Mau ke warung Bu Imas, beli kopi buat bapak di sawah.",
			"Hati-hati, kalau tenaga habis nanti pingsan. Tadi juga ada yang digotong ke saung.",
		],
		rafi: ["Ayo main bola! Eh, tapi Kakak lagi bertani ya?", "Nanti kalau sudah besar, Rafi mau jadi petani milenial!"],
		nengsih: ["Golll! Hehe, Nengsih yang cetak gol.", "Kakak, di kolam sana ada ikan mas besar loh."],
		asih: ["Ayam Mak mah bebas berkeliaran, telurnya bagus-bagus.", "Kalau dikejar, ayamnya kabur. Jangan diganggu atuh, hehe."],
		dadang: ["Gudang ini tempat alat kelompok tani. Kalau mau alat baru, beli di warung.", "Sumur di kebun airnya jernih, nggak pernah kering walau kemarau."],
	};
	const darurat = [];
	if (id === "karta" || id === "ujang" || id === "darsa") {
		if (tenaga.nilai < 25) darurat.push("Kamu pucat, Jang. Makan dulu di warung Bu Imas, nanti pingsan!");
		if (burung) darurat.push(`Itu ada ${burung} ${u.unit} ${u.ganggu2.kabar}! Cepat atasi!`);
		if (kering) darurat.push(`${kering} ${u.unit} kamu butuh perawatan. ${u.rawat.kata}, isi ulang di ${u.sumber.tempat}.`);
		if (siap >= 3) darurat.push(`Sudah ${siap} ${u.unit} siap. ${u.panen.kata} beruntun biar dapat kombo!`);
	}
	if (id === "sobari" && Object.values(kebun.bawa).some((n) => n > 0)) darurat.push(u.pembeli.ada);
	const daftar = [...darurat, ...(u.obrolan[id] || umum[id] || ["Punten…"])];
	return daftar[giliran % daftar.length];
}
