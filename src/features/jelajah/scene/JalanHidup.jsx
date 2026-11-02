import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Color, CylinderGeometry, MeshStandardMaterial, Object3D, SphereGeometry } from "three";
import { posisi, posisiNpc } from "../jelajahStore";
import { pemainLain } from "../multipemain";
import { BAHAN_WARNA, gabung, kotak, warnai } from "./geometri";
import { BAHAN_LALIN, GEOM_MOBIL, GEOM_MOTOR, GEOM_PENGENDARA, WARNA_MOBIL, WARNA_MOTOR } from "./geomLalin";
import { KENDARAAN_LALIN } from "./lalinKawasan";
import { KENDARAAN } from "./kendaraan";
import { JALAN, PAGAR_DEPAN } from "./layout";
import { suasana } from "./suasana";
import { laporTabrak } from "../tenaga";

// Jalan raya di depan kantor yang hidup: lampu jalan (menyala saat malam) dan
// lalu lintas dua arah. Kendaraan lalu lintas memakai InstancedMesh — belasan
// kendaraan cukup beberapa draw call. Lajur kiri (lalu lintas Indonesia): yang ke
// +x di sisi kantor, yang ke −x di seberang. Mereka melambat & berhenti memberi
// jalan bagi pengunjung (atau tamu lain, atau mobil kantor) yang ada di lajurnya,
// dan menjaga jarak dengan kendaraan di depannya.

// kendaraan muncul lagi dari ujung lain setelah lewat batas ini (masih di ruas jalan
// yang lurus; lewat dari sini jalan OSM berbelok)
const UJUNG = 66;
const TENGAH = (JALAN.aspal0 + JALAN.aspal1) / 2;
const LAJUR = {
	mobil: { 1: TENGAH - 2.0, [-1]: TENGAH + 2.0 },
	motor: { 1: TENGAH - 3.1, [-1]: TENGAH + 3.1 },
};
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

// Titik-titik yang harus dihindari kendaraan: pengunjung, tamu lain, mobil/motor kantor.
function halangan() {
	const h = [{ x: posisi.x, z: posisi.z }];
	for (const p of pemainLain.values()) if (p.s && p.s.y < 1) h.push({ x: p.s.x, z: p.s.z });
	for (const k of KENDARAAN) h.push({ x: k.x, z: k.z });
	for (const q of posisiNpc.values()) if (q.lantai === 0 && q.z > 28 && q.z < 43) h.push(q);
	return h;
}

function LaluLintas() {
	const daftar = useMemo(susunLaluLintas, []);
	const mobil = useMemo(() => daftar.filter((k) => k.jenis === "mobil"), [daftar]);
	const motor = useMemo(() => daftar.filter((k) => k.jenis === "motor"), [daftar]);
	const refMobil = useRef();
	const refMotor = useRef();
	const refPengendara = useRef();
	// ikut terdengar oleh suara mesin lalu lintas terdekat (suasanaSuara.js)
	useEffect(() => {
		daftar.forEach((k) => KENDARAAN_LALIN.add(k));
		return () => daftar.forEach((k) => KENDARAAN_LALIN.delete(k));
	}, [daftar]);

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
				if (Math.abs(p.z - k.z) > 1.2) continue;
				const d = (p.x - k.x) * k.arah;
				if (d > 0 && d < bebas) bebas = d;
			}
			for (const l of daftar) {
				if (l === k || l.arah !== k.arah || Math.abs(l.z - k.z) > 1.3) continue;
				const d = (l.x - k.x) * k.arah;
				if (d > 0 && d < bebas) bebas = d - (l.jenis === "mobil" ? 2.5 : 1);
			}
			const sasaran = bebas < 4 ? 0 : bebas < 12 ? (k.jelajah * (bebas - 4)) / 8 : k.jelajah;
			const ubah = sasaran < k.laju ? 7 : 3; // rem lebih cepat dari gas
			k.laju += Math.max(-ubah * dt, Math.min(ubah * dt, sasaran - k.laju));
			k.x += k.arah * k.laju * dt;
			// menghantam pengunjung (yang berjalan kaki) bila tak sempat berhenti
			if (k.laju > 2 && posisi.y < 0.5 && !posisi.kend && Math.abs(posisi.z - k.z) < (k.jenis === "mobil" ? 1.15 : 0.6) && Math.abs(posisi.x - k.x) < (k.jenis === "mobil" ? 2.3 : 1.0)) {
				laporTabrak({ vx: k.arah, vz: (posisi.z - k.z) * 0.6, laju: k.laju, jenis: k.jenis });
			}
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
