import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import Gabung from "./Gabung";
import { HALAMAN_TOKO, MINIMARKET } from "./layout";
import Papan from "./Papan";
import { suasana } from "./suasana";
import Tokoh from "./Tokoh";

// Minimarket di seberang jalan depan kantor: muka kaca dengan rak berisi barang, kasir,
// papan nama, kanopi, dan halaman parkir. Belanjanya lewat panel di depan pintu
// (lihat toko.js) — bangunannya tidak dimasuki. Dipasang di grup halaman (y = TANAH).

const RAK_WARNA = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];
const BAHAN_KACA = new MeshStandardMaterial({ color: "#9cc7e6", transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.3, emissive: "#fff6dd", emissiveIntensity: 0 });
const BAHAN_LAMPU = new MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.4 });
const KASIR = { seragam: "warga", perempuan: true, jilbab: "#b91c1c", kulit: "#d3a378", rambut: "#21180f", baju: "#d61f26", celana: "#1e3a5f", rok: false };

export default function Minimarket() {
	const m = MINIMARKET;
	const h = HALAMAN_TOKO;
	const lebar = m.x1 - m.x0;
	const dalam = m.z1 - m.z0;
	const cx = (m.x0 + m.x1) / 2;
	const cz = (m.z0 + m.z1) / 2;

	// rak barang: tiga lorong rak memanjang, tiap rak 4 tingkat barang warna-warni
	const barang = useMemo(() => {
		const hasil = [];
		for (const rx of [-3.2, 0.4, 3.4]) {
			for (let tingkat = 0; tingkat < 4; tingkat++) {
				for (let i = 0; i < 9; i++) hasil.push({ p: [cx + rx + (i % 2 ? 0.22 : -0.22), 0.35 + tingkat * 0.42, m.z0 + 3 + Math.floor(i / 2) * 0.9], w: RAK_WARNA[(i * 3 + tingkat * 5 + Math.round(rx)) % RAK_WARNA.length] });
			}
		}
		return hasil;
	}, [cx, m.z0]);

	useFrame(() => {
		BAHAN_KACA.emissiveIntensity = 0.15 + suasana.malam * 0.6;
		BAHAN_LAMPU.emissiveIntensity = 0.4 + suasana.malam * 1.4;
	});

	return (
		<group>
			<Gabung>
				{/* halaman parkir beton & garis parkir */}
				<mesh rotation-x={-Math.PI / 2} position={[(h.x0 + h.x1) / 2, 0.012, (h.z0 + h.z1) / 2]}>
					<planeGeometry args={[h.x1 - h.x0, h.z1 - h.z0]} />
					<meshStandardMaterial color="#b9b6ae" />
				</mesh>
				{[-7.5, -5, 5, 7.5].map((x) => (
					<mesh key={x} position={[x, 0.02, (h.z0 + h.z1) / 2]}>
						<boxGeometry args={[0.1, 0.01, 4]} />
						<meshStandardMaterial color="#f4efe4" />
					</mesh>
				))}
				{/* lantai teras toko */}
				<mesh position={[cx, 0.08, m.z0 - 0.9]}>
					<boxGeometry args={[lebar + 0.6, 0.16, 1.8]} />
					<meshStandardMaterial color="#d6d3cb" />
				</mesh>
				{/* dinding samping & belakang */}
				<mesh position={[cx, m.tinggi / 2, m.z1 - 0.1]}>
					<boxGeometry args={[lebar, m.tinggi, 0.2]} />
					<meshStandardMaterial color="#f5f5f2" />
				</mesh>
				{[m.x0 + 0.1, m.x1 - 0.1].map((x) => (
					<mesh key={x} position={[x, m.tinggi / 2, cz]}>
						<boxGeometry args={[0.2, m.tinggi, dalam]} />
						<meshStandardMaterial color="#f5f5f2" />
					</mesh>
				))}
				{/* lantai dalam & atap */}
				<mesh position={[cx, 0.05, cz]}>
					<boxGeometry args={[lebar - 0.4, 0.1, dalam - 0.2]} />
					<meshStandardMaterial color="#e7e5e4" />
				</mesh>
				<mesh position={[cx, m.tinggi + 0.15, cz]}>
					<boxGeometry args={[lebar + 0.4, 0.3, dalam + 0.4]} />
					<meshStandardMaterial color="#cbd5e1" />
				</mesh>
				{/* bingkai muka toko: tiang & ambang atas */}
				{[m.x0 + 0.15, -1.1, 1.1, m.x1 - 0.15].map((x) => (
					<mesh key={x} position={[x, 1.6, m.z0 + 0.05]}>
						<boxGeometry args={[0.18, 3.2, 0.18]} />
						<meshStandardMaterial color="#334155" metalness={0.4} />
					</mesh>
				))}
				<mesh position={[cx, 3.25, m.z0 + 0.05]}>
					<boxGeometry args={[lebar, 0.18, 0.2]} />
					<meshStandardMaterial color="#334155" metalness={0.4} />
				</mesh>
				{/* pita merah atas, garis biru & kuning, kanopi teras */}
				<mesh position={[cx, 3.85, m.z0 - 0.02]}>
					<boxGeometry args={[lebar + 0.4, 1.1, 0.25]} />
					<meshStandardMaterial color="#d61f26" />
				</mesh>
				<mesh position={[cx, 3.24, m.z0 - 0.12]}>
					<boxGeometry args={[lebar + 0.4, 0.1, 0.1]} />
					<meshStandardMaterial color="#1d4ed8" />
				</mesh>
				<mesh position={[cx, 3.14, m.z0 - 0.12]}>
					<boxGeometry args={[lebar + 0.4, 0.1, 0.1]} />
					<meshStandardMaterial color="#facc15" />
				</mesh>
				<mesh position={[cx, 3.3, m.z0 - 0.95]}>
					<boxGeometry args={[lebar + 0.6, 0.12, 1.9]} />
					<meshStandardMaterial color="#e2e8f0" />
				</mesh>
				{/* rak & barang di dalam */}
				{[-3.2, 0.4, 3.4].map((rx) => (
					<mesh key={rx} position={[cx + rx, 0.9, m.z0 + 4.8]}>
						<boxGeometry args={[0.35, 1.8, 4.6]} />
						<meshStandardMaterial color="#e5e7eb" />
					</mesh>
				))}
				{barang.map((b, i) => (
					<mesh key={i} position={b.p}>
						<boxGeometry args={[0.18, 0.3, 0.7]} />
						<meshStandardMaterial color={b.w} />
					</mesh>
				))}
				{/* lemari pendingin di dinding belakang */}
				<mesh position={[cx, 1.1, m.z1 - 0.6]}>
					<boxGeometry args={[lebar - 1.2, 2.2, 0.7]} />
					<meshStandardMaterial color="#cbd5e1" />
				</mesh>
				{/* meja kasir di kiri pintu */}
				<mesh position={[cx - 3.4, 0.5, m.z0 + 1.4]}>
					<boxGeometry args={[2.6, 1.0, 0.8]} />
					<meshStandardMaterial color="#d61f26" />
				</mesh>
				<mesh position={[cx - 3.0, 1.15, m.z0 + 1.45]}>
					<boxGeometry args={[0.5, 0.3, 0.35]} />
					<meshStandardMaterial color="#1f2937" />
				</mesh>
			</Gabung>
			{/* kaca muka toko, berpendar di malam hari */}
			{[
				[m.x0 + 0.15, -1.1],
				[1.1, m.x1 - 0.15],
				[-1.1, 1.1],
			].map(([a, b], i) => (
				<mesh key={i} position={[(a + b) / 2, i === 2 ? 1.5 : 1.6, m.z0 + 0.05]} material={BAHAN_KACA}>
					<boxGeometry args={[b - a - 0.18, i === 2 ? 2.8 : 3.0, 0.05]} />
				</mesh>
			))}
			{/* lampu langit-langit */}
			{[-3, 0, 3].map((x) => (
				<mesh key={x} position={[cx + x, m.tinggi - 0.1, cz]} material={BAHAN_LAMPU}>
					<boxGeometry args={[0.25, 0.05, dalam - 2]} />
				</mesh>
			))}
			{/* kasir */}
			<group position={[cx - 3.4, 0.1, m.z0 + 2.2]} rotation-y={Math.PI}>
				<Tokoh penampilan={KASIR} pose="jalan" />
			</group>
			<Papan
				posisi={[cx, 3.85, m.z0 - 0.16]}
				rotasi={Math.PI}
				lebar={6.4}
				tinggi={0.95}
				latar="#d61f26"
				baris={[{ teks: "Alfamart", ukuran: 0.7, tebal: true, warna: "#ffffff", y: 0.52 }]}
			/>
			<Papan
				posisi={[cx + 2.2, 2.1, m.z0 - 0.02]}
				rotasi={Math.PI}
				lebar={1.6}
				tinggi={0.6}
				latar="#facc15"
				baris={[
					{ teks: "BELANJA PAKAI KOIN", ukuran: 0.13, tebal: true, warna: "#7f1d1d", y: 0.35 },
					{ teks: "hasil mancing di Situ Pemda", ukuran: 0.1, warna: "#7f1d1d", y: 0.68 },
				]}
			/>
		</group>
	);
}
