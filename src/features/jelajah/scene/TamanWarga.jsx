import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Matrix4, MeshStandardMaterial } from "three";
import AreaTampak from "./AreaTampak";
import Gabung from "./Gabung";
import MainBasket from "./MainBasket";
import OrangInstans from "./OrangInstans";
import { lapanganBebas } from "../basket";
import Papan from "./Papan";
import Tokoh from "./Tokoh";
import { penampilanWarga } from "./layout";
import { suasana } from "./suasana";
import {
	AIR_MANCUR, AYUNAN, BANGKU_TAMAN, JALUR_ANTAR_TAMAN, JALUR_JOGGING, JUNGKAT, LAMPU_TAMAN, LAPANGAN, PAPAN_TAMAN, PENONTON_TRIBUN, PEROSOTAN,
	PETAK_BUNGA, POHON_TAMAN, RING_BASKET, RUMPUT_TAMAN, SAUNG, TAMAN_BERMAIN, TRIBUN,
} from "./tamanWargaData";

// Taman Warga: taman air mancur, lapangan basket, dan taman bermain di lahan kosong barat
// Kolam Monster. Benda diam dibungkus <Gabung> (beberapa draw call saja); yang bergerak
// (semburan, ayunan, lampu malam, keramaian) berdiri sendiri. y relatif tanah halaman.

const Kotak = ({ p, s, w, r = 0, kasar = 0.85 }) => (
	<mesh position={p} rotation-y={r}>
		<boxGeometry args={s} />
		<meshStandardMaterial color={w} roughness={kasar} />
	</mesh>
);
const Tiang = ({ p, r, t, w }) => (
	<mesh position={[p[0], p[1] + t / 2, p[2]]}>
		<cylinderGeometry args={[r, r, t, 8]} />
		<meshStandardMaterial color={w} roughness={0.7} />
	</mesh>
);

function PohonTaman({ x, z, i }) {
	const tinggi = 2.2 + (i % 3) * 0.5;
	return (
		<group position={[x, 0, z]}>
			<Tiang p={[0, 0, 0]} r={0.18} t={tinggi} w="#4a2c17" />
			<mesh position={[0, tinggi + 1.1, 0]} rotation-y={i}>
				<icosahedronGeometry args={[1.7 + (i % 2) * 0.4, 0]} />
				<meshStandardMaterial color={i % 2 ? "#2f7d3b" : "#3f8f45"} roughness={0.95} flatShading />
			</mesh>
		</group>
	);
}

function Bangku({ x, z, rot }) {
	return (
		<group position={[x, 0, z]} rotation-y={rot}>
			<Kotak p={[0, 0.45, 0]} s={[1.5, 0.06, 0.45]} w="#8b5a2b" />
			<Kotak p={[0, 0.72, -0.2]} s={[1.5, 0.3, 0.05]} w="#8b5a2b" />
			{[-0.65, 0.65].map((dx) => (
				<Kotak key={dx} p={[dx, 0.22, 0]} s={[0.07, 0.44, 0.4]} w="#374151" />
			))}
		</group>
	);
}

// ---------- A. Taman air mancur ----------

