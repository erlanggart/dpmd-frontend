import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";

// Layar LED (videotron) dengan slide yang berganti tiap beberapa detik. Slide
// digambar di kanvas: { judul, sub, logo, angka: [[nilai, label], ...] }.
// Dipakai di menara depan gedung dan di ruang-ruang rapat.

let logoBogor = null;
function ambilLogo(siap) {
	if (!logoBogor) {
		logoBogor = new Image();
		logoBogor.src = "/logo-bogor.png";
	}
	if (logoBogor.complete) siap();
	else logoBogor.addEventListener("load", siap, { once: true });
	return logoBogor;
}

function gambarSlide(c, slide, i) {
	const g = c.getContext("2d");
	const w = c.width;
	const h = c.height;
	const grad = g.createLinearGradient(0, 0, w, h);
	grad.addColorStop(0, "#0d3527");
	grad.addColorStop(1, "#1f6b50");
	g.fillStyle = grad;
	g.fillRect(0, 0, w, h);
	// kisi titik halus khas layar LED
	g.fillStyle = "rgba(255,255,255,.05)";
	for (let y = 0; y < h; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < w; x += 6) g.fillRect(x, y, 1.5, 1.5);
	// dekorasi batang di kanan bawah
	g.fillStyle = "rgba(255,255,255,.08)";
	for (let k = 0; k < 6; k++) g.fillRect(w * 0.66 + k * w * 0.05, h * (0.68 - (0.1 + ((k * 37 + i * 13) % 45) / 100)), w * 0.035, h);

	g.textAlign = slide.logo ? "center" : "left";
	const x0 = slide.logo ? w / 2 : w * 0.06;
	let y = h * 0.4;
	if (slide.logo) {
		const img = ambilLogo(() => {});
		const lh = h * 0.42;
		const lw = lh * (img.naturalWidth / (img.naturalHeight || 1) || 0.86);
		if (img.complete && img.naturalWidth) g.drawImage(img, w / 2 - lw / 2, h * 0.08, lw, lh);
		y = h * 0.66;
	} else {
		g.fillStyle = "#f3d48a";
		g.fillRect(w * 0.06, h * 0.16, w * 0.09, h * 0.025);
	}
	g.fillStyle = slide.logo ? "#f0dc9c" : "#ffffff";
	g.font = `700 ${Math.round(h * (slide.logo ? 0.15 : 0.13))}px "Segoe UI", system-ui, sans-serif`;
	g.fillText(slide.judul, x0, y);
	if (slide.sub) {
		g.font = `500 ${Math.round(h * 0.075)}px "Segoe UI", system-ui, sans-serif`;
		g.fillStyle = "rgba(255,255,255,.88)";
		g.fillText(slide.sub, x0, y + h * 0.13);
	}
	if (slide.angka) {
		const lebar = w * 0.88;
		slide.angka.forEach(([nilai, label], k) => {
			const cx = w * 0.06 + (lebar / slide.angka.length) * (k + 0.5);
			g.textAlign = "center";
			g.fillStyle = "#ffffff";
			g.font = `800 ${Math.round(h * 0.2)}px "Segoe UI", system-ui, sans-serif`;
			g.fillText(String(nilai ?? "—"), cx, h * 0.72);
			g.fillStyle = "#f3d48a";
			g.font = `600 ${Math.round(h * 0.07)}px "Segoe UI", system-ui, sans-serif`;
			g.fillText(label, cx, h * 0.86);
		});
	}
	if (!slide.logo && !slide.angka) {
		g.font = `600 ${Math.round(h * 0.06)}px "Segoe UI", system-ui, sans-serif`;
		g.fillStyle = "#f3d48a";
		g.textAlign = "left";
		g.fillText("DPMD KABUPATEN BOGOR", w * 0.06, h * 0.88);
	}
}

const PUDAR = 0.7; // detik

export default function Videotron({ posisi, rotasi = 0, lebar, tinggi, slide, jeda = 5, bingkai = "#111" }) {
	const kunci = JSON.stringify(slide);
	// "kanvas" = yang tampil; "lama" & "baru" dipakai untuk memudarkan slide
	// lama ke slide baru, bukan berganti mendadak.
	const { tekstur, kanvas, lama, baru } = useMemo(() => {
		const buat = () => {
			const c = document.createElement("canvas");
			c.width = 1024;
			c.height = Math.round((1024 * tinggi) / lebar);
			return c;
		};
		const c = buat();
		const t = new CanvasTexture(c);
		t.colorSpace = SRGBColorSpace;
		t.anisotropy = 4;
		return { tekstur: t, kanvas: c, lama: buat(), baru: buat() };
	}, [lebar, tinggi]);
	const status = useRef({ i: 0, t: 0, pudar: -1 });

	useEffect(() => {
		const daftar = JSON.parse(kunci);
		const gambar = () => {
			gambarSlide(kanvas, daftar[status.current.i % daftar.length], status.current.i);
			tekstur.needsUpdate = true;
		};
		gambar();
		// Gambar ulang setelah logo selesai dimuat.
		if (daftar.some((s) => s.logo)) ambilLogo(gambar);
	}, [kunci, kanvas, tekstur]);
	useEffect(() => () => tekstur.dispose(), [tekstur]);

	useFrame((_, dt) => {
		const s = status.current;
		s.t += dt;
		if (s.pudar >= 0) {
			s.pudar = Math.min(1, s.pudar + dt / PUDAR);
			const g = kanvas.getContext("2d");
			g.globalAlpha = 1;
			g.drawImage(lama, 0, 0);
			g.globalAlpha = s.pudar;
			g.drawImage(baru, 0, 0);
			g.globalAlpha = 1;
			tekstur.needsUpdate = true;
			if (s.pudar >= 1) s.pudar = -1;
			return;
		}
		if (s.t < jeda) return;
		s.t = 0;
		s.i += 1;
		const daftar = JSON.parse(kunci);
		lama.getContext("2d").drawImage(kanvas, 0, 0);
		gambarSlide(baru, daftar[s.i % daftar.length], s.i);
		s.pudar = 0;
	});

	return (
		<group position={posisi} rotation-y={rotasi}>
			<mesh position-z={-0.04}>
				<boxGeometry args={[lebar + 0.16, tinggi + 0.16, 0.08]} />
				<meshStandardMaterial color={bingkai} />
			</mesh>
			{/* Layar sedikit di depan muka bingkai (z = 0). Bila berimpit, keduanya
			    berebut tampil (z-fighting) dan layar tampak berkedip saat kamera bergerak. */}
			<mesh position-z={0.012} renderOrder={1}>
				<planeGeometry args={[lebar, tinggi]} />
				<meshBasicMaterial map={tekstur} toneMapped={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
			</mesh>
		</group>
	);
}
