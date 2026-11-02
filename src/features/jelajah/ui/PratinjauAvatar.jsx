import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import Tokoh from "../scene/Tokoh";

// Pratinjau avatar 3D di panel gaya: berputar pelan sendiri, bisa diseret ke kiri/kanan
// untuk melihat dari segala sisi. Dimuat terpisah (lazy) dari halaman.

function Putar({ seret, children }) {
	const g = useRef();
	useFrame((_, dt) => {
		const s = seret.current;
		if (!s.aktif) s.sudut += dt * 0.45 * (performance.now() - s.terakhir > 1500 ? 1 : 0);
		g.current.rotation.y += (s.sudut - g.current.rotation.y) * (1 - Math.exp(-10 * dt));
	});
	return <group ref={g}>{children}</group>;
}

export default function PratinjauAvatar({ penampilan }) {
	const seret = useRef({ aktif: false, x: 0, sudut: 0.5, terakhir: 0 });
	const s = seret.current;
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
			<Canvas dpr={[1, 2]} camera={{ fov: 30, position: [0, 1.0, 4.3] }} onCreated={({ camera }) => camera.lookAt(0, 0.86, 0)}>
				<ambientLight intensity={1.4} />
				<directionalLight position={[2, 4, 3]} intensity={1.8} />
				<directionalLight position={[-3, 2, -2]} intensity={0.6} />
				<Putar seret={seret}>
					<Tokoh penampilan={penampilan} pose="diam" />
				</Putar>
			</Canvas>
		</div>
	);
}