function TamanAir() {
	const R = RUMPUT_TAMAN;
	const A = AIR_MANCUR;
	const bunga = useMemo(
		() =>
			PETAK_BUNGA.flatMap(([x, z, lx, lz, warna], n) =>
				Array.from({ length: 8 }, (_, i) => ({ x: x - lx / 2 + 0.25 + (i % 4) * ((lx - 0.5) / 3), z: z - lz / 4 + Math.floor(i / 4) * (lz / 2), warna, k: n * 8 + i })),
			),
		[],
	);
	return (
		<group>
			<Gabung>
				<Kotak p={[(R.x0 + R.x1) / 2, 0.025, (R.z0 + R.z1) / 2]} s={[R.x1 - R.x0, 0.05, R.z1 - R.z0]} w="#4f9d3a" kasar={1} />
				{/* kolam air mancur: bibir batu, air, tugu tengah */}
				<mesh position={[A.x, 0.2, A.z]}>
					<cylinderGeometry args={[A.rBibir, A.rBibir, 0.4, 28]} />
					<meshStandardMaterial color="#9ca3af" roughness={0.9} />
				</mesh>
				<mesh position={[A.x, 0.36, A.z]}>
					<cylinderGeometry args={[A.r, A.r, 0.4, 28]} />
					<meshStandardMaterial color="#38bdf8" roughness={0.2} metalness={0.1} />
				</mesh>
				<mesh position={[A.x, 0.55, A.z]}>
					<cylinderGeometry args={[0.45, 0.6, 0.7, 12]} />
					<meshStandardMaterial color="#d1d5db" roughness={0.8} />
				</mesh>
				{PETAK_BUNGA.map(([x, z, lx, lz], i) => (
					<Kotak key={i} p={[x, 0.12, z]} s={[lx, 0.14, lz]} w="#5b3a1e" kasar={1} />
				))}
				{bunga.map((b) => (
					<mesh key={b.k} position={[b.x, 0.3, b.z]}>
						<sphereGeometry args={[0.12, 6, 5]} />
						<meshStandardMaterial color={b.warna} roughness={0.9} />
					</mesh>
				))}
				{BANGKU_TAMAN.slice(0, 4).map((b, i) => (
					<Bangku key={i} {...b} />
				))}
				{LAMPU_TAMAN.map((l, i) => (
					<Tiang key={i} p={[l.x, 0, l.z]} r={0.06} t={2.6} w="#1f2937" />
				))}
				{POHON_TAMAN.map(([x, z], i) => (
					<PohonTaman key={i} x={x} z={z} i={i} />
				))}
			</Gabung>
			<LampuTaman />
			<Semburan />
		</group>
	);
}

// kepala lampu menyala saat malam
function LampuTaman() {
	const bahan = useMemo(() => new MeshStandardMaterial({ color: "#fef3c7", emissive: "#fde68a", emissiveIntensity: 0 }), []);
	useFrame(() => {
		bahan.emissiveIntensity = suasana.malam * 1.6;
	});
	return LAMPU_TAMAN.map((l, i) => (
		<mesh key={i} position={[l.x, 2.7, l.z]} material={bahan}>
			<sphereGeometry args={[0.2, 10, 8]} />
		</mesh>
	));
}

const N_TETES = 14;
function Semburan() {
	const tetes = useRef();
	const tiang = useRef();
	const m = useMemo(() => new Matrix4(), []);
	const { x, z } = AIR_MANCUR;
	useFrame(({ clock, camera }) => {
		if (Math.hypot(camera.position.x - x, camera.position.z - z) > 70) return;
		const t = clock.elapsedTime;
		tiang.current.scale.y = 0.85 + Math.sin(t * 2.4) * 0.15;
		for (let i = 0; i < N_TETES; i++) {
			const u = (t * 0.7 + i / N_TETES) % 1;
			const a = (i / N_TETES) * Math.PI * 2;
			const jarak = 0.4 + 1.9 * u;
			tetes.current.setMatrixAt(i, m.makeTranslation(Math.cos(a) * jarak, 0.95 + 2.2 * (1 - (2 * u - 1) ** 2), Math.sin(a) * jarak));
		}
		tetes.current.instanceMatrix.needsUpdate = true;
	});
	return (
		<group position={[x, 0, z]}>
			<mesh ref={tiang} position={[0, 1.7, 0]}>
				<cylinderGeometry args={[0.04, 0.12, 1.8, 8]} />
				<meshStandardMaterial color="#bae6fd" transparent opacity={0.6} />
			</mesh>
			<instancedMesh ref={tetes} args={[undefined, undefined, N_TETES]} frustumCulled={false}>
				<sphereGeometry args={[0.07, 6, 5]} />
				<meshStandardMaterial color="#e0f2fe" transparent opacity={0.8} />
			</instancedMesh>
		</group>
	);
}

// ---------- B. Lapangan basket ----------

