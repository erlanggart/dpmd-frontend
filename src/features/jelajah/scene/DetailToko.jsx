import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, Object3D } from "three";
import { penampilanAvatar } from "../avatar";
import { kenakanGaya } from "../lemari";
import Gabung from "./Gabung";
import {
	ATM_ALFAMART,
	BANGKU_TOKO,
	DISTRO,
	FREEZER_ALFAMART,
	GALON_ALFAMART,
	GANTUNGAN_DISTRO,
	GEROBAK_CENDOL,
	HALAMAN_TOKO,
	JALAN,
	KARUNG_KOPERASI,
	KURSI_PLASTIK,
	LAMPU_JALAN_TOKO,
	MANEKIN_DEPAN,
	MESIN_CAPIT,
	PAGAR_DEPAN,
	POT_TOKO,
	TELUR_KOPERASI,
	TONG_TOKO,
	TOKO_PER_ID,
	UMBUL_KOPERASI,
	WARUNG_MIE,
	WARUNG_PECEL,
} from "./layout";
import Papan from "./Papan";
import { suasana } from "./suasana";
import { teksturPavingParkir } from "./tekstur";
import Tokoh from "./Tokoh";

// Detail halaman toko di seberang kantor: pelataran paving, zebra cross dari gerbang, lampu
// jalan, bangku, tong sampah, pot bunga, rak sepeda, lalu isi tiap toko (teras Alfamart,
// teras Koperasi, etalase Distro, hiasan warung) dan gerobak es cendol. Geometri statis
// digabung lewat <Gabung>; yang berpendar (lampu, neon, bohlam) tetap mesh sendiri dan
// terangnya diatur satu bahan bersama tiap frame. Tulisan hanya di benda yang menempel.
// Dipasang di grup halaman (y = TANAH); lantai paving di y 0,04, zebra 0,03.

const BAHAN_LAMPU = new MeshStandardMaterial({ color: "#fff7e0", emissive: "#ffd98a", emissiveIntensity: 0.2 });
const BAHAN_BOHLAM = new MeshStandardMaterial({ color: "#fff3c4", emissive: "#ffc94d", emissiveIntensity: 0.25 });
const BAHAN_NEON = new MeshStandardMaterial({ color: "#a5f3fc", emissive: "#22d3ee", emissiveIntensity: 0.5 });
const BAHAN_KACA_CAPIT = new MeshStandardMaterial({ color: "#bfe6f7", transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0.2 });
const PENJUAL_CENDOL = { seragam: "warga", perempuan: false, kulit: "#a8703f", rambut: "#141010", baju: "#ecfdf5", celana: "#334155" };

// kotak bernama: p = pusat, s = ukuran, w = warna
const B = ({ p, s, w, ry = 0, rz = 0, ...bahan }) => (
	<mesh position={p} rotation-y={ry} rotation-z={rz}>
		<boxGeometry args={s} />
		<meshStandardMaterial color={w} {...bahan} />
	</mesh>
);
const Sil = ({ p, r, t, w, seg = 10, ...bahan }) => (
	<mesh position={p}>
		<cylinderGeometry args={[r[1] ?? r[0], r[0], t, seg]} />
		<meshStandardMaterial color={w} {...bahan} />
	</mesh>
);

// ---------- pelataran & jalan ----------

function Pelataran() {
	const h = HALAMAN_TOKO;
	const z0 = h.z0 + 0.2;
	const paving = useMemo(() => teksturPavingParkir([(h.x1 - h.x0) / 1.6, (h.z1 - z0) / 1.6]), [h, z0]);
	return (
		<>
			<mesh rotation-x={-Math.PI / 2} position={[(h.x0 + h.x1) / 2, 0.04, (z0 + h.z1) / 2]}>
				<planeGeometry args={[h.x1 - h.x0, h.z1 - z0]} />
				<meshStandardMaterial map={paving} />
			</mesh>
			<Gabung>
				{/* kanstin tepi jalan */}
				<B p={[(h.x0 + h.x1) / 2, 0.035, h.z0 + 0.1]} s={[h.x1 - h.x0, 0.07, 0.2]} w="#d6d3cb" />
			</Gabung>
		</>
	);
}

