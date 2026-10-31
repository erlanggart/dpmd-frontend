import { BoxGeometry, Color, Float32BufferAttribute, MeshStandardMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Penggabung geometri statis: banyak potongan berwarna dijadikan satu geometri
// berwarna-per-titik dengan satu material bersama, sehingga satu benda (mobil,
// pos satpam, gerbang) hanya satu draw call, bukan satu per potongan.

export const BAHAN_WARNA = new MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
export const BAHAN_LOGAM = new MeshStandardMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.35 });

const warna = new Color();

// `geom` dipakai langsung (jangan dibagi); posisi/rotasi/skala ditanam ke titiknya.
export function warnai(geom, w, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) {
	const g = geom.index ? geom.toNonIndexed() : geom;
	if (g.attributes.uv) g.deleteAttribute("uv");
	g.scale(...s);
	if (r[0]) g.rotateX(r[0]);
	if (r[1]) g.rotateY(r[1]);
	if (r[2]) g.rotateZ(r[2]);
	g.translate(...p);
	warna.set(w);
	const n = g.attributes.position.count;
	const arr = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) arr.set([warna.r, warna.g, warna.b], i * 3);
	g.setAttribute("color", new Float32BufferAttribute(arr, 3));
	return g;
}

// Kotak berwarna: ukuran `u` = [lx, ly, lz] di posisi `p`, putaran-y `ry`.
export const kotak = (u, w, p, ry = 0) => warnai(new BoxGeometry(...u), w, { p, r: [0, ry, 0] });

export const gabung = (daftar) => mergeGeometries(daftar.filter(Boolean));
