import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color } from "three";
import { malamMenurutJam, suasana } from "./suasana";

// Suasana mengikuti jam WIB: langit, kabut, dan cahaya bergeser dari siang ke
// malam (senja 17.30–18.30, fajar 05.00–06.00). Di malam hari jendela gedung &
// lampu jalan menyala; cahaya di dalam kantor tetap cukup terang (lampu ruangan
// menyala), jadi menjelajah malam tetap nyaman.
const LANGIT = [new Color("#cfe6f1"), new Color("#0d1830")];
const LANGIT_ATAS = [new Color("#ffffff"), new Color("#7d8fc2")];
const TANAH_BAWAH = [new Color("#a8a49b"), new Color("#2b2a35")];
const MATAHARI = [new Color("#fff3dc"), new Color("#9fb4ff")];

export default function SiangMalam() {
	const scene = useThree((s) => s.scene);
	const langit = useRef();
	const sinar = useRef();
	const jam = useRef({ t: 1e9, nilai: 0 });

	useFrame((_, dt) => {
		// jam dibaca tiap beberapa detik saja
		const j = jam.current;
		j.t += dt;
		if (j.t > 5) {
			j.t = 0;
			j.nilai = malamMenurutJam();
		}
		const target = suasana.paksa === "siang" ? 0 : suasana.paksa === "malam" ? 1 : j.nilai;
		const m0 = suasana.malam;
		if (m0 === target && sinar.current.userData.siap) return;
		const m = Math.abs(target - m0) < 0.002 ? target : m0 + (target - m0) * (1 - Math.exp(-2.5 * dt));
		suasana.malam = m;
		sinar.current.userData.siap = true;

		if (scene.background?.isColor) scene.background.lerpColors(LANGIT[0], LANGIT[1], m);
		if (scene.fog) scene.fog.color.lerpColors(LANGIT[0], LANGIT[1], m);
		langit.current.color.lerpColors(LANGIT_ATAS[0], LANGIT_ATAS[1], m);
		langit.current.groundColor.lerpColors(TANAH_BAWAH[0], TANAH_BAWAH[1], m);
		langit.current.intensity = 1.15 - 0.45 * m;
		sinar.current.color.lerpColors(MATAHARI[0], MATAHARI[1], m);
		sinar.current.intensity = 1.5 - 1.15 * m;
	});

	return (
		<>
			<hemisphereLight ref={langit} args={["#ffffff", "#a8a49b", 1.15]} />
			<directionalLight ref={sinar} position={[12, 25, 10]} intensity={1.5} color="#fff3dc" />
		</>
	);
}
