import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { N_RUAS } from "./joranLentur";

// Joran realistis: gagang gabus, dudukan & gulungan spinning, blank meruncing dari ruas-ruas
// bersarang, dan mata pancing. Ruas dekat ujung menekuk paling banyak, seperti joran asli.
const PANJANG_TOTAL = 2.9;
const L = PANJANG_TOTAL / N_RUAS;
const JARI = (i) => 0.019 - (i / N_RUAS) * 0.0155;

const GEO_RUAS = Array.from({ length: N_RUAS }, (_, i) => new CylinderGeometry(JARI(i + 1), JARI(i), L + 0.004, 7));
const GEO_MATA = Array.from({ length: N_RUAS }, (_, i) => new TorusGeometry(0.024 - i * 0.002, 0.0028, 5, 10));
const GEO_LILIT = Array.from({ length: N_RUAS }, (_, i) => new CylinderGeometry(JARI(i) + 0.0012, JARI(i) + 0.0012, 0.035, 7));
const GEO_GAGANG = new CylinderGeometry(0.024, 0.027, 0.3, 10);
const GEO_GAGANG_DEPAN = new CylinderGeometry(0.019, 0.023, 0.11, 10);
const GEO_TUTUP = new CylinderGeometry(0.03, 0.03, 0.035, 10);
const GEO_DUDUKAN = new CylinderGeometry(0.021, 0.021, 0.12, 10);
const GEO_KAKI = new BoxGeometry(0.014, 0.05, 0.05);
const GEO_RUMAH = new BoxGeometry(0.05, 0.06, 0.055);
const GEO_SPOOL = new CylinderGeometry(0.038, 0.044, 0.05, 14);
const GEO_LENGAN = new BoxGeometry(0.008, 0.075, 0.008);
const GEO_KENOP = new SphereGeometry(0.014, 8, 6);

function Ruas({ i, ruas, ujung, warna, warnaUjung }) {
	const mataDi = i % 2 === 1 || i === N_RUAS - 1;
	return (
		<group ref={(el) => (ruas.current[i] = el)} position-y={i ? L : 0}>
			<mesh geometry={GEO_RUAS[i]} position-y={L / 2}>
				<meshStandardMaterial color={i >= N_RUAS - 2 ? warnaUjung : warna} metalness={0.35} roughness={0.32} />
			</mesh>
			{mataDi && (
				<>
					<mesh geometry={GEO_LILIT[i]} position-y={L * 0.92}>
						<meshStandardMaterial color="#111827" roughness={0.5} />
					</mesh>
					{/* mata pancing menghadap sisi depan-bawah, tempat senar lewat */}
					<mesh geometry={GEO_MATA[i]} position={[0, L * 0.92, 0.024 - i * 0.001]} rotation-x={Math.PI / 2 - 0.35}>
						<meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
					</mesh>
				</>
			)}
			{i < N_RUAS - 1 ? <Ruas i={i + 1} ruas={ruas} ujung={ujung} warna={warna} warnaUjung={warnaUjung} /> : <object3D ref={ujung} position-y={L} />}
		</group>
	);
}

export default function ModelJoran({ ruas, ujung, engkol, warna, warnaUjung }) {
	return (
		<>
			<mesh geometry={GEO_GAGANG} position-y={-0.07}>
				<meshStandardMaterial color="#c8a27a" roughness={0.95} />
			</mesh>
			<mesh geometry={GEO_TUTUP} position-y={-0.235}>
				<meshStandardMaterial color="#1f2937" roughness={0.5} />
			</mesh>
			<mesh geometry={GEO_DUDUKAN} position-y={0.135}>
				<meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.35} />
			</mesh>
			<mesh geometry={GEO_GAGANG_DEPAN} position-y={0.255}>
				<meshStandardMaterial color="#c8a27a" roughness={0.95} />
			</mesh>
			{/* gulungan spinning di sisi depan-bawah joran */}
			<group position={[0, 0.135, 0.022]}>
				<mesh geometry={GEO_KAKI} position-z={0.024}>
					<meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
				</mesh>
				<mesh geometry={GEO_RUMAH} position={[0, -0.02, 0.07]}>
					<meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
				</mesh>
				<mesh geometry={GEO_SPOOL} position={[0, 0.033, 0.07]}>
					<meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.22} />
				</mesh>
				<group ref={engkol} position={[-0.032, -0.02, 0.07]}>
					<mesh geometry={GEO_LENGAN} position={[-0.006, 0.036, 0]}>
						<meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
					</mesh>
					<mesh geometry={GEO_KENOP} position={[-0.018, 0.074, 0]}>
						<meshStandardMaterial color="#111827" roughness={0.6} />
					</mesh>
				</group>
			</group>
			<Ruas i={0} ruas={ruas} ujung={ujung} warna={warna} warnaUjung={warnaUjung} />
		</>
	);
}
