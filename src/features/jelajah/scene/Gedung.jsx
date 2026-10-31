import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
	BoxGeometry,
	Color,
	ExtrudeGeometry,
	Float32BufferAttribute,
	MeshStandardMaterial,
	Object3D,
	Path,
	SRGBColorSpace,
	Shape,
	TextureLoader,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { AREA_LAIN, LOBI, RUANGAN, TINGGI_LANTAI } from "../kantorConfig";
import { posisi, posisiPejalan } from "../jelajahStore";
import { DAUN_PINTU, DINDING, KOLAM, MEJA_RAPAT, PERABOT, SAJADAH, TANGGA, TINGGI_DINDING, rectTangga } from "./layout";
import { BAHAN_PERABOT, JENIS_PERABOT, geometriPerabot } from "./perabot";
import { teksturBatu, teksturKayu, teksturKeramik, teksturMarmer, teksturPintuKayu } from "./tekstur";
import Papan from "./Papan";
import Videotron from "./Videotron";

const H = TINGGI_LANTAI;
const AREA = Object.fromEntries([...RUANGAN, LOBI, ...AREA_LAIN].map((a) => [a.id, a]));

// Isi tiap lantai hanya digambar saat relevan: lantai 1 saat pemain di bawah,
// lantai 2 saat pemain di atas; keduanya saat sedang di tangga. `geser` menaikkan
// isinya setinggi lantai; matikan bila anak-anaknya sudah menghitung tingginya sendiri.
export function GrupLantai({ lantai, geser = true, children }) {
	const g = useRef();
	useFrame(() => {
		g.current.visible = lantai === 0 ? posisi.y < 2.6 : posisi.y > 0.9;
	});
	return (
		<group ref={g} position-y={geser ? lantai * H : 0}>
			{children}
		</group>
	);
}

// ---------- lantai ----------

function Lantai({ rect, map, warna = "#ffffff", y = 0.01 }) {
	const lx = rect.x1 - rect.x0;
	const lz = rect.z1 - rect.z0;
	const tekstur = useMemo(() => map?.([lx / 1.2, lz / 1.2]), [map, lx, lz]);
	return (
		<mesh rotation-x={-Math.PI / 2} position={[(rect.x0 + rect.x1) / 2, y, (rect.z0 + rect.z1) / 2]}>
			<planeGeometry args={[lx, lz]} />
			<meshStandardMaterial color={warna} map={tekstur} />
		</mesh>
	);
}

// Pelat lantai 2: satu bidang sebesar gedung dengan lubang untuk kedua tangga.
function PelatLantai2() {
	const geom = useMemo(() => {
		// Bentuk digambar di bidang XY dengan y = -z, lalu diputar rebah.
		const s = new Shape();
		s.moveTo(-15, 13);
		s.lineTo(15, 13);
		s.lineTo(15, -12);
		s.lineTo(-15, -12);
		s.lineTo(-15, 13);
		for (const t of TANGGA) {
			const r = rectTangga(t);
			const lubang = new Path();
			lubang.moveTo(r.x0, -r.z0);
			lubang.lineTo(r.x0, -r.z1);
			lubang.lineTo(r.x1, -r.z1);
			lubang.lineTo(r.x1, -r.z0);
			lubang.lineTo(r.x0, -r.z0);
			s.holes.push(lubang);
		}
		const g = new ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false });
		g.rotateX(-Math.PI / 2);
		g.translate(0, -0.22, 0);
		return g;
	}, []);
	const tekstur = useMemo(() => teksturKeramik([1 / 1.2, 1 / 1.2]), []);
	useEffect(() => () => geom.dispose(), [geom]);
	return (
		<mesh geometry={geom} position-y={0.01}>
			<meshStandardMaterial map={tekstur} />
		</mesh>
	);
}

// ---------- dinding (dipudarkan bila menghalangi kamera) ----------

function Dinding({ lantai, daftarRef }) {
	const data = useMemo(() => DINDING.filter((d) => d.lantai === lantai), [lantai]);
	const bahan = useMemo(
		() =>
			data.map(() => {
				const sisi = new MeshStandardMaterial({ color: "#f1ece2", transparent: true });
				const atas = new MeshStandardMaterial({ color: "#b3a48a", transparent: true });
				return [sisi, sisi, atas, sisi, sisi, sisi];
			}),
		[data],
	);
	return data.map((d, i) => (
		<mesh
			key={i}
			position={[d.x, TINGGI_DINDING / 2, d.z]}
			material={bahan[i]}
			ref={(m) => {
				if (m) {
					m.userData.bahan = [bahan[i][0], bahan[i][2]];
					daftarRef.current[lantai][i] = m;
				}
			}}
		>
			<boxGeometry args={[d.lx, TINGGI_DINDING, d.lz]} />
		</mesh>
	));
}

