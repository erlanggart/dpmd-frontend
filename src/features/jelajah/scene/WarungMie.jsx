import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { LAMA_MAKAN, warung } from "../warung";
import Gabung from "./Gabung";
import { GEROBAK_MIE, KURSI_WARUNG, MEJA_MIE, WARUNG_MIE, penampilanWarga } from "./layout";
import Papan from "./Papan";
import { usePudar } from "./pudar";
import Tokoh from "./Tokoh";

// Warung tenda mie ayam di sebelah timur Alfamart: tenda terpal oranye, gerobak kaca
// bertuliskan menu, penjual di balik gerobak, dua meja panjang berbangku, dan dua pelanggan
// yang sedang makan. Mangkuk pesanan tamu muncul di meja depan bangkunya dan isinya
// berkurang sampai habis. Dipasang di grup halaman (y = TANAH).

const PENJUAL = { seragam: "warga", perempuan: false, kulit: "#b9824f", rambut: "#141010", baju: "#f8fafc", celana: "#334155" };
const TINGGI_MEJA = 0.75;

// Mangkuk mie ayam di meja: mangkuk ayam jago, kuah, mie, topping ayam & sawi.
function Mangkuk() {
	const grup = useRef();
	const isi = useRef();
	useFrame(() => {
		const m = warung.makan;
		grup.current.visible = !!m;
		if (!m) return;
		// di meja tepat di depan bangku yang diduduki
		grup.current.position.set(m.x + Math.sin(m.rot) * 0.42, TINGGI_MEJA, m.z + Math.cos(m.rot) * 0.42);
		const sisa = Math.max(0.05, 1 - m.t / LAMA_MAKAN);
		isi.current.scale.set(1, sisa, 1);
	});
	return (
		<group ref={grup} visible={false}>
			<mesh position-y={0.05}>
				<cylinderGeometry args={[0.11, 0.06, 0.1, 14]} />
				<meshStandardMaterial color="#f8fafc" />
			</mesh>
			<mesh position-y={0.075}>
				<torusGeometry args={[0.1, 0.006, 4, 16]} />
				<meshStandardMaterial color="#dc2626" />
			</mesh>
			<group ref={isi} position-y={0.02}>
				<mesh position-y={0.06}>
					<cylinderGeometry args={[0.098, 0.098, 0.02, 14]} />
					<meshStandardMaterial color="#e8b04a" />
				</mesh>
				<mesh position={[0.03, 0.075, 0.02]}>
					<boxGeometry args={[0.06, 0.02, 0.05]} />
					<meshStandardMaterial color="#8a4b20" />
				</mesh>
				<mesh position={[-0.04, 0.075, -0.02]}>
					<boxGeometry args={[0.05, 0.015, 0.06]} />
					<meshStandardMaterial color="#3f8f2e" />
				</mesh>
			</group>
			{/* sumpit */}
			<mesh position={[0.12, 0.11, 0]} rotation-z={0.5}>
				<boxGeometry args={[0.012, 0.24, 0.012]} />
				<meshStandardMaterial color="#d6a96b" />
			</mesh>
		</group>
	);
}

// Atap terpal tenda: dipudarkan saat menghalangi kamera (mis. sedang duduk makan).
function AtapTenda({ daftarDinding }) {
	const w = WARUNG_MIE;
	const cx = (w.x0 + w.x1) / 2;
	const cz = (w.z0 + w.z1) / 2;
	const grup = usePudar(daftarDinding);
	return (
		<group ref={grup}>
			{[-1, 1].map((s) => (
				<mesh key={s} position={[cx, w.tinggi + 0.28, cz + (s * (w.z1 - w.z0)) / 4]} rotation-x={s * 0.3}>
					<boxGeometry args={[w.x1 - w.x0 + 0.5, 0.05, (w.z1 - w.z0) / 2 / Math.cos(0.3) + 0.3]} />
					<meshStandardMaterial color={s < 0 ? "#f97316" : "#ea580c"} />
				</mesh>
			))}
		</group>
	);
}

