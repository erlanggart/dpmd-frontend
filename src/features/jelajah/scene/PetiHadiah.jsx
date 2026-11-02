import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, MeshStandardMaterial } from "three";
import { harta, petiSiap } from "../harta";
import { BAHAN_WARNA, gabung, kotak, warnai } from "./geometri";
import { PETI_HADIAH } from "./layout";

// Peti hadiah di satu lantai: badan kayu berpita logam, tutup berengsel di belakang yang
// terbuka setelah diambil isinya, kilau berputar selama masih berisi, dan semburan koin
// saat dibuka. Koordinat dunia (dipasang di GrupLantai tanpa geser).

const BAHAN_KILAU = new MeshStandardMaterial({ color: "#fde68a", emissive: "#fbbf24", emissiveIntensity: 1.2, transparent: true, opacity: 0.85 });
const BAHAN_KOIN = new MeshStandardMaterial({ color: "#fbbf24", emissive: "#b45309", emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.3 });
const GEOM_KOIN = new CylinderGeometry(0.06, 0.06, 0.015, 12).rotateX(Math.PI / 2);
const N_KOIN = 12;

function geomPeti(emas) {
	const kayu = emas ? "#7c2d12" : "#8b5a2b";
	const pita = emas ? "#facc15" : "#9ca3af";
	return {
		badan: gabung([
			kotak([0.7, 0.4, 0.46], kayu, [0, 0.2, 0]),
			...[-0.25, 0.25].map((x) => kotak([0.06, 0.41, 0.47], pita, [x, 0.2, 0])),
			kotak([0.71, 0.05, 0.47], pita, [0, 0.03, 0]),
			kotak([0.1, 0.12, 0.02], pita, [0, 0.33, 0.235]),
		]),
		// tutup: engsel di tepi belakang (z = -0.23), membulat ke atas
		tutup: gabung([
			warnai(new CylinderGeometry(0.23, 0.23, 0.7, 12, 1, false, 0, Math.PI), kayu, { p: [0, 0, 0.23], r: [0, 0, Math.PI / 2] }),
			...[-0.25, 0.25].map((x) => warnai(new CylinderGeometry(0.235, 0.235, 0.06, 12, 1, false, 0, Math.PI), pita, { p: [x, 0, 0.23], r: [0, 0, Math.PI / 2] })),
		]),
	};
}

function Peti({ p }) {
	const geom = useMemo(() => geomPeti(p.emas), [p.emas]);
	useEffect(() => () => Object.values(geom).forEach((g) => g.dispose()), [geom]);
	const tutup = useRef();
	const kilau = useRef();
	const koin = useRef([]);
	const buka = useRef(petiSiap(p.id) ? 0 : 1);
	const arahKoin = useMemo(
		() =>
			Array.from({ length: N_KOIN }, () => {
				const a = Math.random() * Math.PI * 2;
				const v = 0.6 + Math.random() * 0.9;
				return { vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: 3 + Math.random() * 1.6 };
			}),
		[],
	);

	useFrame(({ clock }, dt) => {
		const siap = petiSiap(p.id);
		buka.current += ((siap ? 0 : 1) - buka.current) * (1 - Math.exp(-5 * dt));
		tutup.current.rotation.x = -buka.current * 1.9;
		kilau.current.visible = siap;
		if (siap) {
			kilau.current.rotation.y = clock.elapsedTime * 1.6;
			kilau.current.position.y = 0.75 + Math.sin(clock.elapsedTime * 2.2) * 0.06;
		}
		// semburan koin dari peti yang baru dibuka
		const l = harta.ledak;
		const t = l && l.id === p.id ? (performance.now() - l.t0) / 1000 : 99;
		koin.current.forEach((k, i) => {
			if (!k) return;
			k.visible = t < 1.4;
			if (!k.visible) return;
			const a = arahKoin[i];
			k.position.set(a.vx * t, 0.4 + a.vy * t - 4.9 * t * t, a.vz * t);
			k.rotation.y = t * 14 + i;
		});
	});

	return (
		<group position={[p.x, p.y, p.z]} rotation-y={p.rot}>
			<mesh geometry={geom.badan} material={BAHAN_WARNA} />
			<group ref={tutup} position={[0, 0.4, -0.23]}>
				<mesh geometry={geom.tutup} material={BAHAN_WARNA} />
			</group>
			<mesh ref={kilau} material={BAHAN_KILAU} position-y={0.75}>
				<octahedronGeometry args={[p.emas ? 0.13 : 0.1, 0]} />
			</mesh>
			{arahKoin.map((_, i) => (
				<mesh key={i} ref={(m) => (koin.current[i] = m)} geometry={GEOM_KOIN} material={BAHAN_KOIN} visible={false} />
			))}
		</group>
	);
}

export default function PetiHadiah({ lantai }) {
	return PETI_HADIAH.filter((p) => p.lantai === lantai).map((p) => <Peti key={p.id} p={p} />);
}