// ---------- perabot (instanced) ----------

function PerabotInstans({ lantai }) {
	const kelompok = useMemo(() => {
		const per = {};
		for (const p of PERABOT) {
			if (p.lantai !== lantai || !JENIS_PERABOT.includes(p.jenis)) continue;
			(per[p.jenis] ||= []).push(p);
		}
		return Object.entries(per);
	}, [lantai]);
	return kelompok.map(([jenis, daftar]) => <SatuJenis key={jenis} jenis={jenis} daftar={daftar} />);
}

function SatuJenis({ jenis, daftar }) {
	const ref = useRef();
	useLayoutEffect(() => {
		const o = new Object3D();
		daftar.forEach((p, i) => {
			o.position.set(p.x, 0, p.z);
			o.rotation.set(0, p.rot, 0);
			o.updateMatrix();
			ref.current.setMatrixAt(i, o.matrix);
		});
		ref.current.instanceMatrix.needsUpdate = true;
		ref.current.computeBoundingSphere();
	}, [daftar]);
	return <instancedMesh ref={ref} args={[geometriPerabot(jenis), BAHAN_PERABOT, daftar.length]} />;
}

// ---------- tangga putar balik & pagar lubang ----------

function Tangga() {
	const geom = useMemo(() => {
		const bagian = [];
		const warna = new Color();
		const beri = (g, w) => {
			const n = g.toNonIndexed();
			n.deleteAttribute("uv");
			warna.set(w);
			const arr = new Float32Array(n.attributes.position.count * 3);
			for (let i = 0; i < arr.length; i += 3) arr.set([warna.r, warna.g, warna.b], i);
			n.setAttribute("color", new Float32BufferAttribute(arr, 3));
			return n;
		};
		const pagarMiring = (x, zA, yA, zB, yB) => {
			// pegangan + kaca miring dari (zA, yA) ke (zB, yB) pada garis x tetap
			const L = Math.hypot(zB - zA, yB - yA);
			const sudut = Math.atan2(yB - yA, zB - zA);
			const zm = (zA + zB) / 2;
			const ym = (yA + yB) / 2;
			bagian.push(
				beri(new BoxGeometry(0.05, 0.05, L).rotateX(-sudut).translate(x, ym + 0.95, zm), "#6b7178"),
				beri(new BoxGeometry(0.02, 0.85, L).rotateX(-sudut).translate(x, ym + 0.5, zm), "#a9c6d6"),
			);
		};
		for (const t of TANGGA) {
			const n = 10;
			const panjang = t.zDepan - t.zPutar;
			const d = panjang / n;
			const [nx0, nx1] = t.lajurNaik;
			const [tx0, tx1] = t.lajurTiba;
			for (let i = 0; i < n; i++) {
				// lajur naik: dari depan (lantai 1) ke bordes
				const hNaik = ((i + 1) * H) / (2 * n);
				const zNaik = t.zDepan - (i + 0.5) * d;
				bagian.push(beri(new BoxGeometry(nx1 - nx0, hNaik, d).translate((nx0 + nx1) / 2, hNaik / 2, zNaik), i % 2 ? "#d9d4ca" : "#cfc9be"));
				// lajur tiba: dari bordes kembali ke depan (lantai 2)
				const hTiba = H / 2 + ((i + 1) * H) / (2 * n);
				const zTiba = t.zPutar + (i + 0.5) * d;
				bagian.push(beri(new BoxGeometry(tx1 - tx0, hTiba, d).translate((tx0 + tx1) / 2, hTiba / 2, zTiba), i % 2 ? "#d9d4ca" : "#cfc9be"));
			}
			// bordes di ujung belakang
			const bx0 = nx0;
			const bx1 = tx1;
			bagian.push(beri(new BoxGeometry(bx1 - bx0, H / 2, t.zPutar - t.zBelakang).translate((bx0 + bx1) / 2, H / 4, (t.zPutar + t.zBelakang) / 2), "#cbc4b6"));
			// dinding pemisah antar-lajur (di bawah lajur tiba yang lebih tinggi)
			const xs = (nx1 + tx0) / 2;
			bagian.push(beri(new BoxGeometry(tx0 - nx1, H, panjang).translate(xs, H / 2, (t.zPutar + t.zDepan) / 2), "#bdb5a6"));
			// pagar: sisi luar lajur naik, sisi luar lajur tiba, belakang bordes
			pagarMiring(nx0 + 0.03, t.zDepan, 0, t.zPutar, H / 2);
			pagarMiring(tx1 - 0.03, t.zPutar, H / 2, t.zDepan, H);
			bagian.push(
				beri(new BoxGeometry(bx1 - bx0, 0.05, 0.05).translate((bx0 + bx1) / 2, H / 2 + 0.95, t.zBelakang + 0.03), "#6b7178"),
				beri(new BoxGeometry(bx1 - bx0, 0.85, 0.02).translate((bx0 + bx1) / 2, H / 2 + 0.5, t.zBelakang + 0.03), "#a9c6d6"),
			);
		}
		return mergeGeometries(bagian);
	}, []);
	useEffect(() => () => geom.dispose(), [geom]);
	return <mesh geometry={geom} material={BAHAN_PERABOT} />;
}

