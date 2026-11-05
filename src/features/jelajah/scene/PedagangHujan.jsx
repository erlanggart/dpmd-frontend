import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import Gabung from "./Gabung";
import ModelPayung from "./ModelPayung";
import Papan from "./Papan";
import Tokoh from "./Tokoh";
import { tinggiTanah } from "./layout";

// Abang payung & jas hujan: muncul berjalan masuk dari arah titik.datang (bawaan +x) mendorong
// gerobak saat hadir() benar, dan pergi lagi saat hujan reda. Penanda dari jauh: payung
// merah-putih besar di atas gerobak. Tanpa tabrakan (lihat abangHujanData.js).

const JARAK_JALAN = 14; // m dari titik tempat abang muncul/menghilang
const KECEPATAN = 1.8; // m/dtk
const ABANG = { seragam: "warga", perempuan: false, kulit: "#b98a5e", rambut: "#1a1209", baju: "#334155", celana: "#475569", jasHujan: true };
const WARNA_LIPAT = ["#2563eb", "#16a34a", "#f59e0b", "#db2777", "#7c3aed", "#0f172a"];
const KAYU = "#8a5a2b";
const sudutDekat = (dari, ke) => dari + Math.atan2(Math.sin(ke - dari), Math.cos(ke - dari));

const Kayu = ({ args, pos, rot, warna = KAYU }) => (
	<mesh position={pos} rotation={rot}>
		<boxGeometry args={args} />
		<meshStandardMaterial color={warna} roughness={0.85} />
	</mesh>
);

// payung terlipat tergantung pada palang: gagang di atas, kain mengerucut ke bawah
function PayungLipat({ x, warna }) {
	return (
		<group position={[x, 1.96, 0]}>
			<mesh position-y={0.04}>
				<cylinderGeometry args={[0.014, 0.014, 0.1, 6]} />
				<meshStandardMaterial color="#5b3a1e" />
			</mesh>
			<mesh position-y={-0.3} rotation-x={Math.PI}>
				<coneGeometry args={[0.055, 0.6, 8]} />
				<meshStandardMaterial color={warna} flatShading roughness={0.7} />
			</mesh>
		</group>
	);
}

// jas hujan digantung: bahu, badan pipih, lengan, tudung bola kecil
function JasGantung({ x, warna }) {
	return (
		<group position={[x, 1.96, 0]}>
			<mesh position-y={0.02}>
				<sphereGeometry args={[0.07, 8, 6]} />
				<meshStandardMaterial color={warna} roughness={0.5} />
			</mesh>
			<Kayu args={[0.38, 0.05, 0.05]} pos={[0, -0.04, 0]} warna={warna} />
			<Kayu args={[0.3, 0.55, 0.04]} pos={[0, -0.34, 0]} warna={warna} />
			<Kayu args={[0.07, 0.4, 0.04]} pos={[0.19, -0.26, 0]} warna={warna} />
			<Kayu args={[0.07, 0.4, 0.04]} pos={[-0.19, -0.26, 0]} warna={warna} />
		</group>
	);
}

