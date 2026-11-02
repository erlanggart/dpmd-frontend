import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from "three";
import { penampilanAvatar } from "../avatar";
import { HARGA_TIKET, bioskop } from "../bioskop";
import { FILM, FILM_PER_ID, gambarFilm, gambarJeda } from "../film";
import { posisi } from "../jelajahStore";
import { kenakanGaya } from "../lemari";
import { aturSuaraBioskop } from "../suaraBioskop";
import Gabung from "./Gabung";
import {
	AIR_MANCUR,
	AULA_CCM,
	BANGKU_LT2,
	BUTIK_CCM,
	ESKALATOR_CCM,
	INFO_CCM,
	JALUR_KELILING,
	JUMLAH_LANTAI_MAL,
	KASIR_BUTIK,
	KIOS_FC,
	KONTER_KOPI,
	LAHAN_CCM,
	LAYAR,
	LIFT_CCM,
	LOKET,
	MANEKIN_CCM,
	MEJA_FC,
	MEJA_KOPI,
	MESIN_MAIN,
	PENGUNJUNG_CCM,
	POPCORN,
	STUDIO,
	TINGGI_CCM,
	TINGGI_LANTAI_MAL,
	TOKO_LT2,
	VOID_CCM,
	ZONA_MAIN,
	yLantaiMal,
} from "./gedungKhusus";
import { KURSI_BIOSKOP, KURSI_FC, KURSI_KOPI, penampilanWarga } from "./layout";
import OrangInstans from "./OrangInstans";
import Papan from "./Papan";
import { usePudar } from "./pudar";
import { suasana } from "./suasana";
import Tokoh from "./Tokoh";
import { warnaAcak } from "./warnaOrang";

// Cibinong City Mall: massa 4 lantai (24 m) di Jl. Tegar Beriman, muka kaca berpita, papan
// nama besar. Aula tengah bisa dimasuki di semua lantai: atrium berpagar kaca dengan air
// mancur di dasarnya & atap kaca, eskalator bertumpuk, lift; Lt 1 supermarket (Minimarket.jsx,
// TOKO "ccm") & kedai kopi, Lt 2 butik & fesyen, Lt 3 food court & zona main, Lt 4 bioskop.
// Pengunjung berjalan mengelilingi atrium di tiap lantai. Dipasang di grup halaman.

const L = LAHAN_CCM;
const A = AULA_CCM;
const V = VOID_CCM;
const E = ESKALATOR_CCM;
const T = TINGGI_CCM;
const TL = TINGGI_LANTAI_MAL;
const WARNA_MASSA = "#ebe6dd";
const BAHAN_KACA = new MeshStandardMaterial({ color: "#7fb2d6", transparent: true, opacity: 0.3, roughness: 0.08, metalness: 0.4, emissive: "#fff3d6", emissiveIntensity: 0 });
const BAHAN_PITA = new MeshStandardMaterial({ color: "#2b4a63", roughness: 0.15, metalness: 0.5, emissive: "#ffd89a", emissiveIntensity: 0 });
const BAHAN_LAMPU = new MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.6 });
const BAHAN_NEON = new MeshStandardMaterial({ color: "#f472b6", emissive: "#f472b6", emissiveIntensity: 1 });
const BAHAN_LAYAR_MAIN = new MeshStandardMaterial({ color: "#0f172a", emissive: "#38bdf8", emissiveIntensity: 0.8 });
const PENJAGA = { seragam: "warga", perempuan: true, jilbab: "#1e3a8a", kulit: "#d3a378", rambut: "#21180f", baju: "#1e3a8a", celana: "#111827" };
const BARISTA = { seragam: "warga", perempuan: false, kulit: "#b9824f", rambut: "#141010", baju: "#3f2a1d", celana: "#111827" };
const PRAMUNIAGA = { seragam: "warga", perempuan: true, kulit: "#e0b48a", rambut: "#21180f", baju: "#111827", celana: "#111827", rok: true };
const KOKI = { seragam: "warga", perempuan: false, kulit: "#c68d5e", rambut: "#1a130d", baju: "#f8fafc", celana: "#334155" };
const kotak = (k, y0, y1) => ({ p: [(k.x0 + k.x1) / 2, (y0 + y1) / 2, (k.z0 + k.z1) / 2], s: [k.x1 - k.x0, y1 - y0, k.z1 - k.z0] });
const Y = yLantaiMal;

// ---------- layar bioskop ----------

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
		const film = bioskop.tiket && FILM_PER_ID[bioskop.tiket];
		const jarak = Math.hypot(posisi.x - LAYAR.x, posisi.z - LAYAR.z);
		const diStudio = jarak < 40 && Math.abs(posisi.y - (-0.6 + Y(3))) < 2;
		aturSuaraBioskop({ diStudio, film: bioskop.putar ? film : null, t: bioskop.putar?.t ?? 0, jeda: !!bioskop.jeda });
		waktu.current += dt;
		// digambar ulang ±15x sedetik, hanya bila tamu ada di lantai bioskop
		if (waktu.current < 1 / 15 || !diStudio) return;
		waktu.current = 0;
		const g = kanvas.getContext("2d");
		if (bioskop.putar && film) gambarFilm(g, film, bioskop.putar.t);
		else gambarJeda(g, clock.elapsedTime, FILM, HARGA_TIKET);
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

