import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Color, Euler, Matrix4, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3 } from "three";

// Banyak orang berjalan sekaligus (keramaian mal, pejalan kaki di trotoar) dengan biaya kecil:
// tiap bagian badan satu InstancedMesh, kaki & lengan berayun mengikuti fase langkahnya.
// `agen`: larik objek yang digerakkan pemiliknya — { x, y, z, rot, fase, gerak (0..1), tampak,
// baju, celana, kulit, rambut }. Warna dibaca sekali saat dipasang.

const GEO = {
	badan: new BoxGeometry(0.44, 0.6, 0.26),
	kepala: new SphereGeometry(0.13, 10, 8),
	rambut: new SphereGeometry(0.135, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
	kaki: new BoxGeometry(0.15, 0.82, 0.16).translate(0, -0.41, 0),
	lengan: new BoxGeometry(0.1, 0.6, 0.11).translate(0, -0.3, 0),
};
const BAHAN = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 });

export default function OrangInstans({ agen }) {
	const n = agen.length;
	const ref = { badan: useRef(), kepala: useRef(), rambut: useRef(), kaki: useRef(), lengan: useRef() };
	const bantu = useMemo(() => ({ m: new Matrix4(), dasar: new Matrix4(), t: new Matrix4(), q: new Quaternion(), e: new Euler(), v: new Vector3(), s: new Vector3(1, 1, 1), nol: new Matrix4().makeScale(0, 0, 0) }), []);

	useLayoutEffect(() => {
		const c = new Color();
		agen.forEach((a, i) => {
			ref.badan.current.setColorAt(i, c.set(a.baju));
			ref.kepala.current.setColorAt(i, c.set(a.kulit));
			ref.rambut.current.setColorAt(i, c.set(a.rambut));
			for (const s of [0, 1]) {
				ref.kaki.current.setColorAt(i * 2 + s, c.set(a.celana));
				ref.lengan.current.setColorAt(i * 2 + s, c.set(a.baju));
			}
		});
		for (const r of Object.values(ref)) r.current.instanceColor.needsUpdate = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [agen]);

	useFrame(() => {
		const { m, dasar, t, q, e, v, s, nol } = bantu;
		const bagian = (mesh, i, ox, oy, oz, rx) => {
			e.set(rx, 0, 0);
			q.setFromEuler(e);
			t.compose(v.set(ox, oy, oz), q, s);
			m.multiplyMatrices(dasar, t);
			mesh.setMatrixAt(i, m);
		};
		agen.forEach((a, i) => {
			if (!a.tampak) {
				ref.badan.current.setMatrixAt(i, nol);
				ref.kepala.current.setMatrixAt(i, nol);
				ref.rambut.current.setMatrixAt(i, nol);
				for (const k of [0, 1]) {
					ref.kaki.current.setMatrixAt(i * 2 + k, nol);
					ref.lengan.current.setMatrixAt(i * 2 + k, nol);
				}
				return;
			}
			const ayun = Math.sin(a.fase) * 0.55 * (a.gerak ?? 1);
			const naik = Math.abs(Math.cos(a.fase)) * 0.04 * (a.gerak ?? 1);
			e.set(0, a.rot, 0);
			q.setFromEuler(e);
			dasar.compose(v.set(a.x, a.y + naik, a.z), q, s);
			bagian(ref.badan.current, i, 0, 1.15, 0, 0);
			bagian(ref.kepala.current, i, 0, 1.6, 0, 0);
			bagian(ref.rambut.current, i, 0, 1.63, -0.01, 0);
			bagian(ref.kaki.current, i * 2, -0.11, 0.86, 0, ayun);
			bagian(ref.kaki.current, i * 2 + 1, 0.11, 0.86, 0, -ayun);
			bagian(ref.lengan.current, i * 2, -0.28, 1.42, 0, -ayun * 0.8);
			bagian(ref.lengan.current, i * 2 + 1, 0.28, 1.42, 0, ayun * 0.8);
		});
		for (const r of Object.values(ref)) r.current.instanceMatrix.needsUpdate = true;
	});

	return (
		<>
			<instancedMesh ref={ref.badan} args={[GEO.badan, BAHAN, n]} frustumCulled={false} />
			<instancedMesh ref={ref.kepala} args={[GEO.kepala, BAHAN, n]} frustumCulled={false} />
			<instancedMesh ref={ref.rambut} args={[GEO.rambut, BAHAN, n]} frustumCulled={false} />
			<instancedMesh ref={ref.kaki} args={[GEO.kaki, BAHAN, n * 2]} frustumCulled={false} />
			<instancedMesh ref={ref.lengan} args={[GEO.lengan, BAHAN, n * 2]} frustumCulled={false} />
		</>
	);
}
