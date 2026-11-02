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

export default function KeranjangTangan() {
	useBelanja();
	const kunci = belanja.keranjang.join(",");
	const isi = useMemo(() => {
		if (!kunci) return null;
		const m = new Matrix4();
		const s = new Matrix4().makeScale(0.7, 0.7, 0.7);
		return gabung(
			kunci.split(",").map((id, i) => {
				const lapis = Math.floor(i / 6);
				const j = i % 6;
				const c = geometriBarang(BARANG_PER_ID[id]).clone();
				c.applyMatrix4(s);
				c.applyMatrix4(m.makeTranslation(((j % 3) - 1) * 0.13, 0.015 + lapis * 0.08, (Math.floor(j / 3) - 0.5) * 0.13));
				return c;
			}),
		);
	}, [kunci]);
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
