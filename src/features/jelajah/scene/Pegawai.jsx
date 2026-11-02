import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";
import {
	AREA_LAIN,
	BENDA,
	LOBI,
	RUANGAN,
	TINGGI_LANTAI,
} from "../kantorConfig";
import { diLuarGedung, posisi, posisiNpc, posisiPejalan } from "../jelajahStore";
import { cariJalur, penampilanWarga, tabrak, tinggiTanah } from "./layout";
import Tokoh from "./Tokoh";
import { ucapkan } from "../suaraOrang";

// Penghuni kantor (hasil susunPenghuni): pegawai yang bekerja di mejanya, rapat,
// berdiskusi, satpam, petugas kebersihan, pengunjung yang menunggu, dan yang
// berjalan berkeliling. Saat pengunjung mendekat, orang terdekat menyapa lewat
// balon kata berisi nama, jabatan, dan ucapannya.

const KALIMAT_RUANG = Object.fromEntries(RUANGAN.map((r) => [r.id, r.kalimat]));
const KALIMAT_LAIN = {
	rapat: [
		"Rapat sedang berlangsung, mohon tenang ya.",
		"Silakan, slide berikutnya.",
		"Usulan ini kita bahas bersama.",
	],
	pimpinan: [
		"Rapat pimpinan sedang berlangsung.",
		"Selamat datang di DPMD Kabupaten Bogor.",
	],
	menunggu: [
		"Saya sedang menunggu giliran dilayani.",
		"Mau mengurus berkas desa.",
		"Pelayanannya ramah, ya.",
	],
	berdiri: ["Selamat datang di DPMD!", "Ada yang bisa dibantu?"],
	diskusi: [
		"Berkas ini perlu paraf kepala bidang dulu.",
		"Datanya sudah saya cek, tinggal diunggah.",
	],
	ajudan: [
		"Pimpinan sedang memimpin rapat di Ruang Halimun.",
		"Silakan sampaikan keperluan lewat Sekretariat.",
	],
	dapur: ["Mau teh atau kopi?", "Air panasnya baru mendidih."],
	jaga: [
		"Selamat datang, silakan masuk.",
		"Parkir motor di sebelah kanan, ya.",
		"Mari, saya bantu arahkan.",
	],
	mengepel: [
		"Hati-hati, lantainya masih basah.",
		"Permisi, sedang dibersihkan.",
	],
	pejalan: [
		"Permisi, mau antar berkas ke bidang sebelah.",
		"Selamat siang!",
		"Mari, silakan.",
	],
};

function kalimatUntuk(o) {
	if (o.jenis === "ajudan" || o.jenis === "dapur") return KALIMAT_LAIN[o.jenis];
	if (o.jenis === "kepalaRapat" && o.area === "halimun")
		return KALIMAT_LAIN.pimpinan;
	if (o.jenis === "jaga" || o.aktivitas === "jaga") return KALIMAT_LAIN.jaga;
	if (o.aktivitas === "mengepel") return KALIMAT_LAIN.mengepel;
	if (["rapat", "menunggu", "diskusi"].includes(o.aktivitas))
		return KALIMAT_LAIN[o.aktivitas];
	return KALIMAT_RUANG[o.area] || KALIMAT_LAIN.berdiri;
}

// --- balon kata: satu sprite bersama, digambar ulang saat orangnya berganti ---
function bungkus(g, teks, maks) {
	const baris = [""];
	for (const k of teks.split(" ")) {
		const coba = (baris[baris.length - 1] + " " + k).trim();
		if (g.measureText(coba).width > maks && baris[baris.length - 1])
			baris.push(k);
		else baris[baris.length - 1] = coba;
	}
	return baris;
}