// Massa mal di kiri, kanan, belakang aula & atapnya — dipudarkan bila menghalangi kamera.
function Massa({ daftarDinding }) {
	const grup = usePudar(daftarDinding);
	const balok = [
		kotak({ x0: L.x0, x1: A.x0, z0: L.z0, z1: L.z1 }, 0, T),
		kotak({ x0: A.x1, x1: L.x1, z0: L.z0, z1: L.z1 }, 0, T),
		kotak({ x0: A.x0, x1: A.x1, z0: A.z1, z1: L.z1 }, 0, T),
	];
	// atap aula berlubang di atas atrium (ditutup atap kaca)
	const atap = [
		{ x0: A.x0, x1: A.x1, z0: A.z0, z1: V.z0 },
		{ x0: A.x0, x1: A.x1, z0: V.z1, z1: A.z1 },
		{ x0: A.x0, x1: V.x0, z0: V.z0, z1: V.z1 },
		{ x0: V.x1, x1: A.x1, z0: V.z0, z1: V.z1 },
	];
	return (
		<group ref={grup}>
			{balok.map((b, i) => (
				<mesh key={i} position={b.p}>
					<boxGeometry args={b.s} />
					<meshStandardMaterial color={WARNA_MASSA} />
				</mesh>
			))}
			{atap.map((k, i) => {
				const b = kotak(k, T - 0.5, T);
				return (
					<mesh key={`a${i}`} position={b.p}>
						<boxGeometry args={b.s} />
						<meshStandardMaterial color="#d6d3d1" />
					</mesh>
				);
			})}
			{/* pita kaca mendatar tiap lantai di muka & sisi mal */}
			{[1, 2, 3].map((n) => (
				<group key={n}>
					<mesh position={[(L.x0 + A.x0) / 2, Y(n) + 3, L.z0 - 0.06]} material={BAHAN_PITA}>
						<boxGeometry args={[A.x0 - L.x0 - 4, 2.4, 0.1]} />
					</mesh>
					<mesh position={[(A.x1 + L.x1) / 2, Y(n) + 3, L.z0 - 0.06]} material={BAHAN_PITA}>
						<boxGeometry args={[L.x1 - A.x1 - 4, 2.4, 0.1]} />
					</mesh>
					{[L.x0 - 0.06, L.x1 + 0.06].map((x) => (
						<mesh key={x} position={[x, Y(n) + 3, (L.z0 + L.z1) / 2]} material={BAHAN_PITA}>
							<boxGeometry args={[0.1, 2.4, L.z1 - L.z0 - 4]} />
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
		</group>
	);
}

// Lantai 2–4: pelat beton berlubang atrium & eskalator, plafon berlampu, pagar kaca atrium.
function PelatLantai() {
	const potong = [
		{ x0: A.x0, x1: A.x1, z0: A.z0, z1: V.z0 },
		{ x0: A.x0, x1: A.x1, z0: V.z1, z1: A.z1 },
		{ x0: A.x0, x1: V.x0, z0: V.z0, z1: V.z1 },
		{ x0: V.x1, x1: E.x0, z0: V.z0, z1: V.z1 },
		{ x0: E.x0, x1: E.x1, z0: V.z0, z1: E.z0 },
		{ x0: E.x0, x1: E.x1, z0: E.z1, z1: V.z1 },
		{ x0: E.x1, x1: A.x1, z0: V.z0, z1: V.z1 },
	];
	const LANTAI = ["#efe9df", "#f3eee6", "#ece4d6", "#2e1f3d"];
	return (
		<Gabung>
			{/* lantai Lt 1 mengilap */}
			<mesh position={[(A.x0 + A.x1) / 2, 0.015, (A.z0 + A.z1) / 2]}>
				<boxGeometry args={[A.x1 - A.x0, 0.03, A.z1 - A.z0]} />
				<meshStandardMaterial color={LANTAI[0]} roughness={0.25} metalness={0.05} />
			</mesh>
			{[1, 2, 3].flatMap((n) =>
				potong.map((k, i) => {
					const b = kotak(k, Y(n) - 0.35, Y(n));
					return (
						<mesh key={`${n}:${i}`} position={b.p}>
							<boxGeometry args={b.s} />
							<meshStandardMaterial color={LANTAI[n]} roughness={0.35} />
						</mesh>
					);
				}),
			)}
			{/* pinggiran pelat di tepi atrium & pagar kaca berpegangan baja */}
			{[1, 2, 3].flatMap((n) =>
				[
					[(V.x0 + V.x1) / 2, V.z0 - 0.08, V.x1 - V.x0 + 0.3, 0.12],
					[(V.x0 + V.x1) / 2, V.z1 + 0.08, V.x1 - V.x0 + 0.3, 0.12],
					[V.x0 - 0.08, (V.z0 + V.z1) / 2, 0.12, V.z1 - V.z0],
					[V.x1 + 0.08, (V.z0 + V.z1) / 2, 0.12, V.z1 - V.z0],
				].flatMap(([x, z, lx, lz], i) => [
					<mesh key={`k${n}:${i}`} position={[x, Y(n) + 0.55, z]}>
						<boxGeometry args={[lx, 1.0, lz]} />
						<meshStandardMaterial color="#bfdbfe" transparent opacity={0.35} />
					</mesh>,
					<mesh key={`p${n}:${i}`} position={[x, Y(n) + 1.07, z]}>
						<boxGeometry args={[lx + 0.04, 0.06, lz + 0.06]} />
						<meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} />
					</mesh>,
				]),
			)}
			{/* lampu plafon tiap lantai */}
			{[0, 1, 2, 3].flatMap((n) =>
				[-1786, -1776, -1742, -1730].map((x) => (
					<mesh key={`l${n}:${x}`} position={[x, Y(n + 1) - 0.38, (A.z0 + A.z1) / 2]} material={BAHAN_LAMPU}>
						<boxGeometry args={[0.35, 0.05, A.z1 - A.z0 - 6]} />
					</mesh>
				)),
			)}
			{/* atap kaca atrium */}
			<mesh position={[(V.x0 + V.x1) / 2, T - 0.2, (V.z0 + V.z1) / 2]}>
				<boxGeometry args={[V.x1 - V.x0, 0.1, V.z1 - V.z0]} />
				<meshStandardMaterial color="#bae6fd" transparent opacity={0.3} />
			</mesh>
		</Gabung>
	);
}

// Eskalator bertumpuk (Lt 1→2→3→4) di lubang samping atrium + lift kaca.
function Eskalator() {
	const panjang = Math.hypot(E.z1 - E.z0, TL);
	const miring = Math.atan2(TL, E.z1 - E.z0);
	const cx = (E.x0 + E.x1) / 2;
	const cz = (E.z0 + E.z1) / 2;
	const tangga = useRef([]);
	useFrame(({ clock }) => {
		// anak tangga bergerak naik pelan
		const f = (clock.elapsedTime * 0.4) % 1;
		tangga.current.forEach((m, i) => m && (m.position.z = -panjang / 2 + ((i / 10 + f / 10) * panjang) % panjang));
	});
	return (
		<group>
			<Gabung>
				{[0, 1, 2].map((n) => (
					<group key={n}>
						<mesh position={[cx, Y(n) + TL / 2 - 0.15, cz]} rotation-x={-miring}>
							<boxGeometry args={[E.x1 - E.x0 - 0.5, 0.3, panjang]} />
							<meshStandardMaterial color="#6b7280" metalness={0.6} />
						</mesh>
						{[E.x0 + 0.1, E.x1 - 0.1].map((x) => (
							<group key={x}>
								<mesh position={[x, Y(n) + TL / 2 + 0.45, cz]} rotation-x={-miring}>
									<boxGeometry args={[0.08, 0.95, panjang]} />
									<meshStandardMaterial color="#bfdbfe" transparent opacity={0.4} />
								</mesh>
								<mesh position={[x, Y(n) + TL / 2 + 0.95, cz]} rotation-x={-miring}>
									<boxGeometry args={[0.12, 0.08, panjang]} />
									<meshStandardMaterial color="#111827" />
								</mesh>
							</group>
						))}
					</group>
				))}
				{/* lift: ruang kaca berbingkai di dinding barat aula */}
				<mesh position={[(LIFT_CCM.x0 + LIFT_CCM.x1) / 2, T / 2, (LIFT_CCM.z0 + LIFT_CCM.z1) / 2]}>
					<boxGeometry args={[LIFT_CCM.x1 - LIFT_CCM.x0, T, LIFT_CCM.z1 - LIFT_CCM.z0]} />
					<meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.3} />
				</mesh>
				{[0, 1, 2, 3].map((n) => (
					<group key={n}>
						<mesh position={[LIFT_CCM.x0 - 0.03, Y(n) + 1.2, (LIFT_CCM.z0 + LIFT_CCM.z1) / 2]}>
							<boxGeometry args={[0.05, 2.4, 2.2]} />
							<meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
						</mesh>
						<mesh position={[LIFT_CCM.x0 - 0.04, Y(n) + 1.2, (LIFT_CCM.z0 + LIFT_CCM.z1) / 2]}>
							<boxGeometry args={[0.02, 2.4, 0.03]} />
							<meshStandardMaterial color="#475569" />
						</mesh>
					</group>
				))}
			</Gabung>
			{/* anak tangga yang bergerak (hanya eskalator Lt 1 → 2 yang terlihat dari pintu) */}
			<group position={[cx, TL / 2, cz]} rotation-x={-miring}>
				{Array.from({ length: 10 }, (_, i) => (
					<mesh key={i} ref={(m) => (tangga.current[i] = m)} position-y={0.17}>
						<boxGeometry args={[E.x1 - E.x0 - 0.7, 0.04, 0.3]} />
						<meshStandardMaterial color="#d1d5db" metalness={0.7} />
					</mesh>
				))}
			</group>
			{[0, 1, 2, 3].map((n) => (
				<Papan key={n} posisi={[LIFT_CCM.x0 - 0.06, Y(n) + 2.75, (LIFT_CCM.z0 + LIFT_CCM.z1) / 2]} rotasi={-Math.PI / 2} lebar={2.4} tinggi={0.5} latar="#0f172a" baris={[{ teks: `LIFT · Lt ${n + 1}`, ukuran: 0.26, tebal: true, warna: "#fde68a", y: 0.55 }]} />
			))}
			{[0, 1, 2].map((n) => (
				<Papan key={`e${n}`} posisi={[cx, Y(n) + 2.9, E.z0 - 0.3]} rotasi={Math.PI} lebar={4} tinggi={0.5} latar="#1e3a8a" baris={[{ teks: `⬆ Eskalator ke Lt ${n + 2}`, ukuran: 0.25, tebal: true, warna: "#ffffff", y: 0.55 }]} />
			))}
		</group>
	);
}

function MukaMal() {
	const pintuKiri = useRef();
	const pintuKanan = useRef();
	const buka = useRef(0);
	const p = A.pintu;
	const lebarPintu = (p.x1 - p.x0) / 2;
	const cx = (p.x0 + p.x1) / 2;
	useFrame((_, dt) => {
		const dekat = Math.abs(posisi.x - cx) < 4.5 && Math.abs(posisi.z - p.z) < 3 && posisi.y < 2;
		buka.current += ((dekat ? 1 : 0) - buka.current) * (1 - Math.exp(-6 * dt));
		const geser = buka.current * (lebarPintu - 0.1);
		pintuKiri.current.position.x = p.x0 + lebarPintu / 2 - geser;
		pintuKanan.current.position.x = p.x1 - lebarPintu / 2 + geser;
	});
	const tiang = [];
	for (let x = A.x0 + 3; x < A.x1 - 1; x += 3.5) tiang.push(x);
	return (
		<group>
			<Gabung>
				{/* rangka muka kaca setinggi gedung & tepi pelat tiap lantai */}
				{tiang.map((x) => (
					<mesh key={x} position={[x, T / 2, A.z0 + 0.1]}>
						<boxGeometry args={[0.18, T, 0.22]} />
						<meshStandardMaterial color="#334155" metalness={0.5} />
					</mesh>
				))}
				{[1, 2, 3].map((n) => (
					<mesh key={n} position={[(A.x0 + A.x1) / 2, Y(n) - 0.15, A.z0 + 0.05]}>
						<boxGeometry args={[A.x1 - A.x0, 0.45, 0.3]} />
						<meshStandardMaterial color="#e2e8f0" />
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
			{/* kaca muka: Lt 1 berpintu, lantai atas penuh */}
			{[
				[A.x0 + 0.2, p.x0],
				[p.x1, A.x1 - 0.2],
			].map(([a, b]) => (
				<mesh key={a} position={[(a + b) / 2, TL / 2, A.z0 + 0.1]} material={BAHAN_KACA}>
					<boxGeometry args={[b - a, TL - 0.4, 0.06]} />
				</mesh>
			))}
			<mesh position={[cx, 5.0, A.z0 + 0.1]} material={BAHAN_KACA}>
				<boxGeometry args={[p.x1 - p.x0, 1.6, 0.06]} />
			</mesh>
			{[1, 2, 3].map((n) => (
				<mesh key={n} position={[(A.x0 + A.x1) / 2, Y(n) + TL / 2, A.z0 + 0.1]} material={BAHAN_KACA}>
					<boxGeometry args={[A.x1 - A.x0 - 0.4, TL - 0.5, 0.06]} />
				</mesh>
			))}
			<mesh ref={pintuKiri} position={[p.x0 + lebarPintu / 2, 1.9, A.z0 - 0.05]} material={BAHAN_KACA}>
				<boxGeometry args={[lebarPintu, 3.8, 0.06]} />
			</mesh>
			<mesh ref={pintuKanan} position={[p.x1 - lebarPintu / 2, 1.9, A.z0 - 0.05]} material={BAHAN_KACA}>
				<boxGeometry args={[lebarPintu, 3.8, 0.06]} />
			</mesh>
			{/* papan nama besar & penunjuk lantai */}
			<Papan posisi={[cx, T - 2.4, L.z0 - 0.2]} rotasi={Math.PI} lebar={36} tinggi={3.6} latar="#0f172a" baris={[{ teks: "CIBINONG CITY MALL", ukuran: 2.3, tebal: true, warna: "#fbbf24", y: 0.55 }]} />
			<Papan posisi={[cx, 5.0, A.z0 - 6.05]} rotasi={Math.PI} lebar={10} tinggi={0.7} latar="#1e3a8a" baris={[{ teks: "PINTU UTAMA · SELAMAT DATANG", ukuran: 0.36, tebal: true, warna: "#ffffff", y: 0.55 }]} />
			<Papan posisi={[L.x0 + 14, T - 3, L.z0 - 0.2]} rotasi={Math.PI} lebar={9} tinggi={2.4} latar="#b91c1c" baris={[{ teks: "CCM", ukuran: 1.8, tebal: true, warna: "#ffffff", y: 0.55 }]} />
			<Papan posisi={[L.x1 - 16, T - 3, L.z0 - 0.2]} rotasi={Math.PI} lebar={14} tinggi={2.4} latar="#4c1d95" baris={[{ teks: "🎬 BIOSKOP Lt 4", ukuran: 1.2, tebal: true, warna: "#f9a8d4", y: 0.55 }]} />
			<Papan posisi={[(A.x0 + A.x1) / 2 + 12, 8.2, A.z0 - 0.15]} rotasi={Math.PI} lebar={12} tinggi={1.5} latar="#be185d" baris={[{ teks: "FESYEN Lt 2 · FOOD COURT Lt 3", ukuran: 0.6, tebal: true, warna: "#ffffff", y: 0.55 }]} />
		</group>
	);
}

// Muka toko tertutup di dinding aula (penghidup suasana): [teks, warna, x, z, rot, lantai]
const TOKO_HIAS = [
	["APOTEK", "#15803d", A.x0 + 0.06, -566, Math.PI / 2, 0],
	["BANK & ATM", "#065f46", A.x0 + 0.06, -578, Math.PI / 2, 0],
	["OPTIK", "#0e7490", A.x1 - 0.06, -566, -Math.PI / 2, 0],
	["GADGET", "#4338ca", A.x1 - 0.06, -583, -Math.PI / 2, 1],
	["BUKU & ALAT TULIS", "#a16207", A.x0 + 0.06, -578, Math.PI / 2, 1],
	["ELEKTRONIK", "#1d4ed8", A.x1 - 0.06, -590, -Math.PI / 2, 2],
	["SALON & SPA", "#be185d", A.x0 + 0.06, -566, Math.PI / 2, 3],
];

function Lt1() {
	const pelanggan = useMemo(() => KURSI_KOPI.filter((k) => k.npc).map((k) => ({ ...k, penampilan: penampilanWarga() })), []);
	const air = useRef();
	useFrame(({ clock }) => {
		if (!air.current) return;
		const t = clock.elapsedTime;
		air.current.children.forEach((c, i) => {
			const f = (t * 0.9 + i / air.current.children.length) % 1;
			c.position.y = 0.9 + Math.sin(f * Math.PI) * 1.6;
			const r = 0.15 + f * 1.3;
			const a = (i / air.current.children.length) * Math.PI * 2;
			c.position.x = Math.cos(a) * r;
			c.position.z = Math.sin(a) * r;
		});
	});
	return (
		<group>
			<Gabung>
				{/* air mancur di dasar atrium */}
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
				{/* pot tanaman tinggi di sudut atrium */}
				{[
					[V.x0 + 1, V.z0 + 1],
					[V.x1 - 1, V.z0 + 1],
					[V.x0 + 1, V.z1 - 1],
					[V.x1 - 1, V.z1 - 1],
				].map(([x, z]) => (
					<group key={`${x}:${z}`}>
						<mesh position={[x, 0.4, z]}>
							<cylinderGeometry args={[0.45, 0.35, 0.8, 10]} />
							<meshStandardMaterial color="#57534e" />
						</mesh>
						<mesh position={[x, 1.6, z]}>
							<icosahedronGeometry args={[0.9, 0]} />
							<meshStandardMaterial color="#2f7d4a" flatShading />
						</mesh>
					</group>
				))}
				{/* kedai kopi: konter, rak belakang, mesin kopi, meja bundar & kursi */}
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
					<mesh key={`${k.x}:${k.z}`} position={[k.x, 0.45, k.z]}>
						<cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
						<meshStandardMaterial color="#a16207" />
					</mesh>
				))}
				{pelanggan.map((k) => (
					<mesh key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.42, 0.82, k.z + Math.cos(k.rot) * 0.42]}>
						<cylinderGeometry args={[0.045, 0.036, 0.14, 10]} />
						<meshStandardMaterial color="#a16a3c" />
					</mesh>
				))}
				{/* meja informasi */}
				<mesh position={[(INFO_CCM.x0 + INFO_CCM.x1) / 2, 0.55, (INFO_CCM.z0 + INFO_CCM.z1) / 2]}>
					<boxGeometry args={[INFO_CCM.x1 - INFO_CCM.x0, 1.1, INFO_CCM.z1 - INFO_CCM.z0]} />
					<meshStandardMaterial color="#0e7490" />
				</mesh>
			</Gabung>
			<group ref={air} position={[AIR_MANCUR.x, 0, AIR_MANCUR.z]}>
				{Array.from({ length: 18 }, (_, i) => (
					<mesh key={i}>
						<sphereGeometry args={[0.09, 6, 4]} />
						<meshStandardMaterial color="#bae6fd" transparent opacity={0.75} />
					</mesh>
				))}
			</group>
			<Papan posisi={[KONTER_KOPI.x0 - 0.02, 2.6, (KONTER_KOPI.z0 + KONTER_KOPI.z1) / 2]} rotasi={-Math.PI / 2} lebar={5} tinggi={0.8} latar="#3f2a1d" baris={[{ teks: "☕ KEDAI KOPI", ukuran: 0.42, tebal: true, warna: "#fde68a", y: 0.55 }]} />
			<Papan posisi={[(INFO_CCM.x0 + INFO_CCM.x1) / 2, 2.2, INFO_CCM.z1 + 0.02]} lebar={4} tinggi={0.6} latar="#0e7490" baris={[{ teks: "ℹ INFORMASI", ukuran: 0.32, tebal: true, warna: "#ffffff", y: 0.55 }]} />
			<group position={[A.x1 - 1.3, 0.05, (KONTER_KOPI.z0 + KONTER_KOPI.z1) / 2]} rotation-y={-Math.PI / 2}>
				<Tokoh penampilan={BARISTA} pose="diam" asal={{ x: A.x1 - 1.3, z: (KONTER_KOPI.z0 + KONTER_KOPI.z1) / 2, rot: -Math.PI / 2, lantai: 0 }} />
			</group>
			<group position={[(INFO_CCM.x0 + INFO_CCM.x1) / 2, 0.05, INFO_CCM.z0 - 0.6]}>
				<Tokoh penampilan={PENJAGA} pose="diam" asal={{ x: (INFO_CCM.x0 + INFO_CCM.x1) / 2, z: INFO_CCM.z0 - 0.6, rot: 0, lantai: 0 }} />
			</group>
			{pelanggan.map((k) => (
				<group key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.05, 0.05, k.z + Math.cos(k.rot) * 0.05]} rotation-y={k.rot}>
					<Tokoh penampilan={k.penampilan} pose="duduk" aktivitas="makan" />
				</group>
			))}
		</group>
	);
}

