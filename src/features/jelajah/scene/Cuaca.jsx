import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from "three";
import { diLuarGedung, posisi } from "../jelajahStore";
import { aturHujan, suara } from "../suaraPancing";
import { dalamDistro, tokoDi } from "./layout";
import { suasana } from "./suasana";

// Cuaca: hujan turun di sekitar kamera (garis-garis air), langit & kabut meredup (lihat
// SiangMalam.jsx), sesekali petir menyambar disusul guntur, dan desau hujan. Mode
// "otomatis" sesekali menurunkan hujan selama 2–4 menit; bisa juga dipaksa cerah / hujan.

const N = 1600;
const KOTAK = { lebar: 46, tinggi: 26 };

export default function Cuaca() {
	const kilat = useRef();
	const jadwal = useRef({ cek: 20, sampai: 0 });
	const garis = useMemo(() => {
		const pos = new Float32Array(N * 6);
		for (let i = 0; i < N; i++) {
			const x = (Math.random() - 0.5) * KOTAK.lebar;
			const y = Math.random() * KOTAK.tinggi;
			const z = (Math.random() - 0.5) * KOTAK.lebar;
			pos.set([x, y, z, x + 0.03, y - 0.55, z], i * 6);
		}
		const g = new BufferGeometry();
		g.setAttribute("position", new Float32BufferAttribute(pos, 3));
		const l = new LineSegments(g, new LineBasicMaterial({ color: "#d6e4f0", transparent: true, opacity: 0, depthWrite: false }));
		l.frustumCulled = false;
		return l;
	}, []);
	useEffect(
		() => () => {
			garis.geometry.dispose();
			garis.material.dispose();
			aturHujan(0);
		},
		[garis],
	);

	useFrame(({ camera }, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		// hujan otomatis: tiap ±1 menit ada peluang hujan turun 2–4 menit
		const j = jadwal.current;
		const kini = performance.now();
		if (suasana.cuaca === "otomatis") {
			j.cek -= dt;
			if (j.cek <= 0) {
				j.cek = 60;
				if (kini > j.sampai && Math.random() < 0.15) j.sampai = kini + (120 + Math.random() * 120) * 1000;
			}
		}
		const target = suasana.cuaca === "hujan" || (suasana.cuaca === "otomatis" && kini < j.sampai) ? 1 : 0;
		suasana.hujan += (target - suasana.hujan) * (1 - Math.exp(-0.5 * dt));
		if (Math.abs(target - suasana.hujan) < 0.003) suasana.hujan = target;
		const h = suasana.hujan;

		// tetes hujan: kotak partikel mengikuti kamera, tidak tampak di dalam gedung/toko
		const diDalam = !diLuarGedung() || tokoDi(posisi.x, posisi.z) || dalamDistro(posisi.x, posisi.z);
		garis.visible = h > 0.02 && !diDalam;
		garis.material.opacity = 0.55 * h;
		aturHujan(h * (diDalam ? 0.35 : 1));
		if (garis.visible) {
			const p = garis.geometry.attributes.position;
			const a = p.array;
			const turun = 22 * dt;
			const cx = camera.position.x;
			const cz = camera.position.z;
			const dasar = camera.position.y - 10;
			const setengah = KOTAK.lebar / 2;
			for (let i = 0; i < N; i++) {
				const o = i * 6;
				let x = a[o];
				let y = a[o + 1] - turun;
				let z = a[o + 2];
				// bungkus ke sekitar kamera
				if (x - cx > setengah) x -= KOTAK.lebar;
				else if (cx - x > setengah) x += KOTAK.lebar;
				if (z - cz > setengah) z -= KOTAK.lebar;
				else if (cz - z > setengah) z += KOTAK.lebar;
				if (y < dasar) y += KOTAK.tinggi;
				else if (y > dasar + KOTAK.tinggi) y -= KOTAK.tinggi;
				a[o] = x;
				a[o + 1] = y;
				a[o + 2] = z;
				a[o + 3] = x + 0.03;
				a[o + 4] = y - 0.55;
				a[o + 5] = z;
			}
			p.needsUpdate = true;
		}

		// petir: kilat terang sekejap, guntur menyusul
		const k = kilat.current;
		k.intensity *= Math.exp(-9 * dt);
		if (h > 0.85 && Math.random() < dt / 25) {
			k.intensity = 3.2;
			setTimeout(() => suara("guntur"), 400 + Math.random() * 1600);
		}
	});

	return (
		<>
			<primitive object={garis} />
			<ambientLight ref={kilat} color="#dbeafe" intensity={0} />
		</>
	);
}
