import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import { START, balap, trekKini, useBalap } from "../balap";
import { posisi } from "../jelajahStore";
import { TANAH } from "./layout";
import Papan from "./Papan";

// Gerbang start/finis balapan motor di tepi jalan depan kantor; selama balapan: cincin gerbang
// cek trek yang dipilih (berikutnya menyala kuning, dua sesudahnya samar) dan panah 3D di atas
// kepala pemain yang menunjuk gerbang berikutnya. Dipasang di grup halaman (y = TANAH),
// kecuali panah (koordinat dunia, mengikuti pemain).

const BAHAN_AKTIF = new MeshStandardMaterial({ color: "#facc15", emissive: "#f59e0b", emissiveIntensity: 1.2, transparent: true, opacity: 0.85 });
const BAHAN_BERIKUT = new MeshStandardMaterial({ color: "#a5f3fc", emissive: "#22d3ee", emissiveIntensity: 0.6, transparent: true, opacity: 0.35 });
const BAHAN_PANAH = new MeshStandardMaterial({ color: "#facc15", emissive: "#f59e0b", emissiveIntensity: 0.9 });

function Cincin() {
	useBalap();
	const t = trekKini();
	const cincin = useRef([]);
	useFrame(({ clock }) => {
		const aktif = balap.fase === "jalan" || balap.fase === "hitung";
		cincin.current.forEach((m, i) => {
			if (!m) return;
			const k = i - balap.cp;
			m.visible = aktif && k >= 0 && k <= 2;
			if (!m.visible) return;
			m.material = k === 0 ? BAHAN_AKTIF : BAHAN_BERIKUT;
			m.scale.setScalar(k === 0 ? 1 + Math.sin(clock.elapsedTime * 6) * 0.05 : 0.9);
		});
	});
	return t.gerbang.map((c, i) => {
		const sebelum = i ? t.gerbang[i - 1] : START;
		const rot = Math.atan2(c.x - sebelum.x, c.z - sebelum.z);
		return (
			<mesh key={`${t.id}:${i}`} ref={(m) => (cincin.current[i] = m)} position={[c.x, 2.6, c.z]} rotation-y={rot} visible={false} material={BAHAN_BERIKUT}>
				<torusGeometry args={[3.4, 0.2, 8, 32]} />
			</mesh>
		);
	});
}

function Panah() {
	const g = useRef();
	useFrame(({ clock }) => {
		const cp = balap.fase === "jalan" && trekKini().gerbang[balap.cp];
		g.current.visible = !!cp;
		if (!cp) return;
		g.current.position.set(posisi.x, (posisi.yTampil ?? posisi.y) + 2.9 + Math.sin(clock.elapsedTime * 4) * 0.08 - TANAH, posisi.z);
		g.current.rotation.y = Math.atan2(cp.x - posisi.x, cp.z - posisi.z);
	});
	return (
		<group ref={g} visible={false}>
			{/* ujung panah sedikit menukik supaya bentuknya terbaca dari kamera di belakang */}
			<group rotation-x={0.45}>
				<mesh rotation-x={Math.PI / 2} position-z={0.15} material={BAHAN_PANAH}>
					<coneGeometry args={[0.32, 0.7, 12]} />
				</mesh>
				<mesh rotation-x={Math.PI / 2} position-z={-0.35} material={BAHAN_PANAH}>
					<cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
				</mesh>
			</group>
		</group>
	);
}

export default function Balap() {
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
					{ teks: "Balap motor — Sprint & Sirkuit Kawasan", ukuran: 0.15, warna: "#f8fafc", y: 0.78 },
				]}
			/>
			{/* garis start di aspal */}
			<mesh rotation-x={-Math.PI / 2} position={[START.x, 0.02, START.z]}>
				<planeGeometry args={[0.6, 8]} />
				<meshBasicMaterial color="#f8fafc" />
			</mesh>
			<Cincin />
			<Panah />
		</group>
	);
}
