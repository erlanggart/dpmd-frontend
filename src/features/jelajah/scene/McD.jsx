import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import { posisi } from "../jelajahStore";
import Gabung from "./Gabung";
import { JENDELA_DRIVE, KIOS_MCD, KONTER_MCD, LAHAN_MCD, MCD, MEJA_MCD, PAPAN_DRIVE, TIANG_MCD } from "./gedungKhusus";
import { KURSI_MCD, penampilanWarga } from "./layout";
import Papan from "./Papan";
import { usePudar } from "./pudar";
import { suasana } from "./suasana";
import Tokoh from "./Tokoh";

// McD Tegar Beriman: restoran cepat saji satu lantai di lahan sendiri — halaman parkir ke
// arah jalan, tiang papan berlogo lengkung kuning, jendela drive-thru di sisi barat. Di dalam:
// konter pesan & papan menu, kios pesan mandiri, meja-meja dua kursi. Dipasang di grup halaman.

const KUNING = "#ffbc0d";
const MERAH = "#db0007";
const BAHAN_KACA = new MeshStandardMaterial({ color: "#a5c8e4", transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.3, emissive: "#fff2cc", emissiveIntensity: 0 });
const BAHAN_LOGO = new MeshStandardMaterial({ color: KUNING, emissive: KUNING, emissiveIntensity: 0.15, roughness: 0.4 });
const KRU = { seragam: "warga", perempuan: false, kulit: "#c68d5e", rambut: "#1a130d", baju: "#1f2937", celana: "#111827", topi: "#1f2937" };
const KRU2 = { seragam: "warga", perempuan: true, jilbab: "#111827", kulit: "#d3a378", rambut: "#21180f", baju: "#1f2937", celana: "#111827" };

// Logo lengkung kuning: dua busur setengah lingkaran berdampingan + kaki tegak.
function Lengkung({ posisi: pos, skala = 1, rotasi = 0 }) {
	return (
		<group position={pos} rotation-y={rotasi} scale={[skala, skala * 1.5, skala]}>
			{[-0.5, 0.5].map((x) => (
				<group key={x} position-x={x}>
					<mesh material={BAHAN_LOGO} position-y={0.5}>
						<torusGeometry args={[0.5, 0.1, 8, 20, Math.PI]} />
					</mesh>
					{[-0.5, 0.5].map((dx) => (
						<mesh key={dx} material={BAHAN_LOGO} position={[dx, 0.25, 0]}>
							<boxGeometry args={[0.2, 0.5, 0.2]} />
						</mesh>
					))}
				</group>
			))}
		</group>
	);
}

function Cangkang({ daftarDinding }) {
	const grup = usePudar(daftarDinding);
	const b = MCD;
	const lebar = b.x1 - b.x0;
	const dalam = b.z1 - b.z0;
	const cx = (b.x0 + b.x1) / 2;
	const cz = (b.z0 + b.z1) / 2;
	return (
		<group ref={grup}>
			{/* dinding belakang & samping bata merah, dinding muka di atas kaca */}
			<mesh position={[cx, b.tinggi / 2, b.z0 + 0.12]}>
				<boxGeometry args={[lebar, b.tinggi, 0.25]} />
				<meshStandardMaterial color="#8b2c22" />
			</mesh>
			{[b.x0 + 0.12, b.x1 - 0.12].map((x) => (
				<mesh key={x} position={[x, b.tinggi / 2, cz]}>
					<boxGeometry args={[0.25, b.tinggi, dalam]} />
					<meshStandardMaterial color="#8b2c22" />
				</mesh>
			))}
			<mesh position={[cx, 3.85, b.z1 - 0.12]}>
				<boxGeometry args={[lebar, 2.7, 0.25]} />
				<meshStandardMaterial color="#3b3b3b" />
			</mesh>
			{/* atap datar + pita merah mengelilingi (gaya restoran modern) */}
			<mesh position={[cx, b.tinggi + 0.1, cz]}>
				<boxGeometry args={[lebar + 0.3, 0.2, dalam + 0.3]} />
				<meshStandardMaterial color="#d6d3d1" />
			</mesh>
			<mesh position={[cx, b.tinggi + 0.55, cz]}>
				<boxGeometry args={[lebar + 0.5, 0.7, dalam + 0.5]} />
				<meshStandardMaterial color={MERAH} />
			</mesh>
			{/* plafon dalam */}
			<mesh position={[cx, b.tinggi - 0.05, cz]} rotation-x={Math.PI / 2}>
				<planeGeometry args={[lebar - 0.5, dalam - 0.5]} />
				<meshStandardMaterial color="#f5f5f4" />
			</mesh>
		</group>
	);
}

