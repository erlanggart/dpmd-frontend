import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { kebun } from "../kebun";
import { posWarga } from "./wargaDesa";
import { pemainWilayah } from "./uiWilayah";

/*
 * Label DOM yang menempel pada benda 3D (teks melayang hasil panen, nama warga,
 * gelembung obrolan). Elemen mendaftar di `layar`; `useProyektor` (di dalam
 * Canvas) memindahkan posisinya tiap frame tanpa render ulang React.
 * Isi: { el, jenis: "efek"|"nama"|"obrol", id, tinggi }
 */
export const layar = new Map();

const v = new Vector3();
export function useProyektor() {
	const { camera, size } = useThree();
	useFrame(() => {
		const kini = performance.now();
		for (const it of layar.values()) {
			const el = it.el;
			if (!el) continue;
			let x, y, z, alfa = 1, skala = 1;
			if (it.jenis === "efek") {
				const e = kebun.efek.find((f) => f.id === it.id);
				if (!e) { el.style.opacity = "0"; continue; }
				const u = (kini - e.mulai) / 1700;
				x = e.x; z = e.z; y = e.y + u * 1.6;
				alfa = u < 0.12 ? u / 0.12 : 1 - Math.max(0, (u - 0.65) / 0.35);
				skala = e.besar * (u < 0.12 ? 0.5 + (u / 0.12) * 0.7 : 1.2 - Math.min(0.2, (u - 0.12) * 0.8));
			} else {
				const pw = posWarga.get(it.id);
				if (!pw) continue;
				x = pw.x; z = pw.z; y = it.tinggi;
				const d = Math.hypot(pw.x - pemainWilayah.x, pw.z - pemainWilayah.z);
				if (it.jenis === "nama") alfa = d < 10 ? Math.min(1, (10 - d) / 2.5) : 0;
				else alfa = 1;
				skala = Math.max(0.7, Math.min(1, 9 / Math.max(1, camera.position.distanceTo(v.set(x, y, z)))));
			}
			v.set(x, y, z).project(camera);
			if (v.z > 1 || alfa <= 0.01) { el.style.opacity = "0"; continue; }
			const sx = ((v.x + 1) / 2) * size.width, sy = ((1 - v.y) / 2) * size.height;
			el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -100%) scale(${skala.toFixed(3)})`;
			el.style.opacity = String(alfa);
		}
	});
}
