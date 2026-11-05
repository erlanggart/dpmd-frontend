import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

// --- balon kata: satu sprite bersama, digambar ulang saat orangnya berganti ---
function bungkus(g, teks, maks) {
	const baris = [""];
	for (const k of teks.split(" ")) {
		const coba = (baris[baris.length - 1] + " " + k).trim();
		if (g.measureText(coba).width > maks && baris[baris.length - 1])
			baris.push(k);
		else baris[baris.length - 1] = coba;
	}
	return baris;
}

export function useBalon() {
	return useMemo(() => {
		const c = document.createElement("canvas");
		c.width = 512;
		c.height = 256;
		const t = new CanvasTexture(c);
		t.colorSpace = SRGBColorSpace;
		const FONT = '"Segoe UI", system-ui, sans-serif';
		const tulis = ({ nama, jabatan, ucapan }) => {
			const g = c.getContext("2d");
			g.clearRect(0, 0, 512, 256);
			g.font = `500 28px ${FONT}`;
			const barisUcapan = bungkus(g, ucapan, 440);
			const tinggi = (nama ? 78 : 0) + barisUcapan.length * 34 + 26;
			const y0 = 236 - 18 - tinggi;
			g.fillStyle = "rgba(255,255,255,.97)";
			g.strokeStyle = "rgba(15,23,42,.18)";
			g.lineWidth = 3;
			g.beginPath();
			g.roundRect(16, y0, 480, tinggi, 22);
			g.fill();
			g.stroke();
			g.beginPath();
			g.moveTo(240, y0 + tinggi);
			g.lineTo(256, y0 + tinggi + 16);
			g.lineTo(272, y0 + tinggi);
			g.fill();
			g.textAlign = "center";
			g.textBaseline = "middle";
			let y = y0 + 14;
			if (nama) {
				g.fillStyle = "#0f172a";
				g.font = `700 30px ${FONT}`;
				g.fillText(
					nama.length > 30 ? nama.slice(0, 29) + "…" : nama,
					256,
					y + 18,
				);
				g.fillStyle = "#1f6b50";
				g.font = `600 22px ${FONT}`;
				g.fillText(
					jabatan.length > 40 ? jabatan.slice(0, 39) + "…" : jabatan,
					256,
					y + 50,
				);
				g.fillStyle = "rgba(15,23,42,.1)";
				g.fillRect(60, y + 70, 392, 2);
				y += 78;
			}
			g.fillStyle = "#334155";
			g.font = `500 28px ${FONT}`;
			barisUcapan.forEach((b, i) => g.fillText(b, 256, y + 18 + i * 34));
			t.needsUpdate = true;
		};
		return { tekstur: t, tulis };
	}, []);
}

// Balon sapaan penjual & pejalan di kawasan (lihat BalonSuasana.jsx). Satu balon sekaligus;
// `sumber` boleh objek yang terus bergerak ({ x, z }), balonnya ikut berjalan bersama orang itu.
export const kabarBalon = { teks: null, sumber: null, sampai: 0, baru: false };

export function sapaBalon(teks, sumber) {
	Object.assign(kabarBalon, { teks, sumber, sampai: performance.now() + 2500 + teks.length * 50, baru: true });
}