// Di lantai 2: pagar mengelilingi lubang tangga, kecuali mulut lajur tiba.
function PagarLubang() {
	const ruas = [];
	for (const t of TANGGA) {
		const r = rectTangga(t);
		ruas.push({ x: r.x0, z: (r.z0 + r.z1) / 2, lx: 0.04, lz: r.z1 - r.z0 });
		ruas.push({ x: r.x1, z: (r.z0 + r.z1) / 2, lx: 0.04, lz: r.z1 - r.z0 });
		ruas.push({ x: (r.x0 + r.x1) / 2, z: r.z0, lx: r.x1 - r.x0, lz: 0.04 });
		const a = t.lajurNaik[0];
		const b = t.lajurTiba[0];
		ruas.push({ x: (a + b) / 2, z: r.z1, lx: b - a, lz: 0.04 });
	}
	return ruas.map((r, i) => (
		<group key={i} position={[r.x, 0, r.z]}>
			<mesh position-y={0.5}>
				<boxGeometry args={[r.lx, 0.9, r.lz]} />
				<meshStandardMaterial color="#a9c6d6" transparent opacity={0.4} />
			</mesh>
			<mesh position-y={1.0}>
				<boxGeometry args={[r.lx + 0.04, 0.05, r.lz + 0.04]} />
				<meshStandardMaterial color="#6b7178" metalness={0.5} roughness={0.4} />
			</mesh>
		</group>
	));
}

// Kolam ikan koki: bibir batu, air beriak, dan ikan koki yang berenang berputar.
function Kolam() {
	const ikan = useRef([]);
	const air = useRef();
	const k = KOLAM;
	const cx = (k.x0 + k.x1) / 2;
	const cz = (k.z0 + k.z1) / 2;
	const daftar = useMemo(
		() =>
			Array.from({ length: 7 }, (_, i) => ({
				r: 0.5 + (i % 3) * 0.45,
				laju: 0.35 + (i % 4) * 0.12,
				fase: i * 0.9,
				warna: ["#f97316", "#fb923c", "#ffffff", "#ef4444", "#f59e0b"][i % 5],
			})),
		[],
	);
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		daftar.forEach((f, i) => {
			const m = ikan.current[i];
			if (!m) return;
			const a = t * f.laju + f.fase;
			m.position.set(cx + Math.cos(a) * f.r, 0.32, cz + Math.sin(a) * f.r * 1.4);
			m.rotation.y = -a;
		});
		if (air.current) air.current.material.opacity = 0.72 + Math.sin(t * 1.5) * 0.05;
	});
	return (
		<group>
			{[
				[cx, k.z0 + 0.15, k.x1 - k.x0, 0.3],
				[cx, k.z1 - 0.15, k.x1 - k.x0, 0.3],
			].map(([x, z, lx, lz], i) => (
				<mesh key={`h${i}`} position={[x, 0.25, z]}>
					<boxGeometry args={[lx, 0.5, lz]} />
					<meshStandardMaterial color="#8d877c" />
				</mesh>
			))}
			{[
				[k.x0 + 0.15, cz, 0.3, k.z1 - k.z0],
				[k.x1 - 0.15, cz, 0.3, k.z1 - k.z0],
			].map(([x, z, lx, lz], i) => (
				<mesh key={`v${i}`} position={[x, 0.25, z]}>
					<boxGeometry args={[lx, 0.5, lz]} />
					<meshStandardMaterial color="#8d877c" />
				</mesh>
			))}
			<mesh position={[cx, 0.12, cz]} rotation-x={-Math.PI / 2}>
				<planeGeometry args={[k.x1 - k.x0 - 0.6, k.z1 - k.z0 - 0.6]} />
				<meshStandardMaterial color="#123c3a" />
			</mesh>
			{daftar.map((f, i) => (
				<mesh key={i} ref={(m) => (ikan.current[i] = m)} scale={[0.07, 0.05, 0.16]}>
					<sphereGeometry args={[1, 8, 6]} />
					<meshStandardMaterial color={f.warna} />
				</mesh>
			))}
			<mesh ref={air} position={[cx, 0.4, cz]} rotation-x={-Math.PI / 2}>
				<planeGeometry args={[k.x1 - k.x0 - 0.6, k.z1 - k.z0 - 0.6]} />
				<meshStandardMaterial color="#4aa3b8" transparent opacity={0.72} roughness={0.1} metalness={0.2} />
			</mesh>
			{/* batu & tanaman air di tepi */}
			{[
				[k.x0 + 0.5, k.z1 - 0.5],
				[k.x1 - 0.5, k.z0 + 0.6],
			].map(([x, z]) => (
				<mesh key={x} position={[x, 0.55, z]}>
					<icosahedronGeometry args={[0.32, 0]} />
					<meshStandardMaterial color="#3f8f5a" flatShading />
				</mesh>
			))}
		</group>
	);
}

