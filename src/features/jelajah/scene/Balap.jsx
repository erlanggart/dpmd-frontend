import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import { CHECKPOINT, START, balap } from "../balap";
import Papan from "./Papan";

// Gerbang start/finis balapan motor di tepi jalan depan kantor, dan cincin gerbang cek yang
// muncul selama balapan: gerbang berikutnya menyala kuning, sesudahnya samar. Dipasang di
// grup halaman (y = TANAH).

const BAHAN_AKTIF = new MeshStandardMaterial({ color: "#facc15", emissive: "#f59e0b", emissiveIntensity: 1.2, transparent: true, opacity: 0.85 });
const BAHAN_BERIKUT = new MeshStandardMaterial({ color: "#a5f3fc", emissive: "#22d3ee", emissiveIntensity: 0.6, transparent: true, opacity: 0.35 });

export default function Balap() {
	const cincin = useRef([]);
	useFrame(({ clock }) => {
		const aktif = balap.fase === "jalan" || balap.fase === "hitung";
		cincin.current.forEach((m, i) => {
			if (!m) return;
			const k = i - balap.cp;
			m.visible = aktif && (k === 0 || k === 1);
			if (!m.visible) return;
			m.material = k === 0 ? BAHAN_AKTIF : BAHAN_BERIKUT;
			const s = k === 0 ? 1 + Math.sin(clock.elapsedTime * 6) * 0.05 : 0.9;
			m.scale.setScalar(s);
		});
	});

	return (
		<group>
			{/* gerbang start/finis: dua tiang & spanduk kotak-kotak di sisi utara jalan */}
			{[-2.6, 2.6].map((dx) => (
				<mesh key={dx} position={[START.x + dx, 2, 40.6]}>
					<cylinderGeometry args={[0.12, 0.12, 4, 8]} />
					<meshStandardMaterial color="#e5e7eb" metalness={0.5} />
				</mesh>
			))}
			<Papan
				posisi={[START.x, 3.6, 40.6]}
				rotasi={Math.PI}
				lebar={5.4}
				tinggi={0.9}
				latar="#111827"
				baris={[
					{ teks: "🏁 START · FINIS 🏁", ukuran: 0.34, tebal: true, warna: "#facc15", y: 0.38 },
					{ teks: "Balap motor — naik motor ke sini", ukuran: 0.16, warna: "#f8fafc", y: 0.78 },
				]}
			/>
			{/* garis start di aspal */}
			<mesh rotation-x={-Math.PI / 2} position={[START.x, 0.02, START.z]}>
				<planeGeometry args={[0.6, 8]} />
				<meshBasicMaterial color="#f8fafc" />
			</mesh>
			{CHECKPOINT.map((c, i) => {
				const lanjut = CHECKPOINT[i + 1] || CHECKPOINT[0];
				const rot = Math.atan2(lanjut.x - c.x, lanjut.z - c.z);
				return (
					<mesh key={i} ref={(m) => (cincin.current[i] = m)} position={[c.x, 2.4, c.z]} rotation-y={rot} visible={false} material={BAHAN_BERIKUT}>
						<torusGeometry args={[3.2, 0.18, 8, 32]} />
					</mesh>
				);
			})}
		</group>
	);
}
