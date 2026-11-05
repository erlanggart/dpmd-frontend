import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from "three";
import { diLuarGedung, posisi } from "../jelajahStore";
import { aturHujan, suara } from "../suaraPancing";
import { WARUNG_MIE, WARUNG_PECEL, dalamDistro, tokoDi } from "./layout";
import { dalamGedungKhusus } from "./gedungKhusus";
import { suasana } from "./suasana";

// Cuaca: hujan turun di sekitar kamera (garis-garis air), langit & kabut meredup (lihat
// SiangMalam.jsx), sesekali petir menyambar disusul guntur, dan desau hujan. Mode
// "otomatis" sesekali menurunkan hujan 2–4 menit; bisa juga dipaksa cerah / hujan.
// Jadwal hujan otomatis dihitung dari jam (slot 10 menit), bukan diundi per perangkat,
// sehingga semua tamu jelajah bersama mengalami hujan yang sama pada saat yang sama.

const N = 1600;
const SLOT = 10 * 60 * 1000;
// angka semu 0..1 yang sama di semua perangkat untuk slot & urutan tertentu
function acakSlot(slot, k) {
	let h = Math.imul(slot ^ 0x9e3779b9, 2654435761) ^ Math.imul(k + 1, 40503);
	h = Math.imul(h ^ (h >>> 15), 2246822507);
	h = Math.imul(h ^ (h >>> 13), 3266489909);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// Hujan otomatis: ±1 dari 4 slot turun hujan, mulai 0–5 menit, lamanya 2–4 menit.
function hujanTerjadwal(waktu = Date.now()) {
	const slot = Math.floor(waktu / SLOT);
	if (acakSlot(slot, 0) > 0.27) return false;
	const mulai = slot * SLOT + acakSlot(slot, 1) * 5 * 60000;
	const lama = (2 + acakSlot(slot, 2) * 2) * 60000;
	return waktu >= mulai && waktu < mulai + lama;
}
const KOTAK = { lebar: 46, tinggi: 26 };
// atap tenda warung tenda tidak membuat tetes hujan hilang, tapi pemain tidak kehujanan di bawahnya
const bawahTenda = (x, z) => [WARUNG_MIE, WARUNG_PECEL].some((w) => x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1);

export default function Cuaca() {
	const kilat = useRef();
	const jadwal = useRef({ cek: 0, hujan: false });
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
		// hujan otomatis menurut jadwal bersama (dicek tiap 2 detik)
		const j = jadwal.current;
		j.cek -= dt;
		if (j.cek <= 0) {
			j.cek = 2;
			j.hujan = hujanTerjadwal();
		}
		const target = suasana.cuaca === "hujan" || (suasana.cuaca === "otomatis" && j.hujan) ? 1 : 0;
		suasana.hujan += (target - suasana.hujan) * (1 - Math.exp(-0.5 * dt));
		if (Math.abs(target - suasana.hujan) < 0.003) suasana.hujan = target;
		const h = suasana.hujan;

		// tetes hujan: kotak partikel mengikuti kamera, tidak tampak di dalam gedung/toko/McD/mal
		const diDalam = !diLuarGedung() || tokoDi(posisi.x, posisi.z) || dalamDistro(posisi.x, posisi.z) || dalamGedungKhusus(posisi.x, posisi.z);
		suasana.teduh = diDalam || bawahTenda(posisi.x, posisi.z);
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
