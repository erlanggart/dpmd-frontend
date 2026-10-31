import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Color, CylinderGeometry, MeshStandardMaterial, Object3D, SphereGeometry } from "three";
import { posisi } from "../jelajahStore";
import { pemainLain } from "../multipemain";
import { BAHAN_WARNA, gabung, kotak, warnai } from "./geometri";
import { KENDARAAN } from "./kendaraan";
import { JALAN, PAGAR_DEPAN } from "./layout";
import { suasana } from "./suasana";

// Jalan raya di depan kantor yang hidup: lampu jalan (menyala saat malam) dan
// lalu lintas dua arah. Kendaraan lalu lintas memakai InstancedMesh — belasan
// kendaraan cukup beberapa draw call. Lajur kiri (lalu lintas Indonesia): yang ke
// +x di sisi kantor, yang ke −x di seberang. Mereka melambat & berhenti memberi
// jalan bagi pengunjung (atau tamu lain, atau mobil kantor) yang ada di lajurnya,
// dan menjaga jarak dengan kendaraan di depannya.

const UJUNG = 88; // kendaraan muncul lagi dari ujung lain setelah lewat batas ini
const TENGAH = (JALAN.aspal0 + JALAN.aspal1) / 2;
const LAJUR = {
	mobil: { 1: TENGAH - 2.0, [-1]: TENGAH + 2.0 },
	motor: { 1: TENGAH - 3.1, [-1]: TENGAH + 3.1 },
};
const WARNA_MOBIL = ["#e5e7eb", "#1f2937", "#9ca3af", "#b91c1c", "#1e3a8a", "#f5f5f4", "#334155"];
const WARNA_MOTOR = ["#111827", "#b91c1c", "#1d4ed8", "#f5f5f4", "#047857", "#6b7280"];

function acakBiji(seed) {
	let s = seed;
	return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function susunLaluLintas() {
	const r = acakBiji(7);
	const daftar = [];
	const tambah = (jenis, n) => {
		for (let i = 0; i < n; i++) {
			const arah = i % 2 ? -1 : 1;
			const jelajah = jenis === "mobil" ? 8 + r() * 3 : 9 + r() * 4;
			daftar.push({ jenis, arah, x: -UJUNG + r() * UJUNG * 2, z: LAJUR[jenis][arah], laju: jelajah, jelajah, warna: (jenis === "mobil" ? WARNA_MOBIL : WARNA_MOTOR)[Math.floor(r() * 6.99)] });
		}
	};
	tambah("mobil", 6);
	tambah("motor", 8);
	return daftar;
}

// Geometri: badan diberi warna putih supaya warna per-instance yang menentukan catnya.
const GEOM_MOBIL = gabung([
	kotak([1.8, 0.62, 4], "#ffffff", [0, 0.62, 0]),
	kotak([1.6, 0.55, 2.2], "#2a3138", [0, 1.2, -0.25]),
	kotak([1.62, 0.08, 1.9], "#ffffff", [0, 1.5, -0.3]),
	...[-0.6, 0.6].map((x) => kotak([0.38, 0.14, 0.03], "#fff8e0", [x, 0.72, 2.01])),
	...[-0.65, 0.65].map((x) => kotak([0.32, 0.12, 0.03], "#7f1d1d", [x, 0.75, -2.01])),
	...[
		[-0.86, 1.3],
		[0.86, 1.3],
		[-0.86, -1.3],
		[0.86, -1.3],
	].map(([x, z]) => warnai(new CylinderGeometry(0.33, 0.33, 0.24, 12), "#141414", { p: [x, 0.33, z], r: [0, 0, Math.PI / 2] })),
]);
const GEOM_MOTOR = gabung([
	kotak([0.3, 0.42, 1.3], "#ffffff", [0, 0.62, 0]),
	kotak([0.28, 0.1, 0.65], "#1b1b1b", [0, 0.88, -0.15]),
	...[0.62, -0.62].map((z) => warnai(new CylinderGeometry(0.3, 0.3, 0.12, 12), "#141414", { p: [0, 0.3, z], r: [0, 0, Math.PI / 2] })),
]);
// Pengendara motor (tidak ikut diwarnai cat motor): badan, lengan ke setang, helm.
const GEOM_PENGENDARA = gabung([
	kotak([0.42, 0.55, 0.28], "#374151", [0, 1.25, -0.12]),
	kotak([0.36, 0.14, 0.6], "#1f2937", [0, 0.98, 0.05]),
	warnai(new BoxGeometry(0.1, 0.1, 0.5), "#374151", { p: [-0.2, 1.3, 0.2], r: [0.5, 0, 0] }),
	warnai(new BoxGeometry(0.1, 0.1, 0.5), "#374151", { p: [0.2, 1.3, 0.2], r: [0.5, 0, 0] }),
	warnai(new SphereGeometry(0.17, 10, 8), "#e5e7eb", { p: [0, 1.68, -0.08] }),
]);
const BAHAN_LALIN = new MeshStandardMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.45 });

// Titik-titik yang harus dihindari kendaraan: pengunjung, tamu lain, mobil/motor kantor.
function halangan() {
	const h = [{ x: posisi.x, z: posisi.z }];
	for (const p of pemainLain.values()) if (p.s && p.s.y < 1) h.push({ x: p.s.x, z: p.s.z });
	for (const k of KENDARAAN) h.push({ x: k.x, z: k.z });
	return h;
}