// Zebra cross dari gerbang kantor melintasi aspal.
function Zebra() {
	const x = (PAGAR_DEPAN.gerbang[0] + PAGAR_DEPAN.gerbang[1]) / 2;
	return (
		<Gabung>
			{Array.from({ length: 8 }, (_, i) => (
				<mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.03, JALAN.aspal0 + 0.5 + i * 0.95]}>
					<planeGeometry args={[5.4, 0.5]} />
					<meshStandardMaterial color="#f4f4f0" />
				</mesh>
			))}
		</Gabung>
	);
}

// ---------- perabot jalan ----------

function Lampu({ x, z }) {
	return (
		<>
			<Sil p={[x, 0.15, z]} r={[0.14]} t={0.3} w="#374151" />
			<Sil p={[x, 2.2, z]} r={[0.05]} t={4.4} w="#4b5563" seg={8} />
			<B p={[x, 4.35, z - 0.5]} s={[0.06, 0.06, 1.0]} w="#4b5563" />
			<B p={[x, 4.3, z - 0.95]} s={[0.22, 0.08, 0.42]} w="#1f2937" />
		</>
	);
}

function Bangku({ x, z }) {
	return (
		<>
			{[-0.15, 0, 0.15].map((dz) => (
				<B key={dz} p={[x, 0.45, z + dz]} s={[1.6, 0.04, 0.12]} w="#9a6b3f" />
			))}
			{[0.7, 0.82, 0.94].map((y) => (
				<B key={y} p={[x, y, z + 0.24]} s={[1.6, 0.09, 0.03]} w="#8a5a2f" />
			))}
			{[-0.7, 0.7].map((dx) => (
				<group key={dx}>
					<B p={[x + dx, 0.225, z]} s={[0.06, 0.45, 0.5]} w="#374151" />
					<B p={[x + dx, 0.72, z + 0.27]} s={[0.06, 0.55, 0.04]} w="#374151" />
				</group>
			))}
		</>
	);
}

function TongSampah({ x, z }) {
	return (
		<>
			{[
				[0, "#16a34a", "#14532d"],
				[0.6, "#eab308", "#a16207"],
			].map(([dx, w, tutup]) => (
				<group key={dx}>
					<Sil p={[x + dx, 0.35, z]} r={[0.2]} t={0.7} w={w} />
					<Sil p={[x + dx, 0.73, z]} r={[0.23]} t={0.06} w={tutup} />
				</group>
			))}
		</>
	);
}

function PotBunga({ x, z, i }) {
	const bunga = ["#f472b6", "#fbbf24", "#f87171", "#fb923c"];
	return (
		<>
			<Sil p={[x, 0.25, z]} r={[0.22, 0.3]} t={0.5} w="#c2410c" />
			<mesh position={[x, 0.72, z]}>
				<icosahedronGeometry args={[0.27, 0]} />
				<meshStandardMaterial color="#3f8a4f" flatShading />
			</mesh>
			{[0, 1, 2, 3].map((k) => (
				<mesh key={k} position={[x + Math.cos(k * 1.6 + i) * 0.2, 0.82 + (k % 2) * 0.08, z + Math.sin(k * 1.6 + i) * 0.2]}>
					<icosahedronGeometry args={[0.07, 0]} />
					<meshStandardMaterial color={bunga[(k + i) % 4]} flatShading />
				</mesh>
			))}
		</>
	);
}

// ---------- isi toko ----------