// ---------- pintu ----------

function DaunPintu({ p }) {
	const daun = useRef();
	const buka = useRef(0);
	const kayu = useMemo(() => (p.jenis === "kayu" ? teksturPintuKayu() : null), [p.jenis]);
	const sumbuX = p.sumbu === "x";

	useFrame((_, dt) => {
		let ada = posisi.lantai === p.lantai && Math.hypot(posisi.x - p.x, posisi.z - p.z) < 2.2;
		for (const q of posisiPejalan) if (q && q.lantai === p.lantai && Math.hypot(q.x - p.x, q.z - p.z) < 1.8) ada = true;
		buka.current += ((ada ? 1 : 0) - buka.current) * (1 - Math.exp(-6 * dt));
		if (p.jenis === "kaca") daun.current.position.x = -buka.current * p.lebar * 0.9;
		else daun.current.rotation.y = buka.current * 1.6;
	});

	const w = p.lebar - 0.06;
	return (
		<group position={[p.x, 0, p.z]} rotation-y={sumbuX ? Math.PI / 2 : 0}>
			{p.jenis === "kaca" ? (
				<group ref={daun}>
					<mesh position-y={1.15}>
						<boxGeometry args={[w, 2.3, 0.05]} />
						<meshStandardMaterial color="#6f8a99" transparent opacity={0.4} metalness={0.4} roughness={0.1} />
					</mesh>
					<mesh position={[w / 2 - 0.08, 1.1, 0.05]}>
						<boxGeometry args={[0.03, 0.5, 0.03]} />
						<meshStandardMaterial color="#c9ccce" metalness={0.6} />
					</mesh>
				</group>
			) : (
				// engsel di tepi kiri; daun berayun ke dalam
				<group ref={daun} position-x={-w / 2}>
					<mesh position={[w / 2, 1.12, 0]}>
						<boxGeometry args={[w, 2.24, 0.05]} />
						<meshStandardMaterial map={kayu} />
					</mesh>
				</group>
			)}
		</group>
	);
}

// ---------- ruang rapat ----------

const slideRapat = (nama) => [
	{ judul: "RAPAT KOORDINASI", sub: "Dinas Pemberdayaan Masyarakat dan Desa" },
	{ judul: "EVALUASI CAPAIAN PROGRAM", sub: "Pembahasan per bidang" },
	{ judul: "SELAMAT DATANG", sub: `di Ruang Rapat ${nama}` },
];

