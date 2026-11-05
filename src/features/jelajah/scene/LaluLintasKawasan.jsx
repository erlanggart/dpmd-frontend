import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Euler, Matrix4, Quaternion, Vector3 } from "three";
import { posisi } from "../jelajahStore";
import { SAPAAN_JALAN, SAPAAN_MALAM, SAPAAN_PAGI } from "../suaraOrang";
import { sapaBalon } from "./balonKata";
import { laporTabrak } from "../tenaga";
import { BAHAN_WARNA } from "./geometri";
import {
	BAHAN_LALIN,
	GEOM_BUS,
	GEOM_DRUM_MOLEN,
	GEOM_MOBIL,
	GEOM_MOLEN,
	GEOM_MOTOR,
	GEOM_PENGENDARA,
	GEOM_TRONTON,
	GEOM_TRUK_SAMPAH,
	WARNA_BUS,
	WARNA_MOBIL,
	WARNA_MOTOR,
	WARNA_TRONTON,
} from "./geomLalin";
import { tabrakKawasan } from "./kawasanBantu";
import { JALUR, KENDARAAN_LALIN, TITIK_MUNCUL, lanjutDi, titikDi } from "./lalinKawasan";
import OrangInstans from "./OrangInstans";
import { suasana } from "./suasana";
import { warnaAcak } from "./warnaOrang";

// Lalu lintas & pejalan kaki di seluruh jalan kawasan (kompleks Pemda sampai koridor Jl. Tegar
// Beriman): mobil, motor, bus kota, truk sampah, truk molen, dan tronton menyusuri ruas OSM di
// lajur kiri, berbelok di persimpangan, menjaga jarak, dan mengerem untuk pejalan. Supaya
// ringan, kendaraan & pejalan hanya hidup di sekitar pemain — yang tertinggal jauh dimunculkan
// lagi di jalan sekitar pemain. Pejalan kaki di trotoar menyapa saat berpapasan.

const JENIS = {
	mobil: { n: 14, laju: [8, 12], panjang: 4.2, lajur: 0.27, geom: GEOM_MOBIL, warna: WARNA_MOBIL },
	motor: { n: 18, laju: [9, 13], panjang: 1.8, lajur: 0.38, geom: GEOM_MOTOR, warna: WARNA_MOTOR },
	bus: { n: 3, laju: [7, 9], panjang: 10.5, lajur: 0.26, geom: GEOM_BUS, warna: WARNA_BUS, besar: true },
	sampah: { n: 2, laju: [5, 7], panjang: 7.8, lajur: 0.26, geom: GEOM_TRUK_SAMPAH, besar: true },
	molen: { n: 2, laju: [5, 7.5], panjang: 8.2, lajur: 0.26, geom: GEOM_MOLEN, besar: true },
	tronton: { n: 3, laju: [6, 8.5], panjang: 11.2, lajur: 0.26, geom: GEOM_TRONTON, warna: WARNA_TRONTON, besar: true },
};
const DEKAT = [45, 170]; // cincin munculnya kendaraan di sekitar pemain
const JAUH = 230;

