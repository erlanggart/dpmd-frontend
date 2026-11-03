import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ambilKeadaan, kendali, posisi } from "../jelajahStore";
import { aturLatar, hentikanLatar } from "../musikLatar";
import { OBROLAN, ucapkan } from "../suaraOrang";
import { aturMesinLain, aturSuasanaSuara, senyapkanSuasana } from "../suasanaSuara";
import { AULA_CCM, KONTER_KOPI, KONTER_MCD, LOKET, MCD, POPCORN, TITIK_BUTIK, TITIK_PESAN_FC, dalamAulaCcm, dalamMcd, malAktif } from "./gedungKhusus";
import { KENDARAAN_LALIN } from "./lalinKawasan";
import { DISTRO, GEROBAK_MIE, GEROBAK_PECEL, TOKO, dalamDistro, tokoDi } from "./layout";
import { jarakKeTepi } from "./situ";
import { suasana } from "./suasana";
import { LAPAK_PASAR, PASAR, dalamPasar } from "./pasarBumdesData";

// Pengatur suasana suara di sekitar tamu, dicek beberapa kali per detik:
// - musik latar: "berkendara" di mobil/motor, "mal" di dalam mal/McD/toko, "jalan" di luar;
// - suara sekitar: angin, burung/jangkrik, deru lalu lintas, mesin kendaraan sendiri
//   & tiga kendaraan lalu lintas terdekat;
// - sapaan bersuara (bahasa Indonesia) dari penjual, kasir, kru, dan petugas saat tamu mendekat,
//   dan obrolan pengunjung di tempat ramai.

const KALIMAT_LAPAK = {
	"pasar-kopi": ["Kopinya, Kak? Dari kopi BUM Desa, diseduh tubruk.", "Es kopi susu gula arennya segar, Kak!"],
	"pasar-telur": ["Telurnya langsung dari peternak BUM Desa, Kak!", "Martabak telurnya baru matang, Kak."],
	"pasar-ikan": ["Nila bakarnya, Kak? Ikannya dari kolam desa.", "Keripik patinnya renyah, Kak, oleh-oleh juga bisa."],
	"pasar-kebun": ["Jus jambu kristal, Kak? Seger banget.", "Sayurnya hidroponik, panen tadi pagi, Kak."],
	"pasar-tempe": ["Nasi liwetnya, Kak? Sambal rawitnya pedas!", "Mendoan hangat, Kak, baru diangkat."],
	"pasar-sate": ["Sate dombanya, Kak! Empuk, bumbu maranggi.", "Kue tradisionalnya buatan ibu-ibu desa, Kak."],
};

