import { useMemo } from "react";
import Gabung from "./Gabung";
import Papan from "./Papan";
import { usePudar } from "./pudar";
import Tokoh from "./Tokoh";
import { penampilanWarga } from "./layout";

// Warung tenda di seberang kantor (mie ayam Pak Kumis, pecel ayam Bude): tenda terpal,
// gerobak berpapan menu, penjual di balik gerobak, dua meja panjang berbangku, dan pelanggan
// yang sedang makan. Pesanan tamu digambar MakananMeja.jsx. Dipasang di grup halaman.

const TINGGI_MEJA = 0.75;

// Atap terpal tenda: dipudarkan saat menghalangi kamera (mis. sedang duduk makan).
function AtapTenda({ w, warna, daftarDinding }) {
	const cx = (w.x0 + w.x1) / 2;
	const cz = (w.z0 + w.z1) / 2;
	const grup = usePudar(daftarDinding);
	return (
		<group ref={grup}>
			{[-1, 1].map((s) => (
				<mesh key={s} position={[cx, w.tinggi + 0.28, cz + (s * (w.z1 - w.z0)) / 4]} rotation-x={s * 0.3}>
					<boxGeometry args={[w.x1 - w.x0 + 0.5, 0.05, (w.z1 - w.z0) / 2 / Math.cos(0.3) + 0.3]} />
					<meshStandardMaterial color={s < 0 ? warna[0] : warna[1]} />
				</mesh>
			))}
		</group>
	);
}