function Lt2() {
	const y = Y(1);
	const B = BUTIK_CCM;
	const manekin = useMemo(
		() => MANEKIN_CCM.map((mk, i) => ({ ...mk, penampilan: { ...kenakanGaya(penampilanAvatar({ jk: i ? "P" : "L", avatar: 0, kulit: 0 }), mk.gaya), kulit: "#e7e5e4", rambut: "#e7e5e4", jilbab: null } })),
		[],
	);
	const W_RAK = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#111827", "#f8fafc"];
	return (
		<group position-y={y}>
			<Gabung>
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
				{/* toko fesyen hias: rak pajangan di dinding, panggung pajangan */}
				{TOKO_LT2.map(([teks, warna, k]) => {
					const depan = k.z0 < -580;
					const zr = depan ? k.z0 + 0.6 : k.z1 - 0.6;
					return (
						<group key={teks}>
							<mesh position={[(k.x0 + k.x1) / 2, 1.2, zr]}>
								<boxGeometry args={[k.x1 - k.x0 - 0.6, 2.4, 1.0]} />
								<meshStandardMaterial color="#f5f5f4" />
							</mesh>
							{Array.from({ length: 10 }, (_, i) => (
								<mesh key={i} position={[k.x0 + 1 + i * ((k.x1 - k.x0 - 2) / 9), 0.6 + (i % 3) * 0.6, zr + (depan ? 0.52 : -0.52)]}>
									<boxGeometry args={[0.35, 0.22, 0.25]} />
									<meshStandardMaterial color={W_RAK[(i + teks.length) % W_RAK.length]} />
								</mesh>
							))}
							<mesh position={[(k.x0 + k.x1) / 2, 2.8, depan ? k.z0 + 1.15 : k.z1 - 1.15]}>
								<boxGeometry args={[k.x1 - k.x0 - 0.4, 0.5, 0.1]} />
								<meshStandardMaterial color={warna} />
							</mesh>
						</group>
					);
				})}
				{BANGKU_LT2.map((k) => (
					<mesh key={k.z0} position={[(k.x0 + k.x1) / 2, 0.42, (k.z0 + k.z1) / 2]}>
						<boxGeometry args={[k.x1 - k.x0, 0.12, k.z1 - k.z0]} />
						<meshStandardMaterial color="#a16207" />
					</mesh>
				))}
			</Gabung>
			<Papan posisi={[(B.x0 + B.x1) / 2, B.tinggi + 0.3, B.z0 - 0.02]} rotasi={Math.PI} lebar={B.x1 - B.x0 - 0.2} tinggi={0.58} latar="#111827" baris={[{ teks: "BUTIK MODE · Pakaian & Aksesoris", ukuran: 0.34, tebal: true, warna: "#f9a8d4", y: 0.55 }]} />
			{TOKO_LT2.map(([teks, warna, k]) => {
				const depan = k.z0 < -580;
				return <Papan key={teks} posisi={[(k.x0 + k.x1) / 2, 2.8, depan ? k.z0 + 1.22 : k.z1 - 1.22]} rotasi={depan ? 0 : Math.PI} lebar={k.x1 - k.x0 - 0.6} tinggi={0.46} latar={warna} baris={[{ teks, ukuran: 0.28, tebal: true, warna: "#ffffff", y: 0.55 }]} />;
			})}
			<group position={[(KASIR_BUTIK.x0 + KASIR_BUTIK.x1) / 2 - 0.7, 0.05, (KASIR_BUTIK.z0 + KASIR_BUTIK.z1) / 2]} rotation-y={Math.PI / 2}>
				<Tokoh penampilan={PRAMUNIAGA} pose="diam" asal={{ x: KASIR_BUTIK.x0 - 0.2, z: (KASIR_BUTIK.z0 + KASIR_BUTIK.z1) / 2, rot: Math.PI / 2, lantai: 0 }} />
			</group>
			{manekin.map((mk) => (
				<group key={mk.x} position={[mk.x, 0.14, mk.z]} rotation-y={mk.rot}>
					<Tokoh penampilan={mk.penampilan} pose="diam" bayangan={false} />
				</group>
			))}
		</group>
	);
}