// Mesin capit di teras Alfamart (lokal: depan = −z). Hadiahnya bola-bola warna-warni.
function MesinCapit() {
	const { x, z } = MESIN_CAPIT;
	const hadiah = [[-0.25, 0, "#f472b6"], [0, 0.1, "#facc15"], [0.25, -0.05, "#60a5fa"], [-0.1, -0.15, "#34d399"], [0.15, 0.2, "#fb923c"], [-0.28, 0.2, "#a78bfa"], [0.3, 0.15, "#f87171"]];
	return (
		<>
			<group position={[x, 0, z]}>
				<B p={[0, 0.425, 0]} s={[0.9, 0.85, 0.8]} w="#db2777" />
				<B p={[0, 0.78, -0.47]} s={[0.7, 0.05, 0.14]} w="#9d174d" />
				<Sil p={[-0.15, 0.87, -0.47]} r={[0.02]} t={0.12} w="#d1d5db" seg={6} />
				<mesh position={[-0.15, 0.95, -0.47]}>
					<sphereGeometry args={[0.04, 8, 6]} />
					<meshStandardMaterial color="#ef4444" />
				</mesh>
				<Sil p={[0.1, 0.83, -0.47]} r={[0.035]} t={0.03} w="#facc15" seg={8} />
				<Sil p={[0.22, 0.83, -0.47]} r={[0.035]} t={0.03} w="#38bdf8" seg={8} />
				{[-0.425, 0.425].flatMap((dx) => [-0.375, 0.375].map((dz) => <B key={`${dx}:${dz}`} p={[dx, 1.335, dz]} s={[0.05, 0.97, 0.05]} w="#fde047" />))}
				<B p={[0, 1.95, 0]} s={[0.9, 0.3, 0.8]} w="#db2777" />
				<B p={[0, 1.7, 0]} s={[0.7, 0.03, 0.04]} w="#9ca3af" metalness={0.6} />
				<B p={[0.05, 1.48, 0]} s={[0.02, 0.4, 0.02]} w="#6b7280" />
				{[-1, 0, 1].map((k) => (
					<B key={k} p={[0.05 + k * 0.04, 1.24, 0]} s={[0.025, 0.12, 0.025]} w="#9ca3af" rz={k * 0.4} />
				))}
				{hadiah.map(([dx, dz, w]) => (
					<mesh key={dx + ":" + dz} position={[dx, 0.96, dz]}>
						<icosahedronGeometry args={[0.11, 0]} />
						<meshStandardMaterial color={w} flatShading />
					</mesh>
				))}
			</group>
			<mesh position={[x, 1.325, z]} material={BAHAN_KACA_CAPIT}>
				<boxGeometry args={[0.84, 0.95, 0.74]} />
			</mesh>
		</>
	);
}

function MesinCapitPapan() {
	const { x, z } = MESIN_CAPIT;
	return (
		<>
			<Papan posisi={[x, 1.95, z - 0.42]} rotasi={Math.PI} lebar={0.8} tinggi={0.24} latar="#facc15" baris={[{ teks: "MESIN CAPIT", ukuran: 0.13, tebal: true, warna: "#9d174d", y: 0.55 }]} />
			<Papan posisi={[x, 0.45, z - 0.42]} rotasi={Math.PI} lebar={0.5} tinggi={0.26} latar="#fdf2f8" baris={[{ teks: "🪙 20 / main", ukuran: 0.1, tebal: true, warna: "#9d174d", y: 0.55 }]} />
		</>
	);
}

function FreezerEsKrim() {
	const { x, z } = FREEZER_ALFAMART;
	return (
		<>
			<B p={[x, 0.4, z]} s={[1.5, 0.8, 0.7]} w="#f8fafc" />
			<B p={[x, 0.83, z]} s={[1.56, 0.1, 0.76]} w="#dc2626" />
			<B p={[x, 0.91, z]} s={[1.4, 0.06, 0.6]} w="#bae6fd" />
		</>
	);
}

