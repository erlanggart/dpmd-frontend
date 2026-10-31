import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';

// Menggambar teks ke kanvas 2D lalu menjadikannya tekstur. Lebih ringan daripada
// memuat font 3D, dan tetap tajam karena resolusinya mengikuti ukuran papan.
function buatTekstur({ lebar, tinggi, latar, aksen, baris }) {
	const skala = 256;
	const c = document.createElement("canvas");
	c.width = Math.round(lebar * skala);
	c.height = Math.round(tinggi * skala);
	const g = c.getContext("2d");

	g.fillStyle = latar;
	g.fillRect(0, 0, c.width, c.height);
	if (aksen) {
		g.fillStyle = aksen;
		g.fillRect(0, 0, c.width, Math.max(10, c.height * 0.09));
	}

	g.textBaseline = "middle";
	for (const b of baris) {
		let ukuran = b.ukuran * skala;
		g.font = `${b.tebal ? 700 : 500} ${ukuran}px ${FONT}`;
		const maks = c.width * 0.9;
		const w = g.measureText(b.teks).width;
		if (w > maks) {
			ukuran *= maks / w;
			g.font = `${b.tebal ? 700 : 500} ${ukuran}px ${FONT}`;
		}
		g.fillStyle = b.warna || "#16241e";
		g.textAlign = b.rata || "center";
		const x = b.rata === "left" ? c.width * 0.06 : b.rata === "right" ? c.width * 0.94 : c.width / 2;
		g.fillText(b.teks, x, b.y * c.height);
	}

	const t = new CanvasTexture(c);
	t.colorSpace = SRGBColorSpace;
	t.anisotropy = 4;
	return t;
}

// `diterangi`: papan ikut terkena cahaya adegan, dipakai untuk tulisan yang menempel
// di dinding agar warnanya menyatu dengan dinding di sekitarnya.
export default function Papan({ posisi, rotasi = 0, lebar, tinggi, latar = "#ffffff", aksen, baris, bingkai, diterangi }) {
	const kunci = JSON.stringify([lebar, tinggi, latar, aksen, baris]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const tekstur = useMemo(() => buatTekstur({ lebar, tinggi, latar, aksen, baris }), [kunci]);
	useEffect(() => () => tekstur.dispose(), [tekstur]);

	return (
		<group position={posisi} rotation-y={rotasi}>
			{bingkai && (
				<mesh position-z={-0.03}>
					<boxGeometry args={[lebar + 0.12, tinggi + 0.12, 0.05]} />
					<meshStandardMaterial color={bingkai} />
				</mesh>
			)}
			<mesh>
				<planeGeometry args={[lebar, tinggi]} />
				{diterangi ? <meshStandardMaterial map={tekstur} /> : <meshBasicMaterial map={tekstur} toneMapped={false} />}
			</mesh>
		</group>
	);
}
