import { animasiKebun, kebun, useKebun } from "../kebun";
import { usahaKini } from "../usahaWilayah";

// Alat bertani di genggaman tangan kanan tokoh (dipasang di ujung lengan bawah,
// sumbu -y = arah lengan). Ukuran dalam meter.

const KAYU = "#8b5e34";
const BESI = "#94a3b8";

export function Cangkul() {
	return (
		<group>
			{/* gagang menerus dari genggaman, mata cangkul tegak lurus di ujungnya */}
			<mesh position-y={-0.45}><cylinderGeometry args={[0.025, 0.025, 1.05, 6]} /><meshStandardMaterial color={KAYU} /></mesh>
			<mesh position={[0, -0.98, 0.14]}><boxGeometry args={[0.24, 0.05, 0.3]} /><meshStandardMaterial color={BESI} metalness={0.6} roughness={0.4} /></mesh>
		</group>
	);
}

export function Gembor() {
	return (
		<group position={[0, -0.12, 0.05]}>
			<mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.13, 0.15, 0.3, 10]} /><meshStandardMaterial color="#16a34a" /></mesh>
			<mesh position={[0, 0.04, 0.3]} rotation-x={-1.1}><cylinderGeometry args={[0.02, 0.035, 0.36, 6]} /><meshStandardMaterial color="#15803d" /></mesh>
			<mesh position={[0, 0.16, 0.46]}><cylinderGeometry args={[0.05, 0.03, 0.04, 8]} /><meshStandardMaterial color="#166534" /></mesh>
			<mesh position={[0, 0.16, -0.02]} rotation-z={Math.PI / 2}><torusGeometry args={[0.09, 0.015, 5, 10, Math.PI]} /><meshStandardMaterial color="#15803d" /></mesh>
		</group>
	);
}

export function Arit() {
	return (
		<group>
			<mesh position-y={-0.08}><cylinderGeometry args={[0.022, 0.022, 0.2, 6]} /><meshStandardMaterial color={KAYU} /></mesh>
			<mesh position={[0, -0.22, 0.1]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.12, 0.016, 4, 12, Math.PI * 1.1]} /><meshStandardMaterial color={BESI} metalness={0.6} roughness={0.35} /></mesh>
		</group>
	);
}

export function KantongBenih() {
	return <mesh position={[0, -0.05, 0.05]}><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color="#a16207" roughness={1} /></mesh>;
}

export function Ember() {
	return (
		<group position-y={-0.18}>
			<mesh><cylinderGeometry args={[0.13, 0.1, 0.22, 10]} /><meshStandardMaterial color="#8b5e34" /></mesh>
		</group>
	);
}

/** Alat di tangan sesuai aksi bertani yang sedang berlangsung (kosong di luar aksi). */
export function AlatTangan() {
	useKebun();
	const an = animasiKebun();
	if (!an) return null;
	const j = an.jenis;
	if (j === "cangkul" || j === "bersih" || j === "gali") return <Cangkul />;
	if (j === "siram") return usahaKini().id === "bertani" ? <Gembor /> : <Ember />;
	if (j === "tanam") return <KantongBenih />;
	if (j === "panen" && (kebun.petak[an.petak]?.k || kebun.komoditas) === "padi") return <Arit />;
	if (j === "timba") return <Ember />;
	return null;
}