function Gerobak() {
	return (
		<>
			<Gabung>
				{/* alas, papan sisi rendah, 2 roda di ujung, 2 kaki */}
				<Kayu args={[1.5, 0.08, 0.75]} pos={[0, 0.8, 0]} />
				<Kayu args={[1.5, 0.16, 0.04]} pos={[0, 0.92, 0.355]} />
				<Kayu args={[1.5, 0.16, 0.04]} pos={[0, 0.92, -0.355]} />
				<Kayu args={[0.04, 0.16, 0.75]} pos={[0.73, 0.92, 0]} />
				<Kayu args={[0.04, 0.16, 0.75]} pos={[-0.73, 0.92, 0]} />
				{[-0.85, 0.85].map((x) => (
					<mesh key={x} position={[x, 0.22, 0]} rotation-z={Math.PI / 2}>
						<cylinderGeometry args={[0.22, 0.22, 0.06, 14]} />
						<meshStandardMaterial color="#111827" roughness={0.9} />
					</mesh>
				))}
				<mesh position={[0, 0.22, 0]} rotation-z={Math.PI / 2}>
					<cylinderGeometry args={[0.025, 0.025, 1.7, 6]} />
					<meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
				</mesh>
				{[-0.3, 0.3].map((z) => (
					<Kayu key={z} args={[0.07, 0.76, 0.07]} pos={[0, 0.4, z]} />
				))}
				{/* tiang tegak & palang atas */}
				{[-0.7, 0.7].map((x) => (
					<Kayu key={x} args={[0.05, 1.2, 0.05]} pos={[x, 1.4, 0]} />
				))}
				<Kayu args={[1.9, 0.05, 0.05]} pos={[0, 2.0, 0]} />
				{/* tiang payung besar di belakang, penanda dari jauh */}
				<mesh position={[0, 0.97, -0.3]}>
					<cylinderGeometry args={[0.03, 0.03, 0.26, 6]} />
					<meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} />
				</mesh>
				<group position={[0, 1.1, -0.3]} scale={1.9}>
					<ModelPayung warna="#dc2626" warna2="#f8fafc" />
				</group>
				{WARNA_LIPAT.map((w, i) => (
					<PayungLipat key={w} x={-0.55 + i * 0.22} warna={w} />
				))}
				<JasGantung x={-0.85} warna="#f5c518" />
				<JasGantung x={0.85} warna="#38bdf8" />
				{/* tiga payung kecil terbuka, miring berbeda */}
				<group position={[-0.5, 0.84, 0.12]} rotation={[0.9, 0, 0.3]} scale={0.55}>
					<ModelPayung warna="#f59e0b" warna2="#1e293b" />
				</group>
				<group position={[0, 0.84, 0.15]} rotation={[0.7, 0, -0.6]} scale={0.55}>
					<ModelPayung warna="#2563eb" warna2="#f8fafc" />
				</group>
				<group position={[0.45, 0.84, 0.1]} rotation={[-0.8, 0, 0.4]} scale={0.55}>
					<ModelPayung warna="#db2777" warna2="#fde68a" />
				</group>
			</Gabung>
			{/* tumpukan jas terlipat dalam plastik bening (transparan, tidak ikut digabung) */}
			{[["#f5c518", 0], ["#38bdf8", 1], ["#4ade80", 2]].map(([w, i]) => (
				<mesh key={w} position={[0.55, 0.87 + i * 0.05, -0.2]}>
					<boxGeometry args={[0.3, 0.045, 0.22]} />
					<meshStandardMaterial color={w} />
				</mesh>
			))}
			<mesh position={[0.55, 0.93, -0.2]}>
				<boxGeometry args={[0.33, 0.17, 0.25]} />
				<meshStandardMaterial color="#e2e8f0" transparent opacity={0.8} depthWrite={false} />
			</mesh>
			{/* papan harga di sisi depan & belakang (bukan label melayang) */}
			{[0, Math.PI].map((r) => (
				<Papan
					key={r}
					posisi={[0, 0.58, r ? -0.41 : 0.41]}
					rotasi={r}
					lebar={1.3}
					tinggi={0.42}
					latar="#d9b787"
					bingkai="#6b4423"
					baris={[
						{ teks: "PAYUNG · JAS HUJAN", ukuran: 0.11, tebal: true, warna: "#7c2d12", y: 0.36 },
						{ teks: "mulai 🪙 60", ukuran: 0.09, warna: "#1c1917", y: 0.72 },
					]}
				/>
			))}
		</>
	);
}

function Abang({ titik, hadir }) {
	const akar = useRef();
	const gerak = useRef({ laju: 0, fase: 0, payung: 0 });
	const u = useRef(0);
	// asal kepala menoleh ke pemain: diperbarui tiap frame mengikuti posisi & arah abang
	const asal = useMemo(() => ({ x: titik.x, z: titik.z, rot: titik.rot, lantai: 0 }), [titik]);

	useFrame((_, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		const ada = hadir();
		const g = gerak.current;
		u.current = Math.max(0, Math.min(1, u.current + (ada ? 1 : -1) * (KECEPATAN / JARAK_JALAN) * dt));
		const k = u.current;
		akar.current.visible = k > 0;
		if (k <= 0) return;
		const [dx, dz] = titik.datang ?? [1, 0];
		const x = titik.x + dx * JARAK_JALAN * (1 - k);
		const z = titik.z + dz * JARAK_JALAN * (1 - k);
		const y = titik.y ?? tinggiTanah(x, z);
		akar.current.position.set(x, y, z);
		const jalan = k < 1;
		// berjalan menghadap arah gerak; tiba: menghadap titik.rot
		const tujuan = jalan ? (ada ? Math.atan2(-dx, -dz) : Math.atan2(dx, dz)) : titik.rot;
		akar.current.rotation.y += (sudutDekat(akar.current.rotation.y, tujuan) - akar.current.rotation.y) * (1 - Math.exp(-5 * dt));
		g.laju = jalan ? 0.65 : 0;
		if (jalan) g.fase += dt * 7;
		asal.x = x;
		asal.z = z;
		asal.rot = akar.current.rotation.y;
	});

	return (
		<group ref={akar} visible={false}>
			<group position={[1.3, 0, 0]}>
				<Tokoh penampilan={ABANG} pose="jalan" gerak={gerak} asal={asal} />
			</group>
			<Gerobak />
		</group>
	);
}

// daftar: [{ x, z, rot, y?, datang? }], datang = arah asal [dx, dz]; hadir(): true selama pedagang harus ada (mis. sedang hujan)
export default function PedagangHujan({ daftar, hadir }) {
	return daftar.map((t) => <Abang key={`${t.x},${t.z}`} titik={t} hadir={hadir} />);
}
