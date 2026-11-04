import { useLayoutEffect, useRef } from "react";
import { Color, Float32BufferAttribute, Matrix4, Mesh, MeshStandardMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Pembungkus untuk benda STATIS: setelah dipasang, semua mesh berwarna polos di
// dalamnya dipanggang menjadi satu geometri berwarna-per-titik per jenis bahan
// (kilap/kekasaran/flat), lalu mesh aslinya disembunyikan. Puluhan potongan
// (pos satpam, gerbang, teras) jadi 1–3 draw call — penting untuk HP.
// Yang dilewati (tetap digambar sendiri): bertekstur (kecuali prop `tekstur`), transparan, berpendar,
// instanced, bermaterial ganda, atau ditandai userData.tetap.
// Jangan membungkus bagian yang bergerak: posisinya ikut terpanggang.

const bahanBersama = new Map();
function bahanUntuk(m) {
	const kunci = `${m.metalness}|${m.roughness}|${m.flatShading}`;
	if (!bahanBersama.has(kunci)) {
		bahanBersama.set(kunci, new MeshStandardMaterial({ vertexColors: true, metalness: m.metalness, roughness: m.roughness, flatShading: m.flatShading }));
	}
	return bahanBersama.get(kunci);
}

const bisaDigabung = (o) => {
	if (!o.isMesh || o.isInstancedMesh || o.userData.tetap || o.userData.gabungan) return false;
	const m = o.material;
	return !Array.isArray(m) && m.isMeshStandardMaterial && !m.transparent && !m.vertexColors && m.emissive.getHex() === 0;
};
const bisaDigabungTekstur = (o, tekstur) => {
	if (!bisaDigabung(o)) return false;
	return !o.material.map || tekstur;
};

// `tekstur`: ikut menggabung mesh bertekstur (per bahan, uv dipertahankan)
export default function Gabung({ children, bayangan = false, tekstur = false }) {
	const grup = useRef();
	const hasil = useRef();

	useLayoutEffect(() => {
		const g = grup.current;
		const wadah = hasil.current;
		g.updateWorldMatrix(true, true);
		const balik = new Matrix4().copy(g.matrixWorld).invert();
		const ember = new Map(); // bahan → geometri[]
		const sumber = [];
		const warna = new Color();
		g.traverse((o) => {
			if (!bisaDigabungTekstur(o, tekstur)) return;
			// jangan memanggang yang sedang tersembunyi (mis. bagian yang ditampilkan bersyarat)
			for (let p = o; p && p !== g; p = p.parent) if (!p.visible) return;
			let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
			// bahan bertekstur digabung per bahan (uv dipertahankan, warna dari bahannya sendiri)
			const pakaiUv = !!o.material.map;
			for (const nama of Object.keys(geo.attributes)) if (nama !== "position" && nama !== "normal" && !(pakaiUv && nama === "uv")) geo.deleteAttribute(nama);
			geo.applyMatrix4(new Matrix4().multiplyMatrices(balik, o.matrixWorld));
			if (pakaiUv) {
				if (!geo.attributes.uv) return;
				if (!ember.has(o.material)) ember.set(o.material, []);
				ember.get(o.material).push(geo);
				sumber.push(o);
				return;
			}
			warna.copy(o.material.color);
			const n = geo.attributes.position.count;
			const arr = new Float32Array(n * 3);
			for (let i = 0; i < n; i++) arr.set([warna.r, warna.g, warna.b], i * 3);
			geo.setAttribute("color", new Float32BufferAttribute(arr, 3));
			const b = bahanUntuk(o.material);
			if (!ember.has(b)) ember.set(b, []);
			ember.get(b).push(geo);
			sumber.push(o);
		});
		const jadi = [];
		for (const [b, daftar] of ember) {
			const geo = mergeGeometries(daftar);
			daftar.forEach((d) => d.dispose());
			if (geo) jadi.push({ geo, b });
		}
		wadah.clear();
		for (const { geo, b } of jadi) {
			const m = new Mesh(geo, b);
			m.userData.gabungan = true;
			if (bayangan) m.castShadow = m.receiveShadow = true;
			wadah.add(m);
		}
		sumber.forEach((o) => (o.visible = false));
		return () => {
			sumber.forEach((o) => (o.visible = true));
			for (const m of [...wadah.children]) {
				m.geometry.dispose();
				wadah.remove(m);
			}
		};
	}, [bayangan, tekstur]);

	return (
		<group ref={grup}>
			{children}
			<group ref={hasil} />
		</group>
	);
}