function useBalon() {
	return useMemo(() => {
		const c = document.createElement("canvas");
		c.width = 512;
		c.height = 256;
		const t = new CanvasTexture(c);
		t.colorSpace = SRGBColorSpace;
		const FONT = '"Segoe UI", system-ui, sans-serif';
		const tulis = ({ nama, jabatan, ucapan }) => {
			const g = c.getContext("2d");
			g.clearRect(0, 0, 512, 256);
			g.font = `500 28px ${FONT}`;
			const barisUcapan = bungkus(g, ucapan, 440);
			const tinggi = (nama ? 78 : 0) + barisUcapan.length * 34 + 26;
			const y0 = 236 - 18 - tinggi;
			g.fillStyle = "rgba(255,255,255,.97)";
			g.strokeStyle = "rgba(15,23,42,.18)";
			g.lineWidth = 3;
			g.beginPath();
			g.roundRect(16, y0, 480, tinggi, 22);
			g.fill();
			g.stroke();
			g.beginPath();
			g.moveTo(240, y0 + tinggi);
			g.lineTo(256, y0 + tinggi + 16);
			g.lineTo(272, y0 + tinggi);
			g.fill();
			g.textAlign = "center";
			g.textBaseline = "middle";
			let y = y0 + 14;
			if (nama) {
				g.fillStyle = "#0f172a";
				g.font = `700 30px ${FONT}`;
				g.fillText(
					nama.length > 30 ? nama.slice(0, 29) + "…" : nama,
					256,
					y + 18,
				);
				g.fillStyle = "#1f6b50";
				g.font = `600 22px ${FONT}`;
				g.fillText(
					jabatan.length > 40 ? jabatan.slice(0, 39) + "…" : jabatan,
					256,
					y + 50,
				);
				g.fillStyle = "rgba(15,23,42,.1)";
				g.fillRect(60, y + 70, 392, 2);
				y += 78;
			}
			g.fillStyle = "#334155";
			g.font = `500 28px ${FONT}`;
			barisUcapan.forEach((b, i) => g.fillText(b, 256, y + 18 + i * 34));
			t.needsUpdate = true;
		};
		return { tekstur: t, tulis };
	}, []);
}

function Pejalan({ data, indeks }) {
	const grup = useRef();
	const gerak = useRef({ laju: 0, fase: 0 });
	// Rute melingkar: tiap pasang titik disambung A* supaya menghindari halangan.
	const rute = useMemo(() => {
		const hasil = [];
		const n = data.titik.length;
		for (let i = 0; i < n; i++) {
			const [ax, az] = data.titik[i];
			const [bx, bz] = data.titik[(i + 1) % n];
			const potong = cariJalur(
				{ x: ax, z: az, lantai: data.lantai },
				{ x: bx, z: bz, lantai: data.lantai },
			);
			hasil.push(...(potong?.length ? potong : [{ x: bx, z: bz }]));
		}
		return hasil;
	}, [data]);
	const status = useRef({ i: 0, x: data.titik[0][0], z: data.titik[0][1] });

	useEffect(() => {
		posisiPejalan[indeks] = {
			x: data.titik[0][0],
			z: data.titik[0][1],
			lantai: data.lantai,
		};
		return () => {
			posisiPejalan[indeks] = null;
		};
	}, [data, indeks]);

	useFrame((_, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		const s = status.current;
		const tuju = rute[s.i];
		const dx = tuju.x - s.x;
		const dz = tuju.z - s.z;
		const d = Math.hypot(dx, dz);
		// Berhenti sopan bila pengunjung menghalangi di depannya.
		const px = posisi.x - s.x;
		const pz = posisi.z - s.z;
		const terhalang =
			posisi.lantai === data.lantai &&
			px * px + pz * pz < 1.4 &&
			(px * dx + pz * dz) / (d || 1) > 0;
		let bergerak = false;
		if (d < 0.15) s.i = (s.i + 1) % rute.length;
		else if (!terhalang) {
			const v = Math.min(d, 1.25 * dt);
			s.x += (dx / d) * v;
			s.z += (dz / d) * v;
			bergerak = true;
			const r = grup.current.rotation;
			const ke = Math.atan2(dx, dz);
			r.y +=
				Math.atan2(Math.sin(ke - r.y), Math.cos(ke - r.y)) *
				(1 - Math.exp(-8 * dt));
		}
		const gr = gerak.current;
		gr.laju += ((bergerak ? 0.6 : 0) - gr.laju) * (1 - Math.exp(-8 * dt));
		if (bergerak) gr.fase += dt * 7.5;
		grup.current.position.set(s.x, data.lantai * TINGGI_LANTAI, s.z);
		const p = posisiPejalan[indeks];
		if (p) {
			p.x = s.x;
			p.z = s.z;
		}
	});

	return (
		<group
			ref={grup}
			position={[
				data.titik[0][0],
				data.lantai * TINGGI_LANTAI,
				data.titik[0][1],
			]}
		>
			<Tokoh penampilan={data.penampilan} pose="jalan" gerak={gerak} />
		</group>
	);
}

