import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from "three";
import { penampilanAvatar } from "../avatar";
import { FILM, HARGA_TIKET, bioskop } from "../bioskop";
import { posisi } from "../jelajahStore";
import { kenakanGaya } from "../lemari";
import Gabung from "./Gabung";
import {
	AIR_MANCUR,
	AULA_CCM,
	BUTIK_CCM,
	ESKALATOR_CCM,
	KASIR_BUTIK,
	KONTER_KOPI,
	LAHAN_CCM,
	LAYAR,
	LOKET,
	MANEKIN_CCM,
	MEJA_KOPI,
	PENGUNJUNG_CCM,
	STUDIO,
	TINGGI_CCM,
} from "./gedungKhusus";
import { KURSI_BIOSKOP, KURSI_KOPI, penampilanWarga } from "./layout";
import Papan from "./Papan";
import { usePudar } from "./pudar";
import { suasana } from "./suasana";
import Tokoh from "./Tokoh";

// Cibinong City Mall: massa mal 20 m di Jl. Tegar Beriman dengan muka kaca & papan nama
// besar. Aula lantai dasar bisa dimasuki: supermarket (Minimarket.jsx, TOKO "ccm"), butik,
// eskalator, air mancur, kedai kopi, dan bioskop — loket di aula, studio berkursi merah
// dengan layar yang memutar film saat tamu bertiket duduk. Dipasang di grup halaman.

const L = LAHAN_CCM;
const A = AULA_CCM;
const T = TINGGI_CCM;
const WARNA_MASSA = "#ebe6dd";
const BAHAN_KACA = new MeshStandardMaterial({ color: "#7fb2d6", transparent: true, opacity: 0.32, roughness: 0.08, metalness: 0.4, emissive: "#fff3d6", emissiveIntensity: 0 });
const BAHAN_PITA = new MeshStandardMaterial({ color: "#2b4a63", roughness: 0.15, metalness: 0.5, emissive: "#ffd89a", emissiveIntensity: 0 });
const BAHAN_LAMPU = new MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.6 });
const BAHAN_NEON = new MeshStandardMaterial({ color: "#f472b6", emissive: "#f472b6", emissiveIntensity: 1 });
const PENJAGA = { seragam: "warga", perempuan: true, jilbab: "#1e3a8a", kulit: "#d3a378", rambut: "#21180f", baju: "#1e3a8a", celana: "#111827" };
const BARISTA = { seragam: "warga", perempuan: false, kulit: "#b9824f", rambut: "#141010", baju: "#3f2a1d", celana: "#111827" };
const PRAMUNIAGA = { seragam: "warga", perempuan: true, kulit: "#e0b48a", rambut: "#21180f", baju: "#111827", celana: "#111827", rok: true };

const kotak = (k, y0, y1) => ({ p: [(k.x0 + k.x1) / 2, (y0 + y1) / 2, (k.z0 + k.z1) / 2], s: [k.x1 - k.x0, y1 - y0, k.z1 - k.z0] });

// ---------- film ----------

const SUBTITEL = [
	[18, 24, "Pagi di Situ Pemda… seorang pemancing berangkat mencari ikan legenda."],
	[24, 30, "“Konon arwana emas muncul saat jam ikan lapar!”"],
	[30, 35, "Byur! Seekor ikan melompat di depan perahu…"],
	[37, 43, "Malam tiba. Kunang-kunang menemani yang belum menyerah."],
	[43, 50, "“Besok coba lagi… sambil makan pecel ayam Bude.”"],
	[52, 57, "Sementara itu, di Sirkuit Kawasan…"],
	[57, 62, "REKOR BARU! 🏁"],
];
const KREDIT = ["Pemeran Utama — Kamu", "Sutradara — DPMD Kabupaten Bogor", "Lokasi — Situ Pemda & Kawasan Tegar Beriman", "Ikan — Warga Situ Pemda", "Terima kasih sudah menonton 🍿"];
const BINTANG = Array.from({ length: 60 }, (_, i) => [((i * 97) % 640) / 640, ((i * 53) % 150) / 275, i]);

function teksTengah(g, teks, x, y, ukuran, warna, tebal = 700) {
	g.font = `${tebal} ${ukuran}px "Segoe UI", system-ui, sans-serif`;
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.fillStyle = warna;
	g.fillText(teks, x, y);
}

function perahu(g, x, y, s, malam) {
	g.fillStyle = malam ? "#1f1a17" : "#7c4a24";
	g.beginPath();
	g.moveTo(x - 40 * s, y);
	g.lineTo(x + 40 * s, y);
	g.lineTo(x + 30 * s, y + 12 * s);
	g.lineTo(x - 30 * s, y + 12 * s);
	g.fill();
	g.fillStyle = malam ? "#111" : "#e0703a";
	g.fillRect(x - 6 * s, y - 22 * s, 12 * s, 22 * s);
	g.beginPath();
	g.arc(x, y - 28 * s, 7 * s, 0, Math.PI * 2);
	g.fillStyle = malam ? "#111" : "#d9ad85";
	g.fill();
	g.strokeStyle = malam ? "#333" : "#3b2a1a";
	g.lineWidth = 2 * s;
	g.beginPath();
	g.moveTo(x + 5 * s, y - 18 * s);
	g.lineTo(x + 55 * s, y - 50 * s);
	g.stroke();
	g.strokeStyle = "rgba(255,255,255,0.6)";
	g.lineWidth = 1;
	g.beginPath();
	g.moveTo(x + 55 * s, y - 50 * s);
	g.lineTo(x + 62 * s, y + 6 * s);
	g.stroke();
}

