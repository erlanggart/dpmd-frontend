import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Raycaster, Vector2, Vector3 } from "three";
import { BENDA, LOBI, RUANGAN, TINGGI_LANTAI, TITIK_MULAI, cariArea } from "../kantorConfig";
import { kendali, posisi, setKeadaan } from "../jelajahStore";
import { KENDARAAN, KURSI as KURSI_KENDARAAN, airDekat, tambahPerahu, kendaraanDariId, keDunia, kursiDunia, lingkaran, resetKendaraan, tabrakKendaraan, titikNaikKursi } from "./kendaraan";
import { FASILITAS_TOKO, KURSI_BIOSKOP, KURSI_KOLAM, KURSI_MAKAN, KURSI_REHAT, BENAM_APUNG, PAGAR_PANJAT, naikDariAir, TITIK_PESAN_PECEL, TOKO_PER_ID, PERMUKAAN_SITU, aturBadanRenang, diAirSitu, langkahRenang, PERABOT, PETI_HADIAH, TITIK_DISTRO, bilikDi, dalamDistro, TITIK_PESAN_MIE, TITIK_CAPIT, TITIK_CENDOL, tokoDi, TANAH, cariJalur, langkah, tabrakKendaraanStatis, tanggaDi, tinggiTanah } from "./layout";
import { diJalan, tinggiGedungDi } from "./kawasanBantu";
import { LAMA_PANJAT, akarPanjat, cariPagar } from "./gerakPanjat";
import { langkahKaki } from "../suasanaSuara";
import { diriSendiri, kursiTerpakai, pemainLain } from "../multipemain";
import { arahJoran, berhentiPancing, geserAsal, mulaiPancing, pancing, percik } from "../pancing";
import { laporTabrak } from "../tenaga";
import { LAMA_AMBIL, belanja, kembalikanKeranjang, selesaiAmbil } from "../belanja";
import { TENAGA_LARI, setTenaga, tenaga, ubahTenaga } from "../tenaga";
import { AIR_Y, DEK_Y, DERMAGA, KIOS_TOKO_PANCING, KIOS_TOKO_PERAHU, PERAHU, dermagaDi, jarakKeTepi, diPanggung, perahuBebas, titikPancing, titikTepi, titikTurun } from "./situ";
import { bukaPeti, petiSiap } from "../harta";
import { aksesKolam } from "../kolamMonster";
import { AIR_KOLAM_Y, TITIK_LOKET_KOLAM, titikTepiKolam } from "./kolamMonsterData";
import { LAPAK_PASAR, TITIK_ETALASE_PASAR } from "./pasarBumdesData";
import { cariModel } from "./modelKendaraan";
import { TITIK_SALES_MOBIL, TITIK_SALES_MOTOR } from "./showroomData";
import { berhentiMakan, mulaiMakan, tickMakan, warung } from "../warung";
import { berhentiNonton, tickNonton } from "../bioskop";
import { AULA_CCM, dalamStudio, TITIK_BUTIK, TITIK_LIFT, TITIK_LOKET, TITIK_PESAN_FC, TITIK_PESAN_KOPI, TITIK_PESAN_MCD, dalamAulaCcm, dalamGedungKhusus, dalamLahanCcm, dalamMcd, lantaiMalDariY, malAktif } from "./gedungKhusus";

// Lantai kantor dari ketinggian; di dalam lahan mal semua lantai mal dihitung "lantai 0" kawasan
// (lantai mal sendiri di malAktif).
const lantaiDari = (y, x, z) => (y > H / 2 && !dalamLahanCcm(x, z) ? 1 : 0);
// Permukaan pijakan untuk suara langkah kaki.
function permukaanDi(x, z, y, renang) {
	if (renang) return "air";
	if (dermagaDi(x, z)) return "kayu";
	if (y > 0.5 || dalamGedungKhusus(x, z) || tokoDi(x, z) || dalamDistro(x, z) || diJalan(x, z)) return "keras";
	// halaman kantor berpaving, teras, jalan depan & halaman toko
	if (Math.abs(x) < 34 && z > -14 && z < 47) return "keras";
	return "rumput";
}
import { lemari, selesaiCoba } from "../lemari";
import { catat } from "../progres";
import { acaraKini, kantor, stempelSudah } from "../kantorHidup";
import { TENDA_BAZAR, TITIK_PANITIA } from "./acaraData";
import KeranjangTangan from "./KeranjangTangan";
import Tokoh from "./Tokoh";

const H = TINGGI_LANTAI;
const PETUGAS = [LOBI, ...RUANGAN];
const JARAK_SAPA = 3.8;
const JARAK_BENDA = 1.6;
// Titik di bagian atas layar (koordinat NDC) untuk memeriksa atap di atas pandangan.
const ATAS_LAYAR = new Vector2(0, 0.85);
const JARAK_KURSI = 0.95;
const JARAK_MOBIL = 1.3;
const JARAK_MOTOR = 1.1;
const JARAK_TAMU = 2.2;
const JARAK_KERANJANG = 1.6;
const JARAK_KASIR = 1.4;
const JARAK_GEROBAK = 1.5;
const JARAK_PETI = 1.3;
// tenaga berkurang per detik: diam/jalan, tambahan saat berlari, tambahan saat adu tarik ikan
const KURAS = { dasar: 1 / 25, lari: 1 / 4, tarik: 1 / 6, renang: 1 / 7 };
const KECEPATAN = { jalan: 3.8, lari: 6.8, renang: 1.9, renangCepat: 3.0, jongkok: 1.8 };
const GRAVITASI = 13;
const LONCAT = 4.6;
const LONCAT_MOTOR = 4.2;
const TOMBOL_GERAK = new Set([
	"KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight",
]);
// Pengunjung: kemeja kasual (bukan seragam), supaya beda dari pegawai. Bila tamu sudah
// memilih avatar, penampilan dari pilihannya dipakai.
const PENAMPILAN_BAWAAN = { seragam: "warga", perempuan: false, kulit: "#d9ad85", rambut: "#20160f", baju: "#e0703a", celana: "#1e3a5f" };
// Pengaturan berkendara: laju maksimum (m/s), percepatan, jarak sumbu roda.
const KEMUDI = {
// redam: belokan dikurangi saat kencang (motor tidak terlalu sensitif); setirCepat = respons setang.
	mobil: { maju: 10, turbo: 15, mundur: 4, gas: 6, rem: 12, sumbu: 2.6, belok: 0.55, redam: 0.05, setirCepat: 8 },
	motor: { maju: 12, turbo: 18, mundur: 2.5, gas: 8, rem: 14, sumbu: 1.3, belok: 0.45, redam: 0.22, setirCepat: 3.5 },
	perahu: { maju: 3.2, turbo: 5, mundur: 1.4, gas: 1.6, rem: 2.6, belok: 0.75 },
};
// Kendaraan milik (showroom): laju puncak & gas dikali sifat modelnya.
const kemudiUntuk = (kend) => {
	const dasar = KEMUDI[kend.jenis];
	const m = kend.model && cariModel(kend.jenis, kend.model);
	return m ? { ...dasar, maju: dasar.maju * m.laju, turbo: dasar.turbo * m.laju, gas: dasar.gas * m.gas } : dasar;
};
// Dasar tokoh yang duduk di perahu, relatif tanah halaman.
const DUDUK_PERAHU = AIR_Y - 0.32;
// jarak ke lambung perahu (bukan ke titik tengahnya) untuk bisa naik dari papan dermaga
const JARAK_PERAHU = 2.2;
const jarakLambung = (k, x, z) => Math.min(...lingkaran(k).map((o) => Math.hypot(o.x - x, o.z - z) - o.r));
// jok jetski di atas lambung, lebih tinggi dari bangku perahu
const yKursi = (k) => (k.jetski ? TANAH + AIR_Y - 0.12 : k.jenis === "perahu" ? TANAH + DUDUK_PERAHU : TANAH);

const sudutDekat = (dari, ke) => dari + Math.atan2(Math.sin(ke - dari), Math.cos(ke - dari));
// Sisi rak toko terdekat yang dihadapi pemain dari lorong: barang & arah hadapnya.
function rakDekat(x, z) {
	const toko = tokoDi(x, z);
	let hasil = null;
	for (const r of toko?.rak || []) {
		if (z < r.z0 - 0.3 || z > r.z1 + 0.3) continue;
		for (const sisi of [-1, 1]) {
			const d = sisi * (x - r.x) - 0.28;
			if (d > 0 && d < 0.9 && (!hasil || d < hasil.d)) hasil = { id: sisi < 0 ? r.kiri : r.kanan, d, arah: sisi < 0 ? Math.PI / 2 : -Math.PI / 2 };
		}
	}
	return hasil;
}

