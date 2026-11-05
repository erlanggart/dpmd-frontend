import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleGeometry, Color, CylinderGeometry, Euler, LatheGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { BAHAN_ORANG, PANJANG_PAHA, PROFIL_BADAN, bentuk, gabung } from "./orang";

// Banyak orang berjalan sekaligus (keramaian mal, pejalan kaki, taman) dengan biaya kecil:
// tiap bagian badan satu InstancedMesh. Ukuran, sendi, dan rumus ayunannya sama dengan Tokoh
// (versi rendah poligon), jadi orang keramaian sekonsep dengan tokoh utama.
// `agen`: larik objek yang digerakkan pemiliknya — { x, y, z, rot, fase, gerak (0..1), tampak,
// baju, celana, kulit, rambut }. Warna dibaca sekali saat dipasang.

// Warna titik putih = warna instans penuh; titik gelap = warna instans digelapkan (sepatu, sabuk).
const PUTIH = "#ffffff";
const GEO = {
	badan: gabung([
		bentuk(new LatheGeometry(PROFIL_BADAN, 10), PUTIH, [0, 0.91, 0], [0, 0, 0], [1, 1, 0.61]),
		bentuk(new CapsuleGeometry(0.082, 0.33, 2, 8), PUTIH, [0, 1.43, 0], [0, 0, Math.PI / 2], [1, 1, 0.72]),
	]),
	// panggul mengikuti warna celana (mesh terpisah dari baju)
	panggul: bentuk(new SphereGeometry(0.182, 10, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), PUTIH, [0, 0.925, 0], [0, 0, 0], [1, 0.42, 0.62]),
	kepala: gabung([
		bentuk(new SphereGeometry(0.112, 12, 9), PUTIH, [0, 0.135, 0.005], [0, 0, 0], [0.93, 1.07, 1]),
		bentuk(new SphereGeometry(0.07, 8, 5), PUTIH, [0, 0.085, 0.045], [0, 0, 0], [1.1, 0.8, 0.9]),
		bentuk(new CylinderGeometry(0.052, 0.06, 0.12, 8), PUTIH, [0, -0.03, 0]),
		bentuk(new SphereGeometry(0.026, 5, 4), PUTIH, [0.105, 0.13, 0], [0, 0, 0], [0.55, 1, 0.9]),
		bentuk(new SphereGeometry(0.026, 5, 4), PUTIH, [-0.105, 0.13, 0], [0, 0, 0], [0.55, 1, 0.9]),
	]),
	// mata & mulut tidak ikut warna instans
	wajah: gabung([
		...[-1, 1].flatMap((s) => [
			bentuk(new SphereGeometry(0.02, 6, 4), "#f8fafc", [s * 0.038, 0.148, 0.092], [0, 0, 0], [1.15, 0.9, 0.6]),
			bentuk(new SphereGeometry(0.0115, 5, 4), "#1b130d", [s * 0.038, 0.148, 0.1035]),
		]),
		bentuk(new TorusGeometry(0.02, 0.0045, 3, 6, Math.PI), "#8d4a3e", [0, 0.096, 0.104], [0, 0, Math.PI]),
	]),
	rambut: gabung([
		bentuk(new SphereGeometry(0.12, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.47), PUTIH, [0, 0.148, -0.006], [0, 0, 0], [0.97, 1.05, 1.02]),
		bentuk(new SphereGeometry(0.07, 8, 4), PUTIH, [0.012, 0.205, 0.07], [0.2, 0, -0.15], [1.25, 0.42, 0.75]),
		bentuk(new SphereGeometry(0.11, 9, 5), PUTIH, [0, 0.12, -0.035], [0, 0, 0], [0.95, 0.9, 0.85]),
	]),
	paha: gabung([
		bentuk(new SphereGeometry(0.078, 8, 5), PUTIH, [0, -0.02, 0]),
		bentuk(new CylinderGeometry(0.078, 0.063, 0.4, 8), PUTIH, [0, -0.21, 0]),
	]),
	// betis + sepatu: warna titik gelap membuat sepatu nyaris hitam apa pun warna celananya
	betis: gabung([
		bentuk(new SphereGeometry(0.064, 8, 5), PUTIH),
		bentuk(new CylinderGeometry(0.063, 0.047, 0.38, 8), PUTIH, [0, -0.19, 0]),
		bentuk(new CapsuleGeometry(0.056, 0.13, 2, 8), "#242424", [0, -0.418, 0.05], [Math.PI / 2, 0, 0], [1.05, 1, 0.72]),
	]),
	lenganAtas: bentuk(new CapsuleGeometry(0.051, 0.2, 2, 8), PUTIH, [0, -0.145, 0], [0, 0, 0], [1, 1, 0.95]),
	lenganBawah: bentuk(new CapsuleGeometry(0.045, 0.17, 2, 8), PUTIH, [0, -0.115, 0]),
	tangan: gabung([
		bentuk(new CylinderGeometry(0.03, 0.033, 0.05, 6), PUTIH, [0, -0.245, 0]),
		bentuk(new SphereGeometry(0.046, 7, 5), PUTIH, [0, -0.29, 0.004], [0, 0, 0], [0.78, 1.12, 0.6]),
	]),
};

