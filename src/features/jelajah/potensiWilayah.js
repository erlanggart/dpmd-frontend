/*
 * Potensi wilayah 40 kecamatan Kabupaten Bogor untuk peta kecamatan di
 * Jelajahi Kantor. Tiap kecamatan memakai satu game sesuai potensi utamanya,
 * dengan komoditas khasnya sendiri.
 *
 * Sumber riset (November 2026):
 * - Klaster perikanan & peternakan Pemkab Bogor 2026 (Cijeruk ikan hias, Kemang
 *   lele, Rancabungur patin & nila, Pamijahan ikan lokal, Rumpin & Jasinga ayam).
 * - Studi IPB komoditas unggulan Bogor Barat (padi Jasinga/Cigudeg/Rumpin,
 *   ubi jalar Dramaga, pisang Sukajaya/Ciampea, jambu biji Cibungbulang/
 *   Tenjolaya/Parung Panjang, cengkeh Pamijahan) dan sentra manggis
 *   (Leuwiliang, Leuwisadeng, Cigudeg, Sukamakmur, Klapanunggal).
 * - Sentra ikan hias Ciseeng & Parung; tanaman hias Tamansari, Ciawi,
 *   Megamendung, Cisarua, Kemang, Ciseeng, Gunung Sindur; kambing PE Caringin,
 *   Cijeruk, Ciampea, Ciawi, Cigombong, Cariu.
 * - Alas kaki Ciomas (juga Tamansari, Dramaga); emas Pongkor (Nanggung); batu
 *   kapur Citeureup & Klapanunggal; kawasan industri Gunung Putri & Cileungsi;
 *   agrowisata teh Gunung Mas (Cisarua); curug Gunung Salak; Danau Lido.
 * Kecamatan bertanda `terverifikasi: false` belum ditemukan sumber jelasnya:
 * isinya dugaan dan perlu dikonfirmasi DPMD.
 */

export const GAME = {
	bertani: { nama: "Bertani", ikon: "🌾", warna: "#84cc16" },
	ikan: { nama: "Budidaya ikan", ikon: "🐟", warna: "#38bdf8" },
	ternak: { nama: "Beternak", ikon: "🐐", warna: "#f59e0b" },
	wisata: { nama: "Pemandu wisata", ikon: "🏞️", warna: "#22c55e" },
	produksi: { nama: "Kerajinan & industri", ikon: "🏭", warna: "#a78bfa" },
	tambang: { nama: "Tambang", ikon: "⛏️", warna: "#e3b23c" },
};

