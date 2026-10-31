import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
	BufferGeometry,
	CanvasTexture,
	Float32BufferAttribute,
	Object3D,
	RepeatWrapping,
	SRGBColorSpace,
	Vector3,
} from "three";
import { ambilKeadaan, posisi } from "../jelajahStore";
import { TINGGI_DINDING } from "./layout";
import Papan from "./Papan";
import Videotron from "./Videotron";

// Tampak luar gedung DPMD mengikuti foto kantor: dua lantai berwarna arang, atap
// perisai oranye, menara tengah berlambang Kabupaten Bogor, pita hijau limau, dan
// papan SID. Cangkang ini hanya terlihat dari halaman; begitu pengunjung masuk,
// ia memudar sehingga interior terlihat dari atas seperti rumah boneka.

const ARANG = "#5a5551";
const MENARA = "#67615c";
const LIMAU = "#c3d68a";
const T_ATAS = 6.6; // tinggi lantai 2 sampai lis atap
const GEDUNG = { x0: -15.3, x1: 15.3, z0: -13.3, z1: 12.25 };

function kotak(x0, x1, y0, y1, z0, z1) {
	return { pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], uk: [x1 - x0, y1 - y0, z1 - z0] };
}

const KULIT = [
	kotak(GEDUNG.x0, -2, 0, T_ATAS, 12.15, GEDUNG.z1),
	kotak(2, GEDUNG.x1, 0, T_ATAS, 12.15, GEDUNG.z1),
	kotak(-2, 2, 2.6, T_ATAS, 12.15, GEDUNG.z1),
	kotak(GEDUNG.x0, GEDUNG.x0 + 0.1, 0, T_ATAS, GEDUNG.z0, GEDUNG.z1),
	kotak(GEDUNG.x1 - 0.1, GEDUNG.x1, 0, T_ATAS, GEDUNG.z0, GEDUNG.z1),
	kotak(GEDUNG.x0, GEDUNG.x1, 0, T_ATAS, GEDUNG.z0, GEDUNG.z0 + 0.1),
];

// Kaca jendela: [x, y, z, lebar, tinggi, rotasiY]. Setiap jendela dua daun kaca,
// celah di antaranya memperlihatkan dinding sebagai kusen.
const JENDELA = (() => {
	const hasil = [];
	const lantai = [
		[1.35, 1.7],
		[4.65, 2.5],
	];
	for (const [y, h] of lantai) {
		for (const x of [-13.4, -11.95, -9.9, -8.45, -6.6, -5.15, 5.15, 6.6, 8.45, 9.9, 11.95, 13.4]) hasil.push([x, y, GEDUNG.z1 + 0.02, 1.35, h, 0]);
		for (let z = 10; z >= -10; z -= 4) {
			for (const dz of [-0.72, 0.72]) {
				hasil.push([GEDUNG.x1 + 0.02, y, z + dz, 1.35, h, Math.PI / 2]);
				hasil.push([GEDUNG.x0 - 0.02, y, z + dz, 1.35, h, -Math.PI / 2]);
			}
		}
	}
	return hasil;
})();

// Atap perisai: dua bidang trapesium + dua segitiga, dengan garis genteng
// mendatar dari tekstur bergaris yang diulang menurut ketinggian.
function buatAtap(x0, x1, z0, z1, tinggi) {
	const cx = (x0 + x1) / 2;
	const cz = (z0 + z1) / 2;
	// Bubungan memanjang searah sisi terpanjang gedung.
	const h = Math.min(x1 - x0, z1 - z0) / 2;
	const searahX = x1 - x0 >= z1 - z0;
	const r1 = searahX ? [x0 + h, tinggi, cz] : [cx, tinggi, z0 + h];
	const r2 = searahX ? [x1 - h, tinggi, cz] : [cx, tinggi, z1 - h];
	const a = [x0, 0, z0];
	const b = [x1, 0, z0];
	const c = [x1, 0, z1];
	const d = [x0, 0, z1];
	const bidang = [
		...(searahX
			? [
					[a, b, r2, r1],
					[b, c, r2],
					[c, d, r1, r2],
					[d, a, r1],
				]
			: [
					[a, b, r1],
					[b, c, r2, r1],
					[c, d, r2],
					[d, a, r1, r2],
				]),
	];
	const pos = [];
	const uv = [];
	const tengah = new Vector3(cx, -tinggi, cz);
	const v = (p) => new Vector3(...p);
	for (const titik of bidang) {
		const segitiga = titik.length === 3 ? [titik] : [[titik[0], titik[1], titik[2]], [titik[0], titik[2], titik[3]]];
		for (let [p, q, r] of segitiga) {
			// Pastikan normal menghadap ke luar atap.
			const n = v(q).sub(v(p)).cross(v(r).sub(v(p)));
			const luar = v(p).add(v(q)).add(v(r)).divideScalar(3).sub(tengah);
			if (n.dot(luar) < 0) [q, r] = [r, q];
			for (const t of [p, q, r]) {
				pos.push(...t);
				uv.push((t[0] + t[2]) / 6, t[1] * 2.2);
			}
		}
	}
	const g = new BufferGeometry();
	g.setAttribute("position", new Float32BufferAttribute(pos, 3));
	g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
	g.computeVertexNormals();
	return g;
}