function Lt3() {
	const y = Y(2);
	const pemakan = useMemo(() => KURSI_FC.filter((k) => k.npc).map((k) => ({ ...k, penampilan: penampilanWarga() })), []);
	const pemain = useMemo(() => MESIN_MAIN.filter((_, i) => i % 3 === 0).map((m) => ({ ...m, penampilan: penampilanWarga() })), []);
	return (
		<group>
			<group position-y={y}>
				<Gabung>
					{/* kios food court */}
					{KIOS_FC.map(([teks, warna, k]) => (
						<group key={teks}>
							<mesh position={[(k.x0 + k.x1) / 2, 0.55, k.z0 + 0.4]}>
								<boxGeometry args={[k.x1 - k.x0 - 0.2, 1.1, 0.8]} />
								<meshStandardMaterial color={warna} />
							</mesh>
							<mesh position={[(k.x0 + k.x1) / 2, 1.15, k.z0 + 0.4]}>
								<boxGeometry args={[k.x1 - k.x0 - 0.1, 0.06, 0.9]} />
								<meshStandardMaterial color="#e5e7eb" />
							</mesh>
							<mesh position={[(k.x0 + k.x1) / 2, 1.0, k.z1 - 0.4]}>
								<boxGeometry args={[k.x1 - k.x0 - 0.4, 2.0, 0.6]} />
								<meshStandardMaterial color="#9ca3af" metalness={0.6} />
							</mesh>
						</group>
					))}
					{MEJA_FC.map((m) => (
						<group key={`${m.x}:${m.z}`}>
							<mesh position={[m.x, 0.74, m.z]}>
								<boxGeometry args={[m.x1 - m.x0, 0.05, m.z1 - m.z0]} />
								<meshStandardMaterial color="#fafaf9" />
							</mesh>
							<mesh position={[m.x, 0.37, m.z]}>
								<cylinderGeometry args={[0.05, 0.05, 0.72, 8]} />
								<meshStandardMaterial color="#3f3f46" />
							</mesh>
						</group>
					))}
					{KURSI_FC.map((k) => (
						<mesh key={`${k.x}:${k.z}`} position={[k.x, 0.44, k.z]}>
							<boxGeometry args={[0.42, 0.06, 0.4]} />
							<meshStandardMaterial color="#f97316" />
						</mesh>
					))}
					{pemakan.map((k) => (
						<mesh key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.42, 0.79, k.z + Math.cos(k.rot) * 0.42]}>
							<cylinderGeometry args={[0.15, 0.12, 0.024, 14]} />
							<meshStandardMaterial color="#f8fafc" />
						</mesh>
					))}
					{/* zona main: karpet warna-warni & mesin permainan bercahaya */}
					<mesh position={[(ZONA_MAIN.x0 + ZONA_MAIN.x1) / 2, 0.012, (ZONA_MAIN.z0 + ZONA_MAIN.z1) / 2]}>
						<boxGeometry args={[ZONA_MAIN.x1 - ZONA_MAIN.x0, 0.02, ZONA_MAIN.z1 - ZONA_MAIN.z0]} />
						<meshStandardMaterial color="#312e81" />
					</mesh>
					{MESIN_MAIN.map((m) => (
						<group key={`${m.x}:${m.z}`}>
							<mesh position={[m.x, 0.9, m.z]}>
								<boxGeometry args={[1.1, 1.8, 0.8]} />
								<meshStandardMaterial color={m.warna} />
							</mesh>
						</group>
					))}
				</Gabung>
				{MESIN_MAIN.map((m) => (
					<mesh key={`l${m.x}:${m.z}`} position={[m.x, 1.3, m.z + (m.rot ? -0.41 : 0.41)]} material={BAHAN_LAYAR_MAIN}>
						<boxGeometry args={[0.8, 0.55, 0.02]} />
					</mesh>
				))}
				{KIOS_FC.map(([teks, warna, k]) => (
					<Papan key={teks} posisi={[(k.x0 + k.x1) / 2, 2.6, k.z0 + 0.05]} rotasi={Math.PI} lebar={k.x1 - k.x0 - 0.3} tinggi={0.6} latar={warna} baris={[{ teks, ukuran: 0.3, tebal: true, warna: "#ffffff", y: 0.55 }]} />
				))}
				<Papan posisi={[(ZONA_MAIN.x0 + ZONA_MAIN.x1) / 2, 3.6, ZONA_MAIN.z1 + 0.05]} lebar={8} tinggi={1} latar="#7c3aed" baris={[{ teks: "🎮 ZONA MAIN", ukuran: 0.6, tebal: true, warna: "#fde68a", y: 0.55 }]} />
				<Papan posisi={[-1734, 4.4, -556.2]} rotasi={Math.PI} lebar={14} tinggi={1.1} latar="#c2410c" baris={[{ teks: "🍛 FOOD COURT", ukuran: 0.7, tebal: true, warna: "#ffffff", y: 0.55 }]} />
				{KIOS_FC.map(([teks, , k]) => (
					<group key={`k${teks}`} position={[(k.x0 + k.x1) / 2, 0.05, k.z0 + 1.3]} rotation-y={0}>
						<Tokoh penampilan={KOKI} pose="diam" asal={{ x: (k.x0 + k.x1) / 2, z: k.z0 + 1.3, rot: 0, lantai: 0 }} />
					</group>
				))}
			</group>
			{pemakan.map((k) => (
				<group key={`${k.x}:${k.z}`} position={[k.x + Math.sin(k.rot) * 0.05, y + 0.05, k.z + Math.cos(k.rot) * 0.05]} rotation-y={k.rot}>
					<Tokoh penampilan={k.penampilan} pose="duduk" aktivitas="makan" />
				</group>
			))}
			{pemain.map((m) => (
				<group key={`${m.x}:${m.z}`} position={[m.x, y + 0.05, m.z + (m.rot ? -1 : 1)]} rotation-y={m.rot ? 0 : Math.PI}>
					<Tokoh penampilan={m.penampilan} pose="diam" asal={{ x: m.x, z: m.z, rot: m.rot, lantai: 0 }} />
				</group>
			))}
		</group>
	);
}