/* komoditas: jenis tanaman/ikan/ternak/produk yang dipakai game */
export const POTENSI = {
	"Nanggung": { game: "tambang", komoditas: "emas", ringkas: "Tambang emas Gunung Pongkor (Antam) di kaki Halimun-Salak." },
	"Leuwiliang": { game: "bertani", komoditas: "manggis", ringkas: "Kawasan agropolitan manggis berkualitas ekspor." },
	"Leuwisadeng": { game: "bertani", komoditas: "manggis", ringkas: "Wilayah unggulan manggis Bogor Barat." },
	"Pamijahan": { game: "bertani", komoditas: "jeruk", ringkas: "Jeruk siam, cengkeh, dan padi; klaster ikan lokal." },
	"Cibungbulang": { game: "bertani", komoditas: "jambu", ringkas: "Jambu biji dan kopi rakyat." },
	"Ciampea": { game: "bertani", komoditas: "pisang", ringkas: "Pisang; juga peternakan kambing PE." },
	"Tenjolaya": { game: "wisata", komoditas: "curug", ringkas: "Curug-curug Gunung Salak (Curug Ngumet, Ciputri) dan jambu biji." },
	"Dramaga": { game: "bertani", komoditas: "ubi", ringkas: "Ubi jalar; kota pendidikan (IPB) dan perajin alas kaki." },
	"Ciomas": { game: "produksi", komoditas: "sandal", ringkas: "Sentra perajin sepatu dan sandal rumahan terbesar di Bogor." },
	"Tamansari": { game: "bertani", komoditas: "tanaman hias", ringkas: "Tanaman hias, Curug Nangka, dan perajin alas kaki." },
	"Cijeruk": { game: "ikan", komoditas: "ikan hias", ringkas: "Klaster ikan hias 2026; juga kambing PE." },
	"Cigombong": { game: "wisata", komoditas: "danau", ringkas: "Danau Lido dan jalur pendakian Gunung Salak; kambing PE." },
	"Caringin": { game: "ternak", komoditas: "kambing", ringkas: "Peternakan kambing perah PE." },
	"Ciawi": { game: "ternak", komoditas: "kambing", ringkas: "Kambing PE dan tanaman hias." },
	"Cisarua": { game: "wisata", komoditas: "teh", ringkas: "Agrowisata kebun teh Gunung Mas dan kawasan Puncak." },
	"Megamendung": { game: "bertani", komoditas: "tanaman hias", ringkas: "Tanaman hias dan wisata alam Puncak." },
	"Sukaraja": { game: "produksi", komoditas: "umkm", ringkas: "Wilayah penyangga perkotaan, perdagangan dan UMKM.", terverifikasi: false },
	"Babakan Madang": { game: "wisata", komoditas: "gunung", ringkas: "Sentul, Gunung Pancar, dan wisata alam perbukitan." },
	"Sukamakmur": { game: "bertani", komoditas: "manggis", ringkas: "Sentra manggis dan kopi di perbukitan timur." },
	"Cariu": { game: "bertani", komoditas: "padi", ringkas: "Persawahan wilayah timur; kambing PE." },
	"Tanjungsari": { game: "bertani", komoditas: "padi", ringkas: "Pertanian lahan sawah dan ladang perbukitan timur.", terverifikasi: false },
	"Jonggol": { game: "bertani", komoditas: "padi", ringkas: "Persawahan dan peternakan wilayah timur.", terverifikasi: false },
	"Cileungsi": { game: "produksi", komoditas: "pabrik", ringkas: "Kawasan industri dan perdagangan Bogor Timur." },
	"Klapanunggal": { game: "tambang", komoditas: "kapur", ringkas: "Batu kapur Formasi Klapanunggal untuk semen; juga manggis." },
	"Gunung Putri": { game: "produksi", komoditas: "pabrik", ringkas: "Kawasan industri manufaktur." },
	"Citeureup": { game: "tambang", komoditas: "kapur", ringkas: "Tambang batu kapur dan pabrik semen." },
	"Cibinong": { game: "produksi", komoditas: "umkm", ringkas: "Ibu kota kabupaten: pusat pemerintahan, perdagangan, dan riset.", terverifikasi: false },
	"Bojonggede": { game: "produksi", komoditas: "umkm", ringkas: "Permukiman penyangga dengan UMKM rumahan.", terverifikasi: false },
	"Kemang": { game: "ikan", komoditas: "lele", ringkas: "Klaster budidaya lele 2026; juga tanaman hias." },
	"Rancabungur": { game: "ikan", komoditas: "patin", ringkas: "Klaster budidaya patin dan nila 2026." },
	"Parung": { game: "ikan", komoditas: "ikan hias", ringkas: "Pasar ikan hias Parung, salah satu terbesar di Asia Tenggara." },
	"Ciseeng": { game: "ikan", komoditas: "ikan hias", ringkas: "Sentra benih ikan hias dan air tawar." },
	"Gunung Sindur": { game: "bertani", komoditas: "tanaman hias", ringkas: "Sentra tanaman hias." },
	"Rumpin": { game: "bertani", komoditas: "padi", ringkas: "Padi sawah; klaster ayam 2026." },
	"Cigudeg": { game: "bertani", komoditas: "padi", ringkas: "Padi sawah dan manggis." },
	"Sukajaya": { game: "bertani", komoditas: "pisang", ringkas: "Pisang dan manggis di tepi Halimun." },
	"Jasinga": { game: "bertani", komoditas: "padi", ringkas: "Padi sawah dan manggis; klaster ayam 2026." },
	"Tenjo": { game: "bertani", komoditas: "padi", ringkas: "Persawahan wilayah barat laut.", terverifikasi: false },
	"Parung Panjang": { game: "bertani", komoditas: "jambu", ringkas: "Jambu biji." },
	"Tajurhalang": { game: "produksi", komoditas: "umkm", ringkas: "Permukiman penyangga dengan UMKM rumahan.", terverifikasi: false },
};

const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, "");
const PER_NORM = Object.fromEntries(Object.entries(POTENSI).map(([k, v]) => [norm(k), { nama: k, ...v }]));
export const potensiKecamatan = (nama) => PER_NORM[norm(nama)] || null;