function MejaRapat({ m }) {
	return (
		<group position={[m.x, 0, m.z]}>
			<mesh position-y={0.76}>
				<boxGeometry args={[1.7, 0.07, m.panjang]} />
				<meshStandardMaterial color="#4a2c1c" roughness={0.25} metalness={0.1} />
			</mesh>
			{[-1, 1].map((s) => (
				<mesh key={s} position={[0, 0.37, (s * m.panjang) / 3]}>
					<boxGeometry args={[0.9, 0.72, 0.5]} />
					<meshStandardMaterial color="#2e1c12" />
				</mesh>
			))}
			{/* mikrofon meja */}
			{Array.from({ length: Math.floor(m.panjang / 1.3) }, (_, i) =>
				[-0.55, 0.55].map((x) => (
					<mesh key={`${i}${x}`} position={[x, 0.86, -m.panjang / 2 + 0.7 + i * 1.3]}>
						<boxGeometry args={[0.06, 0.14, 0.06]} />
						<meshStandardMaterial color="#222" />
					</mesh>
				)),
			)}
		</group>
	);
}

// ---------- lobi ----------

function Lobi({ statistik }) {
	const kayu = useMemo(() => teksturKayu([2, 1]), []);
	const kayuMeja = useMemo(() => teksturKayu([3, 1]), []);
	const batu = useMemo(() => teksturBatu([3, 1.4]), []);
	const lambang = useMemo(() => {
		const t = new TextureLoader().load("/logo-bogor.png");
		t.colorSpace = SRGBColorSpace;
		return t;
	}, []);
	useEffect(() => () => lambang.dispose(), [lambang]);
	const angka = (v) => (v == null ? "—" : String(v));

	return (
		<group>
			{/* panel kayu di dinding belakang lobi, mengapit dinding sambutan */}
			{[-3.5, 3.5].map((x) => (
				<mesh key={x} position={[x, 1.2, 6.17]}>
					<planeGeometry args={[1.0, 2.4]} />
					<meshStandardMaterial map={kayu} />
				</mesh>
			))}
			{/* dinding sambutan: bingkai batu, panel marmer, lambang, lampu hangat */}
			<mesh position={[0, 1.45, 6.3]}>
				<boxGeometry args={[6.0, 2.9, 0.3]} />
				<meshStandardMaterial map={batu} />
			</mesh>
			<Papan
				posisi={[0, 1.65, 6.46]}
				lebar={4.4}
				tinggi={1.9}
				latar="#ece7df"
				diterangi
				baris={[
					{ teks: "SELAMAT DATANG", ukuran: 0.19, tebal: true, warna: "#2b2b2b", y: 0.38 },
					{ teks: "DI KANTOR", ukuran: 0.12, tebal: true, warna: "#3a3a3a", y: 0.48 },
					{ teks: "DINAS PEMBERDAYAAN", ukuran: 0.14, tebal: true, warna: "#2b2b2b", y: 0.57 },
					{ teks: "MASYARAKAT DAN DESA", ukuran: 0.14, tebal: true, warna: "#2b2b2b", y: 0.65 },
					{ teks: "KABUPATEN BOGOR", ukuran: 0.12, tebal: true, warna: "#3a3a3a", y: 0.73 },
				]}
			/>
			<mesh position={[0, 2.3, 6.47]}>
				<planeGeometry args={[0.38, 0.44]} />
				<meshBasicMaterial map={lambang} transparent toneMapped={false} />
			</mesh>
			{[-2.3, 2.3].map((x) => (
				<mesh key={x} position={[x, 1.65, 6.47]}>
					<boxGeometry args={[0.05, 1.9, 0.02]} />
					<meshBasicMaterial color="#ffe1a0" toneMapped={false} />
				</mesh>
			))}

			{/* meja resepsionis: alas gelap, muka kayu berlampu, atas marmer */}
			<group position={[0, 0, 7.8]}>
				<mesh position-y={0.52}>
					<boxGeometry args={[4.8, 1.04, 0.85]} />
					<meshStandardMaterial color="#2f3237" />
				</mesh>
				<mesh position={[0, 0.52, 0.43]}>
					<planeGeometry args={[4.6, 0.8]} />
					<meshStandardMaterial map={kayuMeja} />
				</mesh>
				<mesh position={[0, 0.96, 0.44]}>
					<boxGeometry args={[4.6, 0.03, 0.01]} />
					<meshBasicMaterial color="#ffe7b0" toneMapped={false} />
				</mesh>
				<mesh position-y={1.07}>
					<boxGeometry args={[5.0, 0.06, 1.0]} />
					<meshStandardMaterial color="#f3f0ea" roughness={0.2} />
				</mesh>
				{[-1.45, 1.45].map((x) => (
					<mesh key={x} position={[x, 0.32, -0.25]} geometry={geometriPerabot("monitor")} material={BAHAN_PERABOT} />
				))}
			</group>

			{/* papan statistik (dinding kanan) & papan panduan (dinding kiri) */}
			<Papan
				posisi={[7.83, 1.75, 8.3]}
				rotasi={-Math.PI / 2}
				lebar={1.9}
				tinggi={1.0}
				aksen="#b8862b"
				bingkai="#7a6a52"
				baris={[
					{ teks: "KABUPATEN BOGOR DALAM ANGKA", ukuran: 0.09, tebal: true, warna: "#b8862b", y: 0.22 },
					{ teks: `${angka(statistik?.kecamatan)} Kecamatan`, ukuran: 0.14, tebal: true, y: 0.46 },
					{ teks: `${angka(statistik?.desa)} Desa · ${angka(statistik?.kelurahan)} Kelurahan`, ukuran: 0.12, tebal: true, y: 0.68 },
					{ teks: "dibina DPMD Kabupaten Bogor", ukuran: 0.07, warna: "#6b7280", y: 0.87 },
				]}
			/>
			<Papan
				posisi={[-7.83, 1.7, 10.4]}
				rotasi={Math.PI / 2}
				lebar={1.6}
				tinggi={1.1}
				aksen="#1f6b50"
				bingkai="#7a6a52"
				baris={[
					{ teks: "PANDUAN PENGUNJUNG", ukuran: 0.09, tebal: true, warna: "#1f6b50", y: 0.2 },
					{ teks: "1. Resepsionis & antrean", ukuran: 0.07, rata: "left", y: 0.4 },
					{ teks: "2. KKD ← pintu kaca → SPKED", ukuran: 0.07, rata: "left", y: 0.55 },
					{ teks: "3. Lantai 2: tangga di lorong", ukuran: 0.07, rata: "left", y: 0.7 },
					{ teks: "Tekan E untuk membaca", ukuran: 0.06, warna: "#6b7280", y: 0.88 },
				]}
			/>
			{/* papan arah di atas pintu kaca */}
			{[
				[-5, "← KKD · TANGGA LT. 2"],
				[5, "SPKED · TOILET →"],
			].map(([x, teks]) => (
				<Papan
					key={x}
					posisi={[x, 2.2, 6.19]}
					lebar={2.0}
					tinggi={0.36}
					latar="#2b2f36"
					baris={[{ teks, ukuran: 0.15, tebal: true, warna: "#f3e2b8", y: 0.52 }]}
				/>
			))}
		</group>
	);
}