export default function WarungMie({ daftarDinding }) {
	const w = WARUNG_MIE;
	const g = GEROBAK_MIE;
	const cx = (w.x0 + w.x1) / 2;
	const pelanggan = useMemo(() => KURSI_WARUNG.filter((k) => k.npc).map((k) => ({ ...k, penampilan: penampilanWarga() })), []);

	return (
		<group>
			<Gabung>
				{/* tiang tenda */}
				{[w.x0, w.x1].flatMap((x) =>
					[w.z0, w.z1].map((z) => (
						<mesh key={`${x}:${z}`} position={[x, w.tinggi / 2, z]}>
							<cylinderGeometry args={[0.05, 0.05, w.tinggi, 6]} />
							<meshStandardMaterial color="#9ca3af" metalness={0.5} />
						</mesh>
					)),
				)}
				{/* gerobak: badan kayu, etalase kaca, roda, panci kuah */}
				<mesh position={[g.x, 0.55, g.z]}>
					<boxGeometry args={[g.lx, 0.9, g.lz]} />
					<meshStandardMaterial color="#1d4ed8" />
				</mesh>
				<mesh position={[g.x, 1.0, g.z]}>
					<boxGeometry args={[g.lx + 0.06, 0.05, g.lz + 0.06]} />
					<meshStandardMaterial color="#e5e7eb" />
				</mesh>
				<mesh position={[g.x + 0.2, 1.32, g.z]}>
					<boxGeometry args={[g.lx - 0.6, 0.6, g.lz - 0.1]} />
					<meshStandardMaterial color="#bfe3f5" transparent opacity={0.5} />
				</mesh>
				<mesh position={[g.x - 0.65, 1.17, g.z]}>
					<cylinderGeometry args={[0.2, 0.2, 0.3, 12]} />
					<meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.3} />
				</mesh>
				{[-0.7, 0.7].map((dx) => (
					<mesh key={dx} position={[g.x + dx, 0.22, g.z - g.lz / 2 - 0.02]} rotation-x={Math.PI / 2}>
						<cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
						<meshStandardMaterial color="#111827" />
					</mesh>
				))}
				{/* mangkuk tertumpuk di etalase */}
				{[0, 1, 2].map((i) => (
					<mesh key={i} position={[g.x + 0.45, 1.08 + i * 0.05, g.z]}>
						<cylinderGeometry args={[0.1, 0.06, 0.05, 10]} />
						<meshStandardMaterial color="#f8fafc" />
					</mesh>
				))}
				{/* meja panjang & bangku */}
				{MEJA_MIE.map((m) => (
					<group key={m.z}>
						<mesh position={[(m.x0 + m.x1) / 2, TINGGI_MEJA - 0.03, m.z]}>
							<boxGeometry args={[m.x1 - m.x0, 0.06, m.z1 - m.z0]} />
							<meshStandardMaterial color="#9a6b3f" />
						</mesh>
						{[m.x0 + 0.15, m.x1 - 0.15].map((x) => (
							<mesh key={x} position={[x, (TINGGI_MEJA - 0.06) / 2, m.z]}>
								<boxGeometry args={[0.08, TINGGI_MEJA - 0.06, m.z1 - m.z0 - 0.1]} />
								<meshStandardMaterial color="#7c5530" />
							</mesh>
						))}
						{[-1, 1].map((s) => (
							<mesh key={s} position={[(m.x0 + m.x1) / 2, 0.42, m.z + s * 0.62]}>
								<boxGeometry args={[m.x1 - m.x0, 0.06, 0.28]} />
								<meshStandardMaterial color="#b07d4a" />
							</mesh>
						))}
						{[-1, 1].flatMap((s) =>
							[m.x0 + 0.2, m.x1 - 0.2].map((x) => (
								<mesh key={`${s}:${x}`} position={[x, 0.2, m.z + s * 0.62]}>
									<boxGeometry args={[0.06, 0.4, 0.22]} />
									<meshStandardMaterial color="#7c5530" />
								</mesh>
							)),
						)}
						{/* botol saus, kecap & sambal */}
						{[
							["#b91c1c", -0.3],
							["#1f1309", 0],
							["#ea580c", 0.3],
						].map(([warna, dx]) => (
							<mesh key={dx} position={[(m.x0 + m.x1) / 2 + dx, TINGGI_MEJA + 0.08, m.z]}>
								<cylinderGeometry args={[0.03, 0.03, 0.16, 8]} />
								<meshStandardMaterial color={warna} />
							</mesh>
						))}
					</group>
				))}
				{/* mangkuk pelanggan */}
				{pelanggan.map((k) => (
					<mesh key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.42, TINGGI_MEJA + 0.05, k.z + Math.cos(k.rot) * 0.42]}>
						<cylinderGeometry args={[0.11, 0.06, 0.1, 12]} />
						<meshStandardMaterial color="#f8fafc" />
					</mesh>
				))}
			</Gabung>

			{/* penjual di balik gerobak, menghadap pembeli */}
			<group position={[g.x, 0, g.z + g.lz / 2 + 0.45]} rotation-y={Math.PI}>
				<Tokoh penampilan={PENJUAL} pose="diam" asal={{ x: g.x, z: g.z + g.lz / 2 + 0.45, rot: Math.PI, lantai: 0 }} />
			</group>
			{pelanggan.map((k) => (
				<group key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.05, 0, k.z + Math.cos(k.rot) * 0.05]} rotation-y={k.rot}>
					<Tokoh penampilan={k.penampilan} pose="duduk" aktivitas="makan" />
				</group>
			))}
			<Mangkuk />
			<AtapTenda daftarDinding={daftarDinding} />

			<Papan
				posisi={[g.x, 1.32, g.z - g.lz / 2 - 0.01]}
				rotasi={Math.PI}
				lebar={1.75}
				tinggi={0.5}
				latar="#fef3c7"
				baris={[
					{ teks: "MIE AYAM", ukuran: 0.2, tebal: true, warna: "#b91c1c", y: 0.36 },
					{ teks: "Pak Kumis · Bakso · Pangsit", ukuran: 0.075, tebal: true, warna: "#1e3a8a", y: 0.78 },
				]}
			/>
			<Papan
				posisi={[cx, w.tinggi - 0.05, w.z0 - 0.02]}
				rotasi={Math.PI}
				lebar={4.6}
				tinggi={0.55}
				latar="#b91c1c"
				baris={[{ teks: "🍜 MIE AYAM PAK KUMIS · 🪙 40", ukuran: 0.26, tebal: true, warna: "#ffffff", y: 0.55 }]}
			/>
		</group>
	);
}