function RakGalon() {
	const { x, z } = GALON_ALFAMART;
	return (
		<>
			{[-0.68, 0.68].flatMap((dx) => [-0.27, 0.27].map((dz) => <B key={`${dx}:${dz}`} p={[x + dx, 0.57, z + dz]} s={[0.05, 1.14, 0.05]} w="#6b7280" />))}
			{[0.1, 0.6].map((y) => (
				<B key={y} p={[x, y, z]} s={[1.4, 0.04, 0.58]} w="#cbd5e1" />
			))}
			<B p={[x, 1.12, z]} s={[1.5, 0.04, 0.66]} w="#cbd5e1" />
			{[0.12, 0.62].flatMap((y0) =>
				[-0.45, 0, 0.45].map((dx) => (
					<group key={`${y0}:${dx}`}>
						<Sil p={[x + dx, y0 + 0.21, z]} r={[0.13]} t={0.42} w="#60a5fa" />
						<Sil p={[x + dx, y0 + 0.45, z]} r={[0.06]} t={0.06} w="#1d4ed8" seg={8} />
					</group>
				)),
			)}
			<B p={[x, 1.27, z - 0.24]} s={[1.3, 0.26, 0.04]} w="#1d4ed8" />
		</>
	);
}

function BoothAtm() {
	const { x, z, lz } = ATM_ALFAMART;
	const muka = z - lz / 2;
	return (
		<>
			<B p={[x, 1.0, z]} s={[0.9, 2.0, 0.9]} w="#e2e8f0" />
			<B p={[x, 2.04, z]} s={[1.0, 0.1, 1.0]} w="#1e40af" />
			<B p={[x, 1.38, muka - 0.01]} s={[0.5, 0.3, 0.06]} w="#0f172a" />
			<B p={[x, 1.1, muka - 0.01]} s={[0.36, 0.18, 0.06]} w="#475569" />
			<B p={[x, 0.78, muka - 0.01]} s={[0.4, 0.07, 0.06]} w="#111827" />
		</>
	);
}

function BoothAtmPapan() {
	const { x, z, lz } = ATM_ALFAMART;
	return <Papan posisi={[x, 1.78, z - lz / 2 - 0.05]} rotasi={Math.PI} lebar={0.7} tinggi={0.22} latar="#1e40af" baris={[{ teks: "ATM", ukuran: 0.15, tebal: true, warna: "#ffffff", y: 0.55 }]} />;
}

function KarungBeras() {
	const { x, z } = KARUNG_KOPERASI;
	const baris = [
		[0.19, [-0.5, 0, 0.5]],
		[0.41, [-0.25, 0.25]],
		[0.63, [0]],
	];
	return (
		<>
			<B p={[x, 0.04, z]} s={[1.6, 0.08, 0.8]} w="#8b5a2b" />
			{baris.flatMap(([y, xs], j) =>
				xs.map((dx, i) => <B key={`${j}:${i}`} p={[x + dx, y, z]} s={[0.46, 0.22, 0.34]} w={(i + j) % 2 ? "#e8dcc0" : "#f1e4c3"} ry={(i - j) * 0.06} />),
			)}
			<B p={[x, 0.86, z]} s={[0.36, 0.2, 0.28]} w="#fef3c7" />
		</>
	);
}

function RakTelur() {
	const { x, z } = TELUR_KOPERASI;
	return (
		<>
			{[-0.6, 0.6].flatMap((dx) => [-0.22, 0.22].map((dz) => <B key={`${dx}:${dz}`} p={[x + dx, 0.6, z + dz]} s={[0.05, 1.2, 0.05]} w="#8b5a2b" />))}
			{[0.3, 0.65, 1.0].map((y) => (
				<group key={y}>
					<B p={[x, y, z]} s={[1.2, 0.03, 0.5]} w="#a16207" />
					{[-0.45, -0.15, 0.15, 0.45].map((dx, i) => (
						<group key={dx}>
							<B p={[x + dx, y + 0.04, z]} s={[0.27, 0.05, 0.27]} w="#d6b98c" />
							{[-0.06, 0.06].flatMap((ex) =>
								[-0.06, 0.06].map((ez) => (
									<mesh key={`${ex}:${ez}`} position={[x + dx + ex, y + 0.09, z + ez]}>
										<icosahedronGeometry args={[0.04, 0]} />
										<meshStandardMaterial color={(i + (ex > 0) + (ez > 0)) % 2 ? "#f5ecd5" : "#e0b787"} flatShading />
									</mesh>
								)),
							)}
						</group>
					))}
				</group>
			))}
			<B p={[x, 1.35, z - 0.2]} s={[1.3, 0.28, 0.04]} w="#c81e1e" />
		</>
	);
}