function Ring({ x, z, arah }) {
	return (
		<group position={[x, 0, z]} rotation-y={arah > 0 ? 0 : Math.PI}>
			<Tiang p={[0, 0, 0]} r={0.07} t={3.3} w="#374151" />
			<Kotak p={[0, 3.3, 0.18]} s={[1.8, 1.05, 0.05]} w="#f8fafc" kasar={0.4} />
			<Kotak p={[0, 3.2, 0.2]} s={[0.6, 0.45, 0.01]} w="#dc2626" kasar={0.5} />
			<mesh position={[0, 3.05, 0.5]} rotation-x={Math.PI / 2}>
				<torusGeometry args={[0.23, 0.022, 6, 16]} />
				<meshStandardMaterial color="#f97316" roughness={0.5} />
			</mesh>
		</group>
	);
}

function Lapangan() {
	const L = LAPANGAN;
	const cx = (L.x0 + L.x1) / 2;
	const cz = (L.z0 + L.z1) / 2;
	const lebar = L.x1 - L.x0 - 0.8;
	const panjang = L.z1 - L.z0 - 0.8;
	const garis = (x, z, lx, lz, k) => <Kotak key={k} p={[x, 0.072, z]} s={[lx, 0.012, lz]} w="#f8fafc" kasar={0.6} />;
	return (
		<Gabung>
			<Kotak p={[cx, 0.03, cz]} s={[L.x1 - L.x0, 0.06, L.z1 - L.z0]} w="#15803d" kasar={0.8} />
			{[L.z0 + 2.9, L.z1 - 2.9].map((z) => (
				<Kotak key={z} p={[cx, 0.064, z]} s={[4.8, 0.008, 5.8]} w="#b91c1c" kasar={0.8} />
			))}
			{/* garis pinggir, tengah, lemparan bebas, dan lingkaran tengah */}
			{garis(cx, L.z0 + 0.4, lebar, 0.08, "a")}
			{garis(cx, L.z1 - 0.4, lebar, 0.08, "b")}
			{garis(L.x0 + 0.4, cz, 0.08, panjang, "c")}
			{garis(L.x1 - 0.4, cz, 0.08, panjang, "d")}
			{garis(cx, cz, lebar, 0.08, "e")}
			{garis(cx, L.z0 + 5.8, 4.8, 0.08, "f")}
			{garis(cx, L.z1 - 5.8, 4.8, 0.08, "g")}
			<mesh position={[cx, 0.074, cz]} rotation-x={-Math.PI / 2}>
				<ringGeometry args={[1.7, 1.78, 28]} />
				<meshStandardMaterial color="#f8fafc" roughness={0.6} />
			</mesh>
			{/* busur garis tiga angka */}
			<mesh position={[cx, 0.074, L.z0 + 0.95]} rotation-x={-Math.PI / 2}>
				<ringGeometry args={[5.92, 6, 28, 1, Math.PI + 0.35, Math.PI - 0.7]} />
				<meshStandardMaterial color="#f8fafc" roughness={0.6} />
			</mesh>
			<mesh position={[cx, 0.074, L.z1 - 0.95]} rotation-x={-Math.PI / 2}>
				<ringGeometry args={[5.92, 6, 28, 1, 0.35, Math.PI - 0.7]} />
				<meshStandardMaterial color="#f8fafc" roughness={0.6} />
			</mesh>
			{RING_BASKET.map((r, i) => (
				<Ring key={i} {...r} />
			))}
			{/* tribun kecil di sisi timur */}
			<Kotak p={[(TRIBUN.x0 + TRIBUN.x1) / 2, 0.15, (TRIBUN.z0 + TRIBUN.z1) / 2]} s={[TRIBUN.x1 - TRIBUN.x0, 0.3, TRIBUN.z1 - TRIBUN.z0]} w="#9ca3af" kasar={0.9} />
			<Kotak p={[-51.3, 0.47, (TRIBUN.z0 + TRIBUN.z1) / 2]} s={[0.55, 0.06, TRIBUN.z1 - TRIBUN.z0 - 0.2]} w="#2563eb" kasar={0.6} />
			<Kotak p={[-50.4, 0.8, (TRIBUN.z0 + TRIBUN.z1) / 2]} s={[0.06, 0.6, TRIBUN.z1 - TRIBUN.z0 - 0.2]} w="#1e40af" kasar={0.6} />
		</Gabung>
	);
}