// ---------- jendela di sisi dalam dinding luar ----------

function JendelaDalam({ lantai }) {
	const daftar = useMemo(() => {
		const hindar =
			lantai === 0
				? [
						["z", -11.5],
						["z", 11.5],
						["b", 8.9],
						["b", -13.2],
					]
				: [
						["z", -11.5],
						["z", 0],
						["z", 8.4],
						["b", 2.3],
						["b", 10.5],
					];
		const dekat = (w, v) => hindar.some(([d, x]) => d === w && Math.abs(x - v) < 2.2);
		const hasil = [];
		for (const x of [-13.4, -10.0, -5.6, 5.6, 10.0, 13.4]) if (!dekat("z", x)) hasil.push([x, 11.84, Math.PI]);
		for (const x of [-12, -8, -4, 0, 4, 8, 12]) if (!dekat("b", x)) hasil.push([x, -12.84, 0]);
		for (const z of [10, 6, 2, -2, -6, -10]) {
			hasil.push([-14.84, z, Math.PI / 2]);
			hasil.push([14.84, z, -Math.PI / 2]);
		}
		return hasil;
	}, [lantai]);
	const ref = useRef();
	useLayoutEffect(() => {
		const o = new Object3D();
		daftar.forEach(([a, b, r], i) => {
			o.position.set(a, 1.45, b);
			o.rotation.set(0, r, 0);
			o.updateMatrix();
			ref.current.setMatrixAt(i, o.matrix);
		});
		ref.current.instanceMatrix.needsUpdate = true;
		ref.current.computeBoundingSphere();
	}, [daftar]);
	return (
		<instancedMesh ref={ref} args={[null, null, daftar.length]}>
			<planeGeometry args={[2.2, 1.5]} />
			<meshStandardMaterial color="#cfe6f3" emissive="#9cc8e4" emissiveIntensity={0.35} />
		</instancedMesh>
	);
}