const TAMPAK_DARI_LUAR = new Set(["luar", "lobi", "lorong1"]);

// ---------- penghuni yang hidup: berpindah tempat, lalu kembali ----------
// - pegawai di meja (separuhnya) bergantian bangun ke dispenser, pantri, toilet, lobi, atau
//   ruang bidang lain, singgah sebentar, lalu kembali duduk;
// - pegawai yang berdiri / berdiskusi ikut berkeliling dengan jeda lebih singkat;
// - satpam berpatroli di halaman, parkiran, dan gerbang;
// - petugas kebersihan menyapu sambil berpindah sedikit demi sedikit di sekitar tempatnya;
// - warga (Pengunjung) berlalu-lalang di halaman dan menyeberang ke toko & warung.

const LAJU_JALAN = 1.15;
const LAJU_SAPU = 0.45;
const acak = (a, b) => a + Math.random() * (b - a);
const pilihAcak = (d) => d[Math.floor(Math.random() * d.length)];

function titikBebas(x, z, lantai) {
	for (let r = 0; r < 2.5; r += 0.3) {
		for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
			const px = x + Math.cos(a) * r;
			const pz = z + Math.sin(a) * r;
			if (!tabrak(px, pz, lantai, 0.4)) return { x: px, z: pz };
			if (r === 0) break;
		}
	}
	return null;
}
const bebaskan = (daftar, l) => daftar.map((t) => ({ ...t, ...titikBebas(t.x, t.z, l) })).filter((t) => !tabrak(t.x, t.z, l, 0.4));

// Tujuan singgah per lantai: benda (dispenser, kopi, teh, wastafel) & tengah ruang.
const TUJUAN = [0, 1].map((l) => {
	const hasil = [];
	for (const b of BENDA) if (b.lantai === l) hasil.push({ x: b.x, z: b.z, hadap: { x: b.x, z: b.z } });
	for (const a of [LOBI, ...RUANGAN, ...AREA_LAIN]) {
		if (a.lantai !== l || a.id === "aula2" || a.id === "belakang1") continue;
		hasil.push({ x: (a.rect.x0 + a.rect.x1) / 2, z: (a.rect.z0 + a.rect.z1) / 2 });
	}
	return bebaskan(hasil, l);
});
// Halaman & seberang jalan (lantai dasar, di dalam grid A*).
const TUJUAN_LUAR = bebaskan(
	[
		{ x: 9, z: 26.5 },
		{ x: 9, z: 30.3 },
		{ x: 0, z: 15.2 },
		{ x: -8, z: 21 },
		{ x: 2.5, z: 21.2 },
		{ x: 13, z: 21.6 },
		{ x: -12.6, z: 23.8 },
		{ x: 17.6, z: 12 },
		{ x: 0, z: -18 },
		{ x: -24, z: 4 },
		{ x: 24, z: 2 },
		{ x: 0, z: 44.6 },
		{ x: 16, z: 44.6 },
		{ x: -11.2, z: 44.4 },
		{ x: -26.8, z: 44.8 },
		{ x: 30, z: 30.4 },
		{ x: -30, z: 30.4 },
	],
	0,
);
const TUJUAN_SATPAM = TUJUAN_LUAR.filter((t) => t.z > 10 && t.z < 31);

const KALIMAT_WARGA = [
	"Mau belanja ke Alfamart dulu.",
	"Mie ayam di seberang itu enak, lho!",
	"Ada urusan ke DPMD, mengurus berkas desa.",
	"Panas juga ya siang ini.",
	"Sudah coba mancing di Situ Pemda?",
	"Baju di Distro Gaya keren-keren.",
];

