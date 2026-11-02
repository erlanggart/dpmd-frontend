import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { lamaMakan, useWarung, warung } from "../warung";

// Pesanan tamu di meja depan kursinya (mie ayam, pecel, McD, kopi): wadahnya mengikuti
// bentuk menu, isinya menyusut sampai habis. Dipasang di grup halaman (y = TANAH).

function Mangkuk({ isi }) {
	return (
		<>
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
			<mesh position={[0.12, 0.11, 0]} rotation-z={0.5}>
				<boxGeometry args={[0.012, 0.24, 0.012]} />
				<meshStandardMaterial color="#d6a96b" />
			</mesh>
		</>
	);
}

// Piring: nasi, lauk goreng, lalapan, sambal (pecel) atau roti (kedai kopi).
function Piring({ isi, item }) {
	const roti = item.id === "roti-bakar" || item.id === "croissant";
	return (
		<>
			<mesh position-y={0.012}>
				<cylinderGeometry args={[0.16, 0.13, 0.024, 18]} />
				<meshStandardMaterial color={roti ? "#f1f5f9" : "#fafaf9"} />
			</mesh>
			<group ref={isi} position-y={0.02}>
				{roti ? (
					<mesh position-y={0.03} rotation-y={0.4}>
						<boxGeometry args={[0.16, 0.05, 0.1]} />
						<meshStandardMaterial color={item.id === "croissant" ? "#d69e45" : "#b7793b"} />
					</mesh>
				) : (
					<>
						{item.id !== "tahu-tempe" && (
							<mesh position={[-0.05, 0.03, 0.02]}>
								<sphereGeometry args={[0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
								<meshStandardMaterial color="#ffffff" />
							</mesh>
						)}
						<mesh position={[0.05, 0.025, -0.02]} rotation-y={0.6}>
							<boxGeometry args={item.id === "pecel-lele" ? [0.15, 0.03, 0.05] : [0.09, 0.05, 0.07]} />
							<meshStandardMaterial color={item.id === "tahu-tempe" ? "#c9a25c" : "#8a4b1f"} />
						</mesh>
						<mesh position={[0.06, 0.02, 0.07]}>
							<boxGeometry args={[0.07, 0.015, 0.04]} />
							<meshStandardMaterial color="#4d9b3a" />
						</mesh>
						<mesh position={[-0.08, 0.02, -0.07]}>
							<cylinderGeometry args={[0.025, 0.025, 0.015, 8]} />
							<meshStandardMaterial color="#c2261c" />
						</mesh>
					</>
				)}
			</group>
		</>
	);
}

// Nampan McD: burger / ayam, kentang goreng, dan gelas minuman.
function Nampan({ isi, item }) {
	return (
		<>
			<mesh position-y={0.01}>
				<boxGeometry args={[0.4, 0.02, 0.3]} />
				<meshStandardMaterial color="#b91c1c" />
			</mesh>
			<mesh position-y={0.021}>
				<boxGeometry args={[0.34, 0.002, 0.24]} />
				<meshStandardMaterial color="#fef3c7" />
			</mesh>
			<group ref={isi} position-y={0.02}>
				{item.id === "mcd-burger" ? (
					<group position={[-0.06, 0, 0]}>
						<mesh position-y={0.02}>
							<cylinderGeometry args={[0.055, 0.055, 0.025, 12]} />
							<meshStandardMaterial color="#d08a3c" />
						</mesh>
						<mesh position-y={0.042}>
							<cylinderGeometry args={[0.058, 0.058, 0.02, 12]} />
							<meshStandardMaterial color="#5b2d14" />
						</mesh>
						<mesh position-y={0.055}>
							<boxGeometry args={[0.1, 0.006, 0.1]} />
							<meshStandardMaterial color="#facc15" />
						</mesh>
						<mesh position-y={0.075}>
							<sphereGeometry args={[0.057, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
							<meshStandardMaterial color="#d99545" />
						</mesh>
					</group>
				) : item.id !== "mcd-kentang" ? (
					<group position={[-0.06, 0, 0]}>
						{item.id === "mcd-panas" && (
							<mesh position={[0.02, 0.03, 0.06]}>
								<sphereGeometry args={[0.045, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
								<meshStandardMaterial color="#ffffff" />
							</mesh>
						)}
						<mesh position={[-0.02, 0.03, -0.03]} rotation-y={0.5}>
							<boxGeometry args={[0.08, 0.05, 0.06]} />
							<meshStandardMaterial color="#c47a2c" />
						</mesh>
						{item.id === "mcd-ayam" && (
							<mesh position={[0.03, 0.03, 0.05]} rotation-y={-0.4}>
								<boxGeometry args={[0.07, 0.045, 0.06]} />
								<meshStandardMaterial color="#b86b25" />
							</mesh>
						)}
					</group>
				) : null}
				{/* kentang goreng di kotak merah */}
				<group position={[0.07, 0, -0.05]}>
					<mesh position-y={0.04}>
						<boxGeometry args={[0.07, 0.08, 0.04]} />
						<meshStandardMaterial color="#dc2626" />
					</mesh>
					{[-0.02, 0, 0.02].map((x) => (
						<mesh key={x} position={[x, 0.1, 0]}>
							<boxGeometry args={[0.012, 0.06, 0.012]} />
							<meshStandardMaterial color="#facc15" />
						</mesh>
					))}
				</group>
			</group>
			{/* gelas minuman bersedotan */}
			<group position={[0.12, 0.02, 0.07]}>
				<mesh position-y={0.065}>
					<cylinderGeometry args={[0.04, 0.032, 0.13, 12]} />
					<meshStandardMaterial color="#f8fafc" />
				</mesh>
				<mesh position-y={0.1}>
					<cylinderGeometry args={[0.041, 0.041, 0.03, 12]} />
					<meshStandardMaterial color="#dc2626" />
				</mesh>
				<mesh position={[0.01, 0.17, 0]} rotation-z={0.15}>
					<cylinderGeometry args={[0.005, 0.005, 0.1, 6]} />
					<meshStandardMaterial color="#facc15" />
				</mesh>
			</group>
		</>
	);
}

const WARNA_GELAS = { "es-jeruk": "#fb923c", "kopi-susu": "#a16a3c", "teh-tarik": "#c79b6b", "mcd-eskrim": "#fef3c7", "mcd-soda": "#3f1d0b" };
function Gelas({ isi, item }) {
	return (
		<>
			<mesh position-y={0.075}>
				<cylinderGeometry args={[0.045, 0.036, 0.15, 14]} />
				<meshStandardMaterial color="#e0f2fe" transparent opacity={0.45} />
			</mesh>
			<group ref={isi}>
				<mesh position-y={0.065}>
					<cylinderGeometry args={[0.04, 0.034, 0.12, 12]} />
					<meshStandardMaterial color={WARNA_GELAS[item.id] || "#a16a3c"} />
				</mesh>
			</group>
			<mesh position={[0.012, 0.17, 0]} rotation-z={0.18}>
				<cylinderGeometry args={[0.005, 0.005, 0.14, 6]} />
				<meshStandardMaterial color="#16a34a" />
			</mesh>
		</>
	);
}

export default function MakananMeja() {
	useWarung();
	const grup = useRef();
	const isi = useRef();
	const m = warung.makan;
	useFrame(() => {
		const mk = warung.makan;
		if (!grup.current) return;
		grup.current.visible = !!mk;
		if (!mk) return;
		grup.current.position.set(mk.x + Math.sin(mk.rot) * 0.42, mk.mejaY, mk.z + Math.cos(mk.rot) * 0.42);
		grup.current.rotation.y = mk.rot;
		const sisa = Math.max(0.05, 1 - mk.t / lamaMakan(mk.item));
		if (isi.current) isi.current.scale.set(1, sisa, 1);
	});
	if (!m) return null;
	const Wadah = { mangkuk: Mangkuk, piring: Piring, nampan: Nampan, gelas: Gelas }[m.item.bentuk] || Mangkuk;
	return (
		<group ref={grup}>
			<Wadah isi={isi} item={m.item} />
		</group>
	);
}