// kursi kantor + bangku warung mie ayam (yang tidak sedang diduduki pelanggan NPC)
// Panggil perahu: perahu menganggur (tanpa pengemudi/penumpang) yang paling jauh dari
// tambatannya dikembalikan ke tambatan kosong terdekat dari pemain.
// Panggil perahu (tak terbatas): perahu menganggur yang paling jauh dari tambatannya
// didatangkan ke tambatan kosong terdekat — atau ke air di samping pemain. Bila semua perahu
// sedang dipakai, perahu baru dimunculkan.
function panggilPerahu(x, z) {
	const kosong = PERAHU.filter((s) => !KENDARAAN.some((k) => k.jenis === "perahu" && Math.hypot(k.x - s.x, k.z - s.z) < 1.5)).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
	const tujuan = kosong[0] && Math.hypot(kosong[0].x - x, kosong[0].z - z) < 25 ? kosong[0] : airDekat(x, z);
	if (!tujuan) return ubahTenaga(0, { teks: "Tidak ada air yang cukup lapang di dekat sini", jenis: "buruk" });
	const nganggur = KENDARAAN.filter((k) => k.jenis === "perahu" && !k.milik && posisi.kend !== k && !kursiTerpakai(k.id).size);
	const jauh = (k) => Math.min(...PERAHU.map((s) => Math.hypot(k.x - s.x, k.z - s.z)), Math.hypot(k.x - x, k.z - z) > 30 ? 999 : 0);
	let perahu = nganggur.sort((a, b) => jauh(b) - jauh(a))[0];
	// perahu menganggur yang sudah tertambat di dekat sini tidak perlu dipindah
	if (perahu && Math.hypot(perahu.x - x, perahu.z - z) < 9) return ubahTenaga(0, { teks: "🚣 Ada perahu di dekat Anda — dekati lalu tekan Naik", jenis: "info" });
	if (!perahu) perahu = tambahPerahu(tujuan.x, tujuan.z, tujuan.rot);
	if (!perahu) return ubahTenaga(0, { teks: "Situ sudah penuh perahu — coba lagi nanti", jenis: "buruk" });
	Object.assign(perahu, { x: tujuan.x, z: tujuan.z, rot: tujuan.rot, laju: 0, setir: 0 });
	percik(tujuan.x, tujuan.z, 1.2);
	ubahTenaga(0, { teks: "🚣 Perahu datang! Silakan naik", jenis: "baik" });
}

// kursi kantor, bangku/kursi tempat makan (yang tidak diduduki pelanggan NPC), kursi bioskop
const KURSI = [...PERABOT.filter((p) => ["kursi", "kursiEksekutif", "sofa"].includes(p.jenis)), ...KURSI_MAKAN.filter((k) => !k.npc), ...KURSI_BIOSKOP, ...KURSI_KOLAM, ...KURSI_REHAT];