// Dinding studio bioskop (dipudarkan bila menghalangi kamera).
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

function Lt4({ daftarDinding }) {
	const y = Y(3);
	const S = STUDIO;
	return (
		<group>
			<group position-y={y}>
				<Gabung>
					{/* karpet studio, panel dinding gelap, panggung layar */}
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
					{KURSI_BIOSKOP.filter((k, i) => i % 12 === 11).map((k) => (
						<mesh key={k.z} position={[k.x + 0.9, 0.06, k.z]} material={BAHAN_NEON}>
							<boxGeometry args={[0.3, 0.03, 0.08]} />
						</mesh>
					))}
					<mesh position={[S.x1 + 0.05, 3.2, (S.pintu.z0 + S.pintu.z1) / 2]} material={BAHAN_NEON}>
						<boxGeometry args={[0.06, 0.08, S.pintu.z1 - S.pintu.z0 + 0.6]} />
					</mesh>
					{/* loket, tali antrean, konter popcorn & mesin popcorn */}
					<mesh position={[(LOKET.x0 + LOKET.x1) / 2, 0.55, (LOKET.z0 + LOKET.z1) / 2]}>
						<boxGeometry args={[LOKET.x1 - LOKET.x0, 1.1, LOKET.z1 - LOKET.z0]} />
						<meshStandardMaterial color="#4c1d95" />
					</mesh>
					{[-596.5, -591.5].map((z) => (
						<mesh key={z} position={[-1789.5, 0.5, z]}>
							<cylinderGeometry args={[0.05, 0.08, 1, 8]} />
							<meshStandardMaterial color="#d4af37" metalness={0.8} />
						</mesh>
					))}
					<mesh position={[(POPCORN.x0 + POPCORN.x1) / 2, 0.55, (POPCORN.z0 + POPCORN.z1) / 2]}>
						<boxGeometry args={[POPCORN.x1 - POPCORN.x0, 1.1, POPCORN.z1 - POPCORN.z0]} />
						<meshStandardMaterial color="#b91c1c" />
					</mesh>
					<mesh position={[POPCORN.x0 + 1, 1.5, POPCORN.z1 + 0.6]}>
						<boxGeometry args={[0.8, 0.9, 0.6]} />
						<meshStandardMaterial color="#fde68a" transparent opacity={0.6} />
					</mesh>
				</Gabung>
				<DindingStudio daftarDinding={daftarDinding} />
				<Papan posisi={[S.x1 + 0.08, 3.9, (S.pintu.z0 + S.pintu.z1) / 2]} rotasi={Math.PI / 2} lebar={3.4} tinggi={0.8} latar="#2e1065" baris={[{ teks: "STUDIO 1", ukuran: 0.46, tebal: true, warna: "#f9a8d4", y: 0.55 }]} />
				<Papan posisi={[LOKET.x0 - 0.02, 3.1, (LOKET.z0 + LOKET.z1) / 2]} rotasi={-Math.PI / 2} lebar={6} tinggi={1.6} latar="#1e1b4b" baris={[
					{ teks: "🎬 BIOSKOP · LOKET", ukuran: 0.42, tebal: true, warna: "#f9a8d4", y: 0.28 },
					{ teks: `Film sejarah Kabupaten Bogor · 🪙 ${HARGA_TIKET}`, ukuran: 0.24, tebal: true, warna: "#ffffff", y: 0.7 },
				]} />
				<Papan posisi={[(POPCORN.x0 + POPCORN.x1) / 2, 2.6, POPCORN.z0 - 0.02]} rotasi={Math.PI} lebar={6} tinggi={0.7} latar="#b91c1c" baris={[{ teks: "🍿 POPCORN & MINUMAN", ukuran: 0.34, tebal: true, warna: "#fde68a", y: 0.55 }]} />
				{/* poster keempat film di muka studio */}
				{FILM.map((f, i) => (
					<Papan
						key={f.id}
						posisi={[S.x0 + 2.4 + i * 4.2, 2.4, S.z0 - 0.02]}
						rotasi={Math.PI}
						lebar={2.2}
						tinggi={3.2}
						latar={f.warna}
						baris={[
							{ teks: f.ikon, ukuran: 0.9, y: 0.3 },
							{ teks: f.judul, ukuran: 0.2, tebal: true, warna: "#ffffff", y: 0.66 },
							{ teks: f.zaman, ukuran: 0.12, warna: "#fde68a", y: 0.82 },
						]}
					/>
				))}
				<group position={[LOKET.x0 - 1.0, 0.05, (LOKET.z0 + LOKET.z1) / 2]} rotation-y={Math.PI / 2}>
					<Tokoh penampilan={PENJAGA} pose="diam" asal={{ x: LOKET.x0 - 1.0, z: (LOKET.z0 + LOKET.z1) / 2, rot: Math.PI / 2, lantai: 0 }} />
				</group>
				<group position={[(POPCORN.x0 + POPCORN.x1) / 2, 0.05, POPCORN.z1 + 0.7]} rotation-y={Math.PI}>
					<Tokoh penampilan={PRAMUNIAGA} pose="diam" asal={{ x: (POPCORN.x0 + POPCORN.x1) / 2, z: POPCORN.z1 + 0.7, rot: Math.PI, lantai: 0 }} />
				</group>
			</group>
			<Layar />
		</group>
	);
}