// Satu langkah menyusuri jalur; mengembalikan true bila jalur habis.
function susuri(st, dt, laju, lantai, gerak) {
	const tuju = st.jalur[0];
	const dx = tuju.x - st.x;
	const dz = tuju.z - st.z;
	const d = Math.hypot(dx, dz);
	// berhenti sopan bila pengunjung menghalangi
	const px = posisi.x - st.x;
	const pz = posisi.z - st.z;
	const terhalang = posisi.lantai === lantai && px * px + pz * pz < 1.2 && (px * dx + pz * dz) / (d || 1) > 0;
	if (d < 0.12) {
		st.jalur.shift();
		return !st.jalur.length;
	}
	if (!terhalang) {
		const v = Math.min(d, laju * dt);
		st.x += (dx / d) * v;
		st.z += (dz / d) * v;
		const ke = Math.atan2(dx, dz);
		st.rot += Math.atan2(Math.sin(ke - st.rot), Math.cos(ke - st.rot)) * (1 - Math.exp(-8 * dt));
		gerak.fase += dt * 7.5 * (laju / LAJU_JALAN);
	}
	gerak.laju += ((terhalang ? 0 : Math.min(0.6, laju / 2)) - gerak.laju) * (1 - Math.exp(-8 * dt));
	return false;
}

const yDi = (lantai, x, z) => (lantai ? lantai * TINGGI_LANTAI : tinggiTanah(x, z));

// Penghuni kantor yang bergantian meninggalkan tempatnya. jenis: "duduk" | "berdiri" |
// "satpam" | "sapu".
function OrangHidup({ o, jenis, lantai, hidup, indeks, terlihat }) {
	const akar = useRef();
	const rumahG = useRef();
	const jalanG = useRef();
	const gerak = useRef({ laju: 0, fase: 0 });
	const s = useRef({ mode: jenis === "sapu" ? "singgah" : "rumah", t: acak(2, 18), jalur: [], x: o.x, z: o.z, rot: o.rot });
	const lamaRumah = jenis === "duduk" ? [15, 45] : jenis === "satpam" ? [15, 35] : [8, 25];

	useFrame((_, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		const st = s.current;
		const gr = gerak.current;
		if (st.mode === "rumah" || st.mode === "singgah") {
			st.t -= dt;
			gr.laju *= Math.exp(-8 * dt);
			if (st.t <= 0) {
				let ke;
				if (jenis === "sapu") {
					// menyapu: geser 1–3,5 m ke titik bebas di sekitar tempatnya
					const a = Math.random() * Math.PI * 2;
					const r = acak(1, 3.5);
					ke = titikBebas(o.x + Math.cos(a) * r, o.z + Math.sin(a) * r, lantai);
				} else if (st.mode === "rumah") ke = pilihAcak(jenis === "satpam" ? TUJUAN_SATPAM : TUJUAN[lantai]);
				else ke = { x: o.x, z: o.z };
				const jalur = ke && cariJalur({ x: st.x, z: st.z, lantai }, { x: ke.x, z: ke.z, lantai });
				if (jalur?.length) {
					st.jalur = jalur;
					st.singgahDi = ke;
					st.mode = jenis === "sapu" ? "pergi" : st.mode === "rumah" ? "pergi" : "pulang";
				} else st.t = acak(3, 10);
			}
		} else if (susuri(st, dt, jenis === "sapu" ? LAJU_SAPU : LAJU_JALAN, lantai, gr)) {
			if (jenis === "sapu") {
				st.mode = "singgah";
				st.t = acak(2, 5);
			} else if (st.mode === "pergi") {
				st.mode = "singgah";
				st.t = acak(4, 11);
				const h = st.singgahDi?.hadap;
				if (h) st.rot = Math.atan2(h.x - st.x, h.z - st.z);
			} else {
				st.mode = "rumah";
				Object.assign(st, { x: o.x, z: o.z, rot: o.rot, t: acak(...lamaRumah) });
			}
		}
		const diRumah = st.mode === "rumah";
		rumahG.current.visible = diRumah;
		jalanG.current.visible = !diRumah;
		jalanG.current.position.set(st.x, yDi(lantai, st.x, st.z), st.z);
		jalanG.current.rotation.y = st.rot;
		akar.current.visible = terlihat(o.area) || !diRumah;
		hidup.current[indeks] = { x: diRumah ? o.x : st.x, z: diRumah ? o.z : st.z, duduk: diRumah };
		const kunci = `p${lantai}:${indeks}`;
		if (diRumah) posisiNpc.delete(kunci);
		else posisiNpc.set(kunci, { x: st.x, z: st.z, lantai });
	});
	useEffect(() => () => posisiNpc.delete(`p${lantai}:${indeks}`), [lantai, indeks]);

	return (
		<group ref={akar}>
			<group ref={rumahG} position={[o.x, yDi(lantai, o.x, o.z), o.z]} rotation-y={o.rot}>
				{jenis !== "sapu" && <Tokoh penampilan={o.penampilan} pose={o.pose} aktivitas={o.aktivitas} asal={{ x: o.x, z: o.z, rot: o.rot, lantai }} />}
			</group>
			<group ref={jalanG} visible={false}>
				<Tokoh penampilan={o.penampilan} pose="jalan" gerak={gerak} aktivitas={jenis === "sapu" ? "mengepel" : undefined} />
			</group>
		</group>
	);
}