export default function WarungTenda({ w, g, meja, kursi, tema, daftarDinding }) {
	const cx = (w.x0 + w.x1) / 2;
	const pelanggan = useMemo(() => kursi.filter((k) => k.npc).map((k) => ({ ...k, penampilan: penampilanWarga() })), [kursi]);

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
				{/* gerobak: badan, etalase kaca, roda, panci / wajan */}
				<mesh position={[g.x, 0.55, g.z]}>
					<boxGeometry args={[g.lx, 0.9, g.lz]} />
					<meshStandardMaterial color={tema.gerobak} />
				</mesh>
				<mesh position={[g.x, 1.0, g.z]}>
					<boxGeometry args={[g.lx + 0.06, 0.05, g.lz + 0.06]} />
					<meshStandardMaterial color="#e5e7eb" />
				</mesh>
				<mesh position={[g.x + 0.2, 1.32, g.z]}>
					<boxGeometry args={[g.lx - 0.6, 0.6, g.lz - 0.1]} />
					<meshStandardMaterial color="#bfe3f5" transparent opacity={0.5} />
				</mesh>
				{tema.wajan ? (
					<>
						<mesh position={[g.x - 0.62, 1.1, g.z]}>
							<cylinderGeometry args={[0.15, 0.17, 0.14, 12]} />
							<meshStandardMaterial color="#374151" metalness={0.6} />
						</mesh>
						<mesh position={[g.x - 0.62, 1.2, g.z]}>
							<sphereGeometry args={[0.24, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
							<meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} side={2} />
						</mesh>
					</>
				) : (
					<mesh position={[g.x - 0.65, 1.17, g.z]}>
						<cylinderGeometry args={[0.2, 0.2, 0.3, 12]} />
						<meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.3} />
					</mesh>
				)}
				{[-0.7, 0.7].map((dx) => (
					<mesh key={dx} position={[g.x + dx, 0.22, g.z - g.lz / 2 - 0.02]} rotation-x={Math.PI / 2}>
						<cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
						<meshStandardMaterial color="#111827" />
					</mesh>
				))}
				{/* isi etalase */}
				{[0, 1, 2].map((i) => (
					<mesh key={i} position={[g.x + 0.25 + i * 0.2, 1.08, g.z]}>
						{tema.wajan ? <boxGeometry args={[0.14, 0.06, 0.1]} /> : <cylinderGeometry args={[0.1, 0.06, 0.05, 10]} />}
						<meshStandardMaterial color={tema.wajan ? ["#a0521d", "#c9a25c", "#8a4b1f"][i] : "#f8fafc"} />
					</mesh>
				))}
				{/* meja panjang & bangku */}
				{meja.map((m) => (
					<group key={m.z}>
						<mesh position={[(m.x0 + m.x1) / 2, TINGGI_MEJA - 0.03, m.z]}>
							<boxGeometry args={[m.x1 - m.x0, 0.06, m.z1 - m.z0]} />
							<meshStandardMaterial color={tema.meja} />
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
						{/* botol saus, kecap & sambal / kobokan */}
						{[
							["#b91c1c", -0.3],
							["#1f1309", 0],
							[tema.wajan ? "#93c5fd" : "#ea580c", 0.3],
						].map(([warna, dx]) => (
							<mesh key={dx} position={[(m.x0 + m.x1) / 2 + dx, TINGGI_MEJA + 0.08, m.z]}>
								<cylinderGeometry args={[0.03, 0.03, 0.16, 8]} />
								<meshStandardMaterial color={warna} />
							</mesh>
						))}
					</group>
				))}
				{/* hidangan pelanggan */}
				{pelanggan.map((k) => (
					<mesh key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.42, TINGGI_MEJA + (tema.wajan ? 0.012 : 0.05), k.z + Math.cos(k.rot) * 0.42]}>
						{tema.wajan ? <cylinderGeometry args={[0.15, 0.12, 0.024, 14]} /> : <cylinderGeometry args={[0.11, 0.06, 0.1, 12]} />}
						<meshStandardMaterial color="#f8fafc" />
					</mesh>
				))}
				{/* spanduk lukis di kedua sisi tenda (khas warung pecel) */}
				{tema.spandukSamping &&
					[w.x0, w.x1].map((x) => (
						<mesh key={x} position={[x, w.tinggi / 2 + 0.25, (w.z0 + w.z1) / 2 + 0.6]}>
							<boxGeometry args={[0.02, w.tinggi - 0.5, w.z1 - w.z0 - 1.6]} />
							<meshStandardMaterial color="#fefce8" />
						</mesh>
					))}
			</Gabung>

			{/* penjual di balik gerobak, menghadap pembeli */}
			<group position={[g.x, 0, g.z + g.lz / 2 + 0.45]} rotation-y={Math.PI}>
				<Tokoh penampilan={tema.penjual} pose="diam" asal={{ x: g.x, z: g.z + g.lz / 2 + 0.45, rot: Math.PI, lantai: 0 }} />
			</group>
			{pelanggan.map((k) => (
				<group key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.05, 0, k.z + Math.cos(k.rot) * 0.05]} rotation-y={k.rot}>
					<Tokoh penampilan={k.penampilan} pose="duduk" aktivitas="makan" />
				</group>
			))}
			<AtapTenda w={w} warna={tema.tenda} daftarDinding={daftarDinding} />

			<Papan posisi={[g.x, 1.32, g.z - g.lz / 2 - 0.01]} rotasi={Math.PI} lebar={1.75} tinggi={0.5} latar={tema.papanLatar} baris={tema.papanGerobak} />
			<Papan posisi={[cx, w.tinggi - 0.05, w.z0 - 0.02]} rotasi={Math.PI} lebar={Math.min(6, w.x1 - w.x0 - 0.6)} tinggi={0.55} latar={tema.spanduk} baris={[{ teks: tema.judul, ukuran: 0.24, tebal: true, warna: "#ffffff", y: 0.55 }]} />
			{tema.spandukSamping &&
				[
					[w.x0 - 0.02, -Math.PI / 2],
					[w.x1 + 0.02, Math.PI / 2],
				].map(([x, rot]) => (
					<Papan
						key={x}
						posisi={[x, w.tinggi / 2 + 0.3, (w.z0 + w.z1) / 2 + 0.6]}
						rotasi={rot}
						lebar={w.z1 - w.z0 - 1.8}
						tinggi={w.tinggi - 0.7}
						latar="#fefce8"
						baris={tema.spandukSamping}
					/>
				))}
		</group>
	);
}