function gambarFilm(g, W, H, t) {
	g.save();
	if (t < 5) {
		// pita hitung mundur
		g.fillStyle = "#2a2a2a";
		g.fillRect(0, 0, W, H);
		const n = 3 - Math.floor(t / (5 / 3));
		const f = (t % (5 / 3)) / (5 / 3);
		g.fillStyle = "#4a4a4a";
		g.beginPath();
		g.moveTo(W / 2, H / 2);
		g.arc(W / 2, H / 2, 160, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
		g.fill();
		g.strokeStyle = "#cfcfcf";
		g.lineWidth = 3;
		for (const r of [90, 110]) {
			g.beginPath();
			g.arc(W / 2, H / 2, r, 0, Math.PI * 2);
			g.stroke();
		}
		teksTengah(g, String(Math.max(1, n)), W / 2, H / 2 + 4, 120, "#f5f5f5");
	} else if (t < 11) {
		g.fillStyle = "#000";
		g.fillRect(0, 0, W, H);
		g.globalAlpha = Math.min(1, (t - 5) / 1.5, (11 - t) / 1.2);
		teksTengah(g, "DPMD PICTURES", W / 2, H / 2 - 14, 54, "#facc15");
		teksTengah(g, "mempersembahkan", W / 2, H / 2 + 34, 22, "#e5e7eb", 500);
	} else if (t < 17) {
		const u = (t - 11) / 6;
		const lg = g.createLinearGradient(0, 0, 0, H);
		lg.addColorStop(0, "#1e1b4b");
		lg.addColorStop(0.6, "#f97316");
		lg.addColorStop(1, "#fde68a");
		g.fillStyle = lg;
		g.fillRect(0, 0, W, H);
		g.fillStyle = "#fde047";
		g.beginPath();
		g.arc(W / 2, H * 0.85 - u * 70, 46, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = "#14532d";
		g.fillRect(0, H * 0.82, W, H);
		g.globalAlpha = Math.min(1, u * 2.5);
		teksTengah(g, "PETUALANG", W / 2, 62, 58, "#ffffff");
		teksTengah(g, "SITU PEMDA", W / 2, 120, 58, "#fde047");
	} else if (t < 36) {
		// siang di situ: awan, matahari, bukit, air beriak, perahu, ikan melompat
		const u = (t - 17) / 19;
		const lg = g.createLinearGradient(0, 0, 0, H * 0.55);
		lg.addColorStop(0, "#38bdf8");
		lg.addColorStop(1, "#bae6fd");
		g.fillStyle = lg;
		g.fillRect(0, 0, W, H);
		g.fillStyle = "#fde047";
		g.beginPath();
		g.arc(80 + u * 480, 70 - Math.sin(u * Math.PI) * 30, 26, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = "rgba(255,255,255,0.9)";
		for (let i = 0; i < 4; i++) {
			const x = ((i * 190 + t * 18) % (W + 160)) - 80;
			for (const [dx, dy, r] of [
				[0, 0, 22],
				[24, -8, 26],
				[50, 0, 20],
			]) {
				g.beginPath();
				g.arc(x + dx, 40 + i * 9 + dy, r, 0, Math.PI * 2);
				g.fill();
			}
		}
		g.fillStyle = "#4d7c0f";
		g.beginPath();
		g.moveTo(0, H * 0.55);
		for (let x = 0; x <= W; x += 40) g.lineTo(x, H * 0.55 - 26 - Math.sin(x * 0.02) * 18);
		g.lineTo(W, H * 0.55);
		g.fill();
		g.fillStyle = "#2f7fa6";
		g.fillRect(0, H * 0.55, W, H);
		g.strokeStyle = "rgba(255,255,255,0.35)";
		g.lineWidth = 2;
		for (let i = 0; i < 14; i++) {
			const y = H * 0.6 + (i % 7) * 15;
			const x = ((i * 83 + t * 30) % (W + 60)) - 30;
			g.beginPath();
			g.moveTo(x, y);
			g.lineTo(x + 26, y);
			g.stroke();
		}
		perahu(g, 120 + u * 320, H * 0.7, 1, false);
		// ikan melompat tiap 4 detik
		const fase = (t % 4) / 1.2;
		if (fase < 1) {
			const fx = 420 - u * 120;
			const fy = H * 0.62 - Math.sin(fase * Math.PI) * 60;
			g.save();
			g.translate(fx + fase * 40, fy);
			g.rotate(-0.8 + fase * 1.6);
			g.fillStyle = "#f59e0b";
			g.beginPath();
			g.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2);
			g.fill();
			g.beginPath();
			g.moveTo(-16, 0);
			g.lineTo(-28, -8);
			g.lineTo(-28, 8);
			g.fill();
			g.restore();
		}
	} else if (t < 51) {
		// malam: bintang, bulan, kunang-kunang, perahu berlentera
		const lg = g.createLinearGradient(0, 0, 0, H);
		lg.addColorStop(0, "#020617");
		lg.addColorStop(0.55, "#1e1b4b");
		lg.addColorStop(1, "#0b1a2e");
		g.fillStyle = lg;
		g.fillRect(0, 0, W, H);
		for (const [x, y, i] of BINTANG) {
			g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
			g.fillStyle = "#fff";
			g.fillRect(x * W, y * H, 2, 2);
		}
		g.globalAlpha = 1;
		g.fillStyle = "#fef9c3";
		g.beginPath();
		g.arc(520, 60, 28, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = "#0f2a3d";
		g.fillRect(0, H * 0.6, W, H);
		g.fillStyle = "rgba(254,249,195,0.25)";
		g.fillRect(500, H * 0.62, 40, H * 0.38);
		perahu(g, 260 + Math.sin(t * 0.5) * 20, H * 0.72, 1, true);
		const lentera = g.createRadialGradient(300, H * 0.6, 2, 300, H * 0.6, 40);
		lentera.addColorStop(0, "rgba(253,224,71,0.9)");
		lentera.addColorStop(1, "rgba(253,224,71,0)");
		g.fillStyle = lentera;
		g.fillRect(250, H * 0.6 - 40, 100, 80);
		for (let i = 0; i < 18; i++) {
			g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
			g.fillStyle = "#facc15";
			g.beginPath();
			g.arc((i * 37 + Math.sin(t * 0.7 + i) * 30) % W, H * 0.35 + Math.cos(t * 0.9 + i * 2) * 40 + (i % 5) * 12, 2.5, 0, Math.PI * 2);
			g.fill();
		}
		g.globalAlpha = 1;
	} else if (t < 63) {
		// balapan motor: jalan berperspektif, garis laju
		g.fillStyle = "#0f172a";
		g.fillRect(0, 0, W, H);
		g.fillStyle = "#1e293b";
		for (let i = 0; i < 12; i++) {
			const h = 40 + ((i * 37) % 70);
			g.fillRect(i * 56, H * 0.45 - h, 44, h);
		}
		g.fillStyle = "#374151";
		g.beginPath();
		g.moveTo(W / 2 - 30, H * 0.45);
		g.lineTo(W / 2 + 30, H * 0.45);
		g.lineTo(W, H);
		g.lineTo(0, H);
		g.fill();
		g.fillStyle = "#facc15";
		for (let i = 0; i < 8; i++) {
			const v = (i / 8 + t * 1.6) % 1;
			const y = H * 0.45 + v * v * H * 0.55;
			g.fillRect(W / 2 - 2 - v * 4, y, 4 + v * 8, 6 + v * 18);
		}
		g.strokeStyle = "rgba(255,255,255,0.5)";
		g.lineWidth = 2;
		for (let i = 0; i < 10; i++) {
			const y = 40 + ((i * 47 + t * 400) % 220);
			g.beginPath();
			g.moveTo(i % 2 ? 30 : W - 150, y);
			g.lineTo(i % 2 ? 150 : W - 30, y);
			g.stroke();
		}
		const by = H * 0.78 + Math.sin(t * 20) * 2;
		g.fillStyle = "#dc2626";
		g.fillRect(W / 2 - 22, by - 30, 44, 26);
		g.fillStyle = "#111";
		g.beginPath();
		g.arc(W / 2, by + 6, 14, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = "#e0703a";
		g.fillRect(W / 2 - 10, by - 56, 20, 28);
		g.fillStyle = "#facc15";
		g.beginPath();
		g.arc(W / 2, by - 64, 11, 0, Math.PI * 2);
		g.fill();
		if (t > 57) teksTengah(g, "VROOM!", W / 2, 60, 52 + Math.sin(t * 10) * 4, "#facc15");
	} else {
		g.fillStyle = "#000";
		g.fillRect(0, 0, W, H);
		g.globalAlpha = Math.min(1, (t - 63) / 1.5);
		const geser = Math.max(0, (t - 65.5) * 38);
		teksTengah(g, "TAMAT", W / 2, H / 2 - 20 - geser, 72, "#facc15");
		KREDIT.forEach((k, i) => teksTengah(g, k, W / 2, H / 2 + 60 + i * 36 - geser, 20, "#e5e7eb", 500));
	}
	g.globalAlpha = 1;
	const sub = SUBTITEL.find(([a, b]) => t >= a && t < b);
	if (sub) {
		g.font = `600 19px "Segoe UI", system-ui, sans-serif`;
		g.textAlign = "center";
		g.textBaseline = "middle";
		g.lineWidth = 4;
		g.strokeStyle = "#000";
		g.strokeText(sub[2], W / 2, H - 22);
		g.fillStyle = "#fff";
		g.fillText(sub[2], W / 2, H - 22);
	}
	// vinyet & butiran film
	const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.6);
	v.addColorStop(0, "rgba(0,0,0,0)");
	v.addColorStop(1, "rgba(0,0,0,0.45)");
	g.fillStyle = v;
	g.fillRect(0, 0, W, H);
	g.restore();
}

function gambarJeda(g, W, H, t) {
	const lg = g.createLinearGradient(0, 0, W, H);
	lg.addColorStop(0, "#3b0764");
	lg.addColorStop(1, "#1e3a8a");
	g.fillStyle = lg;
	g.fillRect(0, 0, W, H);
	g.fillStyle = "rgba(255,255,255,0.08)";
	const x = ((t * 120) % (W + 300)) - 150;
	g.beginPath();
	g.moveTo(x, 0);
	g.lineTo(x + 80, 0);
	g.lineTo(x - 40, H);
	g.lineTo(x - 120, H);
	g.fill();
	teksTengah(g, "SEDANG TAYANG", W / 2, 52, 26, "#f9a8d4");
	teksTengah(g, FILM.judul.toUpperCase(), W / 2, 112, 50, "#ffffff");
	teksTengah(g, `🎟️ Tiket 🪙 ${HARGA_TIKET} di loket · duduk di kursi mana saja`, W / 2, 178, 20, "#e0e7ff", 500);
	teksTengah(g, "🍿 Selamat menikmati", W / 2, 226, 18, "#fde68a", 500);
}

function Layar() {
	const { tekstur, kanvas } = useMemo(() => {
		const c = document.createElement("canvas");
		c.width = 640;
		c.height = 275;
		const t = new CanvasTexture(c);
		t.colorSpace = SRGBColorSpace;
		return { tekstur: t, kanvas: c };
	}, []);
	useEffect(() => () => tekstur.dispose(), [tekstur]);
	const waktu = useRef(1);
	useFrame(({ clock }, dt) => {
		waktu.current += dt;
		// digambar ulang ±15x sedetik, hanya bila tamu ada di sekitar bioskop
		if (waktu.current < 1 / 15) return;
		waktu.current = 0;
		if (Math.hypot(posisi.x - LAYAR.x, posisi.z - LAYAR.z) > 60) return;
		const g = kanvas.getContext("2d");
		if (bioskop.putar) gambarFilm(g, kanvas.width, kanvas.height, bioskop.putar.t);
		else gambarJeda(g, kanvas.width, kanvas.height, clock.elapsedTime);
		tekstur.needsUpdate = true;
	});
	return (
		<group>
			<mesh position={[LAYAR.x, LAYAR.y, LAYAR.z - 0.02]}>
				<boxGeometry args={[LAYAR.lebar + 0.6, LAYAR.tinggi + 0.6, 0.05]} />
				<meshStandardMaterial color="#0b0b0f" />
			</mesh>
			<mesh position={[LAYAR.x, LAYAR.y, LAYAR.z - 0.06]} rotation-y={Math.PI}>
				<planeGeometry args={[LAYAR.lebar, LAYAR.tinggi]} />
				<meshBasicMaterial map={tekstur} toneMapped={false} />
			</mesh>
		</group>
	);
}

// ---------- bangunan ----------

// Massa mal di kiri, kanan, belakang, dan di atas aula — dipudarkan bila menghalangi kamera.
function Massa({ daftarDinding }) {
	const grup = usePudar(daftarDinding);
	const balok = [
		kotak({ x0: L.x0, x1: A.x0, z0: L.z0, z1: L.z1 }, 0, T),
		kotak({ x0: A.x1, x1: L.x1, z0: L.z0, z1: L.z1 }, 0, T),
		kotak({ x0: A.x0, x1: A.x1, z0: A.z1, z1: L.z1 }, 0, T),
		kotak(A, A.tinggi, T),
	];
	return (
		<group ref={grup}>
			{balok.map((b, i) => (
				<mesh key={i} position={b.p}>
					<boxGeometry args={b.s} />
					<meshStandardMaterial color={WARNA_MASSA} />
				</mesh>
			))}
			{/* pita kaca mendatar di muka & sisi mal */}
			{[9, 12.6, 16.2].map((y) => (
				<group key={y}>
					<mesh position={[(L.x0 + L.x1) / 2, y, L.z0 - 0.06]} material={BAHAN_PITA}>
						<boxGeometry args={[L.x1 - L.x0 - 4, 1.6, 0.1]} />
					</mesh>
					{[L.x0 - 0.06, L.x1 + 0.06].map((x) => (
						<mesh key={x} position={[x, y, (L.z0 + L.z1) / 2]} material={BAHAN_PITA}>
							<boxGeometry args={[0.1, 1.6, L.z1 - L.z0 - 4]} />
						</mesh>
					))}
				</group>
			))}
			{/* jendela pajangan toko di muka massa kiri-kanan lantai dasar */}
			{[
				[L.x0 + 4, A.x0 - 4],
				[A.x1 + 4, L.x1 - 4],
			].map(([a, b]) => (
				<mesh key={a} position={[(a + b) / 2, 2.4, L.z0 - 0.06]} material={BAHAN_PITA}>
					<boxGeometry args={[b - a, 3.6, 0.1]} />
				</mesh>
			))}
			{/* plafon aula & panel lampu */}
			<mesh position={[(A.x0 + A.x1) / 2, A.tinggi - 0.02, (A.z0 + A.z1) / 2]} rotation-x={Math.PI / 2}>
				<planeGeometry args={[A.x1 - A.x0, A.z1 - A.z0]} />
				<meshStandardMaterial color="#fafaf9" />
			</mesh>
		</group>
	);
}

function MukaAula() {
	const pintuKiri = useRef();
	const pintuKanan = useRef();
	const buka = useRef(0);
	const p = A.pintu;
	const lebarPintu = (p.x1 - p.x0) / 2;
	const cx = (p.x0 + p.x1) / 2;
	useFrame((_, dt) => {
		const dekat = Math.abs(posisi.x - cx) < 4.5 && Math.abs(posisi.z - p.z) < 3;
		buka.current += ((dekat ? 1 : 0) - buka.current) * (1 - Math.exp(-6 * dt));
		const geser = buka.current * (lebarPintu - 0.1);
		pintuKiri.current.position.x = p.x0 + lebarPintu / 2 - geser;
		pintuKanan.current.position.x = p.x1 - lebarPintu / 2 + geser;
	});
	const tiang = [];
	for (let x = A.x0 + 3; x < A.x1 - 1; x += 3.5) if (x < p.x0 - 0.3 || x > p.x1 + 0.3) tiang.push(x);
	return (
		<group>
			<Gabung>
				{[...tiang, p.x0, p.x1].map((x) => (
					<mesh key={x} position={[x, A.tinggi / 2, A.z0 + 0.1]}>
						<boxGeometry args={[0.18, A.tinggi, 0.2]} />
						<meshStandardMaterial color="#334155" metalness={0.5} />
					</mesh>
				))}
				{/* kanopi pintu masuk & lantai plaza */}
				<mesh position={[cx, 4.6, A.z0 - 3]}>
					<boxGeometry args={[16, 0.35, 6]} />
					<meshStandardMaterial color="#e2e8f0" />
				</mesh>
				{[cx - 7.5, cx + 7.5].map((x) => (
					<mesh key={x} position={[x, 2.3, A.z0 - 5.6]}>
						<cylinderGeometry args={[0.2, 0.2, 4.6, 10]} />
						<meshStandardMaterial color="#94a3b8" metalness={0.5} />
					</mesh>
				))}
				<mesh position={[(A.x0 + A.x1) / 2, 0.02, A.z0 - 4]}>
					<boxGeometry args={[A.x1 - A.x0 + 10, 0.04, 8]} />
					<meshStandardMaterial color="#d6cfc1" />
				</mesh>
				{/* lantai aula mengilap */}
				<mesh position={[(A.x0 + A.x1) / 2, 0.015, (A.z0 + A.z1) / 2]}>
					<boxGeometry args={[A.x1 - A.x0, 0.03, A.z1 - A.z0]} />
					<meshStandardMaterial color="#efe9df" roughness={0.25} metalness={0.05} />
				</mesh>
				{/* pot tanaman di plaza */}
				{[-12, -9, 9, 12].map((dx) => (
					<group key={dx}>
						<mesh position={[cx + dx, 0.35, A.z0 - 2]}>
							<cylinderGeometry args={[0.5, 0.4, 0.7, 12]} />
							<meshStandardMaterial color="#78716c" />
						</mesh>
						<mesh position={[cx + dx, 1.1, A.z0 - 2]}>
							<icosahedronGeometry args={[0.7, 0]} />
							<meshStandardMaterial color="#3f8a4f" flatShading />
						</mesh>
					</group>
				))}
			</Gabung>
			{[
				[A.x0 + 0.2, p.x0],
				[p.x1, A.x1 - 0.2],
			].map(([a, b]) => (
				<mesh key={a} position={[(a + b) / 2, A.tinggi / 2, A.z0 + 0.1]} material={BAHAN_KACA}>
					<boxGeometry args={[b - a, A.tinggi - 0.2, 0.06]} />
				</mesh>
			))}
			<mesh position={[cx, 5.4, A.z0 + 0.1]} material={BAHAN_KACA}>
				<boxGeometry args={[p.x1 - p.x0, 3.2, 0.06]} />
			</mesh>
			<mesh ref={pintuKiri} position={[p.x0 + lebarPintu / 2, 1.9, A.z0 - 0.05]} material={BAHAN_KACA}>
				<boxGeometry args={[lebarPintu, 3.8, 0.06]} />
			</mesh>
			<mesh ref={pintuKanan} position={[p.x1 - lebarPintu / 2, 1.9, A.z0 - 0.05]} material={BAHAN_KACA}>
				<boxGeometry args={[lebarPintu, 3.8, 0.06]} />
			</mesh>
			{/* papan nama besar di muka mal */}
			<Papan posisi={[cx, 14.4, L.z0 - 0.2]} rotasi={Math.PI} lebar={34} tinggi={3.4} latar="#0f172a" baris={[{ teks: "CIBINONG CITY MALL", ukuran: 2.2, tebal: true, warna: "#fbbf24", y: 0.55 }]} />
			<Papan posisi={[cx, 5.0, A.z0 - 6.05]} rotasi={Math.PI} lebar={10} tinggi={0.7} latar="#1e3a8a" baris={[{ teks: "PINTU UTAMA · SELAMAT DATANG", ukuran: 0.36, tebal: true, warna: "#ffffff", y: 0.55 }]} />
			<Papan posisi={[L.x0 + 14, 18.5, L.z0 - 0.2]} rotasi={Math.PI} lebar={9} tinggi={2.4} latar="#b91c1c" baris={[{ teks: "CCM", ukuran: 1.8, tebal: true, warna: "#ffffff", y: 0.55 }]} />
		</group>
	);
}

// Deretan muka toko tertutup di dinding aula (penghidup suasana).
const TOKO_HIAS = [
	{ teks: "OPTIK", warna: "#0e7490", x: A.x1 - 0.06, z: -568, rot: -Math.PI / 2 },
	{ teks: "GADGET", warna: "#4338ca", x: A.x1 - 0.06, z: -576.5, rot: -Math.PI / 2 },
	{ teks: "SEPATU", warna: "#9a3412", x: -1773.5, z: A.z1 - 0.06, rot: Math.PI },
	{ teks: "BANK", warna: "#065f46", x: -1724, z: A.z1 - 0.06, rot: Math.PI },
];

function Aula() {
	const pelanggan = useMemo(() => KURSI_KOPI.filter((k) => k.npc).map((k) => ({ ...k, penampilan: penampilanWarga() })), []);
	const pengunjung = useMemo(() => PENGUNJUNG_CCM.map(([x, z, rot]) => ({ x, z, rot, penampilan: penampilanWarga() })), []);
	const manekin = useMemo(
		() => MANEKIN_CCM.map((mk, i) => ({ ...mk, penampilan: { ...kenakanGaya(penampilanAvatar({ jk: i ? "P" : "L", avatar: 0, kulit: 0 }), mk.gaya), kulit: "#e7e5e4", rambut: "#e7e5e4", jilbab: null } })),
		[],
	);
	const air = useRef();
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		air.current.children.forEach((c, i) => {
			const f = (t * 0.9 + i / air.current.children.length) % 1;
			c.position.y = 0.9 + Math.sin(f * Math.PI) * 1.4;
			const r = 0.15 + f * 1.3;
			const a = (i / air.current.children.length) * Math.PI * 2;
			c.position.x = Math.cos(a) * r;
			c.position.z = Math.sin(a) * r;
		});
	});
	const B = BUTIK_CCM;
	const E = ESKALATOR_CCM;
	const panjangEskalator = Math.hypot(E.z1 - E.z0, A.tinggi);
	const miringEskalator = Math.atan2(A.tinggi, E.z1 - E.z0);
	const W_RAK = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#111827", "#f8fafc"];
	return (
		<group>
			<Gabung>
				{/* lampu plafon */}
				{[-1786, -1770, -1754, -1738, -1726].map((x) => (
					<mesh key={x} position={[x, A.tinggi - 0.06, (A.z0 + A.z1) / 2]} material={BAHAN_LAMPU}>
						<boxGeometry args={[0.4, 0.06, A.z1 - A.z0 - 6]} />
					</mesh>
				))}
				{/* butik: sekat samping, rak gantung, meja lipatan, kasir */}
				{[B.x0 + 0.075, B.x1 - 0.075].map((x) => (
					<mesh key={x} position={[x, B.tinggi / 2, (B.z0 + B.z1) / 2]}>
						<boxGeometry args={[0.15, B.tinggi, B.z1 - B.z0]} />
						<meshStandardMaterial color="#fdf2f8" />
					</mesh>
				))}
				<mesh position={[(B.x0 + B.x1) / 2, B.tinggi + 0.3, B.z0 + 0.1]}>
					<boxGeometry args={[B.x1 - B.x0, 0.6, 0.2]} />
					<meshStandardMaterial color="#111827" />
				</mesh>
				<mesh position={[(B.x0 + B.x1) / 2, 1.75, B.z1 - 0.6]}>
					<boxGeometry args={[B.x1 - B.x0 - 0.6, 0.05, 0.05]} />
					<meshStandardMaterial color="#a1a1aa" metalness={0.7} />
				</mesh>
				{Array.from({ length: 22 }, (_, i) => (
					<mesh key={i} position={[B.x0 + 0.8 + i * 0.57, 1.25, B.z1 - 0.6]}>
						<boxGeometry args={[0.42, 0.95, 0.08]} />
						<meshStandardMaterial color={W_RAK[i % W_RAK.length]} />
					</mesh>
				))}
				<mesh position={[-1764, 0.45, -562]}>
					<boxGeometry args={[2.2, 0.9, 1.1]} />
					<meshStandardMaterial color="#e7e5e4" />
				</mesh>
				{[0, 1, 2, 3].map((i) => (
					<mesh key={i} position={[-1764.8 + i * 0.5, 0.95, -562]}>
						<boxGeometry args={[0.4, 0.1, 0.4]} />
						<meshStandardMaterial color={W_RAK[(i + 3) % W_RAK.length]} />
					</mesh>
				))}
				<mesh position={[(KASIR_BUTIK.x0 + KASIR_BUTIK.x1) / 2, 0.5, (KASIR_BUTIK.z0 + KASIR_BUTIK.z1) / 2]}>
					<boxGeometry args={[KASIR_BUTIK.x1 - KASIR_BUTIK.x0, 1.0, KASIR_BUTIK.z1 - KASIR_BUTIK.z0]} />
					<meshStandardMaterial color="#111827" />
				</mesh>
				{MANEKIN_CCM.map((mk) => (
					<mesh key={mk.x} position={[mk.x, 0.08, mk.z]}>
						<cylinderGeometry args={[0.38, 0.4, 0.12, 16]} />
						<meshStandardMaterial color="#e4e4e7" />
					</mesh>
				))}
				{/* eskalator hias ke lantai 2 */}
				{[E.x0 + 1.5, E.x1 - 1.5].map((x) => (
					<group key={x}>
						<mesh position={[x, A.tinggi / 2, (E.z0 + E.z1) / 2]} rotation-x={-miringEskalator}>
							<boxGeometry args={[1.3, 0.25, panjangEskalator]} />
							<meshStandardMaterial color="#9ca3af" metalness={0.6} />
						</mesh>
						{[-0.7, 0.7].map((dx) => (
							<mesh key={dx} position={[x + dx, A.tinggi / 2 + 0.55, (E.z0 + E.z1) / 2]} rotation-x={-miringEskalator}>
								<boxGeometry args={[0.08, 1.0, panjangEskalator]} />
								<meshStandardMaterial color="#bfdbfe" transparent opacity={0.45} />
							</mesh>
						))}
					</group>
				))}
				{/* air mancur */}
				<mesh position={[AIR_MANCUR.x, 0.3, AIR_MANCUR.z]}>
					<cylinderGeometry args={[AIR_MANCUR.r, AIR_MANCUR.r + 0.1, 0.6, 28]} />
					<meshStandardMaterial color="#d6d3d1" />
				</mesh>
				<mesh position={[AIR_MANCUR.x, 0.56, AIR_MANCUR.z]}>
					<cylinderGeometry args={[AIR_MANCUR.r - 0.2, AIR_MANCUR.r - 0.2, 0.04, 28]} />
					<meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.2} />
				</mesh>
				<mesh position={[AIR_MANCUR.x, 0.9, AIR_MANCUR.z]}>
					<cylinderGeometry args={[0.25, 0.4, 0.8, 12]} />
					<meshStandardMaterial color="#e7e5e4" />
				</mesh>
				{/* kedai kopi: konter, rak belakang, meja bundar & kursi */}
				<mesh position={[(KONTER_KOPI.x0 + KONTER_KOPI.x1) / 2, 0.55, (KONTER_KOPI.z0 + KONTER_KOPI.z1) / 2]}>
					<boxGeometry args={[KONTER_KOPI.x1 - KONTER_KOPI.x0, 1.1, KONTER_KOPI.z1 - KONTER_KOPI.z0]} />
					<meshStandardMaterial color="#6b4423" />
				</mesh>
				<mesh position={[A.x1 - 0.35, 1.6, (KONTER_KOPI.z0 + KONTER_KOPI.z1) / 2]}>
					<boxGeometry args={[0.5, 2.2, KONTER_KOPI.z1 - KONTER_KOPI.z0]} />
					<meshStandardMaterial color="#3f2a1d" />
				</mesh>
				<mesh position={[KONTER_KOPI.x0 + 0.5, 1.3, (KONTER_KOPI.z0 + KONTER_KOPI.z1) / 2 + 2]}>
					<boxGeometry args={[0.45, 0.5, 0.45]} />
					<meshStandardMaterial color="#9ca3af" metalness={0.7} />
				</mesh>
				{MEJA_KOPI.map((m) => (
					<group key={`${m.x}:${m.z}`}>
						<mesh position={[m.x, 0.74, m.z]}>
							<cylinderGeometry args={[0.42, 0.42, 0.04, 16]} />
							<meshStandardMaterial color="#f5f5f4" />
						</mesh>
						<mesh position={[m.x, 0.37, m.z]}>
							<cylinderGeometry args={[0.05, 0.05, 0.72, 8]} />
							<meshStandardMaterial color="#27272a" />
						</mesh>
					</group>
				))}
				{KURSI_KOPI.map((k) => (
					<group key={`${k.x}:${k.z}`}>
						<mesh position={[k.x, 0.45, k.z]}>
							<cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
							<meshStandardMaterial color="#a16207" />
						</mesh>
						<mesh position={[k.x, 0.22, k.z]}>
							<cylinderGeometry args={[0.03, 0.03, 0.44, 6]} />
							<meshStandardMaterial color="#27272a" />
						</mesh>
					</group>
				))}
				{pelanggan.map((k) => (
					<mesh key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.42, 0.82, k.z + Math.cos(k.rot) * 0.42]}>
						<cylinderGeometry args={[0.045, 0.036, 0.14, 10]} />
						<meshStandardMaterial color="#a16a3c" />
					</mesh>
				))}
				{/* loket bioskop */}
				<mesh position={[(LOKET.x0 + LOKET.x1) / 2, 0.55, (LOKET.z0 + LOKET.z1) / 2]}>
					<boxGeometry args={[LOKET.x1 - LOKET.x0, 1.1, LOKET.z1 - LOKET.z0]} />
					<meshStandardMaterial color="#4c1d95" />
				</mesh>
				{/* tali antrean */}
				{[-596.5, -591.5].map((z) => (
					<mesh key={z} position={[-1789.5, 0.5, z]}>
						<cylinderGeometry args={[0.05, 0.08, 1, 8]} />
						<meshStandardMaterial color="#d4af37" metalness={0.8} />
					</mesh>
				))}
			</Gabung>
			<group ref={air} position={[AIR_MANCUR.x, 0, AIR_MANCUR.z]}>
				{Array.from({ length: 16 }, (_, i) => (
					<mesh key={i}>
						<sphereGeometry args={[0.09, 6, 4]} />
						<meshStandardMaterial color="#bae6fd" transparent opacity={0.75} />
					</mesh>
				))}
			</group>

			{TOKO_HIAS.map((t) => (
				<Papan key={t.teks} posisi={[t.x, 3.2, t.z]} rotasi={t.rot} lebar={6} tinggi={4.4} latar={t.warna} baris={[{ teks: t.teks, ukuran: 0.8, tebal: true, warna: "#ffffff", y: 0.25 }, { teks: "Segera hadir di lantai 1", ukuran: 0.3, warna: "#e0f2fe", y: 0.7 }]} />
			))}
			<Papan posisi={[(B.x0 + B.x1) / 2, B.tinggi + 0.3, B.z0 - 0.02]} rotasi={Math.PI} lebar={B.x1 - B.x0 - 0.2} tinggi={0.58} latar="#111827" baris={[{ teks: "BUTIK MODE · Pakaian & Aksesoris", ukuran: 0.34, tebal: true, warna: "#f9a8d4", y: 0.55 }]} />
			<Papan posisi={[KONTER_KOPI.x0 - 0.02, 2.6, (KONTER_KOPI.z0 + KONTER_KOPI.z1) / 2]} rotasi={-Math.PI / 2} lebar={5} tinggi={0.8} latar="#3f2a1d" baris={[{ teks: "☕ KEDAI KOPI", ukuran: 0.42, tebal: true, warna: "#fde68a", y: 0.55 }]} />
			<Papan posisi={[LOKET.x0 - 0.02, 3.1, (LOKET.z0 + LOKET.z1) / 2]} rotasi={-Math.PI / 2} lebar={6} tinggi={1.6} latar="#1e1b4b" baris={[
				{ teks: "🎬 BIOSKOP · LOKET", ukuran: 0.42, tebal: true, warna: "#f9a8d4", y: 0.28 },
				{ teks: `Sedang tayang: ${FILM.judul} · 🪙 ${HARGA_TIKET}`, ukuran: 0.24, tebal: true, warna: "#ffffff", y: 0.7 },
			]} />
			<group position={[LOKET.x0 - 1.0, 0.05, (LOKET.z0 + LOKET.z1) / 2]} rotation-y={Math.PI / 2}>
				<Tokoh penampilan={PENJAGA} pose="diam" asal={{ x: LOKET.x0 - 1.0, z: (LOKET.z0 + LOKET.z1) / 2, rot: Math.PI / 2, lantai: 0 }} />
			</group>
			<group position={[A.x1 - 1.3, 0.05, (KONTER_KOPI.z0 + KONTER_KOPI.z1) / 2]} rotation-y={-Math.PI / 2}>
				<Tokoh penampilan={BARISTA} pose="diam" asal={{ x: A.x1 - 1.3, z: (KONTER_KOPI.z0 + KONTER_KOPI.z1) / 2, rot: -Math.PI / 2, lantai: 0 }} />
			</group>
			<group position={[(KASIR_BUTIK.x0 + KASIR_BUTIK.x1) / 2 - 0.7, 0.05, (KASIR_BUTIK.z0 + KASIR_BUTIK.z1) / 2]} rotation-y={Math.PI / 2}>
				<Tokoh penampilan={PRAMUNIAGA} pose="diam" asal={{ x: KASIR_BUTIK.x0 - 0.2, z: (KASIR_BUTIK.z0 + KASIR_BUTIK.z1) / 2, rot: Math.PI / 2, lantai: 0 }} />
			</group>
			{manekin.map((mk) => (
				<group key={mk.x} position={[mk.x, 0.14, mk.z]} rotation-y={mk.rot}>
					<Tokoh penampilan={mk.penampilan} pose="diam" bayangan={false} />
				</group>
			))}
			{pengunjung.map((o) => (
				<group key={`${o.x}:${o.z}`} position={[o.x, 0.05, o.z]} rotation-y={o.rot}>
					<Tokoh penampilan={o.penampilan} pose="diam" asal={{ x: o.x, z: o.z, rot: o.rot, lantai: 0 }} />
				</group>
			))}
			{pelanggan.map((k) => (
				<group key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.05, 0.05, k.z + Math.cos(k.rot) * 0.05]} rotation-y={k.rot}>
					<Tokoh penampilan={k.penampilan} pose="duduk" aktivitas="makan" />
				</group>
			))}
		</group>
	);
}