export default function McD({ daftarDinding }) {
	const b = MCD;
	const L = LAHAN_MCD;
	const lebar = b.x1 - b.x0;
	const dalam = b.z1 - b.z0;
	const cx = (b.x0 + b.x1) / 2;
	const cz = (b.z0 + b.z1) / 2;
	const pintuKiri = useRef();
	const pintuKanan = useRef();
	const buka = useRef(0);
	const lebarPintu = (b.pintu.x1 - b.pintu.x0) / 2;
	const pelanggan = useMemo(() => KURSI_MCD.filter((k) => k.npc).map((k) => ({ ...k, penampilan: penampilanWarga() })), []);

	useFrame((_, dt) => {
		BAHAN_KACA.emissiveIntensity = 0.12 + suasana.malam * 0.55;
		BAHAN_LOGO.emissiveIntensity = 0.15 + suasana.malam * 0.9;
		// pintu kaca geser membuka sendiri
		const dekat = Math.abs(posisi.x - cx) < 2.6 && Math.abs(posisi.z - b.pintu.z) < 2.6;
		buka.current += ((dekat ? 1 : 0) - buka.current) * (1 - Math.exp(-6 * dt));
		const geser = buka.current * (lebarPintu - 0.05);
		pintuKiri.current.position.x = b.pintu.x0 + lebarPintu / 2 - geser;
		pintuKanan.current.position.x = b.pintu.x1 - lebarPintu / 2 + geser;
	});

	return (
		<group>
			<Gabung>
				{/* halaman parkir aspal & garis parkir, trotoar keliling gedung */}
				<mesh rotation-x={-Math.PI / 2} position={[(L.x0 + L.x1) / 2, 0.006, (L.z0 + L.z1) / 2]}>
					<planeGeometry args={[L.x1 - L.x0, L.z1 - L.z0]} />
					<meshStandardMaterial color="#55585d" />
				</mesh>
				<mesh position={[cx, 0.02, cz]}>
					<boxGeometry args={[lebar + 3, 0.04, dalam + 3]} />
					<meshStandardMaterial color="#c9c4b8" />
				</mesh>
				{[856, 859, 862, 865, 868, 902, 905, 908, 911].map((x) => (
					<mesh key={x} position={[x, 0.012, -966]}>
						<boxGeometry args={[0.12, 0.01, 4.8]} />
						<meshStandardMaterial color="#f8fafc" />
					</mesh>
				))}
				{/* lantai dalam berubin */}
				<mesh position={[cx, 0.045, cz]}>
					<boxGeometry args={[lebar - 0.5, 0.01, dalam - 0.5]} />
					<meshStandardMaterial color="#e7e0d6" />
				</mesh>
				{/* bingkai kaca muka */}
				{[b.x0 + 0.3, b.pintu.x0, b.pintu.x1, b.x1 - 0.3].map((x) => (
					<mesh key={x} position={[x, 1.25, b.z1 - 0.1]}>
						<boxGeometry args={[0.14, 2.5, 0.14]} />
						<meshStandardMaterial color="#1f2937" />
					</mesh>
				))}
				{/* konter, mesin kasir, dapur di belakang */}
				<mesh position={[(KONTER_MCD.x0 + KONTER_MCD.x1) / 2, 0.55, (KONTER_MCD.z0 + KONTER_MCD.z1) / 2]}>
					<boxGeometry args={[KONTER_MCD.x1 - KONTER_MCD.x0, 1.1, KONTER_MCD.z1 - KONTER_MCD.z0]} />
					<meshStandardMaterial color="#e5e7eb" />
				</mesh>
				<mesh position={[(KONTER_MCD.x0 + KONTER_MCD.x1) / 2, 0.3, KONTER_MCD.z1 + 0.01]}>
					<boxGeometry args={[KONTER_MCD.x1 - KONTER_MCD.x0, 0.5, 0.02]} />
					<meshStandardMaterial color={MERAH} />
				</mesh>
				{[880, 885, 890].map((x) => (
					<mesh key={x} position={[x, 1.25, KONTER_MCD.z0 + 0.5]}>
						<boxGeometry args={[0.4, 0.3, 0.35]} />
						<meshStandardMaterial color="#1f2937" />
					</mesh>
				))}
				<mesh position={[cx, 1.0, b.z0 + 0.9]}>
					<boxGeometry args={[lebar - 6, 2.0, 1.0]} />
					<meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.35} />
				</mesh>
				{/* meja & kursi */}
				{MEJA_MCD.map((m) => (
					<group key={`${m.x}:${m.z}`}>
						<mesh position={[m.x, 0.74, m.z]}>
							<boxGeometry args={[m.x1 - m.x0, 0.05, m.z1 - m.z0]} />
							<meshStandardMaterial color="#d6b98c" />
						</mesh>
						<mesh position={[m.x, 0.37, m.z]}>
							<cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
							<meshStandardMaterial color="#374151" />
						</mesh>
					</group>
				))}
				{KURSI_MCD.map((k) => (
					<group key={`${k.x}:${k.z}`}>
						<mesh position={[k.x, 0.44, k.z]}>
							<boxGeometry args={[0.42, 0.06, 0.4]} />
							<meshStandardMaterial color={MERAH} />
						</mesh>
						<mesh position={[k.x, 0.72, k.z - Math.cos(k.rot) * 0.19]}>
							<boxGeometry args={[0.42, 0.5, 0.05]} />
							<meshStandardMaterial color={MERAH} />
						</mesh>
						<mesh position={[k.x, 0.21, k.z]}>
							<cylinderGeometry args={[0.03, 0.03, 0.42, 6]} />
							<meshStandardMaterial color="#374151" />
						</mesh>
					</group>
				))}
				{/* nampan pelanggan */}
				{pelanggan.map((k) => (
					<mesh key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.42, 0.775, k.z + Math.cos(k.rot) * 0.42]}>
						<boxGeometry args={[0.38, 0.02, 0.28]} />
						<meshStandardMaterial color="#b91c1c" />
					</mesh>
				))}
				{/* kios pesan mandiri */}
				{KIOS_MCD.map((k) => (
					<group key={k.x}>
						<mesh position={[k.x, 0.9, k.z]}>
							<boxGeometry args={[0.55, 1.8, 0.3]} />
							<meshStandardMaterial color="#f8fafc" />
						</mesh>
						<mesh position={[k.x, 1.35, k.z - 0.16]}>
							<boxGeometry args={[0.45, 0.65, 0.02]} />
							<meshStandardMaterial color="#0f172a" emissive="#1e3a8a" emissiveIntensity={0.6} />
						</mesh>
					</group>
				))}
				{/* tiang papan tinggi di tepi jalan */}
				<mesh position={[TIANG_MCD.x, 4.5, TIANG_MCD.z]}>
					<boxGeometry args={[0.5, 9, 0.5]} />
					<meshStandardMaterial color="#9ca3af" metalness={0.5} />
				</mesh>
				<mesh position={[TIANG_MCD.x, 9.6, TIANG_MCD.z]}>
					<boxGeometry args={[3.4, 2.6, 0.5]} />
					<meshStandardMaterial color={MERAH} />
				</mesh>
				{/* jendela drive-thru: kanopi kecil di dinding barat & papan menu */}
				<mesh position={[JENDELA_DRIVE.x + 0.9, 2.7, JENDELA_DRIVE.z]}>
					<boxGeometry args={[1.8, 0.12, 2.6]} />
					<meshStandardMaterial color={MERAH} />
				</mesh>
				<mesh position={[JENDELA_DRIVE.x + 0.13, 1.4, JENDELA_DRIVE.z]}>
					<boxGeometry args={[0.04, 1.0, 1.4]} />
					<meshStandardMaterial color="#a5c8e4" />
				</mesh>
				<mesh position={[PAPAN_DRIVE.x, 0.9, PAPAN_DRIVE.z]}>
					<boxGeometry args={[0.15, 1.8, 0.15]} />
					<meshStandardMaterial color="#374151" />
				</mesh>
				<mesh position={[PAPAN_DRIVE.x, 1.6, PAPAN_DRIVE.z]}>
					<boxGeometry args={[2.0, 1.2, 0.2]} />
					<meshStandardMaterial color="#1f2937" />
				</mesh>
			</Gabung>

			<Cangkang daftarDinding={daftarDinding} />
			{/* kaca muka & daun pintu geser */}
			{[
				[b.x0 + 0.3, b.pintu.x0],
				[b.pintu.x1, b.x1 - 0.3],
			].map(([a, c]) => (
				<mesh key={a} position={[(a + c) / 2, 1.25, b.z1 - 0.1]} material={BAHAN_KACA}>
					<boxGeometry args={[c - a - 0.14, 2.4, 0.05]} />
				</mesh>
			))}
			<mesh ref={pintuKiri} position={[b.pintu.x0 + lebarPintu / 2, 1.2, b.z1 + 0.02]} material={BAHAN_KACA}>
				<boxGeometry args={[lebarPintu, 2.3, 0.05]} />
			</mesh>
			<mesh ref={pintuKanan} position={[b.pintu.x1 - lebarPintu / 2, 1.2, b.z1 + 0.02]} material={BAHAN_KACA}>
				<boxGeometry args={[lebarPintu, 2.3, 0.05]} />
			</mesh>

			{/* logo & tulisan di muka gedung, logo di tiang papan */}
			<Lengkung posisi={[b.x1 - 3.2, 3.2, b.z1 + 0.08]} skala={0.95} />
			<Papan posisi={[cx - 2, 3.9, b.z1 + 0.04]} lebar={9} tinggi={1.1} latar="#3b3b3b" baris={[{ teks: "McDonald's", ukuran: 0.8, tebal: true, warna: KUNING, y: 0.55 }]} />
			<Lengkung posisi={[TIANG_MCD.x, 8.45, TIANG_MCD.z + 0.3]} skala={1.05} />
			<Lengkung posisi={[TIANG_MCD.x, 8.45, TIANG_MCD.z - 0.3]} skala={1.05} rotasi={Math.PI} />
			<Papan posisi={[PAPAN_DRIVE.x, 1.6, PAPAN_DRIVE.z + 0.11]} lebar={1.9} tinggi={1.1} latar="#1f2937" baris={[
				{ teks: "DRIVE THRU", ukuran: 0.2, tebal: true, warna: KUNING, y: 0.22 },
				{ teks: "🍔 Burger  🍗 Ayam  🍟 Kentang", ukuran: 0.11, tebal: true, warna: "#ffffff", y: 0.55 },
				{ teks: "Buka 24 jam", ukuran: 0.1, warna: "#fca5a5", y: 0.82 },
			]} />

			{/* papan menu di atas konter, menghadap pembeli */}
			{[-1, 0, 1].map((i) => (
				<Papan
					key={i}
					posisi={[cx + i * 3.4, 3.1, KONTER_MCD.z0 - 1.6]}
					lebar={3.2}
					tinggi={1.2}
					latar="#111827"
					baris={
						[
							[
								{ teks: "PAKET NASI AYAM", ukuran: 0.2, tebal: true, warna: KUNING, y: 0.3 },
								{ teks: "🍗🍚🥤  🪙 60", ukuran: 0.22, tebal: true, warna: "#ffffff", y: 0.7 },
							],
							[
								{ teks: "BURGER KEJU GANDA", ukuran: 0.2, tebal: true, warna: KUNING, y: 0.3 },
								{ teks: "🍔  🪙 55 · 🍟 🪙 25", ukuran: 0.2, tebal: true, warna: "#ffffff", y: 0.7 },
							],
							[
								{ teks: "AYAM GORENG · SUNDAE", ukuran: 0.18, tebal: true, warna: KUNING, y: 0.3 },
								{ teks: "🍗 🪙 50 · 🍨 🪙 18 · 🥤 🪙 15", ukuran: 0.17, tebal: true, warna: "#ffffff", y: 0.7 },
							],
						][i + 1]
					}
				/>
			))}

			{/* kru di balik konter, pelanggan duduk makan */}
			{[
				[880, KRU],
				[889.5, KRU2],
			].map(([x, p]) => (
				<group key={x} position={[x, 0.04, KONTER_MCD.z0 - 0.55]}>
					<Tokoh penampilan={p} pose="diam" asal={{ x, z: KONTER_MCD.z0 - 0.55, rot: 0, lantai: 0 }} />
				</group>
			))}
			{pelanggan.map((k) => (
				<group key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.05, 0.04, k.z + Math.cos(k.rot) * 0.05]} rotation-y={k.rot}>
					<Tokoh penampilan={k.penampilan} pose="duduk" aktivitas="makan" />
				</group>
			))}
		</group>
	);
}
