import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import Tokoh from "../scene/Tokoh";

// Pratinjau avatar 3D berputar pelan di panel gaya, supaya pakaian yang dipilih terlihat
// jelas walau tokoh di dunia tertutup panel. Dimuat terpisah (lazy) dari halaman.

function Putar({ children }) {
	const g = useRef();
	useFrame((_, dt) => (g.current.rotation.y += dt * 0.7));
	return <group ref={g}>{children}</group>;
}

export default function PratinjauAvatar({ penampilan }) {
	return (
		<Canvas dpr={[1, 2]} camera={{ fov: 30, position: [0, 1.1, 3.4] }} onCreated={({ camera }) => camera.lookAt(0, 0.95, 0)}>
			<ambientLight intensity={1.4} />
			<directionalLight position={[2, 4, 3]} intensity={1.8} />
			<directionalLight position={[-3, 2, -2]} intensity={0.6} />
			<Putar>
				<Tokoh penampilan={penampilan} pose="diam" />
			</Putar>
		</Canvas>
	);
}
