import { useEffect, useMemo } from "react";
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from "three";

// Pelat nomor merah kendaraan dinas Pemda Kabupaten Bogor ("F 12312 F"): tulisan putih di
// dasar merah, bulan-tahun berlaku di bawahnya. Nomornya acak tapi tetap per kendaraan
// (dari id), jadi semua tamu jelajah bersama melihat nomor yang sama.

function nomorPlat(id) {
	let h = 2166136261;
	for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	const n = 1000 + ((h >>> 0) % 99000);
	return `F ${n} F`;
}

function buatBahan(teks) {
	const c = document.createElement("canvas");
	c.width = 320;
	c.height = 96;
	const g = c.getContext("2d");
	g.fillStyle = "#c81e1e";
	g.fillRect(0, 0, c.width, c.height);
	g.strokeStyle = "#ffffff";
	g.lineWidth = 5;
	g.strokeRect(6, 6, c.width - 12, c.height - 12);
	g.fillStyle = "#ffffff";
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.font = '800 54px "Segoe UI", Arial, sans-serif';
	g.fillText(teks, c.width / 2, 42, c.width - 30);
	g.font = '700 16px "Segoe UI", Arial, sans-serif';
	g.fillText("08 · 30", c.width / 2, 80);
	const t = new CanvasTexture(c);
	t.colorSpace = SRGBColorSpace;
	t.anisotropy = 4;
	return new MeshBasicMaterial({ map: t, toneMapped: false });
}

export default function Plat({ id, posisi, rotasi = 0, lebar = 0.5, tinggi = 0.15 }) {
	const bahan = useMemo(() => buatBahan(nomorPlat(id)), [id]);
	useEffect(
		() => () => {
			bahan.map.dispose();
			bahan.dispose();
		},
		[bahan],
	);
	return (
		<mesh position={posisi} rotation-y={rotasi} material={bahan}>
			<planeGeometry args={[lebar, tinggi]} />
		</mesh>
	);
}
