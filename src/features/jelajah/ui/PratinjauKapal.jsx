import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { KapalTamu } from "../scene/ModelKapal";
import { AIR_Y } from "../scene/situ";

// Pratinjau 3D kapal di Toko Perahu: terapung di air, berputar pelan sendiri dan bisa
// diseret untuk dilihat dari segala sisi. Dimuat terpisah (lazy), pola PratinjauAvatar.

function Putar({ seret, children }) {
	const g = useRef();
	useFrame((_, dt) => {
		const s = seret.current;
		if (!s.aktif) s.sudut += dt * 0.4 * (performance.now() - s.terakhir > 1500 ? 1 : 0);
		g.current.rotation.y += (s.sudut - g.current.rotation.y) * (1 - Math.exp(-10 * dt));
	});
	return <group ref={g}>{children}</group>;
}

export default function PratinjauKapal({ model, warna }) {
	const seret = useRef({ aktif: false, x: 0, sudut: 0.6, terakhir: 0 });
	const s = seret.current;
	// kapal diam di tengah; group di bawah mengimbangi tinggi air (AIR_Y) supaya berada di tengah bingkai
	const k = useMemo(
		() => ({ x: 0, z: 0, rot: 0, laju: 0, setir: 0, warna, model: model.id, milik: true, jetski: !!model.jetski, bermesin: model.bermesin }),
		[model, warna],
	);
	return (
		<div
			className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
			onPointerDown={(e) => {
				e.currentTarget.setPointerCapture?.(e.pointerId);
				Object.assign(s, { aktif: true, x: e.clientX });
			}}
			onPointerMove={(e) => {
				if (!s.aktif) return;
				s.sudut += (e.clientX - s.x) * 0.012;
				s.x = e.clientX;
			}}
			onPointerUp={() => Object.assign(s, { aktif: false, terakhir: performance.now() })}
			onPointerCancel={() => Object.assign(s, { aktif: false, terakhir: performance.now() })}
		>
			<Canvas dpr={[1, 2]} camera={{ fov: 32, position: [5.2, 3.4, 9.4] }} onCreated={({ camera }) => camera.lookAt(0, 0.1, 0)}>
				<fog attach="fog" args={["#e0f2fe", 13, 32]} />
				<ambientLight intensity={1.5} />
				<directionalLight position={[3, 5, 4]} intensity={1.8} />
				<directionalLight position={[-3, 2, -2]} intensity={0.6} />
				<mesh rotation-x={-Math.PI / 2} position-y={-0.03}>
					<circleGeometry args={[60, 32]} />
					<meshStandardMaterial color="#38bdf8" roughness={0.35} />
				</mesh>
				<Putar seret={seret}>
					<group position-y={-AIR_Y}>
						<KapalTamu key={model.id} k={k} i={0} />
					</group>
				</Putar>
			</Canvas>
		</div>
	);
}