// Warga yang berlalu-lalang di halaman kantor & seberang jalan.
const JUMLAH_WARGA = 8;
function Pengunjung({ i, posisiWarga }) {
	const g = useRef();
	const gerak = useRef({ laju: 0, fase: 0 });
	const penampilan = useMemo(() => penampilanWarga(), []);
	const s = useRef(null);
	if (!s.current) {
		const awal = TUJUAN_LUAR[(i * 5) % TUJUAN_LUAR.length];
		s.current = { mode: "singgah", t: acak(0.5, 8), jalur: [], x: awal.x, z: awal.z, rot: Math.random() * 6 };
	}
	useFrame((_, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		const st = s.current;
		if (st.mode === "singgah") {
			st.t -= dt;
			gerak.current.laju *= Math.exp(-8 * dt);
			if (st.t <= 0) {
				const ke = pilihAcak(TUJUAN_LUAR);
				const jalur = cariJalur({ x: st.x, z: st.z, lantai: 0 }, { x: ke.x, z: ke.z, lantai: 0 });
				if (jalur?.length) {
					st.jalur = jalur;
					st.mode = "pergi";
				} else st.t = acak(2, 6);
			}
		} else if (susuri(st, dt, LAJU_JALAN * 1.05, 0, gerak.current)) {
			st.mode = "singgah";
			st.t = acak(3, 12);
		}
		g.current.position.set(st.x, tinggiTanah(st.x, st.z), st.z);
		g.current.rotation.y = st.rot;
		posisiWarga.current[i] = { x: st.x, z: st.z };
		posisiNpc.set(`w${i}`, { x: st.x, z: st.z, lantai: 0 });
	});
	useEffect(() => () => posisiNpc.delete(`w${i}`), [i]);
	return (
		<group ref={g}>
			<Tokoh penampilan={penampilan} pose="jalan" gerak={gerak} />
		</group>
	);
}

// Peran tiap penghuni yang ikut hidup (null = tetap di tempat).
function peranHidup(o, i, lantai) {
	if (o.aktivitas === "mengepel") return "sapu";
	if (o.jenis === "jaga" || o.aktivitas === "jaga") return "satpam";
	if (o.pose === "duduk" && o.aktivitas === "mengetik") return (i * 7 + lantai) % 2 === 0 ? "duduk" : null;
	if (o.pose === "diam" && (o.aktivitas === "diskusi" || o.aktivitas === "menunggu")) return i % 3 !== 0 ? "berdiri" : null;
	return null;
}