function RakTelurPapan() {
	const { x, z } = TELUR_KOPERASI;
	return <Papan posisi={[x, 1.35, z - 0.24]} rotasi={Math.PI} lebar={1.2} tinggi={0.24} latar="#c81e1e" baris={[{ teks: "🥚 TELUR SEGAR", ukuran: 0.13, tebal: true, warna: "#ffffff", y: 0.55 }]} />;
}

function Umbul({ x, z }) {
	return (
		<>
			<Sil p={[x, 2.1, z]} r={[0.03]} t={4.2} w="#f1f5f9" seg={6} />
			<mesh position={[x, 4.25, z]}>
				<sphereGeometry args={[0.05, 8, 6]} />
				<meshStandardMaterial color="#facc15" />
			</mesh>
			<B p={[x + 0.31, 3.8, z]} s={[0.55, 0.6, 0.012]} w="#dc2626" />
			<B p={[x + 0.31, 3.2, z]} s={[0.55, 0.6, 0.012]} w="#f8fafc" />
		</>
	);
}

function GantunganBaju() {
	const { x, z } = GANTUNGAN_DISTRO;
	const warna = ["#7c3aed", "#f472b6", "#38bdf8", "#facc15", "#34d399", "#f97316"];
	return (
		<>
			{[-0.55, 0.55].map((dx) => (
				<group key={dx}>
					<B p={[x + dx, 0.75, z]} s={[0.04, 1.5, 0.04]} w="#a1a1aa" metalness={0.6} />
					<B p={[x + dx, 0.03, z]} s={[0.05, 0.04, 0.5]} w="#71717a" />
				</group>
			))}
			<B p={[x, 1.45, z]} s={[1.2, 0.03, 0.03]} w="#d4d4d8" metalness={0.6} />
			{warna.map((w, i) => (
				<B key={w} p={[x - 0.46 + i * 0.185, 1.1, z]} s={[0.15, 0.62, 0.05]} w={w} ry={(i % 2 ? 0.25 : -0.2)} />
			))}
		</>
	);
}

// Etalase luar Distro: dua manekin berbusana di atas podium.
function ManekinDepan() {
	const manekin = useMemo(
		() => [
			{ gaya: { t: 3, b: 4, c: 2, s: 2 }, jk: "P" },
			{ gaya: { t: 5, b: 1, c: 6, s: 4 }, jk: "L" },
		].map(({ gaya, jk }) => ({ ...kenakanGaya(penampilanAvatar({ jk, avatar: 0, kulit: 0 }), gaya), kulit: "#e7e5e4", rambut: "#e7e5e4", jilbab: null })),
		[],
	);
	return (
		<>
			<Gabung>
				{MANEKIN_DEPAN.map((m) => (
					<Sil key={m.x} p={[m.x, 0.12, m.z]} r={[0.4, 0.38]} t={0.12} w="#e4e4e7" seg={16} />
				))}
			</Gabung>
			{MANEKIN_DEPAN.map((m, i) => (
				<group key={m.x} position={[m.x, 0.18, m.z]} rotation-y={Math.PI}>
					<Tokoh penampilan={manekin[i]} pose="diam" bayangan={false} />
				</group>
			))}
		</>
	);
}

function NeonDistro() {
	const d = DISTRO;
	const cx = (d.x0 + d.x1) / 2;
	const z = d.z0 - 0.12;
	return (
		<>
			<mesh position={[cx, 3.81, z]} material={BAHAN_NEON}>
				<boxGeometry args={[6.2, 0.05, 0.04]} />
			</mesh>
			{[-3.08, 3.08].map((dx) => (
				<mesh key={dx} position={[cx + dx, 3.46, z]} material={BAHAN_NEON}>
					<boxGeometry args={[0.05, 0.72, 0.04]} />
				</mesh>
			))}
		</>
	);
}

// ---------- gerobak es cendol ----------