// Dinding studio bioskop (dipudarkan bila menghalangi kamera) & isi studio.
function DindingStudio({ daftarDinding }) {
	const grup = usePudar(daftarDinding);
	const S = STUDIO;
	const p = S.pintu;
	return (
		<group ref={grup}>
			<mesh position={[(S.x0 + S.x1) / 2, S.tinggi / 2, S.z0 + 0.12]}>
				<boxGeometry args={[S.x1 - S.x0, S.tinggi, 0.25]} />
				<meshStandardMaterial color="#2e1065" />
			</mesh>
			<mesh position={[S.x1 - 0.12, S.tinggi / 2, (S.z0 + p.z0) / 2]}>
				<boxGeometry args={[0.25, S.tinggi, p.z0 - S.z0]} />
				<meshStandardMaterial color="#2e1065" />
			</mesh>
			<mesh position={[S.x1 - 0.12, S.tinggi / 2, (p.z1 + S.z1) / 2]}>
				<boxGeometry args={[0.25, S.tinggi, S.z1 - p.z1]} />
				<meshStandardMaterial color="#2e1065" />
			</mesh>
			<mesh position={[S.x1 - 0.12, (S.tinggi + 2.8) / 2, (p.z0 + p.z1) / 2]}>
				<boxGeometry args={[0.25, S.tinggi - 2.8, p.z1 - p.z0]} />
				<meshStandardMaterial color="#2e1065" />
			</mesh>
			<mesh position={[(S.x0 + S.x1) / 2, S.tinggi, (S.z0 + S.z1) / 2]} rotation-x={Math.PI / 2}>
				<planeGeometry args={[S.x1 - S.x0, S.z1 - S.z0]} />
				<meshStandardMaterial color="#120a1f" />
			</mesh>
		</group>
	);
}