// [x, z, jangkau, lantaiMal|null, kalimat[], perempuan]
const SAPA_TEMPAT = [
	...TOKO.filter((t) => t.id !== "ccm").map((t) => [(t.pintu.x0 + t.pintu.x1) / 2, t.z0 + 1.5, 3, null, t.id === "alfamart" ? ["Selamat datang di Alfamart, selamat berbelanja!", "Selamat datang, Kak. Ada promo minuman hari ini."] : ["Mari, Kak, sembako murah di Koperasi Desa Merah Putih.", "Beras dan minyaknya baru datang, Kak."], t.id === "alfamart"]),
	[GEROBAK_MIE.x, GEROBAK_MIE.z - 1, 3, null, ["Mie ayamnya, Kak! Masih hangat.", "Mampir, Kak, mie ayam Pak Kumis!", "Bakso juga ada, Kak."], false],
	[GEROBAK_PECEL.x, GEROBAK_PECEL.z - 1, 3, null, ["Pecel ayamnya, Nak? Sambalnya baru diulek!", "Mari, mampir dulu. Lele gorengnya garing!", "Makan dulu, Nak, biar kuat kerjanya."], true],
	[(DISTRO.pintu.x0 + DISTRO.pintu.x1) / 2, DISTRO.z0 + 1.5, 3, null, ["Selamat datang di Distro Gaya, silakan dicoba bajunya.", "Koleksi baru, Kak, ruang cobanya di sebelah kanan."], true],
	[(MCD.pintu.x0 + MCD.pintu.x1) / 2, MCD.z1 - 2, 3.5, null, ["Selamat datang di McD! Silakan pesan di kasir.", "Selamat datang, mau makan di sini atau dibawa pulang?"], true],
	[(KONTER_MCD.x0 + KONTER_MCD.x1) / 2, KONTER_MCD.z1 + 1.2, 2.5, null, ["Mau pesan apa, Kak? Paket nasi ayamnya lagi laris.", "Silakan, Kak, mau tambah kentang?"], false],
	[(AULA_CCM.pintu.x0 + AULA_CCM.pintu.x1) / 2, AULA_CCM.z0 + 2, 4, 0, ["Selamat datang di Cibinong City Mall!", "Bioskop ada di lantai empat, Kak. Food court di lantai tiga."], true],
	[KONTER_KOPI.x0 - 1.2, (KONTER_KOPI.z0 + KONTER_KOPI.z1) / 2, 2.5, 0, ["Kopinya, Kak? Es kopi susu gula aren paling laris.", "Silakan, mau yang panas atau dingin?"], false],
	[TITIK_BUTIK[0].x, TITIK_BUTIK[0].z, 2.5, 1, ["Silakan dilihat koleksi barunya, Kak.", "Ada diskon untuk baju batik hari ini."], true],
	[TITIK_PESAN_FC.x, TITIK_PESAN_FC.z, 2.5, 2, ["Silakan, Kak, mau nasi goreng atau ayam geprek?", "Baksonya masih panas, Kak!"], false],
	[LOKET.x0 - 1.2, (LOKET.z0 + LOKET.z1) / 2, 2.5, 3, ["Mau nonton film sejarah Bogor, Kak? Tiketnya tiga puluh lima koin.", "Silakan pilih filmnya, Kak. Studio satu sebentar lagi mulai."], true],
	[(POPCORN.x0 + POPCORN.x1) / 2, POPCORN.z0 - 1, 2.5, 3, ["Popcornnya, Kak? Ada rasa karamel.", "Minumnya sekalian, Kak?"], true],
	// lapak food court Pasar BUMDes
	...LAPAK_PASAR.map((l, i) => [l.titik.x, l.titik.z, 2.2, null, KALIMAT_LAPAK[l.id], i % 2 === 1]),
];

// Tempat ramai yang punya obrolan latar: [x, z, jangkau, lantaiMal|null]
const TEMPAT_OBROL = [
	[GEROBAK_MIE.x - 4, GEROBAK_MIE.z + 4, 12, null],
	[GEROBAK_PECEL.x + 4, GEROBAK_PECEL.z + 4, 12, null],
	[(MCD.x0 + MCD.x1) / 2, (MCD.z0 + MCD.z1) / 2, 14, null],
	[(AULA_CCM.x0 + AULA_CCM.x1) / 2, (AULA_CCM.z0 + AULA_CCM.z1) / 2, 30, 0],
	[(AULA_CCM.x0 + AULA_CCM.x1) / 2, (AULA_CCM.z0 + AULA_CCM.z1) / 2, 30, 1],
	[-1734, -585, 20, 2],
	[0, 0, 14, null], // lobi kantor DPMD
	[(PASAR.x0 + PASAR.x1) / 2, (PASAR.z0 + PASAR.z1) / 2, 14, null], // food court Pasar BUMDes
];

