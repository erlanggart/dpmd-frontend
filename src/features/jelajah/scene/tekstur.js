import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

// Tekstur yang digambar di kanvas saat dimuat: tanpa berkas gambar tambahan untuk
// diunduh, dan tiap tekstur dibuat sekali lalu dipakai bersama (cache di modul).

const cache = new Map();

function buat(kunci, w, h, gambar, ulang = [1, 1]) {
	if (!cache.has(kunci)) {
		const c = document.createElement("canvas");
		c.width = w;
		c.height = h;
		gambar(c.getContext("2d"), w, h);
		const t = new CanvasTexture(c);
		t.wrapS = t.wrapT = RepeatWrapping;
		t.colorSpace = SRGBColorSpace;
		t.anisotropy = 8;
		cache.set(kunci, t);
	}
	const t = cache.get(kunci).clone();
	t.repeat.set(...ulang);
	t.needsUpdate = true;
	return t;
}

// Bilangan acak berbiji supaya pola sama di setiap kunjungan.
function acak(seed) {
	let s = seed;
	return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// Paving blok susun bata (running bond). Satu ubin tekstur = 1,6 × 1,6 m.
function paving(palet, nat) {
	return (g, w, h) => {
		const r = acak(7);
		g.fillStyle = nat;
		g.fillRect(0, 0, w, h);
		const bw = w / 4;
		const bh = h / 8;
		for (let baris = 0; baris < 8; baris++) {
			const geser = baris % 2 ? bw / 2 : 0;
			for (let i = -1; i < 5; i++) {
				g.fillStyle = palet[Math.floor(r() * palet.length)];
				g.fillRect(i * bw + geser + 1.5, baris * bh + 1.5, bw - 3, bh - 3);
			}
		}
	};
}

export const teksturPaving = (ulang) =>
	buat("paving", 256, 256, paving(["#a8a49b", "#b1ada4", "#9f9b92", "#aba79e"], "#7d7a73"), ulang);

export const teksturPavingParkir = (ulang) =>
	buat("paving-parkir", 256, 256, paving(["#c09a74", "#b78f69", "#c8a47e", "#b3895f"], "#8a6c50"), ulang);

export const teksturPavingJalan = (ulang) =>
	buat("paving-jalan", 256, 256, paving(["#d6cdbb", "#cfc5b2", "#dcd3c2"], "#a69c89"), ulang);

// Keramik kantor 60 × 60 cm: satu ubin tekstur = 2 × 2 keramik.
export const teksturKeramik = (ulang) =>
	buat(
		"keramik",
		128,
		128,
		(g, w, h) => {
			g.fillStyle = "#b9bcbd";
			g.fillRect(0, 0, w, h);
			for (const [x, y, c] of [
				[0, 0, "#e4e5e3"],
				[1, 0, "#dfe0de"],
				[0, 1, "#e1e2e0"],
				[1, 1, "#e6e7e5"],
			]) {
				g.fillStyle = c;
				g.fillRect(x * 64 + 1, y * 64 + 1, 62, 62);
			}
		},
		ulang,
	);

// Marmer putih lobi dengan urat abu tipis.
export const teksturMarmer = (ulang) =>
	buat(
		"marmer",
		256,
		256,
		(g, w, h) => {
			const r = acak(11);
			g.fillStyle = "#c9c6c0";
			g.fillRect(0, 0, w, h);
			for (const [x, y] of [
				[0, 0],
				[1, 0],
				[0, 1],
				[1, 1],
			]) {
				g.fillStyle = "#f2f0eb";
				g.fillRect(x * 128 + 1, y * 128 + 1, 126, 126);
				g.strokeStyle = "rgba(150,145,138,.35)";
				g.lineWidth = 1.2;
				for (let k = 0; k < 3; k++) {
					g.beginPath();
					let px = x * 128 + r() * 128;
					let py = y * 128;
					g.moveTo(px, py);
					for (let s = 0; s < 6; s++) {
						px += (r() - 0.5) * 40;
						py += 21;
						g.lineTo(Math.max(x * 128, Math.min(x * 128 + 127, px)), py);
					}
					g.stroke();
				}
			}
		},
		ulang,
	);

// Panel kayu bilah tegak (dinding lobi, meja resepsionis).
export const teksturKayu = (ulang) =>
	buat(
		"kayu",
		128,
		128,
		(g, w, h) => {
			const r = acak(5);
			for (let i = 0; i < 8; i++) {
				const t = 0.9 + r() * 0.2;
				g.fillStyle = `rgb(${Math.round(196 * t)},${Math.round(150 * t)},${Math.round(104 * t)})`;
				g.fillRect(i * 16, 0, 16, h);
				g.fillStyle = "rgba(90,60,30,.35)";
				g.fillRect(i * 16, 0, 1.5, h);
			}
		},
		ulang,
	);

// Bingkai batu alam di dinding sambutan.
export const teksturBatu = (ulang) =>
	buat(
		"batu",
		128,
		128,
		(g, w, h) => {
			const r = acak(3);
			g.fillStyle = "#77736c";
			g.fillRect(0, 0, w, h);
			for (let y = 0; y < h; y += 16) {
				let x = -r() * 20;
				while (x < w) {
					const bw = 18 + r() * 22;
					const t = 0.85 + r() * 0.3;
					g.fillStyle = `rgb(${Math.round(170 * t)},${Math.round(166 * t)},${Math.round(158 * t)})`;
					g.fillRect(x + 1, y + 1, bw - 2, 14);
					x += bw;
				}
			}
		},
		ulang,
	);

// Daun pintu kayu berukir garis miring, seperti pintu di lobi kantor.
export const teksturPintuKayu = () =>
	buat("pintu-kayu", 128, 256, (g, w, h) => {
		g.fillStyle = "#9b6b43";
		g.fillRect(0, 0, w, h);
		g.strokeStyle = "rgba(70,42,20,.55)";
		g.lineWidth = 3;
		g.strokeRect(10, 10, w - 20, h - 20);
		g.lineWidth = 2;
		for (let i = 0; i < 6; i++) {
			const y = 40 + i * 32;
			g.beginPath();
			g.moveTo(24, y);
			g.lineTo(w / 2, y + 20);
			g.lineTo(w - 24, y);
			g.stroke();
		}
		g.fillStyle = "#c9b27a";
		g.fillRect(w - 26, h / 2 - 3, 14, 6);
	});
