import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";
import { RUANGAN, TINGGI_LANTAI } from "../kantorConfig";
import { posisi, posisiPejalan } from "../jelajahStore";
import { cariJalur } from "./layout";
import Tokoh from "./Tokoh";

// Penghuni kantor (hasil susunPenghuni): pegawai yang bekerja di mejanya, rapat,
// berdiskusi, satpam, petugas kebersihan, pengunjung yang menunggu, dan yang
// berjalan berkeliling. Saat pengunjung mendekat, orang terdekat menyapa lewat
// balon kata berisi nama, jabatan, dan ucapannya.

const KALIMAT_RUANG = Object.fromEntries(RUANGAN.map((r) => [r.id, r.kalimat]));
const KALIMAT_LAIN = {
	rapat: ["Rapat sedang berlangsung, mohon tenang ya.", "Silakan, slide berikutnya.", "Usulan ini kita bahas bersama."],
	pimpinan: ["Rapat pimpinan sedang berlangsung.", "Selamat datang di DPMD Kabupaten Bogor."],
	menunggu: ["Saya sedang menunggu giliran dilayani.", "Mau mengurus berkas desa.", "Pelayanannya ramah, ya."],
	berdiri: ["Selamat datang di DPMD!", "Ada yang bisa dibantu?"],
	diskusi: ["Berkas ini perlu paraf kepala bidang dulu.", "Datanya sudah saya cek, tinggal diunggah."],
	ajudan: ["Pimpinan sedang memimpin rapat di Ruang Halimun.", "Silakan sampaikan keperluan lewat Sekretariat."],
	dapur: ["Mau teh atau kopi?", "Air panasnya baru mendidih."],
	jaga: ["Selamat datang, silakan masuk.", "Parkir motor di sebelah kanan, ya.", "Mari, saya bantu arahkan."],
	mengepel: ["Hati-hati, lantainya masih basah.", "Permisi, sedang dibersihkan."],
	pejalan: ["Permisi, mau antar berkas ke bidang sebelah.", "Selamat siang!", "Mari, silakan."],
};

function kalimatUntuk(o) {
	if (o.jenis === "ajudan" || o.jenis === "dapur") return KALIMAT_LAIN[o.jenis];
	if (o.jenis === "kepalaRapat" && o.area === "halimun") return KALIMAT_LAIN.pimpinan;
	if (o.jenis === "jaga" || o.aktivitas === "jaga") return KALIMAT_LAIN.jaga;
	if (o.aktivitas === "mengepel") return KALIMAT_LAIN.mengepel;
	if (["rapat", "menunggu", "diskusi"].includes(o.aktivitas)) return KALIMAT_LAIN[o.aktivitas];
	return KALIMAT_RUANG[o.area] || KALIMAT_LAIN.berdiri;
}