function Penonton() {
	const daftar = useMemo(() => PENONTON_TRIBUN.map((p) => ({ ...p, penampilan: penampilanWarga() })), []);
	return daftar.map((p, i) => (
		<group key={i} position={[p.x, 0.02, p.z]} rotation-y={p.rot}>
			<Tokoh penampilan={p.penampilan} pose="duduk" aktivitas="menunggu" bayangan={false} />
		</group>
	));
}

// ---------- C. Taman bermain ----------

function Ayunan() {
	const A = AYUNAN;
	const anak = useMemo(() => [penampilanWarga(), penampilanWarga()], []);
	const pivot = useRef([]);
	useFrame(({ clock, camera }) => {
		if (Math.hypot(camera.position.x - A.x, camera.position.z - A.z) > 60) return;
		const t = clock.elapsedTime;
		pivot.current.forEach((g, i) => g && (g.rotation.x = Math.sin(t * 1.7 + i * 1.6) * 0.45));
	});
	return (
		<group position={[A.x, 0, A.z]}>
			{[-0.8, 0.8].map((dx, i) => (
				<group key={dx} position={[dx, A.tinggi, 0]} ref={(g) => (pivot.current[i] = g)}>
					{[-0.22, 0.22].map((c) => (
						<Kotak key={c} p={[c, -0.9, 0]} s={[0.02, 1.8, 0.02]} w="#6b7280" />
					))}
					<Kotak p={[0, -1.82, 0]} s={[0.55, 0.05, 0.25]} w="#facc15" kasar={0.6} />
					<group position={[0, -2.13, 0.02]} scale={0.7}>
						<Tokoh penampilan={anak[i]} pose="duduk" aktivitas="menunggu" bayangan={false} />
					</group>
				</group>
			))}
		</group>
	);
}

function RangkaAyunan() {
	const A = AYUNAN;
	return (
		<group position={[A.x, 0, A.z]}>
			<Kotak p={[0, A.tinggi, 0]} s={[A.lebar, 0.1, 0.1]} w="#dc2626" kasar={0.6} />
			{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Tiang key={`${sx}${sz}`} p={[(sx * A.lebar) / 2, 0, sz * 0.6]} r={0.05} t={A.tinggi} w="#dc2626" />))}
		</group>
	);
}

function Perosotan() {
	return (
		<group position={[PEROSOTAN.x, 0, PEROSOTAN.z]}>
			<Kotak p={[0, 1.5, 0]} s={[0.9, 0.06, 0.9]} w="#2563eb" kasar={0.6} />
			{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Tiang key={`${sx}${sz}`} p={[sx * 0.4, 0, sz * 0.4]} r={0.05} t={1.5} w="#1e40af" />))}
			{/* anak tangga di sisi +z */}
			{[0.3, 0.7, 1.1].map((y) => (
				<Kotak key={y} p={[0, y, 0.5 + (0.9 - y) * 0.15]} s={[0.7, 0.04, 0.12]} w="#fbbf24" kasar={0.6} />
			))}
			{/* papan luncur ke arah -z */}
			<mesh position={[0, 0.8, -1.925]} rotation-x={-0.443}>
				<boxGeometry args={[0.7, 0.05, 3.27]} />
				<meshStandardMaterial color="#ef4444" roughness={0.4} />
			</mesh>
			{[-0.35, 0.35].map((x) => (
				<mesh key={x} position={[x, 0.86, -1.925]} rotation-x={-0.443}>
					<boxGeometry args={[0.05, 0.12, 3.27]} />
					<meshStandardMaterial color="#b91c1c" roughness={0.5} />
				</mesh>
			))}
		</group>
	);
}

function Jungkat() {
	return (
		<group position={[JUNGKAT.x, 0, JUNGKAT.z]}>
			<mesh position={[0, 0.35, 0]}>
				<boxGeometry args={[0.25, 0.7, 0.35]} />
				<meshStandardMaterial color="#7c3aed" roughness={0.6} />
			</mesh>
			<mesh position={[0, 0.7, 0]} rotation-z={0.17}>
				<boxGeometry args={[JUNGKAT.panjang, 0.08, 0.3]} />
				<meshStandardMaterial color="#f59e0b" roughness={0.6} />
			</mesh>
			{/* pegangan di kedua ujung papan */}
			{[-1, 1].map((s) => (
				<Kotak key={s} p={[s * 1.25, 0.7 + s * 1.25 * 0.17 + 0.2, 0]} s={[0.04, 0.3, 0.3]} w="#374151" />
			))}
		</group>
	);
}