export default function Pegawai({ lantai, penghuni }) {
	const daftar = useMemo(() => penghuni.orang.filter((p) => p.lantai === lantai), [penghuni, lantai]);
	const pejalan = useMemo(() => penghuni.pejalan.map((p, i) => [p, i]).filter(([p]) => p.lantai === lantai), [penghuni, lantai]);
	const sprite = useRef();
	const balon = useBalon();
	const aktif = useRef({ siapa: null, putaran: new Map() });
	const grupOrang = useRef([]);
	// posisi terkini penghuni yang sedang berkeliling & warga (untuk balon sapaan)
	const hidup = useRef([]);
	const posisiWarga = useRef([]);
	const luarRef = useRef(false);
	const terlihat = (area) => !luarRef.current || TAMPAK_DARI_LUAR.has(area);
	const peran = useMemo(() => daftar.map((o, i) => peranHidup(o, i, lantai)), [daftar, lantai]);
	const warga = useMemo(() => (lantai === 0 ? Array.from({ length: JUMLAH_WARGA }, (_, i) => i) : []), [lantai]);

	useFrame(() => {
		// dari luar gedung hanya halaman, lobi, dan lorong yang terlihat (lewat pintu kaca)
		const luar = diLuarGedung();
		luarRef.current = luar;
		daftar.forEach((o, i) => {
			const g = grupOrang.current[i];
			if (g) g.visible = !luar || TAMPAK_DARI_LUAR.has(o.area);
		});
		const sp = sprite.current;
		if (posisi.lantai !== lantai) {
			sp.visible = false;
			aktif.current.siapa = null;
			return;
		}
		// Orang terdekat dalam jangkauan sapa (yang berkeliling dihitung dari posisi terkininya).
		let terbaik = null;
		let jarak = 2.4 * 2.4;
		const cek = (kunci, x, z, data, tinggi) => {
			const d = (posisi.x - x) ** 2 + (posisi.z - z) ** 2;
			if (d < jarak) {
				jarak = d;
				terbaik = { kunci, x, z, data, tinggi };
			}
		};
		daftar.forEach((o, i) => {
			const h = peran[i] && hidup.current[i];
			if (h && !h.duduk) cek(`p${i}`, h.x, h.z, o, 2.15);
			else cek(`p${i}`, o.x, o.z, o, o.pose === "duduk" ? 1.75 : 2.15);
		});
		for (const [p, i] of pejalan) {
			const q = posisiPejalan[i];
			if (q) cek(`j${i}`, q.x, q.z, p, 2.15);
		}
		for (const i of warga) {
			const q = posisiWarga.current[i];
			if (q) cek(`w${i}`, q.x, q.z, { nama: null }, 2.15);
		}
		const a = aktif.current;
		if (!terbaik) {
			sp.visible = false;
			a.siapa = null;
			return;
		}
		if (a.siapa !== terbaik.kunci) {
			a.siapa = terbaik.kunci;
			const o = terbaik.data;
			const jenisKunci = terbaik.kunci[0];
			const daftarKalimat =
				jenisKunci === "w"
					? KALIMAT_WARGA
					: jenisKunci === "j"
						? KALIMAT_LAIN[o.jenis === "bersih" ? "mengepel" : o.jenis === "jaga" ? "jaga" : "pejalan"]
						: kalimatUntuk(o);
			const n = a.putaran.get(terbaik.kunci) ?? Math.floor(Math.random() * daftarKalimat.length);
			a.putaran.set(terbaik.kunci, n + 1);
			const ucapan = daftarKalimat[n % daftarKalimat.length];
			balon.tulis({ nama: o.nama, jabatan: o.jabatan, ucapan });
			// ucapannya juga terdengar (suara Bahasa Indonesia), tidak hanya balon kata
			ucapkan(ucapan, { x: terbaik.x, z: terbaik.z, perempuan: o.penampilan?.perempuan ?? (jenisKunci === "w" ? Math.random() < 0.5 : false), penting: true, jangkau: 6 });
		}
		sp.visible = true;
		sp.position.set(terbaik.x, yDi(lantai, terbaik.x, terbaik.z) + terbaik.tinggi + 0.75, terbaik.z);
	});

	return (
		<group>
			{daftar.map((o, i) =>
				peran[i] ? (
					<OrangHidup key={i} o={o} jenis={peran[i]} lantai={lantai} hidup={hidup} indeks={i} terlihat={terlihat} />
				) : (
					<group key={i} ref={(g) => (grupOrang.current[i] = g)} position={[o.x, yDi(lantai, o.x, o.z), o.z]} rotation-y={o.rot}>
						<Tokoh penampilan={o.penampilan} pose={o.pose} aktivitas={o.aktivitas} asal={o.aktivitas === "mengepel" ? null : { x: o.x, z: o.z, rot: o.rot, lantai }} />
					</group>
				),
			)}
			{pejalan.map(([p, i]) => (
				<Pejalan key={i} data={p} indeks={i} />
			))}
			{warga.map((i) => (
				<Pengunjung key={i} i={i} posisiWarga={posisiWarga} />
			))}
			<sprite ref={sprite} scale={[2.2, 1.1, 1]} visible={false} renderOrder={10}>
				<spriteMaterial map={balon.tekstur} transparent depthTest={false} />
			</sprite>
		</group>
	);
}