// ---------- keramaian ----------

// Pengunjung berjalan mengelilingi atrium tiap lantai (searah & berlawanan), plus yang berdiri.
function Keramaian() {
	const jalur = useMemo(() => {
		const titik = JALUR_KELILING.map(([x, z]) => ({ x, z }));
		const seg = titik.map((a, i) => {
			const b = titik[(i + 1) % titik.length];
			return { a, b, pj: Math.hypot(b.x - a.x, b.z - a.z) };
		});
		return { seg, total: seg.reduce((s, q) => s + q.pj, 0) };
	}, []);
	const agen = useMemo(() => {
		const hasil = [];
		let biji = 5;
		const r = () => ((biji = (biji * 16807) % 2147483647) - 1) / 2147483646;
		for (let n = 0; n < JUMLAH_LANTAI_MAL; n++) {
			for (let i = 0; i < 13; i++) hasil.push({ ...warnaAcak(r), lantai: n, s: r() * jalur.total, arah: r() < 0.5 ? 1 : -1, geser: (r() - 0.5) * 2.4, laju: 0.9 + r() * 0.6, x: 0, y: 0, z: 0, rot: 0, fase: r() * 6, gerak: 1, tampak: false });
		}
		return hasil;
	}, [jalur]);
	const statis = useMemo(() => PENGUNJUNG_CCM.map(([x, z, rot, n]) => ({ x, z, rot, n, penampilan: penampilanWarga() })), []);
	const cek = useRef(1);
	const dekat = useRef(false);
	useFrame((_, dt) => {
		cek.current += dt;
		if (cek.current > 0.5) {
			cek.current = 0;
			dekat.current = Math.hypot(posisi.x - (A.x0 + A.x1) / 2, posisi.z - (A.z0 + A.z1) / 2) < 140;
		}
		for (const a of agen) {
			a.tampak = dekat.current;
			if (!a.tampak) continue;
			a.s = (a.s + a.arah * a.laju * dt + jalur.total) % jalur.total;
			let s = a.s;
			let seg = jalur.seg[0];
			for (const q of jalur.seg) {
				seg = q;
				if (s <= q.pj) break;
				s -= q.pj;
			}
			const ux = (seg.b.x - seg.a.x) / seg.pj;
			const uz = (seg.b.z - seg.a.z) / seg.pj;
			a.x = seg.a.x + ux * s - uz * a.geser;
			a.z = seg.a.z + uz * s + ux * a.geser;
			a.y = Y(a.lantai) + 0.02;
			const ke = Math.atan2(ux * a.arah, uz * a.arah);
			a.rot += Math.atan2(Math.sin(ke - a.rot), Math.cos(ke - a.rot)) * Math.min(1, dt * 6);
			a.fase += dt * 7 * a.laju;
		}
	});
	return (
		<group>
			<OrangInstans agen={agen} />
			{statis.map((o) => (
				<group key={`${o.x}:${o.z}`} position={[o.x, Y(o.n) + 0.05, o.z]} rotation-y={o.rot}>
					<Tokoh penampilan={o.penampilan} pose="diam" asal={{ x: o.x, z: o.z, rot: o.rot, lantai: 0 }} />
				</group>
			))}
		</group>
	);
}