function Saung() {
	const S = SAUNG.sisi;
	return (
		<group position={[SAUNG.x, 0, SAUNG.z]}>
			<Kotak p={[0, 0.03, 0]} s={[S, 0.06, S]} w="#a8a29e" kasar={0.9} />
			{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Tiang key={`${sx}${sz}`} p={[(sx * (S - 0.4)) / 2, 0, (sz * (S - 0.4)) / 2]} r={0.1} t={2.5} w="#7c4a1e" />))}
			<mesh position={[0, 3.05, 0]} rotation-y={Math.PI / 4}>
				<coneGeometry args={[S * 0.95, 1.1, 4]} />
				<meshStandardMaterial color="#92400e" roughness={0.95} flatShading />
			</mesh>
		</group>
	);
}

function TamanBermain() {
	const T = TAMAN_BERMAIN;
	return (
		<group>
			<Gabung>
				<Kotak p={[(T.x0 + 0.8 + T.x1) / 2, 0.02, (T.z0 + T.z1) / 2]} s={[T.x1 - T.x0 - 0.8, 0.04, T.z1 - T.z0]} w="#e7d3a0" kasar={1} />
				{BANGKU_TAMAN.slice(4).map((b, i) => (
					<Bangku key={i} {...b} />
				))}
				<RangkaAyunan />
				<Perosotan />
				<Jungkat />
				<Saung />
			</Gabung>
			{/* tokoh mahal digambar, jadi hanya saat kamera cukup dekat */}
			<AreaTampak x={AYUNAN.x} z={AYUNAN.z} jarak={45}>
				<Ayunan />
			</AreaTampak>
		</group>
	);
}

// ---------- keramaian ----------

const BAJU = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0ea5e9", "#db2777", "#475569"];
const BAJU_OLAHRAGA = ["#22d3ee", "#f43f5e", "#a3e635", "#f97316", "#facc15"];
const CELANA_OLAHRAGA = ["#111827", "#1e3a8a", "#0f172a"];
const KULIT = ["#e2b48c", "#d3a378", "#c08d63", "#b07a50"];
const RAMBUT = ["#15100c", "#21180f", "#2e2116", "#3a2a1c"];
const biji = (s) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const sudutDekat = (dari, ke) => dari + Math.atan2(Math.sin(ke - dari), Math.cos(ke - dari));