function GerobakCendol() {
	const { x, z, lx, lz } = GEROBAK_CENDOL;
	const muka = z - lz / 2;
	return (
		<>
			<B p={[x, 0.5, z]} s={[lx, 0.8, lz]} w="#0f766e" />
			<B p={[x, 0.92, z]} s={[lx + 0.1, 0.05, lz + 0.1]} w="#fef3c7" />
			{[-0.55, 0, 0.55].map((dx, i) => (
				<group key={dx}>
					<Sil p={[x + dx, 1.12, z]} r={[0.22]} t={0.34} w={["#4ade80", "#f8fafc", "#92400e"][i]} seg={14} />
					<Sil p={[x + dx, 1.3, z]} r={[0.24]} t={0.04} w="#cbd5e1" seg={14} />
				</group>
			))}
			{[-0.55, 0.55].map((dx) => (
				<mesh key={dx} position={[x + dx, 0.22, muka + 0.04]} rotation-x={Math.PI / 2}>
					<cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
					<meshStandardMaterial color="#111827" />
				</mesh>
			))}
			<Sil p={[x + 0.65, 1.2, z + 0.25]} r={[0.03]} t={2.3} w="#9ca3af" seg={6} metalness={0.5} />
			<mesh position={[x, 2.5, z]}>
				<coneGeometry args={[1.25, 0.32, 8]} />
				<meshStandardMaterial color="#ef4444" flatShading />
			</mesh>
			<mesh position={[x, 2.7, z]}>
				<sphereGeometry args={[0.05, 8, 6]} />
				<meshStandardMaterial color="#fde047" />
			</mesh>
		</>
	);
}

// ---------- hiasan warung ----------

function Kursi({ x, z, rot, warna, lebar = 0.42, y = 0 }) {
	return (
		<group position={[x, y, z]} rotation-y={rot}>
			<B p={[0, 0.44, 0]} s={[lebar, 0.04, 0.42]} w={warna} />
			<B p={[0, 0.66, 0.19]} s={[lebar, 0.36, 0.04]} w={warna} />
			{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <B key={`${sx}:${sz}`} p={[sx * (lebar / 2 - 0.03), 0.21, sz * 0.17]} s={[0.04, 0.42, 0.04]} w="#e5e7eb" />))}
		</group>
	);
}

// Spanduk kain di sisi tenda mie ayam: kain tipis + papan bergambar menempel di luarnya.
function SisiMie() {
	const w = WARUNG_MIE;
	const z = (w.z0 + w.z1) / 2 + 0.6;
	return (
		<Gabung>
			{[w.x0, w.x1].map((x) => (
				<B key={x} p={[x, w.tinggi / 2 + 0.3, z]} s={[0.02, w.tinggi - 0.7, w.z1 - w.z0 - 1.8]} w="#fef3c7" />
			))}
		</Gabung>
	);
}

function SisiMiePapan() {
	const w = WARUNG_MIE;
	const baris = [
		{ teks: "PAK KUMIS", ukuran: 0.42, tebal: true, warna: "#b91c1c", y: 0.22 },
		{ teks: "MIE AYAM", ukuran: 0.55, tebal: true, warna: "#1d4ed8", y: 0.45 },
		{ teks: "🍜 Bakso • Pangsit • Es Teh", ukuran: 0.2, tebal: true, warna: "#92400e", y: 0.68 },
		{ teks: "Kuah Gurih Sejak 1998 😋", ukuran: 0.17, tebal: true, warna: "#b91c1c", y: 0.86 },
	];
	return [
		[w.x0 - 0.03, -Math.PI / 2],
		[w.x1 + 0.03, Math.PI / 2],
	].map(([x, rot]) => (
		<Papan key={x} posisi={[x, w.tinggi / 2 + 0.3, (w.z0 + w.z1) / 2 + 0.6]} rotasi={rot} lebar={w.z1 - w.z0 - 1.8} tinggi={w.tinggi - 0.7} latar="#fef3c7" baris={baris} />
	));
}