export default function MalCcm({ daftarDinding }) {
	useFrame(() => {
		BAHAN_KACA.emissiveIntensity = 0.1 + suasana.malam * 0.5;
		BAHAN_PITA.emissiveIntensity = suasana.malam * 0.45;
		BAHAN_LAMPU.emissiveIntensity = 0.6 + suasana.malam * 1.2;
		const kedip = Math.sin(performance.now() / 400);
		BAHAN_NEON.emissiveIntensity = 0.8 + kedip * 0.2;
		BAHAN_LAYAR_MAIN.emissiveIntensity = 0.6 + Math.sin(performance.now() / 150) * 0.25;
	});
	return (
		<group>
			<Massa daftarDinding={daftarDinding} />
			<PelatLantai />
			<Eskalator />
			<MukaMal />
			{TOKO_HIAS.map(([teks, warna, x, z, rot, n]) => (
				<Papan key={teks} posisi={[x, Y(n) + 3, z]} rotasi={rot} lebar={6} tinggi={4.4} latar={warna} baris={[{ teks, ukuran: 0.7, tebal: true, warna: "#ffffff", y: 0.25 }, { teks: `Lt ${n + 1} · buka 10.00–22.00`, ukuran: 0.3, warna: "#e0f2fe", y: 0.72 }]} />
			))}
			<Lt1 />
			<Lt2 />
			<Lt3 />
			<Lt4 daftarDinding={daftarDinding} />
			<Keramaian />
		</group>
	);
}