function teksturGenteng() {
	const c = document.createElement("canvas");
	c.width = 8;
	c.height = 64;
	const g = c.getContext("2d");
	g.fillStyle = "#d9794b";
	g.fillRect(0, 0, 8, 64);
	g.fillStyle = "#b15d38";
	g.fillRect(0, 58, 8, 6);
	const t = new CanvasTexture(c);
	t.wrapS = t.wrapT = RepeatWrapping;
	t.colorSpace = SRGBColorSpace;
	return t;
}

function Jendela() {
	const ref = useRef();
	useLayoutEffect(() => {
		const o = new Object3D();
		JENDELA.forEach(([x, y, z, w, h, ry], i) => {
			o.position.set(x, y, z);
			o.rotation.set(0, ry, 0);
			o.scale.set(w, h, 1);
			o.updateMatrix();
			ref.current.setMatrixAt(i, o.matrix);
		});
		ref.current.instanceMatrix.needsUpdate = true;
	}, []);
	return (
		<instancedMesh ref={ref} args={[null, null, JENDELA.length]}>
			<planeGeometry args={[1, 1]} />
			<meshStandardMaterial color="#1f2428" metalness={0.35} roughness={0.25} />
		</instancedMesh>
	);
}

function Cangkang({ statistik }) {
	const grup = useRef();
	const bahan = useRef([]);
	const tampak = useRef(1);
	const atap = useMemo(() => buatAtap(GEDUNG.x0 - 0.9, GEDUNG.x1 + 0.9, GEDUNG.z0 - 0.9, GEDUNG.z1 + 0.9, 4), []);
	const genteng = useMemo(teksturGenteng, []);
	useEffect(
		() => () => {
			atap.dispose();
			genteng.dispose();
		},
		[atap, genteng],
	);

	useEffect(() => {
		const daftar = new Set();
		grup.current.traverse((o) => {
			if (!o.material) return;
			o.material.transparent = true;
			daftar.add(o.material);
		});
		bahan.current = [...daftar];
	}, []);

	useFrame((_, dt) => {
		const target = ambilKeadaan().area === "luar" ? 1 : 0;
		const t = tampak.current + (target - tampak.current) * (1 - Math.exp(-8 * dt));
		if (Math.abs(t - tampak.current) < 1e-4 && grup.current.visible === t > 0.02) return;
		tampak.current = t;
		grup.current.visible = t > 0.02;
		for (const m of bahan.current) {
			m.opacity = t;
			m.depthWrite = t > 0.95;
		}
	});

	return (
		<group ref={grup}>
			{KULIT.map((k, i) => (
				<mesh key={i} position={k.pos}>
					<boxGeometry args={k.uk} />
					<meshStandardMaterial color={ARANG} />
				</mesh>
			))}
			<Jendela />

			{/* lis di bawah atap */}
			<mesh position={[0, T_ATAS - 0.15, (GEDUNG.z0 + GEDUNG.z1) / 2]}>
				<boxGeometry args={[GEDUNG.x1 - GEDUNG.x0 + 0.8, 0.3, GEDUNG.z1 - GEDUNG.z0 + 0.8]} />
				<meshStandardMaterial color="#d08a63" />
			</mesh>
			<mesh geometry={atap} position-y={T_ATAS}>
				<meshStandardMaterial map={genteng} flatShading />
			</mesh>

			{/* pita hijau limau sepanjang muka gedung */}
			<mesh position={[0, 2.78, GEDUNG.z1 + 0.08]}>
				<boxGeometry args={[GEDUNG.x1 - GEDUNG.x0 + 0.1, 0.35, 0.16]} />
				<meshStandardMaterial color={LIMAU} />
			</mesh>

			{/* menara tengah dengan videotron (slide pertama: lambang & KABUPATEN BOGOR) */}
			{/* menonjol melewati lis atap (z1 + 0.9) supaya atap tampak di belakang menara */}
			<mesh position={[0, 5.25, GEDUNG.z1 + 0.6]}>
				<boxGeometry args={[8, 4.7, 1.2]} />
				<meshStandardMaterial color={MENARA} />
			</mesh>
			<Videotron
				posisi={[0, 5.3, GEDUNG.z1 + 1.25]}
				lebar={6.8}
				tinggi={3.7}
				jeda={6}
				bingkai="#1d1b19"
				slide={[
					{ logo: true, judul: "KABUPATEN BOGOR" },
					{ judul: "SELAMAT DATANG", sub: "Dinas Pemberdayaan Masyarakat dan Desa" },
					{
						judul: "KABUPATEN BOGOR",
						angka: [
							[statistik?.kecamatan, "Kecamatan"],
							[statistik?.desa, "Desa"],
							[statistik?.kelurahan, "Kelurahan"],
						],
					},
					{ judul: "JELAJAHI KANTOR KAMI", sub: "Tujuh bidang layanan di dua lantai" },
				]}
			/>

			{/* papan SID di sayap kanan */}
			<Papan
				posisi={[9.4, 4.9, GEDUNG.z1 + 0.04]}
				lebar={3.2}
				tinggi={1.1}
				latar={ARANG}
				diterangi
				baris={[{ teks: "SID", ukuran: 0.95, tebal: true, warna: "#e0482b", y: 0.52 }]}
			/>
			<mesh position={[9.4, 3.95, GEDUNG.z1 + 0.06]}>
				<boxGeometry args={[3, 0.5, 0.08]} />
				<meshStandardMaterial color="#d9532f" />
			</mesh>

			{/* kusen di atas pintu masuk */}
			<mesh position={[0, TINGGI_DINDING - 0.06, 12.05]}>
				<boxGeometry args={[4, 0.12, 0.3]} />
				<meshStandardMaterial color="#2a2826" />
			</mesh>
		</group>
	);
}