function acakBiji(seed) {
	let s = seed;
	return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// Taruh agen di titik ruas acak dalam cincin [r0, r1] dari pemain.
function munculkan(a, r0, r1, boleh) {
	for (let coba = 0; coba < 25; coba++) {
		const t = TITIK_MUNCUL[Math.floor(Math.random() * TITIK_MUNCUL.length)];
		if (!boleh(JALUR[t.j])) continue;
		const q = titikDi(t.j, t.s);
		const d = Math.hypot(q.x - posisi.x, q.z - posisi.z);
		if (d < r0 || d > r1) continue;
		a.j = t.j;
		a.s = t.s;
		a.arah = Math.random() < 0.5 ? 1 : -1;
		a.hidup = true;
		return true;
	}
	a.hidup = false;
	return false;
}

function Kendaraan() {
	const agen = useMemo(() => {
		const r = acakBiji(11);
		const hasil = [];
		for (const [jenis, c] of Object.entries(JENIS)) {
			for (let i = 0; i < c.n; i++) {
				const jelajah = c.laju[0] + r() * (c.laju[1] - c.laju[0]);
				hasil.push({ jenis, c, i, j: 0, s: 0, arah: 1, laju: jelajah * 0.6, jelajah, x: 0, z: 0, rot: 0, hx: 0, hz: 1, hidup: false, tampak: false, putar: 0, warna: c.warna ? c.warna[Math.floor(r() * c.warna.length)] : "#ffffff" });
			}
		}
		return hasil;
	}, []);
	const ref = useRef({});
	const refPengendara = useRef();
	const refDrum = useRef();
	const bantu = useMemo(() => ({ m: new Matrix4(), t: new Matrix4(), q: new Quaternion(), e: new Euler(), v: new Vector3(), s: new Vector3(1, 1, 1), nol: new Matrix4().makeScale(0, 0, 0), titik: {} }), []);
	const tunda = useRef(0);

	useEffect(() => {
		agen.forEach((a) => KENDARAAN_LALIN.add(a));
		return () => agen.forEach((a) => KENDARAAN_LALIN.delete(a));
	}, [agen]);

	useLayoutEffect(() => {
		const w = new Color();
		for (const jenis of Object.keys(JENIS)) {
			const m = ref.current[jenis];
			if (!m) continue;
			agen.filter((a) => a.jenis === jenis).forEach((a, i) => m.setColorAt(i, w.set(a.warna)));
			m.instanceColor.needsUpdate = true;
		}
	}, [agen]);

	useFrame((_, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		const { m, t, q, e, v, s, nol, titik } = bantu;
		// kendaraan yang tertinggal jauh dimunculkan lagi (bergiliran, tidak semua sekaligus)
		tunda.current -= dt;
		const bolehMuncul = tunda.current <= 0;
		for (const a of agen) {
			const jauh = Math.hypot(a.x - posisi.x, a.z - posisi.z);
			if (!a.hidup || jauh > JAUH) {
				if (bolehMuncul && munculkan(a, DEKAT[0], DEKAT[1], (r) => !a.c.besar || r.besar)) {
					tunda.current = 0.15;
					titikDi(a.j, a.s, titik);
					a.x = titik.x;
					a.z = titik.z;
					a.laju = a.jelajah * 0.7;
				}
				if (!a.hidup) continue;
			}
		}
		for (const a of agen) {
			if (!a.hidup) continue;
			// jarak bebas di depan: pemain di lajurnya & kendaraan searah di depan
			let bebas = Infinity;
			const lx = a.hz;
			const lz = -a.hx;
			const px = posisi.x - a.x;
			const pz = posisi.z - a.z;
			const fp = px * a.hx + pz * a.hz;
			if (fp > 0 && fp < 18 && Math.abs(px * lx + pz * lz) < 2 && posisi.y < 3) bebas = fp - a.c.panjang / 2 - 1;
			for (const b of agen) {
				if (b === a || !b.hidup || b.hx * a.hx + b.hz * a.hz < 0.4) continue;
				const dx = b.x - a.x;
				const dz = b.z - a.z;
				const f = dx * a.hx + dz * a.hz;
				if (f <= 0 || f > 30 || Math.abs(dx * lx + dz * lz) > 1.7) continue;
				bebas = Math.min(bebas, f - (a.c.panjang + b.c.panjang) / 2 - 1.5);
			}
			const sasaran = bebas < 2 ? 0 : bebas < 14 ? (a.jelajah * (bebas - 2)) / 12 : a.jelajah;
			const ubah = sasaran < a.laju ? 7 : 2.5;
			a.laju += Math.max(-ubah * dt, Math.min(ubah * dt, sasaran - a.laju));
			a.s += a.arah * a.laju * dt;
			const r = JALUR[a.j];
			if (a.s > r.panjang || a.s < 0) {
				const lanjut = lanjutDi(a.j, a.s > r.panjang ? 1 : 0, (rr) => !a.c.besar || rr.besar);
				if (lanjut) Object.assign(a, lanjut);
				else {
					// jalan buntu: putar balik
					a.arah *= -1;
					a.s = Math.max(0, Math.min(r.panjang, a.s));
				}
			}
			titikDi(a.j, a.s, titik);
			a.hx = titik.dx * a.arah;
			a.hz = titik.dz * a.arah;
			// lajur kiri (lalu lintas Indonesia): kiri arah hadap = (hz, −hx)
			const geser = Math.min(2.4, JALUR[a.j].lebar * a.c.lajur);
			const tx = titik.x + a.hz * geser;
			const tz = titik.z - a.hx * geser;
			const lompat = Math.hypot(tx - a.x, tz - a.z) > 4;
			const f = lompat ? 1 : 1 - Math.exp(-10 * dt);
			a.x += (tx - a.x) * f;
			a.z += (tz - a.z) * f;
			const ke = Math.atan2(a.hx, a.hz);
			a.rot = lompat ? ke : a.rot + Math.atan2(Math.sin(ke - a.rot), Math.cos(ke - a.rot)) * Math.min(1, dt * 5);
			a.putar += dt * 1.6;
			// menyerempet pejalan kaki yang tak sempat dihindari
			if (a.laju > 2.5 && !posisi.kend && posisi.y < 0.5) {
				const fp2 = (posisi.x - a.x) * a.hx + (posisi.z - a.z) * a.hz;
				const lp2 = Math.abs((posisi.x - a.x) * lx + (posisi.z - a.z) * lz);
				if (Math.abs(fp2) < a.c.panjang / 2 && lp2 < (a.jenis === "motor" ? 0.6 : 1.25)) laporTabrak({ vx: a.hx, vz: a.hz, laju: a.laju, jenis: a.jenis === "motor" ? "motor" : "mobil" });
			}
		}
		// tulis matriks per jenis
		const indeks = {};
		let iPengendara = 0;
		let iDrum = 0;
		for (const a of agen) {
			const mesh = ref.current[a.jenis];
			const i = (indeks[a.jenis] = (indeks[a.jenis] ?? -1) + 1);
			if (!mesh) continue;
			if (!a.hidup) {
				mesh.setMatrixAt(i, nol);
				if (a.jenis === "motor") refPengendara.current.setMatrixAt(iPengendara++, nol);
				if (a.jenis === "molen") refDrum.current.setMatrixAt(iDrum++, nol);
				continue;
			}
			e.set(0, a.rot, 0);
			q.setFromEuler(e);
			m.compose(v.set(a.x, 0.04, a.z), q, s);
			mesh.setMatrixAt(i, m);
			if (a.jenis === "motor") refPengendara.current.setMatrixAt(iPengendara++, m);
			if (a.jenis === "molen") {
				// drum molen berputar pada sumbunya yang miring ke belakang
				e.set(Math.PI / 2 - 0.25, a.putar, 0, "XYZ");
				q.setFromEuler(e);
				t.compose(v.set(0, 2.4, -1.0), q, s);
				m.multiply(t);
				refDrum.current.setMatrixAt(iDrum++, m);
			}
		}
		for (const mesh of [...Object.values(ref.current), refPengendara.current, refDrum.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true;
	});

	return (
		<>
			{Object.entries(JENIS).map(([jenis, c]) => (
				<instancedMesh key={jenis} ref={(el) => (ref.current[jenis] = el)} args={[c.geom, BAHAN_LALIN, c.n]} frustumCulled={false} />
			))}
			<instancedMesh ref={refPengendara} args={[GEOM_PENGENDARA, BAHAN_WARNA, JENIS.motor.n]} frustumCulled={false} />
			<instancedMesh ref={refDrum} args={[GEOM_DRUM_MOLEN, BAHAN_WARNA, JENIS.molen.n]} frustumCulled={false} />
		</>
	);
}

// ---------- pejalan kaki di trotoar ----------

const N_PEJALAN = 28;

function Pejalan() {
	const agen = useMemo(() => {
		const r = acakBiji(23);
		return Array.from({ length: N_PEJALAN }, () => ({ ...warnaAcak(r), j: 0, s: 0, arah: 1, sisi: r() < 0.5 ? 1 : -1, laju: 1.1 + r() * 0.5, x: 0, y: 0.04, z: 0, rot: 0, fase: r() * 6, gerak: 1, tampak: false, hidup: false, sapaLagi: 0, perempuan: r() < 0.5 }));
	}, []);
	const titik = useMemo(() => ({}), []);
	useFrame((_, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		const kini = performance.now();
		for (const a of agen) {
			if (!a.hidup || Math.hypot(a.x - posisi.x, a.z - posisi.z) > 130) {
				a.tampak = false;
				if (!munculkan(a, 18, 100, () => true)) continue;
				titikDi(a.j, a.s, titik);
				const geser = JALUR[a.j].lebar / 2 + 1.4;
				a.x = titik.x + titik.dz * geser * a.sisi;
				a.z = titik.z - titik.dx * geser * a.sisi;
				if (tabrakKawasan(a.x, a.z, 0.3)) {
					a.hidup = false;
					continue;
				}
			}
			// berhenti sebentar bila tamu tepat di depannya
			const px = posisi.x - a.x;
			const pz = posisi.z - a.z;
			const jarak = Math.hypot(px, pz);
			const hadap = (px * Math.sin(a.rot) + pz * Math.cos(a.rot)) / (jarak || 1);
			const tertahan = jarak < 1.3 && hadap > 0.5 && posisi.y < 3;
			a.gerak += ((tertahan ? 0 : 1) - a.gerak) * Math.min(1, dt * 8);
			if (!tertahan) {
				a.s += a.arah * a.laju * dt;
				const r = JALUR[a.j];
				if (a.s > r.panjang || a.s < 0) {
					const lanjut = lanjutDi(a.j, a.s > r.panjang ? 1 : 0);
					if (lanjut) Object.assign(a, lanjut);
					else {
						a.arah *= -1;
						a.s = Math.max(0, Math.min(r.panjang, a.s));
					}
				}
				a.fase += dt * 7 * a.laju;
			}
			titikDi(a.j, a.s, titik);
			const geser = JALUR[a.j].lebar / 2 + 1.4;
			const nx = titik.x + titik.dz * geser * a.sisi;
			const nz = titik.z - titik.dx * geser * a.sisi;
			// trotoar menembus gedung/pohon: balik arah
			if (tabrakKawasan(nx, nz, 0.25)) {
				a.arah *= -1;
				continue;
			}
			const lompat = Math.hypot(nx - a.x, nz - a.z) > 3;
			a.x = lompat ? nx : a.x + (nx - a.x) * Math.min(1, dt * 10);
			a.z = lompat ? nz : a.z + (nz - a.z) * Math.min(1, dt * 10);
			const ke = Math.atan2(titik.dx * a.arah, titik.dz * a.arah);
			a.rot += Math.atan2(Math.sin(ke - a.rot), Math.cos(ke - a.rot)) * Math.min(1, dt * 6);
			a.tampak = true;
			// menyapa saat berpapasan dengan tamu
			if (jarak < 2.4 && kini > a.sapaLagi && !posisi.kend) {
				a.sapaLagi = kini + 45000;
				const jam = suasana.malam > 0.6 ? SAPAAN_MALAM : suasana.pagi ? SAPAAN_PAGI : SAPAAN_JALAN;
				sapaBalon(jam[Math.floor(Math.random() * jam.length)], a);
			}
		}
	});
	return <OrangInstans agen={agen} />;
}

export default function LaluLintasKawasan() {
	return (
		<>
			<Kendaraan />
			<Pejalan />
		</>
	);
}