// Untaian bohlam di bawah atap tenda: satu InstancedMesh untuk semua bohlam.
function untaian(w) {
	const hasil = [];
	const kabel = [];
	for (const z of [w.z0 + 0.1, (w.z0 + w.z1) / 2, w.z1 - 0.1]) {
		const n = 12;
		const titik = Array.from({ length: n + 1 }, (_, i) => {
			const t = i / n;
			return [w.x0 + 0.2 + t * (w.x1 - w.x0 - 0.4), 2.32 - 0.2 * (1 - (2 * t - 1) ** 2), z];
		});
		hasil.push(...titik);
		for (let i = 0; i < n; i++) {
			const [ax, ay] = titik[i];
			const [bx, by] = titik[i + 1];
			kabel.push({ p: [(ax + bx) / 2, (ay + by) / 2 + 0.03, z], panjang: Math.hypot(bx - ax, by - ay), sudut: Math.atan2(by - ay, bx - ax) });
		}
	}
	return { bohlam: hasil, kabel };
}

function Bohlam() {
	const ref = useRef();
	const { bohlam, kabel } = useMemo(() => {
		const a = untaian(WARUNG_MIE);
		const b = untaian(WARUNG_PECEL);
		return { bohlam: [...a.bohlam, ...b.bohlam], kabel: [...a.kabel, ...b.kabel] };
	}, []);
	useLayoutEffect(() => {
		const o = new Object3D();
		bohlam.forEach(([x, y, z], i) => {
			o.position.set(x, y, z);
			o.updateMatrix();
			ref.current.setMatrixAt(i, o.matrix);
		});
		ref.current.instanceMatrix.needsUpdate = true;
	}, [bohlam]);
	return (
		<>
			<instancedMesh ref={ref} args={[null, BAHAN_BOHLAM, bohlam.length]}>
				<sphereGeometry args={[0.045, 6, 5]} />
			</instancedMesh>
			<Gabung>
				{kabel.map((k, i) => (
					<B key={i} p={k.p} s={[k.panjang, 0.012, 0.012]} w="#1f2937" rz={k.sudut} />
				))}
			</Gabung>
		</>
	);
}

// ---------- rakitan ----------