// Pintu kaca geser di pintu masuk: membuka sendiri saat pengunjung mendekat dan
// masuk ke dalam dinding.
// Pintu tidak ikut tabrakan, jadi celah pintu tetap selalu bisa dilewati.
function PintuKaca() {
	const kiri = useRef();
	const kanan = useRef();
	const buka = useRef(0);
	useFrame((_, dt) => {
		const dekat = Math.hypot(posisi.x, posisi.z - 12) < 5;
		buka.current += ((dekat ? 1 : 0) - buka.current) * (1 - Math.exp(-6 * dt));
		const geser = buka.current * 1.9;
		kiri.current.position.x = -1 - geser;
		kanan.current.position.x = 1 + geser;
	});
	const daun = (ref) => (
		<group ref={ref} position={[0, 1.15, 12]}>
			<mesh>
				<boxGeometry args={[1.98, 2.3, 0.05]} />
				<meshStandardMaterial color="#5b7380" transparent opacity={0.45} metalness={0.4} roughness={0.1} />
			</mesh>
			<mesh position={[ref === kiri ? 0.9 : -0.9, 0, 0.04]}>
				<boxGeometry args={[0.04, 0.4, 0.04]} />
				<meshStandardMaterial color="#c9ccce" metalness={0.6} />
			</mesh>
		</group>
	);
	return (
		<group>
			{daun(kiri)}
			{daun(kanan)}
		</group>
	);
}

export default function Fasad({ statistik }) {
	return (
		<>
			<Cangkang statistik={statistik} />
			<PintuKaca />
		</>
	);
}