export default function SuasanaHidup() {
	const t = useRef(0);
	const sapaLagi = useRef(new Map());
	const obrol = useRef({ lagi: 0, dialog: null, baris: 0, tempat: null });

	useEffect(() => () => {
		hentikanLatar();
		senyapkanSuasana();
	}, []);

	useFrame((_, dt) => {
		t.current += dt;
		if (t.current < 0.2) return;
		t.current = 0;
		const kini = performance.now();
		const k = posisi.kend;
		const pose = posisi.pose;
		const keadaan = ambilKeadaan();
		const diKantor = keadaan.area !== "luar";
		const diMcd = dalamMcd(posisi.x, posisi.z);
		const diMal = dalamAulaCcm(posisi.x, posisi.z);
		const diToko = !!tokoDi(posisi.x, posisi.z) || dalamDistro(posisi.x, posisi.z);
		const dalam = diKantor || diMcd || diMal || diToko;

		// --- musik latar ---
		const berkendara = k && (k.jenis === "mobil" || k.jenis === "motor");
		// dekat panggung food court Pasar BUMDes: band akustik live
		const diPasar = posisi.lantai === 0 && dalamPasar(posisi.x, posisi.z, 7);
		aturLatar(berkendara ? "berkendara" : pose === "perahu" || pose === "mancing" ? null : diMal || diMcd || diToko ? "mal" : diPasar ? "live" : "jalan");

		// --- suara sekitar ---
		const laju = berkendara ? Math.abs(k.laju) : 0;
		const malam = suasana.malam;
		const luar = !dalam;
		const situ = jarakKeTepi(posisi.x, posisi.z) < 40 ? 0.35 : 0;
		// lalu lintas: makin banyak & dekat makin keras
		const terdekat = [];
		let deru = 0;
		for (const v of KENDARAAN_LALIN) {
			if (v.hidup === false) continue;
			const d = Math.hypot(v.x - posisi.x, v.z - posisi.z);
			if (d < 90) deru += (1 - d / 90) * (v.laju > 1 ? 1 : 0.4);
			if (d < 45) terdekat.push({ jenis: v.jenis === "motor" ? "motor" : "mobil", laju: v.laju, jarak: d });
		}
		terdekat.sort((a, b) => a.jarak - b.jarak);
		aturMesinLain(luar || berkendara ? terdekat.slice(0, 3) : []);
		aturSuasanaSuara({
			angin: luar ? 0.55 + situ + Math.min(1, laju / 14) * (k?.jenis === "motor" ? 1 : 0.4) : 0,
			lalin: Math.min(1, deru / 4) * (luar ? 1 : 0.25),
			burung: luar && malam < 0.4 && suasana.hujan < 0.3 ? 0.7 : 0,
			jangkrik: luar && malam > 0.6 ? 0.8 : 0,
			mesin: berkendara && !posisi.kursi ? { jenis: k.jenis, laju: k.laju, gas: Math.abs(kendali.arah.y) || 0 } : berkendara ? { jenis: k.jenis, laju: k.laju, gas: 0.4 } : null,
		});

		// --- sapaan & obrolan bersuara ---
		if (k) return;
		const lantaiMal = diMal ? malAktif.lantai : null;
		for (const [i, [x, z, jangkau, n, kalimat, perempuan]] of SAPA_TEMPAT.entries()) {
			if (n !== null && n !== lantaiMal) continue;
			if (Math.hypot(x - posisi.x, z - posisi.z) > jangkau) continue;
			if ((sapaLagi.current.get(i) || 0) > kini) continue;
			if (ucapkan(kalimat[Math.floor(Math.random() * kalimat.length)], { x, z, perempuan, penting: true, jangkau: jangkau + 6 })) sapaLagi.current.set(i, kini + 60000);
			return;
		}
		const o = obrol.current;
		if (kini < o.lagi) return;
		const tempat = TEMPAT_OBROL.find(([x, z, jangkau, n]) => (n === null || n === lantaiMal) && (n === null || diMal) && Math.hypot(x - posisi.x, z - posisi.z) < jangkau);
		if (!tempat) {
			o.dialog = null;
			return;
		}
		if (!o.dialog || o.baris >= o.dialog.length || o.tempat !== tempat) {
			o.dialog = OBROLAN[Math.floor(Math.random() * OBROLAN.length)];
			o.baris = 0;
			o.tempat = tempat;
		}
		// dua orang bergantian (suara pria/wanita), sedikit menjauh dari tamu
		const [x, z] = tempat;
		if (ucapkan(o.dialog[o.baris], { x: x + 3, z: z + 3, perempuan: o.baris % 2 === 1, jangkau: tempat[2] + 10, nada: o.baris % 2 ? 0.1 : -0.1 })) {
			o.baris++;
			o.lagi = kini + (o.baris >= o.dialog.length ? 9000 + Math.random() * 9000 : 2600);
		}
	});
	return null;
}