// --- balon kata: satu sprite bersama, digambar ulang saat orangnya berganti ---
function bungkus(g, teks, maks) {
	const baris = [""];
	for (const k of teks.split(" ")) {
		const coba = (baris[baris.length - 1] + " " + k).trim();
		if (g.measureText(coba).width > maks && baris[baris.length - 1]) baris.push(k);
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
				g.fillText(nama.length > 30 ? nama.slice(0, 29) + "…" : nama, 256, y + 18);
				g.fillStyle = "#1f6b50";
				g.font = `600 22px ${FONT}`;
				g.fillText(jabatan.length > 40 ? jabatan.slice(0, 39) + "…" : jabatan, 256, y + 50);
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
			const potong = cariJalur({ x: ax, z: az, lantai: data.lantai }, { x: bx, z: bz, lantai: data.lantai });
			hasil.push(...(potong?.length ? potong : [{ x: bx, z: bz }]));
		}
		return hasil;
	}, [data]);
	const status = useRef({ i: 0, x: data.titik[0][0], z: data.titik[0][1] });

	useEffect(() => {
		posisiPejalan[indeks] = { x: data.titik[0][0], z: data.titik[0][1], lantai: data.lantai };
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
		const terhalang = posisi.lantai === data.lantai && px * px + pz * pz < 1.4 && (px * dx + pz * dz) / (d || 1) > 0;
		let bergerak = false;
		if (d < 0.15) s.i = (s.i + 1) % rute.length;
		else if (!terhalang) {
			const v = Math.min(d, 1.25 * dt);
			s.x += (dx / d) * v;
			s.z += (dz / d) * v;
			bergerak = true;
			const r = grup.current.rotation;
			const ke = Math.atan2(dx, dz);
			r.y += Math.atan2(Math.sin(ke - r.y), Math.cos(ke - r.y)) * (1 - Math.exp(-8 * dt));
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
		<group ref={grup} position={[data.titik[0][0], data.lantai * TINGGI_LANTAI, data.titik[0][1]]}>
			<Tokoh penampilan={data.penampilan} pose="jalan" gerak={gerak} />
		</group>
	);
}

export default function Pegawai({ lantai, penghuni }) {
	const daftar = useMemo(() => penghuni.orang.filter((p) => p.lantai === lantai), [penghuni, lantai]);
	const pejalan = useMemo(() => penghuni.pejalan.map((p, i) => [p, i]).filter(([p]) => p.lantai === lantai), [penghuni, lantai]);
	const sprite = useRef();
	const balon = useBalon();
	const aktif = useRef({ siapa: null, putaran: new Map() });

	useFrame(() => {
		const sp = sprite.current;
		if (posisi.lantai !== lantai) {
			sp.visible = false;
			aktif.current.siapa = null;
			return;
		}
		// Orang terdekat dalam jangkauan sapa (pejalan dihitung dari posisi terkininya).
		let terbaik = null;
		let jarak = 2.4 * 2.4;
		const cek = (kunci, x, z, data, tinggi) => {
			const d = (posisi.x - x) ** 2 + (posisi.z - z) ** 2;
			if (d < jarak) {
				jarak = d;
				terbaik = { kunci, x, z, data, tinggi };
			}
		};
		daftar.forEach((o, i) => cek(`p${i}`, o.x, o.z, o, o.pose === "duduk" ? 1.75 : 2.15));
		for (const [p, i] of pejalan) {
			const q = posisiPejalan[i];
			if (q) cek(`j${i}`, q.x, q.z, p, 2.15);
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
			const daftarKalimat = terbaik.kunci[0] === "j" ? KALIMAT_LAIN[o.jenis === "bersih" ? "mengepel" : o.jenis === "jaga" ? "jaga" : "pejalan"] : kalimatUntuk(o);
			const n = a.putaran.get(terbaik.kunci) ?? 0;
			a.putaran.set(terbaik.kunci, n + 1);
			balon.tulis({ nama: o.nama, jabatan: o.jabatan, ucapan: daftarKalimat[n % daftarKalimat.length] });
		}
		sp.visible = true;
		sp.position.set(terbaik.x, lantai * TINGGI_LANTAI + terbaik.tinggi + 0.75, terbaik.z);
	});

	return (
		<group>
			{daftar.map((o, i) => (
				<group key={i} position={[o.x, lantai * TINGGI_LANTAI, o.z]} rotation-y={o.rot}>
					<Tokoh
						penampilan={o.penampilan}
						pose={o.pose}
						aktivitas={o.aktivitas}
						asal={o.aktivitas === "mengepel" ? null : { x: o.x, z: o.z, rot: o.rot, lantai }}
					/>
				</group>
			))}
			{pejalan.map(([p, i]) => (
				<Pejalan key={i} data={p} indeks={i} />
			))}
			<sprite ref={sprite} scale={[2.2, 1.1, 1]} visible={false} renderOrder={10}>
				<spriteMaterial map={balon.tekstur} transparent depthTest={false} />
			</sprite>
		</group>
	);
}
