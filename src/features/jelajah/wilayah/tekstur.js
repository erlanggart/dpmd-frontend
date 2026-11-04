import { CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from "three";

/*
 * Tekstur prosedural (digambar di kanvas 2D, tanpa unduhan berkas): rumput
 * bergradasi dengan helai & bercak, tanah gembur bergumpal, dan jalan tanah
 * berkerikil. Dibuat sekali lalu dipakai ulang.
 */

const acak = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const cache = new Map();

function buat(nama, ukuran, gambar, ulang) {
	if (cache.has(nama)) return cache.get(nama);
	const c = document.createElement("canvas");
	c.width = c.height = ukuran;
	const g = c.getContext("2d");
	gambar(g, ukuran);
	const t = new CanvasTexture(c);
	t.colorSpace = SRGBColorSpace;
	t.wrapS = t.wrapT = RepeatWrapping;
	t.repeat.set(ulang, ulang);
	t.anisotropy = 8;
	cache.set(nama, t);
	return t;
}

const bercak = (g, u, n, warna, r0, r1, alfa) => {
	for (let i = 0; i < n; i++) {
		const x = acak() * u, y = acak() * u, r = r0 + acak() * (r1 - r0);
		g.globalAlpha = alfa * (0.4 + acak() * 0.6);
		g.fillStyle = warna[Math.floor(acak() * warna.length)];
		// gambar juga di sisi seberang supaya ubin menyambung mulus
		for (const dx of [-u, 0, u]) for (const dy of [-u, 0, u]) {
			g.beginPath();
			g.arc(x + dx, y + dy, r, 0, Math.PI * 2);
			g.fill();
		}
	}
	g.globalAlpha = 1;
};

/** rumput: dasar hijau, bercak tua/muda, helai-helai kecil */
export const teksturRumput = (ulang = 160) => buat(`rumput${ulang}`, 512, (g, u) => {
	g.fillStyle = "#7aa64a";
	g.fillRect(0, 0, u, u);
	bercak(g, u, 60, ["#6a9840", "#86b255", "#739f45", "#8fb85c"], 18, 60, 0.5);
	bercak(g, u, 40, ["#5d8a36", "#9bbf62"], 6, 18, 0.45);
	for (let i = 0; i < 5200; i++) {
		const x = acak() * u, y = acak() * u, h = 3 + acak() * 6;
		g.strokeStyle = ["#5e8c35", "#94bd5c", "#6f9f40", "#a8c96c", "#557f30"][Math.floor(acak() * 5)];
		g.globalAlpha = 0.55 + acak() * 0.45;
		g.lineWidth = 1 + acak();
		g.beginPath();
		g.moveTo(x, y);
		g.lineTo(x + (acak() - 0.5) * 3, y - h);
		g.stroke();
	}
	g.globalAlpha = 1;
	bercak(g, u, 70, ["#e7d26a", "#f8fafc", "#c4b5fd"], 1, 2, 0.6); // bunga liar kecil
}, ulang);

/** tanah gembur (abu-abu terang supaya bisa diwarnai lewat `color`) */
export const teksturTanah = (ulang = 1) => buat(`tanah${ulang}`, 256, (g, u) => {
	g.fillStyle = "#d8d8d8";
	g.fillRect(0, 0, u, u);
	bercak(g, u, 220, ["#b8b8b8", "#f0f0f0", "#a8a8a8"], 2, 7, 0.55);
	bercak(g, u, 90, ["#8a8a8a", "#ffffff"], 1, 2.5, 0.7);
	// alur bekas cangkul
	g.globalAlpha = 0.25;
	g.fillStyle = "#777";
	for (let y = 16; y < u; y += 32) g.fillRect(0, y, u, 5);
	g.globalAlpha = 1;
}, ulang);

/** jalan tanah padat berkerikil */
export const teksturJalan = (ulang = 40) => buat(`jalan${ulang}`, 256, (g, u) => {
	g.fillStyle = "#b8955e";
	g.fillRect(0, 0, u, u);
	bercak(g, u, 120, ["#a8854f", "#c6a571", "#9c7a48"], 4, 14, 0.5);
	bercak(g, u, 260, ["#8b8b83", "#d6d3d1", "#6b5a3a"], 1, 2.6, 0.8);
}, ulang);

/** air sawah: kilau tipis */
export const teksturAir = (ulang = 6) => buat(`air${ulang}`, 256, (g, u) => {
	g.fillStyle = "#6d9aa3";
	g.fillRect(0, 0, u, u);
	bercak(g, u, 50, ["#7fb0b8", "#5e8a93", "#8cc0c6"], 6, 22, 0.35);
}, ulang);

// ------------------------------------------------------------------ bahan bangunan
// Tekstur abu-abu terang, diwarnai lewat `color` bahan supaya satu gambar bisa
// dipakai untuk genteng merah, cokelat, hijau, dsb.

const isi = (g, u, w) => { g.fillStyle = w; g.fillRect(0, 0, u, u); };
const abu = (v) => `rgb(${v},${v},${v})`;

/** genteng tanah liat: baris-baris lengkung bertumpuk */
export const teksturGenteng = () => buat("genteng", 256, (g, u) => {
	isi(g, u, abu(225));
	const t = 32, l = 32;
	for (let y = 0; y < u; y += t) {
		const geser = (y / t) % 2 ? l / 2 : 0;
		for (let x = -l; x < u + l; x += l) {
			const gr = g.createLinearGradient(0, y, 0, y + t);
			gr.addColorStop(0, abu(250));
			gr.addColorStop(0.75, abu(205));
			gr.addColorStop(1, abu(150));
			g.fillStyle = gr;
			g.beginPath();
			g.moveTo(x + geser, y);
			g.lineTo(x + geser + l, y);
			g.lineTo(x + geser + l, y + t - 6);
			g.quadraticCurveTo(x + geser + l / 2, y + t + 4, x + geser, y + t - 6);
			g.closePath();
			g.fill();
			g.strokeStyle = abu(140);
			g.lineWidth = 1.5;
			g.stroke();
		}
	}
	bercak(g, u, 80, [abu(180), abu(255)], 1, 3, 0.35);
}, 1);

/** bilik: anyaman bambu kepang */
export const teksturBilik = () => buat("bilik", 256, (g, u) => {
	isi(g, u, abu(220));
	const k = 16;
	for (let i = 0; i < u / k; i++) for (let j = 0; j < u / k; j++) {
		const x = i * k, y = j * k;
		const datar = (i + j) % 2 === 0;
		g.fillStyle = datar ? abu(238) : abu(200);
		g.fillRect(x, y, k, k);
		g.strokeStyle = abu(datar ? 205 : 170);
		g.lineWidth = 1;
		for (let n = 3; n < k; n += 4) {
			g.beginPath();
			if (datar) { g.moveTo(x, y + n); g.lineTo(x + k, y + n); } else { g.moveTo(x + n, y); g.lineTo(x + n, y + k); }
			g.stroke();
		}
		g.strokeStyle = abu(150);
		g.strokeRect(x + 0.5, y + 0.5, k - 1, k - 1);
	}
}, 1);

/** papan kayu mendatar dengan serat */
export const teksturPapan = () => buat("papan", 256, (g, u) => {
	isi(g, u, abu(215));
	const t = 32;
	for (let y = 0; y < u; y += t) {
		g.fillStyle = abu(200 + Math.floor(acak() * 45));
		g.fillRect(0, y, u, t);
		g.strokeStyle = abu(170);
		g.lineWidth = 1;
		for (let n = 0; n < 6; n++) {
			const yy = y + 4 + acak() * (t - 8);
			g.beginPath();
			g.moveTo(0, yy);
			for (let x = 0; x <= u; x += 32) g.lineTo(x, yy + Math.sin(x * 0.05 + n) * 1.5);
			g.stroke();
		}
		g.fillStyle = abu(110);
		g.fillRect(0, y + t - 2, u, 2);
		const sambung = acak() * u;
		g.fillRect(sambung, y, 2, t);
	}
}, 1);

/** seng gelombang */
export const teksturSeng = () => buat("seng", 128, (g, u) => {
	for (let x = 0; x < u; x++) {
		const v = 170 + Math.round(Math.sin((x / u) * Math.PI * 16) * 55);
		g.fillStyle = abu(v);
		g.fillRect(x, 0, 1, u);
	}
	bercak(g, u, 40, ["rgb(150,120,90)", abu(120)], 1, 4, 0.3); // karat tipis
}, 1);

/** ijuk / rumbia: serat-serat menjuntai */
export const teksturIjuk = () => buat("ijuk", 256, (g, u) => {
	isi(g, u, abu(150));
	for (let i = 0; i < 2600; i++) {
		const x = acak() * u, y = acak() * u;
		g.strokeStyle = abu(110 + Math.floor(acak() * 130));
		g.globalAlpha = 0.7;
		g.lineWidth = 1 + acak();
		g.beginPath();
		g.moveTo(x, y);
		g.lineTo(x + (acak() - 0.5) * 3, y + 10 + acak() * 16);
		g.stroke();
	}
	g.globalAlpha = 1;
	for (let y = 0; y < u; y += 64) { g.fillStyle = abu(90); g.fillRect(0, y, u, 3); }
}, 1);

/** tembok plester */
export const teksturTembok = () => buat("tembok", 256, (g, u) => {
	isi(g, u, abu(238));
	bercak(g, u, 160, [abu(225), abu(250), abu(215)], 3, 14, 0.4);
	bercak(g, u, 200, [abu(205)], 0.5, 1.5, 0.5);
}, 1);

/** pasangan batu kali */
export const teksturBatu = () => buat("batu", 256, (g, u) => {
	isi(g, u, abu(130));
	for (let y = 0; y < u; y += 28) for (let x = (y / 28) % 2 ? -18 : 0; x < u; x += 36) {
		g.fillStyle = abu(175 + Math.floor(acak() * 70));
		g.beginPath();
		g.ellipse(x + 18, y + 14, 16, 11.5, 0, 0, Math.PI * 2);
		g.fill();
		g.strokeStyle = abu(110);
		g.stroke();
	}
}, 1);

/** salinan tekstur dengan ulangan sendiri (gambar dipakai bersama) */
export const ulangi = (t, rx, ry) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };

const cacheBahan = new Map();
/** bahan bertekstur yang dipakai bersama (kunci: jenis + warna + ulangan) */
export function bahanBangunan(jenis, warna, rx = 1, ry = 1, opsi = {}) {
	const kunci = `${jenis}|${warna}|${rx}|${ry}|${JSON.stringify(opsi)}`;
	if (!cacheBahan.has(kunci)) {
		const sumber = { genteng: teksturGenteng, bilik: teksturBilik, papan: teksturPapan, seng: teksturSeng, ijuk: teksturIjuk, tembok: teksturTembok, batu: teksturBatu }[jenis]();
		cacheBahan.set(kunci, new MeshStandardMaterial({ map: ulangi(sumber, rx, ry), color: warna, roughness: 0.92, ...opsi }));
	}
	return cacheBahan.get(kunci);
}