function Keramaian() {
	const agen = useMemo(() => {
		const r = biji(777);
		const pilih = (d) => d[Math.floor(r() * d.length)];
		const dasar = (extra) => ({ x: 0, y: 0.06, z: 0, rot: 0, fase: r() * 6, gerak: 1, tampak: true, baju: pilih(BAJU), celana: pilih(["#1f2937", "#334155", "#111827"]), kulit: pilih(KULIT), rambut: pilih(RAMBUT), ...extra });
		const hasil = [];
		// 5 pelari mengelilingi jalan melingkar (dua arah), tersebar sepanjang jalur
		for (let i = 0; i < 5; i++) {
			const awal = JALUR_JOGGING[(i * 2) % JALUR_JOGGING.length];
			// baju olahraga: kaos cerah lengan pendek & celana pendek (lengan bawah dan betis warna kulit)
			const kulit = pilih(KULIT);
			hasil.push(dasar({ jenis: "jogging", rute: JALUR_JOGGING, i: (i * 2) % JALUR_JOGGING.length, arah: i % 2 ? -1 : 1, laju: 2.2 + r() * 0.8, x: awal[0], z: awal[1], baju: BAJU_OLAHRAGA[i], celana: pilih(CELANA_OLAHRAGA), kulit, betisWarna: kulit, lenganWarna: kulit }));
		}
		// 3 pemain basket berkeliaran di lapangan
		for (let i = 0; i < 3; i++) hasil.push(dasar({ jenis: "basket", x: LAPANGAN.x0 + 2 + r() * 8, z: LAPANGAN.z0 + 2 + r() * 13, tx: 0, tz: 0, jeda: r() * 2, laju: 1.5 + r() * 0.8 }));
		// 2 orang berjalan bolak-balik antara kedua taman
		for (let i = 0; i < 2; i++) {
			const awal = JALUR_ANTAR_TAMAN[i * 2];
			hasil.push(dasar({ jenis: "jalan", rute: JALUR_ANTAR_TAMAN, i: i * 2, arah: i ? -1 : 1, laju: 1.2 + r() * 0.3, x: awal[0], z: awal[1] }));
		}
		return hasil;
	}, []);

	useFrame(({ camera }, dt0) => {
		if (Math.hypot(camera.position.x + 50, camera.position.z - 10) > 130) return;
		const dt = Math.min(dt0, 0.1);
		for (const a of agen) {
			if (a.jenis === "basket") a.tampak = lapanganBebas();
			let tx;
			let tz;
			if (a.jenis === "basket") {
				if (a.jeda > 0) {
					a.jeda -= dt;
					a.gerak = 0;
					continue;
				}
				if (!a.tx || Math.hypot(a.tx - a.x, a.tz - a.z) < 0.3) {
					a.tx = LAPANGAN.x0 + 1.2 + Math.random() * (LAPANGAN.x1 - LAPANGAN.x0 - 2.4);
					a.tz = LAPANGAN.z0 + 1.5 + Math.random() * (LAPANGAN.z1 - LAPANGAN.z0 - 3);
					a.jeda = 0.4 + Math.random() * 1.6;
					a.gerak = 0;
					continue;
				}
				tx = a.tx;
				tz = a.tz;
			} else {
				// menuju titik rute berikutnya: jalur jogging melingkar, jalur antar-taman bolak-balik
				const n = a.rute.length;
				let tujuan = a.i + a.arah;
				if (a.jenis === "jalan") {
					if (tujuan < 0 || tujuan > n - 1) {
						a.arah *= -1;
						tujuan = a.i + a.arah;
					}
				} else tujuan = (tujuan + n) % n;
				[tx, tz] = a.rute[tujuan];
				if (Math.hypot(tx - a.x, tz - a.z) < 0.4) a.i = tujuan;
			}
			const dx = tx - a.x;
			const dz = tz - a.z;
			const d = Math.hypot(dx, dz) || 1;
			const langkah = Math.min(d, a.laju * dt);
			a.x += (dx / d) * langkah;
			a.z += (dz / d) * langkah;
			a.rot = sudutDekat(a.rot, Math.atan2(dx, dz));
			a.gerak = 1;
			a.fase += dt * (a.jenis === "jogging" ? 9 : 6.5) * (a.laju / 1.5);
		}
	});

	return <OrangInstans agen={agen} />;
}

// papan nama berkaki di tepi utara rumput, menghadap ke selatan (arah kantor)
function PapanNama() {
	const P = PAPAN_TAMAN;
	return (
		<group position={[P.x, 0, P.z]} rotation-y={Math.PI}>
			<Gabung>
				{[-1, 1].map((s) => (
					<Tiang key={s} p={[(s * P.lebar) / 2 - s * 0.2, 0, 0]} r={0.07} t={P.kaki + P.tinggi} w="#5b3a1e" />
				))}
			</Gabung>
			<Papan
				posisi={[0, P.kaki + P.tinggi / 2, 0.09]}
				lebar={P.lebar}
				tinggi={P.tinggi}
				latar="#14532d"
				aksen="#facc15"
				bingkai="#3b2a1a"
				diterangi
				baris={[
					{ teks: "TAMAN WARGA", ukuran: 0.3, tebal: true, warna: "#fef9c3", y: 0.45 },
					{ teks: "Air mancur · Lapangan basket · Taman bermain", ukuran: 0.1, warna: "#bbf7d0", y: 0.75 },
				]}
			/>
		</group>
	);
}

export default function TamanWarga() {
	return (
		<group name="taman-warga">
			<TamanAir />
			<Lapangan />
			<MainBasket />
			<AreaTampak x={-51} z={19} jarak={45}>
				<Penonton />
			</AreaTampak>
			<TamanBermain />
			<Keramaian />
			<PapanNama />
		</group>
	);
}