export default function Pemain({ daftarDinding, penghuni, penampilan = PENAMPILAN_BAWAAN }) {
	const grup = useRef();
	const badanLoncat = useRef();
	const tokohJalan = useRef();
	const tokohDuduk = useRef();
	const penandaTujuan = useRef();
	const bidangKlik = useRef();
	const riak = useRef();
	// jarak tempuh untuk misi harian (renang / mendayung / naik motor)
	const tempuh = useRef({ x: 0, z: 0, jenis: null, akum: 0 });
	const gerak = useRef({ laju: 0, fase: 0, udara: false, isyarat: null });
	const tombol = useRef(new Set());
	const rute = useRef(null);
	const macet = useRef(0);
	const tegurToko = useRef(0);
	const loncat = useRef({ h: 0, vy: 0 });
	const dorong = useRef(null); // terpental setelah tertabrak
	// mode: jalan | duduk | masuk | kemudi | turun
	const mode = useRef({ jenis: "jalan", t: 0, k: null, kursi: null, dari: null });
	const kamera = useRef({ yaw: TITIK_MULAI.yaw, pitch: 0.55, jarak: 10, luar: 1, lompat: true });
	const bantu = useMemo(() => ({ ray: new Raycaster(), arah: new Vector3(), kepala: new Vector3(), lihat: new Vector3(), fokus: new Vector3() }), []);
	const { camera, gl } = useThree();

	// Kursi & sofa yang tidak sedang diduduki pegawai.
	const kursiBebas = useMemo(() => {
		const terisi = (penghuni?.orang || []).filter((o) => o.pose === "duduk");
		return KURSI.filter((k) => !terisi.some((o) => o.lantai === k.lantai && Math.hypot(o.x - k.x, o.z - k.z) < 0.35)).map((k, i) => ({ ...k, id: `kursi:${i}` }));
	}, [penghuni]);

	useEffect(() => {
		kamera.current.jarak = window.innerWidth < 640 ? 12 : 10;
		resetKendaraan();
		berhentiPancing();
	}, []);

	// Keyboard: tombol gerak & Spasi (loncat) ditangani di sini; E/Esc/M milik UI.
	useEffect(() => {
		const turun = (e) => {
			if (e.target.closest?.("input, textarea, [contenteditable], button")) return;
			if (e.code === "Space") {
				e.preventDefault();
				if (!e.repeat) kendali.loncat = true;
				return;
			}
			if (e.code === "KeyC") {
				if (!e.repeat) kendali.jongkok = !kendali.jongkok;
				return;
			}
			if (!TOMBOL_GERAK.has(e.code)) return;
			if (e.code.startsWith("Arrow")) e.preventDefault();
			tombol.current.add(e.code);
		};
		const naik = (e) => tombol.current.delete(e.code);
		const lepasSemua = () => tombol.current.clear();
		window.addEventListener("keydown", turun);
		window.addEventListener("keyup", naik);
		window.addEventListener("blur", lepasSemua);
		return () => {
			window.removeEventListener("keydown", turun);
			window.removeEventListener("keyup", naik);
			window.removeEventListener("blur", lepasSemua);
		};
	}, []);

	// Seret di kanvas untuk memutar kamera, roda mouse untuk zoom.
	useEffect(() => {
		const el = gl.domElement;
		let aktif = null;
		const turun = (e) => {
			if (aktif !== null) return;
			aktif = { id: e.pointerId, x: e.clientX, y: e.clientY };
		};
		const gerakPointer = (e) => {
			if (!aktif || e.pointerId !== aktif.id) return;
			const k = kamera.current;
			// Saat memancing seretan menggerakkan joran saja (bidikan sebelum melempar;
			// saat adu tarik arahnya dibaca GamePancing dari posisi mouse) — kamera diam.
			if (pancing.aktif) {
				if (pancing.fase === "siap") pancing.aim -= (e.clientX - aktif.x) * 0.004;
				aktif.x = e.clientX;
				aktif.y = e.clientY;
				return;
			}
			k.yaw -= (e.clientX - aktif.x) * 0.006;
			k.pitch = Math.min(1.2, Math.max(0.3, k.pitch + (e.clientY - aktif.y) * 0.004));
			aktif.x = e.clientX;
			aktif.y = e.clientY;
		};
		const naik = (e) => {
			if (aktif && e.pointerId === aktif.id) aktif = null;
		};
		const roda = (e) => {
			e.preventDefault();
			const k = kamera.current;
			k.jarak = Math.min(15, Math.max(5, k.jarak + e.deltaY * 0.01));
		};
		el.addEventListener("pointerdown", turun);
		window.addEventListener("pointermove", gerakPointer);
		window.addEventListener("pointerup", naik);
		window.addEventListener("pointercancel", naik);
		el.addEventListener("wheel", roda, { passive: false });
		return () => {
			el.removeEventListener("pointerdown", turun);
			window.removeEventListener("pointermove", gerakPointer);
			window.removeEventListener("pointerup", naik);
			window.removeEventListener("pointercancel", naik);
			el.removeEventListener("wheel", roda);
		};
	}, [gl]);

	useFrame((_, dtMentah) => {
		// Dibatasi 0,1 detik: di HP yang hanya 10–20 fps langkah tetap normal, dan lompatan
		// terjauh (lari, 0,68 m) masih lebih pendek dari tebal dinding + badan, jadi tak menembus.
		const dt = Math.min(dtMentah, 0.1);
		const g = grup.current;
		const p = g.position;
		const k = kamera.current;
		const m = mode.current;
		// lantai mal tempat pemain berada (penghalang & titik interaksi per lantai mal)
		malAktif.lantai = dalamLahanCcm(p.x, p.z) ? lantaiMalDariY(p.y) : 0;

		if (kendali.teleport) {
			const t = kendali.teleport;
			if (m.jenis !== "jalan") {
				if (m.jenis === "mancing") berhentiPancing();
				if (m.k) {
					m.k.laju = 0;
					m.k.pintu = 0;
					if (m.k.jenis === "motor") m.k.miring = 0.12;
				}
				mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
			}
			p.set(t.x, t.y ?? (t.lantai ? t.lantai * H : tinggiTanah(t.x, t.z)), t.z);
			g.rotation.y = t.rot;
			k.yaw = t.yaw;
			k.lompat = true;
			kendali.teleport = null;
			kendali.target = null;
			rute.current = null;
		}

		// --- masukan: keyboard + joystick ---
		const tb = tombol.current;
		const maju = kendali.arah.y + (tb.has("KeyW") || tb.has("ArrowUp") ? 1 : 0) - (tb.has("KeyS") || tb.has("ArrowDown") ? 1 : 0);
		const samping = kendali.arah.x + (tb.has("KeyD") || tb.has("ArrowRight") ? 1 : 0) - (tb.has("KeyA") || tb.has("ArrowLeft") ? 1 : 0);
		const lariMau = kendali.lari || kendali.lariAnalog || tb.has("ShiftLeft") || tb.has("ShiftRight");
		// jongkok hanya saat berjalan di darat (C saat memancing tetap milik kamera pancing)
		if (m.jenis !== "jalan" || p.y < TANAH - 0.2) kendali.jongkok = false;
		const jongkok = kendali.jongkok;
		const lari = lariMau && tenaga.nilai >= TENAGA_LARI && !jongkok;

		// --- tenaga terkuras; habis = pingsan, lalu bangun di depan lobi ---
		{
			const md0 = mode.current;
			const kuras =
				KURAS.dasar +
				(lari && md0.jenis === "jalan" ? KURAS.lari : 0) +
				(md0.jenis === "mancing" && pancing.fase === "tarik" ? KURAS.tarik : 0) +
				(md0.jenis === "jalan" && p.y < TANAH - 0.2 ? KURAS.renang : 0);
			ubahTenaga(-kuras * dt);
			if (tenaga.nilai <= 0 && !tenaga.pingsan) {
				tenaga.pingsan = performance.now();
				if (md0.jenis === "mancing") berhentiPancing();
				if (md0.k) md0.k.laju = 0;
				if (md0.jenis === "panjat") p.y = md0.y1; // rebah di pijakan, tidak menggantung di pagar
				// rebah tak bergerak; bangun lewat teleport di bawah (mode kembali "jalan")
				mode.current = { jenis: "pingsan", t: 0, k: null, kursi: null, dari: null };
				rute.current = null;
				ubahTenaga(0, { teks: "Anda pingsan kehabisan tenaga…", jenis: "buruk" });
			}
			if (tenaga.pingsan) {
				if (performance.now() - tenaga.pingsan > 2600) {
					tenaga.pingsan = false;
					setTenaga(40);
					kendali.teleport = { x: 0, z: 17.5, lantai: 0, rot: Math.PI, yaw: 0 };
					ubahTenaga(0, { teks: "Anda siuman di depan lobi. Isi tenaga di minimarket seberang jalan!", jenis: "info" });
				}
			}
		}
		if (kendali.putar) k.yaw -= kendali.putar * 1.8 * dt;

		// --- aksi dari UI (E / tombol): duduk, berdiri, naik/turun kendaraan ---
		if (kendali.aksi) {
			const aksi = kendali.aksi;
			kendali.aksi = null;
			const md = mode.current;
			if (md.jenis === "jalan" && aksi.startsWith("kursi:")) {
				const kursi = kursiBebas.find((c) => c.id === aksi);
				if (kursi) {
					mode.current = { jenis: "duduk", t: 0, k: null, kursi, dari: { x: p.x, z: p.z } };
					rute.current = null;
					// kursi bioskop: kamera langsung di belakang, memandang layar
					if (kursi.bioskop) {
						kamera.current.yaw = kursi.rot + Math.PI;
						kamera.current.pitch = 0.2;
					}
				}
			} else if (md.jenis === "jalan" && aksi.startsWith("peti:")) {
				bukaPeti(PETI_HADIAH.find((pt) => pt.id === aksi.slice(5)));
			} else if (md.jenis === "jalan" && aksi === "perahu:panggil") {
				panggilPerahu(p.x, p.z);
			} else if (md.jenis === "jalan" && /^(mobil|motor|perahu):/.test(aksi)) {
				// "mobil:0" = jadi pengemudi; "mobil:0#2" = duduk di kursi penumpang 2
				const [id, no] = aksi.split("#");
				const kend = kendaraanDariId(id);
				if (kend) {
					mode.current = { jenis: "masuk", t: 0, k: kend, kursi: null, no: +no || 0, dari: { x: p.x, z: p.z, y: p.y } };
					rute.current = null;
				}
			} else if (aksi === "berdiri" && md.jenis === "duduk") {
				berdiri();
			} else if (aksi === "renang:terjun" && md.jenis === "kemudi" && md.k?.jenis === "perahu") {
				// terjun dari perahu ke air di sampingnya (kanan, kiri, atau belakang)
				const kend = md.k;
				const ke = [
					[1.4, 0],
					[-1.4, 0],
					[0, -2.2],
				]
					.map(([lx, lz]) => keDunia(kend, lx, lz))
					.find((t) => diAirSitu(t.x, t.z) && langkahRenang(t.x, t.z) !== null);
				if (!ke) ubahTenaga(0, { teks: "Terlalu dekat tepi — tidak bisa terjun di sini", jenis: "buruk" });
				else {
					if (!md.no) {
						kend.laju = 0;
						kend.setir = 0;
					}
					p.set(ke.x, PERMUKAAN_SITU, ke.z);
					g.rotation.y = kend.rot;
					mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
					percik(ke.x, ke.z, 1.3);
				}
			} else if (aksi === "keluar" && md.jenis === "kemudi") {
				mode.current = { ...md, jenis: "turun", t: 0 };
			} else if (md.jenis === "jalan" && aksi === "mancing:tepi") {
				// memancing dari pinggir situ, menghadap ke air
				const tp = titikTepi(p.x, p.z);
				if (tp) {
					mode.current = { jenis: "mancing", t: 0, k: null, kursi: null, dari: null };
					rute.current = null;
					mulaiPancing({ x: p.x, z: p.z, rot: tp.rot, perahu: false });
				}
			} else if (md.jenis === "duduk" && aksi === "mancing:kolam" && md.kursi?.kolam && aksesKolam()) {
				// dari bangku pancing: tetap duduk lalu langsung melempar
				const c = md.kursi;
				mode.current = { ...md, jenis: "mancing", t: 0 };
				rute.current = null;
				mulaiPancing({ x: c.x, z: c.z, rot: c.rot, perahu: false, kolam: true, duduk: true });
			} else if (md.jenis === "jalan" && aksi === "mancing:kolam") {
				// Kolam Monster: hanya dengan tiket aktif atau saat lomba berlangsung
				const tp = titikTepiKolam(p.x, p.z);
				if (tp && aksesKolam()) {
					mode.current = { jenis: "mancing", t: 0, k: null, kursi: null, dari: null };
					rute.current = null;
					mulaiPancing({ x: p.x, z: p.z, rot: tp.rot, perahu: false, kolam: true });
				}
			} else if (md.jenis === "jalan" && aksi.startsWith("mancing:")) {
				const d = DERMAGA.find((dd) => dd.id === aksi.slice(8));
				if (d) {
					const tp = titikPancing(d, p.x, p.z);
					p.set(tp.x, TANAH + DEK_Y, tp.z);
					mode.current = { jenis: "mancing", t: 0, k: null, kursi: null, dari: null };
					rute.current = null;
					mulaiPancing({ x: tp.x, z: tp.z, rot: tp.rot, perahu: false });
				}
			} else if (md.jenis === "kemudi" && aksi === "mancing:perahu" && md.k?.jenis === "perahu") {
				// pengemudi & penumpang sama-sama bisa memancing dari kursinya
				mode.current = { ...md, jenis: "mancing", t: 0 };
				mulaiPancing({ x: p.x, z: p.z, rot: md.k.rot, perahu: true });
			} else if (md.jenis === "mancing" && aksi === "berhenti") {
				berhentiPancing();
			}
		}

		function berdiri() {
			const c = mode.current.kursi;
			const depan = { x: c.x + Math.sin(c.rot) * 0.75, z: c.z + Math.cos(c.rot) * 0.75 };
			const lantaiY = c.y ?? c.lantai * H;
			berhentiMakan();
			berhentiNonton();
			const ok = langkah(lantaiY, depan.x, depan.z) !== null && !tabrakKendaraan(depan.x, depan.z, 0.38);
			const ke = ok ? depan : mode.current.dari;
			p.set(ke.x, lantaiY, ke.z);
			mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
		}

		// kendaraan tamu lain yang melaju menghantam pengunjung yang sedang berjalan
		if (mode.current.jenis === "jalan" && p.y < 0.5) {
			for (const kend of KENDARAAN) {
				if (kend === mode.current.k || Math.abs(kend.laju) < 3 || kend.jenis === "perahu") continue;
				if (lingkaran(kend).some((o) => Math.hypot(o.x - p.x, o.z - p.z) < o.r + 0.4)) {
					const arah = Math.sign(kend.laju);
					laporTabrak({ vx: Math.sin(kend.rot) * arah, vz: Math.cos(kend.rot) * arah, laju: Math.abs(kend.laju), jenis: kend.jenis });
				}
			}
		}
		if (tenaga.tabrak) {
			const tb2 = tenaga.tabrak;
			tenaga.tabrak = null;
			if (mode.current.jenis === "jalan") {
				dorong.current = { vx: tb2.vx * (5 + tb2.kuat * 4), vz: tb2.vz * (5 + tb2.kuat * 4), t: 0.55 };
				loncat.current.vy = 3 + tb2.kuat * 2.5;
				rute.current = null;
			}
		}
		if (dorong.current) {
			const d = dorong.current;
			d.t -= dt;
			const nx = p.x + d.vx * dt;
			const nz = p.z + d.vz * dt;
			if (langkah(p.y, nx, p.z) !== null) p.x = nx;
			if (langkah(p.y, p.x, nz) !== null) p.z = nz;
			if (d.t <= 0) dorong.current = null;
		}

		let besar = 0;
		const jenisMode = mode.current.jenis;

		if (jenisMode === "jalan") {
			if (kendali.target) {
				const t = kendali.target;
				const lantaiKini = lantaiDari(p.y, p.x, p.z);
				const titik = cariJalur({ x: p.x, z: p.z, lantai: lantaiKini }, { x: t.x, z: t.z, lantai: t.lantai ?? lantaiKini });
				rute.current = titik?.length ? { titik, buka: t.buka } : null;
				if (!titik?.length && t.buka) setKeadaan({ minta: `${t.buka}:${performance.now()}` });
				kendali.target = null;
			}

			// arah gerak relatif terhadap kamera
			const sy = Math.sin(k.yaw);
			const cy = Math.cos(k.yaw);
			let mx = -sy * maju + cy * samping;
			let mz = -cy * maju - sy * samping;
			besar = Math.hypot(mx, mz);
			if (besar > 0.05) {
				rute.current = null;
			} else if (rute.current) {
				const r = rute.current;
				const tuju = r.titik[0];
				const dx = tuju.x - p.x;
				const dz = tuju.z - p.z;
				const d = Math.hypot(dx, dz);
				if (d < 0.3) {
					r.titik.shift();
					if (!r.titik.length) {
						if (r.buka) setKeadaan({ minta: `${r.buka}:${performance.now()}` });
						rute.current = null;
					}
				} else {
					mx = dx / d;
					mz = dz / d;
					besar = 1;
				}
			}
			if (besar > 1) {
				mx /= besar;
				mz /= besar;
				besar = 1;
			}

			// gerak per sumbu (bisa menggeser di sepanjang dinding); tinggi ikut tangga;
			// mobil & motor juga menghalangi.
			if (besar > 0.05) {
				const diAir = p.y < TANAH - 0.2;
				const v = (diAir ? (lari ? KECEPATAN.renangCepat : KECEPATAN.renang) : jongkok ? KECEPATAN.jongkok : lari ? KECEPATAN.lari : KECEPATAN.jalan) * besar * dt;
				const ax = p.x;
				const az = p.z;
				const bisa = (x, z) => {
					// di halaman dekat / di dalam situ: boleh turun berenang & naik lagi ke tepi
					const y = p.y < 0.5 && (diAir || diAirSitu(x, z) || jarakKeTepi(x, z) < 1.2) ? langkahRenang(x, z) : langkah(p.y, x, z);
					if (y === null) return null;
					// dari air ke darat selalu lewat gerak memanjat, tidak melangkah langsung
					if (diAir && diAirSitu(p.x, p.z) && !diAirSitu(x, z)) return null;
					if (y < 0.5 && tabrakKendaraan(x, z, 0.38)) return null;
					// belanjaan yang belum dibayar tidak boleh dibawa keluar toko
					if (belanja.keranjang.length && tokoDi(p.x, p.z) && !tokoDi(x, z)) {
						if (performance.now() - (tegurToko.current || 0) > 2500) {
							tegurToko.current = performance.now();
							ubahTenaga(0, { teks: "🧾 Bayar dulu di kasir sebelum keluar!", jenis: "buruk" });
						}
						return null;
					}
					return y;
				};
				const naik = diAir && diAirSitu(p.x, p.z) ? naikDariAir(p.x, p.z, mx / besar, mz / besar) : null;
				if (naik && !tabrakKendaraan(naik.x + naik.hx * naik.z1, naik.z + naik.hz * naik.z1, 0.38)) {
					mode.current = { jenis: "panjat", k: null, kursi: null, dari: null, ...naik, renangF: gerak.current.renang ?? 0 };
					percik(p.x, p.z, 1);
					langkahKaki("air", false);
				}
				let y = bisa(p.x + mx * v, p.z);
				if (y !== null) {
					p.x += mx * v;
					p.y = y;
				}
				y = bisa(p.x, p.z + mz * v);
				if (y !== null) {
					p.z += mz * v;
					p.y = y;
				}
				g.rotation.y += (sudutDekat(g.rotation.y, Math.atan2(mx, mz)) - g.rotation.y) * (1 - Math.exp(-14 * dt));
				if (rute.current && Math.hypot(p.x - ax, p.z - az) < v * 0.1) {
					macet.current += dt;
					if (macet.current > 0.5) rute.current = null;
				} else macet.current = 0;
			}

			// loncat
			const l = loncat.current;
			if (kendali.loncat && l.h === 0 && p.y > TANAH - 0.2 && mode.current.jenis === "jalan") {
				const pagar = !jongkok && p.y < 0.5 && cariPagar(PAGAR_PANJAT, p.x, p.y, p.z, g.rotation.y, (x, z) => (tabrakKendaraan(x, z, 0.38) ? null : langkah(p.y, x, z)));
				if (jongkok) kendali.jongkok = false; // Spasi saat jongkok = berdiri dulu
				else if (pagar) {
					mode.current = { jenis: "panjat", k: null, kursi: null, dari: null, ...pagar };
					rute.current = null;
				} else l.vy = LONCAT;
			}
			kendali.loncat = false;
			if (l.vy !== 0 || l.h > 0) {
				l.h += l.vy * dt;
				l.vy -= GRAVITASI * dt;
				if (l.h <= 0) {
					l.h = 0;
					l.vy = 0;
				}
			}
			gerak.current.udara = l.h > 0.05;
		} else if (jenisMode === "panjat") {
			kendali.loncat = false;
			const md = mode.current;
			const a = akarPanjat(md, dt);
			p.set(a.x, a.y, a.z);
			g.rotation.y += (sudutDekat(g.rotation.y, md.rot) - g.rotation.y) * (1 - Math.exp(-14 * dt));
			if (a.u >= 1) {
				langkahKaki(permukaanDi(p.x, p.z, p.y, false), false);
				mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
			}
		} else if (jenisMode === "duduk") {
			kendali.loncat = false;
			const c = mode.current.kursi;
			p.set(c.x + Math.sin(c.rot) * 0.05, c.y ?? c.lantai * H, c.z + Math.cos(c.rot) * 0.05);
			g.rotation.y = c.rot;
			// kursi tempat makan: pesanan di tempat itu diantar ke meja & dimakan
			if (c.warung) {
				if (warung.pesanan && !warung.makan) mulaiMakan(c);
				tickMakan(dt);
			}
			// kursi bioskop: film diputar selama duduk (bila punya tiket)
			if (c.bioskop) tickNonton(dt, c);
			// bangku & kursi santai: tenaga pulih pelan selama duduk
			if (c.rehat) ubahTenaga(0.6 * dt);
			// bergerak = berdiri
			if (Math.hypot(maju, samping) > 0.3) berdiri();
		} else if (jenisMode === "masuk") {
			kendali.loncat = false;
			const md = mode.current;
			const kend = md.k;
			md.t += dt;
			if (kend.jenis === "mobil") {
				// 1) melangkah ke pintu sambil pintu dibuka, 2) masuk ke jok, 3) pintu ditutup
				const pintu = titikNaikKursi(kend, md.no);
				const jok = kursiDunia(kend, md.no);
				if (md.t < 0.5) {
					const f = md.t / 0.5;
					p.x += (pintu.x - p.x) * Math.min(1, f * 1.5);
					p.z += (pintu.z - p.z) * Math.min(1, f * 1.5);
					kend.pintu = f;
					g.rotation.y = kend.rot + (KURSI_KENDARAAN.mobil[md.no][0] < 0 ? Math.PI / 2 : -Math.PI / 2);
					besar = 0.6;
				} else if (md.t < 0.9) {
					const f = (md.t - 0.5) / 0.4;
					p.x = pintu.x + (jok.x - pintu.x) * f;
					p.z = pintu.z + (jok.z - pintu.z) * f;
					kend.pintu = 1;
				} else if (md.t < 1.35) {
					kend.pintu = 1 - (md.t - 0.9) / 0.45;
				} else {
					kend.pintu = 0;
					mode.current = { ...md, jenis: "kemudi", t: 0 };
				}
			} else {
				const jok = kursiDunia(kend, md.no);
				const f = Math.min(1, md.t / 0.45);
				p.x += (jok.x - p.x) * f;
				p.z += (jok.z - p.z) * f;
				// melangkah turun ke perahu
				if (kend.jenis === "perahu") p.y = md.dari.y + (yKursi(kend) - md.dari.y) * f;
				g.rotation.y = kend.rot;
				if (kend.jenis === "motor") kend.miring *= 1 - f;
				if (md.t >= 0.45) {
					if (kend.jenis === "motor") kend.miring = 0;
					mode.current = { ...md, jenis: "kemudi", t: 0 };
				}
			}
		} else if (jenisMode === "kemudi" && mode.current.no > 0) {
			// penumpang: ikut duduk di kursinya, kendaraan digerakkan pengemudi
			const md = mode.current;
			const kend = md.k;
			kendali.loncat = false;
			const jok = kursiDunia(kend, md.no);
			p.set(jok.x, yKursi(kend) + (kend.h || 0), jok.z);
			g.rotation.y = kend.rot;
			if (Math.abs(kend.laju) > 0.5) {
				const ke = kend.rot + Math.PI;
				k.yaw += (sudutDekat(k.yaw, ke) - k.yaw) * (1 - Math.exp(-2.2 * dt));
			}
		} else if (jenisMode === "kemudi" && mode.current.k.jenis === "perahu") {
			// mendayung: bisa berputar di tempat, hanya di air situ
			const kend = mode.current.k;
			const c = kend.kemudi || KEMUDI.perahu;
			kendali.loncat = false;
			const target = maju > 0.05 ? maju * (lari ? c.turbo : c.maju) : maju < -0.05 ? maju * c.mundur : 0;
			const batas = (Math.abs(target) > Math.abs(kend.laju) ? c.gas : c.rem) * dt;
			kend.laju += Math.max(-batas, Math.min(batas, target - kend.laju));
			if (Math.abs(maju) < 0.05) kend.laju *= Math.exp(-0.6 * dt);
			if (Math.abs(kend.laju) < 0.02 && Math.abs(maju) < 0.05) kend.laju = 0;
			kend.setir += (Math.max(-1, Math.min(1, samping)) - kend.setir) * (1 - Math.exp(-5 * dt));
			const lama = { x: kend.x, z: kend.z, rot: kend.rot };
			kend.rot -= kend.setir * c.belok * dt * (0.45 + Math.min(1, Math.abs(kend.laju) / 3)) * (kend.laju < -0.1 ? -1 : 1);
			kend.x += Math.sin(kend.rot) * kend.laju * dt;
			kend.z += Math.cos(kend.rot) * kend.laju * dt;
			const badan = lingkaran(kend);
			if (!badan.every((o) => perahuBebas(o.x, o.z, o.r)) || badan.some((o) => tabrakKendaraan(o.x, o.z, o.r, kend))) {
				Object.assign(kend, lama);
				kend.laju *= -0.2;
			}
			const jok = kursiDunia(kend, 0);
			p.set(jok.x, yKursi(kend), jok.z);
			g.rotation.y = kend.rot;
			if (Math.abs(kend.laju) > 0.4) {
				const ke = kend.rot + Math.PI;
				k.yaw += (sudutDekat(k.yaw, ke) - k.yaw) * (1 - Math.exp(-1.6 * dt));
			}
		} else if (jenisMode === "mancing") {
			const md = mode.current;
			kendali.loncat = false;
			// kiri/kanan dipakai membidik & melawan arah lari ikan
			pancing.arah = Math.abs(samping) > 0.3 ? Math.sign(samping) : 0;
			if (md.k) {
				// perahu terapung pelan sampai diam (penumpang tidak mengendalikannya)
				const kend = md.k;
				if (!md.no) {
					kend.laju *= Math.exp(-1.5 * dt);
					kend.setir *= 0.9;
				}
				const jok = kursiDunia(kend, md.no || 0);
				p.set(jok.x, yKursi(kend), jok.z);
				geserAsal(jok.x, jok.z, kend.rot);
			}
			g.rotation.y = arahJoran() + Math.PI * pancing.gaya.balik;
			// kamera mengikuti arah bidikan saja (bukan ayunan joran) supaya ayunannya terlihat
			const ke = pancing.asal.rot + pancing.aim + Math.PI;
			k.yaw += (sudutDekat(k.yaw, ke) - k.yaw) * (1 - Math.exp(-3 * dt));
			if (!pancing.aktif) {
				pancing.arah = 0;
				mode.current = md.k ? { ...md, jenis: "kemudi", t: 0 } : md.kursi ? { ...md, jenis: "duduk", t: 0 } : { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
			}
		} else if (jenisMode === "kemudi") {
			const kend = mode.current.k;
			const c = kemudiUntuk(kend);
			// motor bisa meloncat (Spasi / tombol loncat); di udara roda tak bisa membelok
			if (kend.jenis === "motor" && kendali.loncat && !kend.h) {
				kend.vy = LONCAT_MOTOR;
				kend.h = 0.001;
			}
			kendali.loncat = false;
			if (kend.h) {
				kend.h += kend.vy * dt;
				kend.vy -= GRAVITASI * dt;
				if (kend.h <= 0) {
					kend.h = 0;
					kend.vy = 0;
				}
			}
			// gas / rem / mundur
			const target = maju > 0.05 ? maju * (lari ? c.turbo : c.maju) : maju < -0.05 ? maju * c.mundur : 0;
			const beda = target - kend.laju;
			const searah = Math.sign(beda) === Math.sign(kend.laju) || kend.laju === 0;
			const batas = (searah ? c.gas : c.rem) * dt;
			kend.laju += Math.max(-batas, Math.min(batas, beda));
			if (Math.abs(maju) < 0.05) kend.laju *= Math.exp(-1.2 * dt);
			if (Math.abs(kend.laju) < 0.02 && Math.abs(maju) < 0.05) kend.laju = 0;
			kend.setir += (Math.max(-1, Math.min(1, samping)) - kend.setir) * (1 - Math.exp(-c.setirCepat * dt));
			// model sepeda: belok kanan (D) = rot berkurang
			const putar = ((-kend.setir * c.belok * kend.laju * dt) / c.sumbu) * 2 / (1 + Math.abs(kend.laju) * c.redam) * (kend.h ? 0.15 : 1);
			const lama = { x: kend.x, z: kend.z, rot: kend.rot };
			kend.rot += putar;
			kend.x += Math.sin(kend.rot) * kend.laju * dt;
			kend.z += Math.cos(kend.rot) * kend.laju * dt;
			const tabrakan = lingkaran(kend).some((o) => tabrakKendaraanStatis(o.x, o.z, o.r) || tabrakKendaraan(o.x, o.z, o.r, kend));
			if (tabrakan) {
				Object.assign(kend, lama);
				kend.laju *= -0.25;
			}
			kend.roda += (kend.laju * dt) / 0.32;
			if (kend.jenis === "motor") kend.miring = -kend.setir * Math.min(1, Math.abs(kend.laju) / 8) * 0.35;
			// pengemudi mengikuti kendaraan
			const jok = kursiDunia(kend, 0);
			p.set(jok.x, TANAH + (kend.h || 0), jok.z);
			g.rotation.y = kend.rot;
			// kamera berangsur ke belakang kendaraan saat melaju
			if (Math.abs(kend.laju) > 0.5) {
				const ke = kend.rot + Math.PI;
				k.yaw += (sudutDekat(k.yaw, ke) - k.yaw) * (1 - Math.exp(-2.2 * dt));
			}
		} else if (jenisMode === "turun") {
			const md = mode.current;
			const kend = md.k;
			md.t += dt;
			if (!md.no) {
				kend.laju = 0;
				kend.setir *= 0.8;
				kend.h = 0;
				kend.vy = 0;
			}
			if (kend.jenis === "perahu") {
				// naik ke papan dermaga terdekat
				if (!md.ke) md.ke = titikTurun(kend.x, kend.z) || { x: p.x, z: p.z };
				const f = Math.min(1, md.t / 0.45);
				p.x += (md.ke.x - p.x) * f;
				p.z += (md.ke.z - p.z) * f;
				p.y += (TANAH + DEK_Y - p.y) * f;
				if (md.t >= 0.45) {
					p.set(md.ke.x, tinggiTanah(md.ke.x, md.ke.z), md.ke.z);
					mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
				}
			} else if (kend.jenis === "mobil" && md.no) {
				// penumpang keluar lewat pintunya sendiri (atau ke belakang mobil bila terhalang)
				const ke = titikNaikKursi(kend, md.no);
				const bisa = langkah(TANAH, ke.x, ke.z) !== null && !tabrakKendaraan(ke.x, ke.z, 0.38);
				const tuju = bisa ? ke : keDunia(kend, 0, -2.8);
				p.set(tuju.x, TANAH, tuju.z);
				g.rotation.y = kend.rot + (KURSI_KENDARAAN.mobil[md.no][0] < 0 ? -Math.PI / 2 : Math.PI / 2);
				mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
			} else if (kend.jenis === "mobil") {
				kend.pintu = Math.min(1, md.t / 0.4);
				if (md.t >= 0.4 && !md.keluar) {
					// berdiri di samping pintu (atau di belakang mobil bila sisi pintu terhalang)
					const pilihan = [titikNaikKursi(kend, 0), keDunia(kend, 1.3, 0.35), keDunia(kend, 0, -2.8)];
					const ke = pilihan.find((q) => langkah(TANAH, q.x, q.z) !== null && !tabrakKendaraan(q.x, q.z, 0.38)) || pilihan[0];
					p.set(ke.x, TANAH, ke.z);
					g.rotation.y = kend.rot - Math.PI / 2;
					md.keluar = true;
				}
				if (md.t >= 0.4) kend.pintu = Math.max(0, 1 - (md.t - 0.4) / 0.45);
				if (md.t >= 0.85) {
					kend.pintu = 0;
					mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
				}
			} else {
				const pilihan = [titikNaikKursi(kend, md.no || 0), keDunia(kend, 0.7, 0), keDunia(kend, 0, -1.6)];
				const ke = pilihan.find((q) => langkah(TANAH, q.x, q.z) !== null && !tabrakKendaraan(q.x, q.z, 0.38)) || pilihan[0];
				p.set(ke.x, TANAH, ke.z);
				// standar motor diturunkan hanya bila tak ada lagi yang menunggangi
				if (!md.no && !kursiTerpakai(kend.id).size) kend.miring = 0.12;
				mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
			}
		}

		// --- tampilan tokoh pengunjung sesuai mode ---
		const mk = mode.current;
		const diMobil = (mk.jenis === "kemudi" || (mk.jenis === "masuk" && mk.t > 0.85) || (mk.jenis === "turun" && !mk.keluar)) && mk.k?.jenis === "mobil";
		const diMotor = (mk.jenis === "kemudi" || (mk.jenis === "masuk" && mk.t >= 0.3)) && mk.k?.jenis === "motor";
		const diPerahu = (mk.jenis === "kemudi" || mk.jenis === "mancing" || (mk.jenis === "masuk" && mk.t >= 0.3)) && mk.k?.jenis === "perahu";
		const duduk = mk.jenis === "duduk" || diMotor || diPerahu || (mk.jenis === "mancing" && !!mk.kursi);
		tokohJalan.current.visible = !diMobil && !duduk;
		tokohDuduk.current.visible = duduk && !diMobil;
		// di motor: jok lebih tinggi daripada kursi kantor; pembonceng sedikit lebih tinggi lagi
		tokohDuduk.current.position.y = diMotor ? (mk.no ? 0.46 : 0.38) : 0;
		badanLoncat.current.position.y = loncat.current.h + (mk.jenis === "pingsan" ? 0.2 : 0);
		badanLoncat.current.rotation.x = mk.jenis === "pingsan" ? -1.5 : 0;

		const gr = gerak.current;
		// berenang: gaya bebas saat bergerak, mengapung tegak saat diam
		const renang = mk.jenis === "jalan" && p.y < TANAH - 0.2;
		gr.renang = renang ? (gr.renang ?? 0) + ((besar > 0.05 ? 1 : 0) - (gr.renang ?? 0)) * (1 - Math.exp(-4 * dt)) : 0;
		if (renang) aturBadanRenang(tokohJalan.current, gr.renang);
		else if (mk.jenis === "panjat" && mk.renangF != null && mk.t < 0.35) {
			// dari gaya renang kembali tegak; akar sudah turun BENAM_APUNG, jadi selisihnya ditanggung di sini
			const sisa = 1 - mk.t / 0.35;
			tokohJalan.current.rotation.x = (0.15 + 1.2 * mk.renangF) * sisa;
			tokohJalan.current.position.y = (-0.15 - BENAM_APUNG) * mk.renangF * sisa;
		} else if (tokohJalan.current.rotation.x) {
			tokohJalan.current.rotation.x = 0;
			tokohJalan.current.position.y = 0;
		}
		riak.current.visible = renang;
		if (renang) {
			riak.current.position.set(p.x, PERMUKAAN_SITU + 0.02, p.z);
			riak.current.scale.setScalar(1 + ((performance.now() / 700) % 1) * 0.8);
			riak.current.material.opacity = 0.5 * (1 - ((performance.now() / 700) % 1));
		}
		gr.jongkok = (gr.jongkok ?? 0) + ((kendali.jongkok ? 1 : 0) - (gr.jongkok ?? 0)) * (1 - Math.exp(-10 * dt));
		gr.panjatU = mk.jenis === "panjat" ? Math.min(1, mk.t / LAMA_PANJAT) : -1;
		gr.panjatT = mk.tinggi ?? 0;
		const targetLaju = besar > 0.05 ? (lari ? 1 : 0.7) : 0;
		gr.laju += (targetLaju - gr.laju) * (1 - Math.exp(-10 * dt));
		if (besar > 0.05) {
			// suara langkah tiap kali kaki menapak (dua kali per ayunan)
			const tapak = Math.floor(gr.fase / Math.PI);
			gr.fase += dt * (lari ? 13 : jongkok ? 6.5 : 9);
			if (jenisMode === "jalan" && !jongkok && Math.floor(gr.fase / Math.PI) !== tapak && !loncat.current.h) langkahKaki(permukaanDi(p.x, p.z, p.y, renang), lari);
		}

		// --- kabar untuk UI ---
		const diTangga = !!tanggaDi(p.x, p.z);
		const lantai = lantaiDari(p.y, p.x, p.z);
		posisi.x = p.x;
		posisi.y = p.y;
		posisi.z = p.z;
		posisi.rot = g.rotation.y;
		posisi.lantai = lantai;
		// untuk tamu lain (jelajah bersama)
		posisi.yTampil = p.y + loncat.current.h;
		posisi.pose = diMobil ? "mobil" : diMotor ? "motor" : diPerahu ? "perahu" : duduk ? "duduk" : mk.jenis === "mancing" ? "mancing" : mk.jenis === "panjat" ? "panjat" : renang ? "renang" : kendali.jongkok ? "jongkok" : "jalan";
		posisi.panjatU = gr.panjatU;
		posisi.panjatT = gr.panjatT;
		posisi.kursi = mk.k ? mk.no || 0 : 0;
		{
			const tp = tempuh.current;
			const jenis = renang ? "renang" : mk.jenis === "kemudi" && !mk.no && (diPerahu || diMotor) ? (diPerahu ? "perahu" : "motor") : null;
			const d = Math.hypot(p.x - tp.x, p.z - tp.z);
			if (jenis && jenis === tp.jenis && d < 5) tp.akum += d;
			else tp.akum = 0;
			if (tp.akum >= 10) {
				catat(jenis, Math.floor(tp.akum));
				tp.akum -= Math.floor(tp.akum);
			}
			Object.assign(tp, { x: p.x, z: p.z, jenis });
		}
		posisi.udara = gr.udara;
		posisi.lari = lari && besar > 0.05;
		posisi.kend = mk.k || null;
		posisi.yaw = kamera.current.yaw;
		const em = diriSendiri.emote;
		// mengambil barang dari rak: hadap ke rak, tangan menjangkau, lalu barang masuk keranjang
		const ab = belanja.ambil;
		if (ab) {
			if (ab.arah == null) ab.arah = rakDekat(p.x, p.z)?.arah ?? g.rotation.y;
			if (besar < 0.05) g.rotation.y += (sudutDekat(g.rotation.y, ab.arah) - g.rotation.y) * (1 - Math.exp(-12 * dt));
			ab.t += dt;
			const u = ab.t / LAMA_AMBIL;
			gr.ambil = u < 0.5 ? u * 2 : Math.max(0, 2 - u * 2);
			if (ab.t >= LAMA_AMBIL) selesaiAmbil();
		}
		// keranjang dikembalikan begitu keluar toko
		if (belanja.bawaKeranjang && !tokoDi(p.x, p.z) && (p.z < (TOKO_PER_ID[belanja.toko]?.z0 ?? 47) - 0.6 || mk.jenis !== "jalan")) kembalikanKeranjang();
		gr.aktivitas = warung.makan && mk.jenis === "duduk" ? "makan" : null;
		posisi.aktivitas = gr.aktivitas;
		// keluar bilik ruang coba = pakaian coba dilepas
		if (lemari.coba && bilikDi(p.x, p.z) < 0) selesaiCoba();
		// gaya tubuh saat memancing (dihitung Pancingan.jsx): condong, ayunan lengan, engkol gulungan
		gr.gayaPancing = mk.jenis === "mancing" ? pancing.gaya : null;
		gr.isyarat =
			mk.jenis === "mancing"
				? pancing.fase === "dapat"
					? "angkat"
					: "mancing"
				: renang
					? "renang"
					: em && performance.now() < em.sampai
					? em.jenis
					: belanja.ambil
						? "ambil"
						: belanja.bawaKeranjang
							? "keranjang"
							: null;

		const tujuanAkhir = rute.current?.titik[rute.current.titik.length - 1];
		penandaTujuan.current.visible = !!tujuanAkhir;
		if (tujuanAkhir) penandaTujuan.current.position.set(tujuanAkhir.x, (lantai ? lantai * H : dalamLahanCcm(tujuanAkhir.x, tujuanAkhir.z) ? p.y : tinggiTanah(tujuanAkhir.x, tujuanAkhir.z)) + 0.03, tujuanAkhir.z);

		const area = diTangga ? "tangga" : cariArea(p.x, p.z, lantai)?.id ?? (lantai ? "aula2" : "belakang1");
		let dekat = null;
		// di bangku Kolam Monster: tombol aksinya memancing (berdiri cukup dengan bergerak)
		if (mk.jenis === "duduk") dekat = mk.kursi?.kolam ? (aksesKolam() ? "mancing:kolam" : "kolam:tiket") : "berdiri";
		else if (mk.jenis === "mancing") dekat = "berhenti";
		else if (mk.jenis === "kemudi" && mk.k.jenis === "perahu") {
			// di perahu: dekat dermaga → turun; di tengah situ & hampir diam → memancing
			if (titikTurun(mk.k.x, mk.k.z)) dekat = "keluar";
			else if (Math.abs(mk.k.laju) < 0.8) dekat = "mancing:perahu";
		} else if (mk.jenis === "kemudi") dekat = "keluar";
		else if (mk.jenis === "jalan" && renang) {
			// berenang di dekat perahu yang masih ada kursi kosong: naik dari air
			let terdekat = 1.6;
			for (const kend of KENDARAAN) {
				if (kend.jenis !== "perahu") continue;
				const terisi = kursiTerpakai(kend.id);
				const kosong = KURSI_KENDARAAN.perahu.map((_, i) => i).filter((i) => !terisi.has(i) && !(posisi.kend === kend));
				if (!kosong.length) continue;
				const d = Math.max(0, jarakLambung(kend, p.x, p.z));
				if (d < terdekat) {
					terdekat = d;
					dekat = kosong[0] ? `${kend.id}#${kosong[0]}` : kend.id;
				}
			}
		} else if (mk.jenis === "jalan" && !diTangga && !renang) {
			// yang berjangkauan pendek (kursi, kendaraan, benda) didahulukan bila dalam jangkauan
			let terdekat = Infinity;
			const coba = (id, d, batas) => {
				if (d < batas && d < terdekat) {
					terdekat = d;
					dekat = id;
				}
			};
			for (const b of BENDA) if (b.lantai === lantai) coba(b.id, Math.hypot(b.x - p.x, b.z - p.z), JARAK_BENDA);
			// kursi di lantai & ketinggian yang sama (kursi lantai atas mal punya y sendiri)
			for (const c of kursiBebas) if (c.lantai === lantai && Math.abs((c.y ?? c.lantai * H) - p.y) < 1.2) coba(c.id, Math.hypot(c.x - p.x, c.z - p.z), JARAK_KURSI);
			if (lantai === 0) {
				for (const kend of KENDARAAN) {
					// pengemudi dulu; bila sudah ada pengemudi (tamu lain), kursi penumpang yang kosong
					const terisi = kursiTerpakai(kend.id);
					const kosong = KURSI_KENDARAAN[kend.jenis].map((_, i) => i).filter((i) => !terisi.has(i));
					if (!kosong.length || (kosong[0] > 0 && Math.abs(kend.laju) > 1.5)) continue;
					const nama = (i) => (i ? `${kend.id}#${i}` : kend.id);
					if (kend.jenis === "perahu") {
						if (dermagaDi(p.x, p.z)) coba(nama(kosong[0]), Math.max(0, jarakLambung(kend, p.x, p.z)), JARAK_PERAHU);
						continue;
					}
					const batas = kend.jenis === "mobil" ? JARAK_MOBIL : JARAK_MOTOR;
					if (kosong[0] === 0) {
						const t = titikNaikKursi(kend, 0);
						coba(kend.id, Math.hypot(t.x - p.x, t.z - p.z), batas);
					} else {
						// penumpang mobil masuk dari pintu kursi kosong yang terdekat
						for (const i of kosong) {
							const t = titikNaikKursi(kend, i);
							coba(nama(i), Math.hypot(t.x - p.x, t.z - p.z), batas);
						}
					}
				}
			}
			for (const [id, tamu] of pemainLain) {
				const st = tamu.s;
				if (!st || st.pose === "mobil" || lantaiDari(st.y, st.x, st.z) !== lantai || Math.abs(st.y - p.y) > 2) continue;
				coba("tamu:" + id, Math.hypot(st.x - p.x, st.z - p.z), JARAK_TAMU);
			}
			// di dalam toko: ambil keranjang, ambil barang dari rak, bayar di kasir
			const toko = lantai === 0 && tokoDi(p.x, p.z);
			if (toko) {
				if (!belanja.bawaKeranjang) coba(`keranjang:${toko.id}`, Math.hypot(toko.keranjang.x - p.x, toko.keranjang.z - p.z), JARAK_KERANJANG);
				else if (!belanja.ambil && belanja.toko === toko.id) {
					const r = rakDekat(p.x, p.z);
					if (r) coba(`ambil:${r.id}`, r.d, 1);
				}
				if (belanja.keranjang.length && belanja.toko === toko.id) coba(`kasir:${toko.id}`, Math.hypot(toko.titikKasir.x - p.x, toko.titikKasir.z - p.z), JARAK_KASIR);
			}
			for (const pt of PETI_HADIAH) if (pt.lantai === lantai && petiSiap(pt.id)) coba(`peti:${pt.id}`, Math.hypot(pt.x - p.x, pt.z - p.z), JARAK_PETI);
			// distro: bilik ruang coba, atau belanja di kasir / rak
			if (lantai === 0 && dalamDistro(p.x, p.z)) {
				if (bilikDi(p.x, p.z) >= 0) coba("distro:coba", 0, 1);
				else for (const t of TITIK_DISTRO) coba("distro:pilih", Math.hypot(t.x - p.x, t.z - p.z), 1.6);
			}
			// kios Toko Pancing di dermaga
			if (lantai === 0) for (const kp of KIOS_TOKO_PANCING) coba("pancing:toko", Math.hypot(kp.x - p.x, kp.z - p.z), 2.1);
			// kios Toko Perahu, di seberang kios joran (id tak boleh berawalan "perahu:")
			if (lantai === 0) for (const kp of KIOS_TOKO_PERAHU) coba("kapal:toko", Math.hypot(kp.x - p.x, kp.z - p.z), 2.1);
			// tempat makan: gerobak mie ayam & pecel ayam, konter McD & kedai kopi CCM
			if (lantai === 0) {
				coba("pesan:mie", Math.hypot(TITIK_PESAN_MIE.x - p.x, TITIK_PESAN_MIE.z - p.z), JARAK_GEROBAK);
				coba("pesan:pecel", Math.hypot(TITIK_PESAN_PECEL.x - p.x, TITIK_PESAN_PECEL.z - p.z), JARAK_GEROBAK);
				// halaman toko: mesin capit di teras Alfamart & gerobak es cendol
				coba("capit", Math.hypot(TITIK_CAPIT.x - p.x, TITIK_CAPIT.z - p.z), JARAK_GEROBAK);
				coba("cendol", Math.hypot(TITIK_CENDOL.x - p.x, TITIK_CENDOL.z - p.z), JARAK_GEROBAK);
				for (const f of FASILITAS_TOKO) coba("fasilitas:" + f.id, Math.hypot(f.x - p.x, f.z - p.z), f.jangkau);
				// food court Pasar BUMDes: enam lapak & papan etalase produk BUM Desa
				for (const l of LAPAK_PASAR) coba(`pesan:${l.id}`, Math.hypot(l.titik.x - p.x, l.titik.z - p.z), 1.7);
				coba("pasar:etalase", Math.hypot(TITIK_ETALASE_PASAR.x - p.x, TITIK_ETALASE_PASAR.z - p.z), 1.8);
				// showroom: bicara dengan sales di meja
				coba("showroom:mobil", Math.hypot(TITIK_SALES_MOBIL.x - p.x, TITIK_SALES_MOBIL.z - p.z), 1.9);
				coba("showroom:motor", Math.hypot(TITIK_SALES_MOTOR.x - p.x, TITIK_SALES_MOTOR.z - p.z), 1.9);
				coba("pesan:mcd", Math.hypot(TITIK_PESAN_MCD.x - p.x, TITIK_PESAN_MCD.z - p.z), 1.8);
				// acara harian kawasan: stempel bazar atau pendaftaran lomba jetski
				const acara = acaraKini();
				if (acara === "bazar") for (const t of TENDA_BAZAR) if (!stempelSudah(t.id)) coba(`bazar:${t.id}`, Math.hypot(t.titik.x - p.x, t.titik.z - p.z), 1.7);
				if (acara === "jetski" && !kantor.lomba) coba("lomba:panitia", Math.hypot(TITIK_PANITIA.x - p.x, TITIK_PANITIA.z - p.z), 2.2);
				// Cibinong City Mall: kedai kopi (Lt 1), butik (Lt 2), food court (Lt 3), loket bioskop (Lt 4), lift
				const diLt = (t) => t.lantaiMal === undefined || (dalamLahanCcm(p.x, p.z) && t.lantaiMal === malAktif.lantai);
				if (diLt(TITIK_PESAN_KOPI)) coba("pesan:kopi", Math.hypot(TITIK_PESAN_KOPI.x - p.x, TITIK_PESAN_KOPI.z - p.z), 1.8);
				if (diLt(TITIK_PESAN_FC)) coba("pesan:foodcourt", Math.hypot(TITIK_PESAN_FC.x - p.x, TITIK_PESAN_FC.z - p.z), 2);
				if (diLt(TITIK_LOKET)) coba("bioskop:tiket", Math.hypot(TITIK_LOKET.x - p.x, TITIK_LOKET.z - p.z), 1.8);
				for (const t of TITIK_BUTIK) if (diLt(t)) coba("distro:butik", Math.hypot(t.x - p.x, t.z - p.z), 1.6);
				if (dalamLahanCcm(p.x, p.z)) coba("lift", Math.hypot(TITIK_LIFT.x - p.x, TITIK_LIFT.z - p.z), 1.8);
			}
			// Kolam Monster: loket tiket/lomba, dan memancing di tepinya (bertiket)
			if (!dekat && lantai === 0) {
				coba("kolam:loket", Math.hypot(TITIK_LOKET_KOLAM.x - p.x, TITIK_LOKET_KOLAM.z - p.z), 1.8);
				if (!dekat && titikTepiKolam(p.x, p.z)) dekat = aksesKolam() ? "mancing:kolam" : "kolam:tiket";
			}
			// di panggung dermaga: mulai memancing; di papan dermaga tanpa perahu: panggil perahu
			if (!dekat && lantai === 0) {
				const d = diPanggung(p.x, p.z);
				if (d) dekat = `mancing:${d.id}`;
				else if (dermagaDi(p.x, p.z)) dekat = "perahu:panggil";
				else if (titikTepi(p.x, p.z)) dekat = "mancing:tepi";
			}
			if (!dekat) {
				for (const a of PETUGAS) {
					if (a.lantai !== lantai || a.id !== area) continue;
					coba(a.id, Math.hypot(a.npc.x - p.x, a.npc.z - p.z), JARAK_SAPA);
				}
			}
		}
		const modeUi = mk.jenis === "mancing" ? "mancing" : mk.jenis === "kemudi" ? (mk.no ? "penumpang" : mk.k.jenis) : mk.jenis === "duduk" ? "duduk" : "jalan";
		setKeadaan({ area, lantai, dekat, mode: modeUi, lantaiMal: dalamLahanCcm(p.x, p.z) ? malAktif.lantai : null });

		// Bidang klik mengikuti lantai & posisi pemain (kawasan jauh lebih luas dari bidangnya).
		bidangKlik.current.position.set(p.x, (lantai ? lantai * H : dalamLahanCcm(p.x, p.z) ? p.y : tinggiTanah(p.x, p.z)) + 0.02, p.z);

		// --- kamera orang ketiga ---
		// Di halaman kamera lebih landai dan memandang lebih tinggi supaya tampak depan
		// gedung (atap, menara) terlihat utuh; di dalam gedung kamera kembali menunduk.
		// di dalam minimarket kamera mendekat & menunduk seperti di dalam gedung kantor
		const diToko = lantai === 0 && (!!tokoDi(p.x, p.z) || dalamDistro(p.x, p.z) || dalamMcd(p.x, p.z) || dalamStudio(p.x, p.z));
		// aula mal berplafon 7 m: kamera tetap lapang seperti di luar, tetapi tidak didorong
		// keluar oleh massa gedung (dindingnya dipudarkan bila menghalangi)
		const diAula = lantai === 0 && dalamAulaCcm(p.x, p.z);
		k.luar += ((area === "luar" && !diToko ? 1 : 0) - k.luar) * (1 - Math.exp(-3 * dt));
		const jarakKamera = diToko
			? Math.min(k.jarak, 5)
			: k.jarak + (mk.jenis === "kemudi" && mk.k.jenis === "mobil" ? 2.5 : 0) + (mk.jenis === "mancing" ? (pancing.fase === "dapat" ? -4.5 : pancing.fase === "tarik" ? 0.5 : 1.5) : 0);
		const pitch = Math.max(0.12, k.pitch - 0.27 * k.luar);
		const sy = Math.sin(k.yaw);
		const cy = Math.cos(k.yaw);
		// Saat pemain di luar gedung, kamera tidak boleh masuk ke badan gedung (misalnya
		// ketika mobil menghadap menjauhi gedung): tarik mendekat sampai di luar gedung
		// atau sudah di atas atap.
		let jarakAman = jarakKamera;
		if (area === "luar" && !diToko && !diAula) {
			for (let d = jarakKamera; d >= 3; d -= 0.5) {
				jarakAman = d;
				const kx = p.x + sy * d * Math.cos(pitch);
				const kz = p.z + cy * d * Math.cos(pitch);
				const ky = p.y + 1.2 + d * Math.sin(pitch);
				const dalamKantor = kx > -15.8 && kx < 15.8 && kz > -13.8 && kz < 12.9 && ky < 11;
				if (!dalamKantor && ky - TANAH > tinggiGedungDi(kx, kz)) break;
			}
		} else if (diAula && !diToko) {
			// di aula mal: kamera tetap di dalam aula (tidak menembus muka kaca / dinding massa)
			// dan di bawah plafon lantainya
			const A = AULA_CCM;
			for (let d = jarakKamera; d >= 2.5; d -= 0.5) {
				jarakAman = d;
				const kx = p.x + sy * d * Math.cos(pitch);
				const kz = p.z + cy * d * Math.cos(pitch);
				const ky = 1.2 + d * Math.sin(pitch);
				if (kx > A.x0 + 0.6 && kx < A.x1 - 0.6 && kz > A.z0 + 0.6 && kz < A.z1 - 0.6 && ky < 5.2) break;
			}
		}
		k.jarakAman = k.jarakAman == null ? jarakAman : k.jarakAman + (jarakAman - k.jarakAman) * (1 - Math.exp(-8 * dt));
		const datar = k.jarakAman * Math.cos(pitch);
		const tinggi = k.jarakAman * Math.sin(pitch);
		bantu.kepala.set(p.x, p.y + 1.2, p.z);
		// mengangkat ikan: kamera dekat setinggi mata (tetap di bawah atap pendopo dermaga)
		// dan menatap ikan di depan dada, bukan ke langit
		const angkatIkan = mk.jenis === "mancing" && pancing.fase === "dapat";
		bantu.fokus.set(p.x, p.y + (angkatIkan ? 1.35 : 1.2 + 1.8 * k.luar), p.z);
		let tx = p.x + sy * datar;
		let ty = angkatIkan ? Math.min(p.y + 1.2 + tinggi, p.y + 1.75) : p.y + 1.2 + tinggi;
		let tz = p.z + cy * datar;
		// mode kamera memancing (tombol 🎥 / C): dekat di bahu, dari atas, atau sinematik
		const modeKam = mk.jenis === "mancing" && !angkatIkan ? pancing.kamera : "standar";
		if (modeKam !== "standar") {
			const hx = -sy;
			const hz = -cy; // arah hadap pemancing (kamera standar ada di belakangnya)
			const yAir = TANAH + (pancing.kolam ? AIR_KOLAM_Y : AIR_Y);
			const fs = pancing.fase;
			const sasaran = fs === "tarik" || fs === "gigit" ? pancing.ikanPos : fs === "tunggu" || fs === "lempar" ? pancing.pelampung : null;
			const sx = sasaran ? sasaran.x : p.x + hx * 6;
			const sz = sasaran ? sasaran.z : p.z + hz * 6;
			const kini = performance.now() / 1000;
			if (modeKam === "dekat") {
				// sudut pandang orang ketiga rapat: di belakang bahu kanan, setinggi kepala
				tx = p.x - hx * 1.7 - hz * 0.55;
				tz = p.z - hz * 1.7 + hx * 0.55;
				ty = p.y + 1.75;
				bantu.fokus.set(p.x + (sx - p.x) * 0.55, (p.y + 1.1 + yAir) / 2, p.z + (sz - p.z) * 0.55);
			} else if (modeKam === "atas") {
				// dari atas: pemancing dan pelampung/ikan tampak dalam satu bingkai
				const mx = (p.x + sx) / 2;
				const mz = (p.z + sz) / 2;
				const lebar = Math.hypot(sx - p.x, sz - p.z);
				tx = mx - hx * 2.5;
				tz = mz - hz * 2.5;
				ty = yAir + 9 + lebar * 0.6;
				bantu.fokus.set(mx, yAir, mz);
			} else {
				// sinematik: mengitari pelan saat menunggu, menyamping rendah saat ikan melawan
				const lawan = fs === "tarik" || fs === "gigit";
				const mx = (p.x + sx) / 2;
				const mz = (p.z + sz) / 2;
				const sisi = Math.sin(kini * 0.07) > 0 ? 1 : -1;
				if (lawan) {
					const r = 4.5 + Math.hypot(sx - p.x, sz - p.z) * 0.35;
					tx = mx - hz * sisi * r;
					tz = mz + hx * sisi * r;
					ty = yAir + 1.3 + Math.sin(kini * 0.5) * 0.25;
					bantu.fokus.set(mx, yAir + 0.6, mz);
				} else {
					const a = Math.atan2(-hx, -hz) + Math.sin(kini * 0.12) * 1.15;
					tx = p.x + Math.sin(a) * 5.2;
					tz = p.z + Math.cos(a) * 5.2;
					ty = p.y + 2 + Math.sin(kini * 0.2) * 0.4;
					bantu.fokus.set(p.x + (sx - p.x) * 0.35, p.y + 1, p.z + (sz - p.z) * 0.35);
				}
			}
		}
		if (k.lompat) {
			camera.position.set(tx, ty, tz);
			bantu.lihat.copy(bantu.fokus);
			k.lompat = false;
		} else {
			const f = 1 - Math.exp(-7 * dt);
			camera.position.x += (tx - camera.position.x) * f;
			camera.position.y += (ty - camera.position.y) * f;
			camera.position.z += (tz - camera.position.z) * f;
			bantu.lihat.lerp(bantu.fokus, 1 - Math.exp(-10 * dt));
		}
		camera.lookAt(bantu.lihat);
		// guncangan kamera saat ikan menyambar, melompat, atau mengamuk
		if (mk.jenis === "mancing" && pancing.getar > 0.05) {
			const g2 = pancing.getar * 0.09;
			camera.position.x += (Math.random() - 0.5) * g2;
			camera.position.y += (Math.random() - 0.5) * g2;
		}

		// --- dinding lantai aktif yang menghalangi pandangan dibuat tembus pandang ---
		bantu.arah.subVectors(bantu.kepala, camera.position);
		const jauh = bantu.arah.length();
		bantu.ray.set(camera.position, bantu.arah.normalize());
		bantu.ray.far = jauh;
		const f = 1 - Math.exp(-10 * dt);
		for (const l of [0, 1]) {
			const dinding = daftarDinding.current[l].filter(Boolean);
			const kena =
				l === lantai ? new Set(bantu.ray.intersectObjects(dinding, false).flatMap((h) => h.object.userData.sekelompok || [h.object])) : null;
			// Saat mengangkat ikan kamera turun ke bawah atap saung dermaga: atap yang
			// menutupi bagian atas pandangan disembunyikan supaya tidak menjadi pita gelap.
			let atas = null;
			if (angkatIkan && l === lantai) {
				bantu.ray.setFromCamera(ATAS_LAYAR, camera);
				bantu.ray.far = 8;
				atas = new Set(bantu.ray.intersectObjects(dinding, false).map((h) => h.object));
				bantu.ray.set(camera.position, bantu.arah);
				bantu.ray.far = jauh;
			}
			for (const md of dinding) {
				const target = atas?.has(md) ? 0 : kena?.has(md) ? 0.15 : 1;
				for (const bahan of md.userData.bahan) {
					if (bahan.opacity === target) continue;
					bahan.opacity = Math.abs(target - bahan.opacity) < 0.01 ? target : bahan.opacity + (target - bahan.opacity) * f;
					bahan.depthWrite = bahan.opacity > 0.95;
					// hanya yang sedang pudar ikut antrean transparan; dinding utuh digambar opak (lebih
					// murah). Ganti transparan = ganti varian shader (define OPAQUE), jadi perlu needsUpdate.
					const tembus = bahan.opacity < 1;
					if (bahan.transparent !== tembus) {
						bahan.transparent = tembus;
						bahan.needsUpdate = true;
					}
				}
			}
		}
		// Prioritas -1: jalan sebelum useFrame lain, supaya kendaraan digambar di posisi frame ini
		// (bukan frame lalu, yang membuatnya tertinggal dari pengemudi & kamera lalu tampak patah).
	}, -1);

	// Ketuk/klik lantai untuk berjalan ke titik itu. Bidang tak terlihat ini hanya
	// menangkap klik; seretan kamera (delta besar) diabaikan.
	const ketukLantai = (e) => {
		if (e.delta > 8 || mode.current.jenis !== "jalan") return;
		kendali.target = { x: e.point.x, z: e.point.z, lantai: posisi.lantai };
	};

	return (
		<>
			<group ref={grup} position={[TITIK_MULAI.x, tinggiTanah(TITIK_MULAI.x, TITIK_MULAI.z), TITIK_MULAI.z]} rotation-y={TITIK_MULAI.rot}>
				<group ref={badanLoncat}>
					<group ref={tokohJalan}>
						<Tokoh penampilan={penampilan} pose="jalan" gerak={gerak} />
						<KeranjangTangan />
					</group>
					<group ref={tokohDuduk} visible={false}>
						<Tokoh penampilan={penampilan} pose="duduk" gerak={gerak} />
					</group>
				</group>
			</group>
			{/* riak air di sekeliling tamu yang berenang */}
			<mesh ref={riak} rotation-x={-Math.PI / 2} visible={false}>
				<ringGeometry args={[0.45, 0.6, 24]} />
				<meshBasicMaterial color="#e0f2fe" transparent opacity={0.5} depthWrite={false} />
			</mesh>
			<mesh ref={penandaTujuan} rotation-x={-Math.PI / 2} visible={false}>
				<ringGeometry args={[0.25, 0.38, 24]} />
				<meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} />
			</mesh>
			<mesh ref={bidangKlik} rotation-x={-Math.PI / 2} position-y={0.02} onClick={ketukLantai}>
				<planeGeometry args={[160, 160]} />
				<meshBasicMaterial colorWrite={false} depthWrite={false} />
			</mesh>
		</>
	);
}