// bagian tunggal per orang, bagian berpasangan (kiri & kanan), dan warna instansnya
const TUNGGAL = [["badan", "baju"], ["panggul", "celana"], ["kepala", "kulit"], ["wajah", null], ["rambut", "rambut"]];
const GANDA = [["paha", "celana"], ["betis", "celana"], ["lenganAtas", "baju"], ["lenganBawah", "baju"], ["tangan", "kulit"]];

export default function OrangInstans({ agen }) {
	const n = agen.length;
	const ref = useRef({});
	const bantu = useMemo(() => ({ dasar: new Matrix4(), induk: new Matrix4(), m: new Matrix4(), t: new Matrix4(), q: new Quaternion(), e: new Euler(), v: new Vector3(), s: new Vector3(1, 1, 1), nol: new Matrix4().makeScale(0, 0, 0) }), []);

	useLayoutEffect(() => {
		const c = new Color();
		agen.forEach((a, i) => {
			for (const [nama, warna] of TUNGGAL) if (warna) ref.current[nama].setColorAt(i, c.set(a[warna]));
			for (const [nama, warna] of GANDA) for (const s of [0, 1]) ref.current[nama].setColorAt(i * 2 + s, c.set(a[warna]));
		});
		for (const [nama, warna] of [...TUNGGAL, ...GANDA]) if (warna) ref.current[nama].instanceColor.needsUpdate = true;
	}, [agen]);

	useFrame(() => {
		const { dasar, induk, m, t, q, e, v, s, nol } = bantu;
		const r = ref.current;
		// sendi: induk × (geser ke pangkal) × (putar x); hasilnya ditulis ke `keluar`
		const sendi = (dari, ox, oy, rx, keluar) => {
			e.set(rx, 0, 0);
			q.setFromEuler(e);
			t.compose(v.set(ox, oy, 0), q, s);
			keluar.multiplyMatrices(dari, t);
		};
		agen.forEach((a, i) => {
			if (!a.tampak) {
				for (const [nama] of TUNGGAL) r[nama].setMatrixAt(i, nol);
				for (const [nama] of GANDA) for (const k of [0, 1]) r[nama].setMatrixAt(i * 2 + k, nol);
				return;
			}
			const laju = a.gerak ?? 1;
			const f = a.fase;
			const ayun = Math.sin(f) * 0.7 * laju;
			e.set(0, a.rot, 0);
			q.setFromEuler(e);
			dasar.compose(v.set(a.x, a.y + Math.abs(Math.sin(f)) * 0.04 * laju, a.z), q, s);
			r.badan.setMatrixAt(i, dasar);
			r.panggul.setMatrixAt(i, dasar);
			sendi(dasar, 0, 1.58, 0, m);
			r.kepala.setMatrixAt(i, m);
			r.wajah.setMatrixAt(i, m);
			r.rambut.setMatrixAt(i, m);
			for (const k of [0, 1]) {
				const sisi = k ? 1 : -1;
				const j = i * 2 + k;
				// kaki: paha di pinggul, betis menekuk di lutut
				const kaki = sisi < 0 ? ayun : -ayun;
				const tekuk = Math.max(0, (sisi < 0 ? -1 : 1) * Math.cos(f)) * 1.05 * laju + 0.04 * laju;
				sendi(dasar, sisi * 0.095, 0.9, kaki, induk);
				r.paha.setMatrixAt(j, induk);
				sendi(induk, 0, -PANJANG_PAHA, tekuk, m);
				r.betis.setMatrixAt(j, m);
				// lengan berayun berlawanan dengan kaki di sisinya
				const lengan = (sisi < 0 ? -ayun : ayun) * 0.8;
				const siku = -0.15 - Math.max(0, sisi < 0 ? -ayun : ayun) * 0.4;
				sendi(dasar, sisi * 0.245, 1.43, lengan, induk);
				r.lenganAtas.setMatrixAt(j, induk);
				sendi(induk, 0, -0.29, siku, m);
				r.lenganBawah.setMatrixAt(j, m);
				r.tangan.setMatrixAt(j, m);
			}
		});
		for (const [nama] of [...TUNGGAL, ...GANDA]) r[nama].instanceMatrix.needsUpdate = true;
	});

	const pasang = (nama, jumlah) => <instancedMesh key={nama} ref={(o) => (ref.current[nama] = o)} args={[GEO[nama], BAHAN_ORANG, jumlah]} frustumCulled={false} />;
	return (
		<>
			{TUNGGAL.map(([nama]) => pasang(nama, n))}
			{GANDA.map(([nama]) => pasang(nama, n * 2))}
		</>
	);
}