function Studio({ daftarDinding }) {
	const S = STUDIO;
	return (
		<group>
			<Gabung>
				{/* karpet, panel dinding gelap, panggung layar */}
				<mesh position={[(S.x0 + S.x1) / 2, 0.035, (S.z0 + S.z1) / 2]}>
					<boxGeometry args={[S.x1 - S.x0 - 0.3, 0.02, S.z1 - S.z0 - 0.3]} />
					<meshStandardMaterial color="#5b1a1a" />
				</mesh>
				<mesh position={[S.x0 + 0.06, S.tinggi / 2, (S.z0 + S.z1) / 2]}>
					<boxGeometry args={[0.1, S.tinggi, S.z1 - S.z0]} />
					<meshStandardMaterial color="#1c1426" />
				</mesh>
				<mesh position={[(S.x0 + S.x1) / 2, S.tinggi / 2, S.z1 - 0.06]}>
					<boxGeometry args={[S.x1 - S.x0, S.tinggi, 0.1]} />
					<meshStandardMaterial color="#0b0712" />
				</mesh>
				<mesh position={[(S.x0 + S.x1) / 2, 0.3, S.z1 - 0.7]}>
					<boxGeometry args={[S.x1 - S.x0 - 0.4, 0.6, 1.4]} />
					<meshStandardMaterial color="#1f1530" />
				</mesh>
				{/* kursi merah: dudukan, sandaran, sandaran tangan */}
				{KURSI_BIOSKOP.map((k) => (
					<group key={`${k.x}:${k.z}`}>
						<mesh position={[k.x, 0.42, k.z]}>
							<boxGeometry args={[0.62, 0.14, 0.55]} />
							<meshStandardMaterial color="#b91c1c" />
						</mesh>
						<mesh position={[k.x, 0.8, k.z - 0.32]}>
							<boxGeometry args={[0.62, 0.75, 0.1]} />
							<meshStandardMaterial color="#991b1b" />
						</mesh>
						<mesh position={[k.x - 0.33, 0.58, k.z - 0.05]}>
							<boxGeometry args={[0.05, 0.12, 0.5]} />
							<meshStandardMaterial color="#27272a" />
						</mesh>
					</group>
				))}
				{/* lampu tangga lorong */}
				{KURSI_BIOSKOP.filter((k, i) => i % 12 === 11).map((k) => (
					<mesh key={k.z} position={[k.x + 0.9, 0.06, k.z]} material={BAHAN_NEON}>
						<boxGeometry args={[0.3, 0.03, 0.08]} />
					</mesh>
				))}
				{/* neon di atas pintu studio */}
				<mesh position={[S.x1 + 0.05, 3.2, (S.pintu.z0 + S.pintu.z1) / 2]} material={BAHAN_NEON}>
					<boxGeometry args={[0.06, 0.08, S.pintu.z1 - S.pintu.z0 + 0.6]} />
				</mesh>
			</Gabung>
			<DindingStudio daftarDinding={daftarDinding} />
			<Layar />
			<Papan posisi={[S.x1 + 0.08, 3.9, (S.pintu.z0 + S.pintu.z1) / 2]} rotasi={Math.PI / 2} lebar={3.4} tinggi={0.8} latar="#2e1065" baris={[{ teks: "STUDIO 1", ukuran: 0.46, tebal: true, warna: "#f9a8d4", y: 0.55 }]} />
			{/* poster film di muka studio */}
			{[
				[FILM.judul, "#0e7490", "🎣"],
				["Balap Sirkuit Kawasan", "#b91c1c", "🏍️"],
				["Misteri Ikan Legenda", "#4c1d95", "🐉"],
			].map(([judul, warna, ikon], i) => (
				<Papan
					key={judul}
					posisi={[S.x0 + 3.5 + i * 5, 2.4, S.z0 - 0.02]}
					rotasi={Math.PI}
					lebar={2.2}
					tinggi={3.2}
					latar={warna}
					baris={[
						{ teks: ikon, ukuran: 0.9, y: 0.32 },
						{ teks: judul, ukuran: 0.2, tebal: true, warna: "#ffffff", y: 0.7 },
						{ teks: i ? "Segera tayang" : "Sedang tayang", ukuran: 0.15, warna: "#fde68a", y: 0.86 },
					]}
				/>
			))}
		</group>
	);
}

export default function MalCcm({ daftarDinding }) {
	useFrame(() => {
		BAHAN_KACA.emissiveIntensity = 0.1 + suasana.malam * 0.5;
		BAHAN_PITA.emissiveIntensity = suasana.malam * 0.45;
		BAHAN_LAMPU.emissiveIntensity = 0.6 + suasana.malam * 1.2;
		BAHAN_NEON.emissiveIntensity = 0.8 + Math.sin(performance.now() / 400) * 0.2;
	});
	return (
		<group>
			<Massa daftarDinding={daftarDinding} />
			<MukaAula />
			<Aula />
			<Studio daftarDinding={daftarDinding} />
		</group>
	);
}
