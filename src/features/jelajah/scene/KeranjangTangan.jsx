import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Matrix4 } from "three";
import { BARANG_PER_ID, LAMA_AMBIL, belanja, useBelanja } from "../belanja";
import { GEO_KERANJANG, geometriBarang } from "./barangToko";
import { BAHAN_WARNA, gabung } from "./geometri";

// Keranjang belanja yang ditenteng tangan kiri tamu beserta isinya, dan barang yang sedang
// diambil tangan kanan dari rak (mengikuti `belanja.ambil`). Koordinat lokal tokoh (menghadap +z).
const KERANJANG = [-0.36, 0.57, 0.02];
const BAHU_KANAN = [0.245, 1.43, 0];
const LENGAN = 0.6;

// Isi keranjang (id barang dipisah koma) → satu geometri, barang disusun 3×2 per lapis.
function geomIsi(kunci) {
	const daftar = kunci.split(",").filter((id) => BARANG_PER_ID[id]);
	if (!daftar.length) return null;
	const m = new Matrix4();
	const s = new Matrix4().makeScale(0.7, 0.7, 0.7);
	return gabung(
		daftar.map((id, i) => {
			const lapis = Math.floor(i / 6);
			const j = i % 6;
			const c = geometriBarang(BARANG_PER_ID[id]).clone();
			c.applyMatrix4(s);
			c.applyMatrix4(m.makeTranslation(((j % 3) - 1) * 0.13, 0.015 + lapis * 0.08, (Math.floor(j / 3) - 0.5) * 0.13));
			return c;
		}),
	);
}

// Keranjang di tangan tamu lain (dari kiriman jelajah bersama: s.kr).
export function KeranjangTamu({ sumber }) {
	const grup = useRef();
	const isi = useRef();
	const kunci = useRef(null);
	useFrame(() => {
		const kr = sumber()?.kr;
		grup.current.visible = Array.isArray(kr);
		const k = Array.isArray(kr) ? kr.join(",") : "";
		if (k === kunci.current) return;
		kunci.current = k;
		isi.current.geometry?.dispose();
		const g = geomIsi(k);
		isi.current.geometry = g || isi.current.geometry;
		isi.current.visible = !!g;
	});
	useEffect(() => () => isi.current?.geometry?.dispose(), []);
	return (
		<group ref={grup} visible={false}>
			<group position={KERANJANG} rotation-y={Math.PI / 2}>
				<mesh geometry={GEO_KERANJANG} material={BAHAN_WARNA} />
				<mesh ref={isi} material={BAHAN_WARNA} visible={false} />
			</group>
		</group>
	);
}

export default function KeranjangTangan() {
	useBelanja();
	const kunci = belanja.keranjang.join(",");
	const isi = useMemo(() => (kunci ? geomIsi(kunci) : null), [kunci]);
	useEffect(() => () => isi?.dispose(), [isi]);

	const tangan = useRef();
	const idTangan = useRef(null);
	useFrame(() => {
		const a = belanja.ambil;
		const t = a ? a.t / LAMA_AMBIL : 0;
		const o = tangan.current;
		o.visible = !!a && t > 0.4;
		if (!o.visible) return;
		if (idTangan.current !== a.id) {
			o.geometry = geometriBarang(BARANG_PER_ID[a.id]);
			idTangan.current = a.id;
		}
		// paruh pertama tangan menjangkau rak, paruh kedua barang dibawa ke keranjang
		const jangkau = t < 0.5 ? t * 2 : 2 - t * 2;
		const sudut = jangkau * 1.4;
		const hx = BAHU_KANAN[0];
		const hy = BAHU_KANAN[1] - LENGAN * Math.cos(sudut) - 0.1;
		const hz = LENGAN * Math.sin(sudut);
		const u = Math.max(0, (t - 0.5) * 2);
		o.position.set(hx + (KERANJANG[0] - hx) * u, hy + (KERANJANG[1] + 0.12 - hy) * u, hz + (KERANJANG[2] - hz) * u);
	});

	return (
		<group visible={belanja.bawaKeranjang}>
			<group position={KERANJANG} rotation-y={Math.PI / 2}>
				<mesh geometry={GEO_KERANJANG} material={BAHAN_WARNA} />
				{isi && <mesh geometry={isi} material={BAHAN_WARNA} />}
			</group>
			<mesh ref={tangan} material={BAHAN_WARNA} visible={false} />
		</group>
	);
}
