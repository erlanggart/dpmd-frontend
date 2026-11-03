import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * Bungkus area besar (kolam, food court, showroom) yang hanya digambar bila kamera
 * berada dalam `jarak` meter dari pusatnya. Area di balik kabut tidak perlu digambar,
 * dan tokoh/animasi di dalamnya ikut berhenti (Tokoh memeriksa induk yang tak tampak).
 * Diperiksa beberapa kali per detik, bukan tiap frame.
 */
export default function AreaTampak({ x, z, jarak = 150, children }) {
	const grup = useRef();
	const detik = useRef(1);
	useFrame(({ camera }, dt) => {
		detik.current += dt;
		if (detik.current < 0.25 || !grup.current) return;
		detik.current = 0;
		grup.current.visible = Math.hypot(camera.position.x - x, camera.position.z - z) < jarak;
	});
	return <group ref={grup}>{children}</group>;
}