export default function DetailToko() {
	useFrame(() => {
		const m = suasana.malam;
		BAHAN_LAMPU.emissiveIntensity = 0.2 + m * 2.4;
		BAHAN_BOHLAM.emissiveIntensity = 0.25 + m * 2.2;
		BAHAN_NEON.emissiveIntensity = 0.5 + m * 2.2;
	});
	const alfa = TOKO_PER_ID.alfamart;
	const kop = TOKO_PER_ID.koperasi;
	const sisiPromo = [
		[alfa.x0 - 0.02, -Math.PI / 2, "#fde047", "#b91c1c", "PROMO GAJIAN! 🎉", "Diskon s.d. 30%", "Beli 2 Gratis 1 • Minuman Dingin"],
		[alfa.x1 + 0.02, Math.PI / 2, "#d61f26", "#ffffff", "BELANJA HEMAT", "Poin Hemat Tiap Transaksi", "Isi Ulang Pulsa • Bayar Listrik"],
	];
	return (
		<group>
			<Pelataran />
			<Zebra />
			<Gabung>
				{LAMPU_JALAN_TOKO.map((l) => (
					<Lampu key={l.x} {...l} />
				))}
				{BANGKU_TOKO.map((b) => (
					<Bangku key={b.x} x={b.x} z={b.z} />
				))}
				{TONG_TOKO.map((t) => (
					<TongSampah key={t.x} {...t} />
				))}
				{POT_TOKO.map((p, i) => (
					<PotBunga key={p.x} {...p} i={i} />
				))}
				<MesinCapit />
				<FreezerEsKrim />
				<RakGalon />
				<BoothAtm />
				<KarungBeras />
				<RakTelur />
				{UMBUL_KOPERASI.map((u) => (
					<Umbul key={u.x} {...u} />
				))}
				<GantunganBaju />
				<GerobakCendol />
				{KURSI_PLASTIK.map((k) => (
					<Kursi key={k.x + ":" + k.z} {...k} />
				))}
			</Gabung>
			{/* bola lampu jalan: mesh berpendar, bahan bersama */}
			{LAMPU_JALAN_TOKO.map((l) => (
				<mesh key={l.x} position={[l.x, 4.24, l.z - 0.95]} material={BAHAN_LAMPU}>
					<boxGeometry args={[0.16, 0.03, 0.32]} />
				</mesh>
			))}
			<NeonDistro />
			<ManekinDepan />
			<SisiMie />
			<Bohlam />

			{/* tulisan yang menempel di benda */}
			<MesinCapitPapan />
			<BoothAtmPapan />
			<RakTelurPapan />
			<SisiMiePapan />
			<Papan posisi={[FREEZER_ALFAMART.x, 0.4, FREEZER_ALFAMART.z - 0.37]} rotasi={Math.PI} lebar={1.2} tinggi={0.3} latar="#fee2e2" baris={[{ teks: "🍦 ES KRIM", ukuran: 0.15, tebal: true, warna: "#b91c1c", y: 0.55 }]} />
			<Papan posisi={[GALON_ALFAMART.x, 1.27, GALON_ALFAMART.z - 0.28]} rotasi={Math.PI} lebar={1.2} tinggi={0.2} latar="#1d4ed8" baris={[{ teks: "AIR GALON ISI ULANG", ukuran: 0.12, tebal: true, warna: "#ffffff", y: 0.55 }]} />
			{sisiPromo.map(([x, rot, latar, warna, a, b, c]) => (
				<Papan
					key={x}
					posisi={[x, 2.4, alfa.z0 + 4.5]}
					rotasi={rot}
					lebar={4.4}
					tinggi={1.5}
					latar={latar}
					baris={[
						{ teks: a, ukuran: 0.34, tebal: true, warna, y: 0.3 },
						{ teks: b, ukuran: 0.26, tebal: true, warna, y: 0.55 },
						{ teks: c, ukuran: 0.15, tebal: true, warna, y: 0.8 },
					]}
				/>
			))}
			<Papan
				posisi={[kop.x0 - 0.02, 2.3, kop.z0 + 4.5]}
				rotasi={-Math.PI / 2}
				lebar={4}
				tinggi={1.4}
				latar="#ffffff"
				baris={[
					{ teks: "KOPERASI DESA", ukuran: 0.3, tebal: true, warna: "#c81e1e", y: 0.25 },
					{ teks: "MERAH PUTIH", ukuran: 0.34, tebal: true, warna: "#c81e1e", y: 0.5 },
					{ teks: "Simpan Pinjam • Sembako • Gotong Royong", ukuran: 0.12, tebal: true, warna: "#1e293b", y: 0.73 },
					{ teks: "Buka 07.00 – 21.00", ukuran: 0.13, tebal: true, warna: "#92400e", y: 0.9 },
				]}
			/>
			<Papan posisi={[GEROBAK_CENDOL.x, 0.5, GEROBAK_CENDOL.z - GEROBAK_CENDOL.lz / 2 - 0.02]} rotasi={Math.PI} lebar={1.5} tinggi={0.5} latar="#ecfdf5" baris={[{ teks: "ES CENDOL", ukuran: 0.2, tebal: true, warna: "#0f766e", y: 0.35 }, { teks: "🪙 15 • segar & manis", ukuran: 0.1, tebal: true, warna: "#b45309", y: 0.78 }]} />
			<group position={[GEROBAK_CENDOL.x, 0, GEROBAK_CENDOL.z + GEROBAK_CENDOL.lz / 2 + 0.5]} rotation-y={Math.PI}>
				<Tokoh penampilan={PENJUAL_CENDOL} pose="diam" asal={{ x: GEROBAK_CENDOL.x, z: GEROBAK_CENDOL.z + GEROBAK_CENDOL.lz / 2 + 0.5, rot: Math.PI, lantai: 0 }} />
			</group>
		</group>
	);
}