// ---------- papan nama ruang & poster ----------

// [teks, warna, x, y, z, rotasi, lebar]
const PAPAN_RUANG = [
	[0, "KKD", "#7c3aed", -9.6, 1.8, 7.14, Math.PI, 1.6],
	[0, "SPKED", "#d97706", 9.6, 1.8, 7.14, Math.PI, 1.6],
	[0, "TOILET", "#475569", 13.04, 2.2, 2.9, -Math.PI / 2, 0.9],
	[0, "AREA BELAKANG · RUANG RAPAT SALAK · ARSIP · MUSHOLA", "#1f6b50", 0.5, 2.2, 1.16, 0, 3.4],
	[0, "← TANGGA KE LANTAI 2", "#1f6b50", -2.3, 1.8, 1.16, 0, 2.2],
	[0, "RUANG RAPAT PANGRANGO", "#7a2e2e", -10.5, 1.9, 0.16, 0, 2.4],
	[0, "RUANG ARSIP", "#5a4637", -2.64, 1.9, -2.4, Math.PI / 2, 1.4],
	[0, "MUSHOLA", "#1f6b4a", -8.3, 2.2, -9.44, 0, 1.2],
	[0, "RUANG RAPAT SALAK", "#7a2e2e", 2.64, 1.9, -4.8, -Math.PI / 2, 2.0],
	[1, "RUANG KEPALA DINAS", "#5a3a24", -8.24, 2.35, 5.75, Math.PI / 2, 1.9],
	[1, "PROLAP", "#0891b2", 2.1, 1.8, 7.14, Math.PI, 1.6],
	[1, "KEUANGAN", "#16a34a", 10.6, 1.8, 7.14, Math.PI, 1.8],
	[1, "TOILET", "#475569", 12.64, 2.2, 5.75, -Math.PI / 2, 0.9],
	[1, "PMD", "#db2777", 1.4, 1.8, 3.96, 0, 1.6],
	[1, "PMD", "#db2777", -3.7, 2.35, -4.16, Math.PI, 1.2],
	[1, "GUDANG ARSIP", "#5a4637", -9.34, 2.35, -8.75, Math.PI / 2, 1.3],
	[1, "RUANG RAPAT HALIMUN", "#7a2e2e", -7.75, 2.35, 3.96, 0, 1.1],
	[1, "DAPUR", "#8a5a2b", -7.2, 2.2, -9.44, 0, 1.0],
	[1, "SEKRETARIAT", "#2563eb", 4.6, 2.35, -5.84, 0, 1.6],
	[1, "PEMDES", "#0f766e", 9, 2.35, 4.66, 0, 1.2],
];

function PosterRuang({ ruang }) {
	const { npc, warna, singkatan, nama, rect, poster } = ruang;
	const [dx, dz] = npc.arah;
	const jarak = dz < 0 ? rect.z1 - npc.z : dz > 0 ? npc.z - rect.z0 : dx > 0 ? npc.x - rect.x0 : rect.x1 - npc.x;
	// `poster` menimpa letak bawaan (dinding tepat di belakang petugas).
	return (
		<Papan
			posisi={poster ? [poster.x, 1.7, poster.z] : [npc.x - dx * (jarak - 0.17), 1.7, npc.z - dz * (jarak - 0.17)]}
			rotasi={poster ? poster.rot : Math.atan2(dx, dz)}
			lebar={2.8}
			tinggi={0.95}
			latar={warna}
			baris={[
				{ teks: singkatan, ukuran: 0.34, tebal: true, warna: "#ffffff", y: 0.42 },
				{ teks: nama, ukuran: 0.1, warna: "rgba(255,255,255,.88)", y: 0.8 },
			]}
		/>
	);
}

// Sajadah mushola (instanced) + rak.
function Sajadah() {
	const ref = useRef();
	useLayoutEffect(() => {
		const o = new Object3D();
		SAJADAH.forEach((s, i) => {
			o.position.set(s.x, 0.02, s.z);
			o.rotation.set(-Math.PI / 2, 0, 0);
			o.updateMatrix();
			ref.current.setMatrixAt(i, o.matrix);
		});
		ref.current.instanceMatrix.needsUpdate = true;
		ref.current.computeBoundingSphere();
	}, []);
	return (
		<instancedMesh ref={ref} args={[null, null, SAJADAH.length]}>
			<planeGeometry args={[0.7, 1.15]} />
			<meshStandardMaterial color="#1f6b4a" />
		</instancedMesh>
	);
}

