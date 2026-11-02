import { useMemo } from "react";
import { ConeGeometry, CylinderGeometry, ExtrudeGeometry, IcosahedronGeometry, Shape, SphereGeometry } from "three";
import { BAHAN_LOGAM, BAHAN_WARNA, gabung, warnai } from "./geometri";

// Model ikan low-poly dari parameter spesies (pancing.js): panjang 1 m, kepala ke +z.
// Dipanggang menjadi satu geometri berwarna per spesies (tersimpan), jadi tiap ikan
// cukup satu draw call (+1 untuk mata yang menyala).

const cache = new Map();

// Sirip tipis dari kontur (z, y) di bidang tegak.
function sirip(titik, warna, { x = 0, tebal = 0.012 } = {}) {
	const s = new Shape(titik.map(([z, y]) => ({ x: z, y })));
	const g = new ExtrudeGeometry(s, { depth: tebal, bevelEnabled: false });
	// bentuk digambar di bidang xy (x = z ikan) → putar supaya x jadi z
	g.rotateY(-Math.PI / 2);
	g.translate(x + tebal / 2, 0, 0);
	return warnai(g, warna);
}

function bangun(ikan) {
	const { warna: w, bentuk: b } = ikan;
	const T = b.tinggi;
	const L = b.lebar;
	const bagian = [];
	const belut = b.ekor === "belut";

	// badan: punggung gelap + perut terang menyembul di bawah
	bagian.push(warnai(new IcosahedronGeometry(0.5, 2), w.punggung, { s: [L, T, 1] }));
	bagian.push(warnai(new IcosahedronGeometry(0.5, 2), w.perut, { s: [L * 0.9, T * 0.72, 0.9], p: [0, -T * 0.2, 0.02] }));

	// ekor, berpangkal di ujung belakang badan
	const KONTUR_EKOR = {
		garpu: [[0, 0], [-0.3, T * 0.62], [-0.2, 0], [-0.3, -T * 0.62]],
		bulat: [[0, 0], [-0.14, T * 0.5], [-0.26, T * 0.35], [-0.29, 0], [-0.26, -T * 0.35], [-0.14, -T * 0.5]],
		pisau: [[0.15, -T * 0.25], [-0.45, -T * 0.05], [-0.56, 0], [-0.45, T * 0.05], [-0.1, -T * 0.32]],
	};
	if (KONTUR_EKOR[b.ekor]) {
		const ekor = sirip(KONTUR_EKOR[b.ekor], w.sirip);
		ekor.translate(0, 0, -0.42);
		bagian.push(ekor);
	}

	// sirip punggung, dada, dan perut
	if (belut) {
		bagian.push(sirip([[0.1, T * 0.4], [-0.5, T * 0.15], [-0.5, -T * 0.15], [0.1, -T * 0.4], [-0.2, -T * 0.6], [-0.2, T * 0.6]], w.sirip));
	} else {
		bagian.push(sirip([[0.18, T * 0.42], [0.02, T * 0.78], [-0.24, T * 0.5], [-0.3, T * 0.3]], w.sirip));
		bagian.push(sirip([[-0.08, -T * 0.4], [-0.2, -T * 0.66], [-0.3, -T * 0.3]], w.sirip));
		for (const sisi of [-1, 1]) {
			const g = sirip([[0.22, -T * 0.08], [0.06, -T * 0.32], [0.04, -T * 0.08]], w.sirip);
			g.rotateZ(sisi * 0.6);
			g.translate(sisi * L * 0.45, 0, 0);
			bagian.push(g);
		}
	}

	// mata (yang menyala digambar terpisah)
	for (const sisi of [-1, 1]) {
		const p = [sisi * L * 0.4, T * 0.12, 0.36];
		if (!b.mataNyala) bagian.push(warnai(new SphereGeometry(0.035, 8, 6), "#f8fafc", { p }));
		bagian.push(warnai(new SphereGeometry(0.02, 6, 5), "#0b0b0b", { p: [p[0] + sisi * 0.018, p[1], p[2] + 0.012] }));
	}

	// kumis
	if (b.kumis) {
		for (const sisi of [-1, 1]) {
			for (const [y, sudut] of [[0, 0.35], [-T * 0.12, 0.7]]) {
				const g = new CylinderGeometry(0.006, 0.01, 0.3, 4);
				g.rotateX(Math.PI / 2);
				g.rotateY(sisi * sudut);
				g.translate(sisi * L * 0.25 + sisi * 0.08, y - T * 0.05, 0.56);
				bagian.push(warnai(g, w.punggung));
			}
		}
	}
	// duri di punggung (Raja Situ)
	if (b.duri) {
		for (let i = 0; i < 6; i++) bagian.push(warnai(new ConeGeometry(0.035, 0.16, 5), w.sirip, { p: [0, T * 0.5, 0.25 - i * 0.1], r: [-0.4, 0, 0] }));
		for (const sisi of [-1, 1]) bagian.push(warnai(new ConeGeometry(0.03, 0.18, 5), "#d6d3c4", { p: [sisi * L * 0.3, T * 0.32, 0.38], r: [0.6, 0, -sisi * 0.6] }));
	}
	// belang gelap & tutul
	if (b.belang) for (let i = 0; i < 4; i++) bagian.push(warnai(new IcosahedronGeometry(0.5, 1), w.sirip, { s: [L * 1.02, T * 0.95, 0.035], p: [0, T * 0.05, 0.2 - i * 0.14] }));
	if (b.tutul)
		for (let i = 0; i < 8; i++) {
			const sisi = i % 2 ? 1 : -1;
			bagian.push(warnai(new SphereGeometry(0.025, 6, 4), "#3b3f46", { p: [sisi * L * 0.47, -T * 0.05 + (i % 3) * 0.03, -0.25 + Math.floor(i / 2) * 0.08] }));
		}

	const mata = b.mataNyala
		? gabung([-1, 1].map((sisi) => warnai(new SphereGeometry(0.04, 8, 6), b.mataNyala, { p: [sisi * L * 0.4, T * 0.12, 0.36] })))
		: null;
	return { badan: gabung(bagian), mata };
}

function geometriIkan(ikan) {
	if (!cache.has(ikan.id)) cache.set(ikan.id, bangun(ikan));
	return cache.get(ikan.id);
}

// `panjang` dalam meter. Geometri disimpan per spesies, jadi tidak dibuang saat unmount.
export default function ModelIkan({ ikan, panjang = 1, ...props }) {
	const g = useMemo(() => geometriIkan(ikan), [ikan]);
	const kilau = ikan.bentuk.kilau;
	return (
		<group {...props}>
			<group scale={panjang}>
				<mesh geometry={g.badan} material={kilau ? BAHAN_LOGAM : BAHAN_WARNA} />
				{g.mata && (
					<mesh geometry={g.mata}>
						<meshBasicMaterial vertexColors toneMapped={false} />
					</mesh>
				)}
			</group>
		</group>
	);
}