function LaluLintas() {
	const daftar = useMemo(susunLaluLintas, []);
	const mobil = useMemo(() => daftar.filter((k) => k.jenis === "mobil"), [daftar]);
	const motor = useMemo(() => daftar.filter((k) => k.jenis === "motor"), [daftar]);
	const refMobil = useRef();
	const refMotor = useRef();
	const refPengendara = useRef();

	useLayoutEffect(() => {
		const w = new Color();
		mobil.forEach((k, i) => refMobil.current.setColorAt(i, w.set(k.warna)));
		motor.forEach((k, i) => refMotor.current.setColorAt(i, w.set(k.warna)));
		refMobil.current.instanceColor.needsUpdate = true;
		refMotor.current.instanceColor.needsUpdate = true;
	}, [mobil, motor]);

	const o = useMemo(() => new Object3D(), []);
	useFrame((_, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		const h = halangan();
		for (const k of daftar) {
			// jarak bebas di depan: halangan di lajurnya & kendaraan di depan searah
			let bebas = Infinity;
			for (const p of h) {
				if (Math.abs(p.z - k.z) > 1.7) continue;
				const d = (p.x - k.x) * k.arah;
				if (d > 0 && d < bebas) bebas = d;
			}
			for (const l of daftar) {
				if (l === k || l.arah !== k.arah || Math.abs(l.z - k.z) > 1.3) continue;
				const d = (l.x - k.x) * k.arah;
				if (d > 0 && d < bebas) bebas = d - (l.jenis === "mobil" ? 2.5 : 1);
			}
			const sasaran = bebas < 4 ? 0 : bebas < 12 ? (k.jelajah * (bebas - 4)) / 8 : k.jelajah;
			const ubah = sasaran < k.laju ? 9 : 3; // rem lebih cepat dari gas
			k.laju += Math.max(-ubah * dt, Math.min(ubah * dt, sasaran - k.laju));
			k.x += k.arah * k.laju * dt;
			if (k.x * k.arah > UJUNG) k.x = -k.arah * UJUNG;
		}
		const tulis = (ref, kumpulan) => {
			kumpulan.forEach((k, i) => {
				o.position.set(k.x, 0, k.z);
				o.rotation.set(0, (k.arah * Math.PI) / 2, 0);
				o.updateMatrix();
				ref.current.setMatrixAt(i, o.matrix);
			});
			ref.current.instanceMatrix.needsUpdate = true;
		};
		tulis(refMobil, mobil);
		tulis(refMotor, motor);
		tulis(refPengendara, motor);
	});

	return (
		<>
			<instancedMesh ref={refMobil} args={[GEOM_MOBIL, BAHAN_LALIN, mobil.length]} frustumCulled={false} />
			<instancedMesh ref={refMotor} args={[GEOM_MOTOR, BAHAN_LALIN, motor.length]} frustumCulled={false} />
			<instancedMesh ref={refPengendara} args={[GEOM_PENGENDARA, BAHAN_WARNA, motor.length]} frustumCulled={false} />
		</>
	);
}

// Lampu jalan di tepi trotoar depan kantor, menghadap jalan; bohlamnya menyala malam.
const GEOM_TIANG = gabung([
	warnai(new CylinderGeometry(0.06, 0.08, 5, 8), "#4b5563", { p: [0, 2.5, 0] }),
	kotak([0.06, 0.06, 1.4], "#4b5563", [0, 4.95, 0.65]),
	kotak([0.36, 0.12, 0.5], "#374151", [0, 4.88, 1.3]),
]);
const GEOM_BOHLAM = new BoxGeometry(0.3, 0.04, 0.42);

function LampuJalan() {
	const titik = useMemo(() => {
		const [g0, g1] = PAGAR_DEPAN.gerbang;
		const hasil = [];
		// tidak tepat di depan lobi (x 0) supaya tak menghalangi kamera ke pintu masuk
		for (let x = -47.25; x <= 54; x += 13.5) if (x < g0 - 1 || x > g1 + 1) hasil.push(x);
		return hasil;
	}, []);
	const tiang = useRef();
	const bohlam = useRef();
	const bahanBohlam = useMemo(() => new MeshStandardMaterial({ color: "#f1f5f9", emissive: "#ffd27a", emissiveIntensity: 0 }), []);
	useEffect(() => () => bahanBohlam.dispose(), [bahanBohlam]);

	useLayoutEffect(() => {
		const o = new Object3D();
		const z = JALAN.kanstin - 0.25;
		titik.forEach((x, i) => {
			o.position.set(x, 0, z);
			o.updateMatrix();
			tiang.current.setMatrixAt(i, o.matrix);
			o.position.set(x, 4.81, z + 1.3);
			o.updateMatrix();
			bohlam.current.setMatrixAt(i, o.matrix);
		});
		tiang.current.instanceMatrix.needsUpdate = true;
		bohlam.current.instanceMatrix.needsUpdate = true;
	}, [titik]);

	useFrame(() => {
		bahanBohlam.emissiveIntensity = suasana.malam * 2.2;
	});

	return (
		<>
			<instancedMesh ref={tiang} args={[GEOM_TIANG, BAHAN_WARNA, titik.length]} />
			<instancedMesh ref={bohlam} args={[GEOM_BOHLAM, bahanBohlam, titik.length]} />
		</>
	);
}

export default function JalanHidup() {
	return (
		<>
			<LampuJalan />
			<LaluLintas />
		</>
	);
}