// ---------- karpet & lantai per area ----------

const KARPET_RAPAT = "#5b2b2b";

function LantaiArea({ lantai }) {
	const daftar = [];
	if (lantai === 0) {
		daftar.push([LOBI.rect, teksturMarmer]);
		daftar.push([AREA.mushola.rect, null, "#2f6e4f"]);
		daftar.push([AREA.pangrango.rect, null, KARPET_RAPAT]);
		daftar.push([AREA.salak.rect, null, KARPET_RAPAT]);
		daftar.push([AREA.toilet1.rect, teksturKeramik, "#dfe7ec"]);
		daftar.push([AREA.arsip.rect, teksturKeramik, "#e9e2d2"]);
		daftar.push([{ x0: -15, x1: 15, z0: -13, z1: 12 }, teksturKeramik, "#ffffff", 0.004]);
	} else {
		daftar.push([AREA.kadis.rect, null, "#4b3a2a"]);
		daftar.push([AREA.halimun.rect, null, KARPET_RAPAT]);
		daftar.push([AREA.toilet2.rect, teksturKeramik, "#dfe7ec"]);
	}
	return daftar.map(([rect, map, warna, y], i) => <Lantai key={i} rect={rect} map={map} warna={warna} y={y ?? 0.012} />);
}

export default function Gedung({ daftarDinding, statistik }) {
	return (
		<group>
			<Tangga />

			<GrupLantai lantai={0}>
				<LantaiArea lantai={0} />
				<Dinding lantai={0} daftarRef={daftarDinding} />
				<PerabotInstans lantai={0} />
				<JendelaDalam lantai={0} />
				<Lobi statistik={statistik} />
				<Sajadah />
				{MEJA_RAPAT.filter((m) => m.lantai === 0).map((m, i) => (
					<MejaRapat key={i} m={m} />
				))}
				<Videotron posisi={[8.9, 1.5, -12.83]} lebar={6.0} tinggi={2.4} slide={slideRapat("Salak")} />
				<Videotron posisi={[-10.5, 1.45, -6.43]} lebar={4.0} tinggi={1.8} slide={slideRapat("Pangrango")} />
				<Kolam />
			</GrupLantai>

			<GrupLantai lantai={1}>
				<PelatLantai2 />
				<LantaiArea lantai={1} />
				<Dinding lantai={1} daftarRef={daftarDinding} />
				<PerabotInstans lantai={1} />
				<JendelaDalam lantai={1} />
				<PagarLubang />
				{MEJA_RAPAT.filter((m) => m.lantai === 1).map((m, i) => (
					<MejaRapat key={i} m={m} />
				))}
				<Videotron posisi={[-11.0, 1.5, -5.43]} lebar={4.4} tinggi={2.0} slide={slideRapat("Halimun")} />
			</GrupLantai>

			{[0, 1].map((l) => (
				<GrupLantai key={l} lantai={l}>
					{RUANGAN.filter((r) => r.lantai === l).map((r) => (
						<group key={r.id}>
							<PosterRuang ruang={r} />
							{/* karpet di depan meja layanan, berwarna bidang */}
							<mesh
								rotation-x={-Math.PI / 2}
								position={[r.npc.x + r.npc.arah[0] * 2.7, 0.02, r.npc.z + r.npc.arah[1] * 2.7]}
							>
								<planeGeometry args={r.npc.arah[0] ? [2.2, 2.6] : [2.6, 2.2]} />
								<meshStandardMaterial color={r.warna} transparent opacity={0.28} />
							</mesh>
						</group>
					))}
					{PAPAN_RUANG.filter((p) => p[0] === l).map(([, teks, warna, x, y, z, rot, lebar]) => (
						<Papan
							key={teks + x}
							posisi={[x, y, z]}
							rotasi={rot}
							lebar={lebar}
							tinggi={0.36}
							latar="#ffffff"
							aksen={warna}
							baris={[{ teks, ukuran: 0.15, tebal: true, warna, y: 0.58 }]}
						/>
					))}
					{DAUN_PINTU.filter((p) => p.lantai === l).map((p, i) => (
						<DaunPintu key={i} p={p} />
					))}
				</GrupLantai>
			))}
		</group>
	);
}
