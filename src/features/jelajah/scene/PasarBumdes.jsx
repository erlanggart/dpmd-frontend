import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, DoubleSide, Float32BufferAttribute, Line, LineBasicMaterial, MeshBasicMaterial, MeshStandardMaterial, Object3D, SphereGeometry } from "three";
import { WARUNG } from "../warung";
import { posisi } from "../jelajahStore";
import AreaTampak from "./AreaTampak";
import Gabung from "./Gabung";
import Papan from "./Papan";
import Tokoh from "./Tokoh";
import { KURSI_PASAR, penampilanWarga } from "./layout";
import { ETALASE_PASAR as E, GERBANG_PASAR as G, LAPAK_PASAR, MEJA_PASAR, PANGGUNG_PASAR as S, PASAR as A, PERGOLA_PASAR as PG } from "./pasarBumdesData";
import { suasana } from "./suasana";

// Food court Pasar BUMDes: lapak berbahan produk BUM Desa Kab. Bogor, meja makan di
// bawah pergola berlampu gantung, dan panggung live music (musiknya di musikLatar.js,
// lagu "live"). Dipasang di grup kawasan (y relatif tanah).

const KAYU = "#a87b51";
const KAYU_TUA = "#6b4a2f";
const BAHAN_BOHLAM = new MeshStandardMaterial({ color: "#fff3c4", emissive: "#ffc861", emissiveIntensity: 0.6 });
const GEO_BOHLAM = new SphereGeometry(0.05, 8, 6);
const WARNA_SOROT = ["#f472b6", "#60a5fa", "#facc15", "#34d399"];

// isi meja saji tiap lapak: [warna, bentuk] — kecil & bergaya, cukup memberi kesan dagangan
const DAGANGAN = {
	"pasar-kopi": [["#4a2c17", "toples"], ["#f5f5f4", "gelas"], ["#c2410c", "toples"]],
	"pasar-telur": [["#fde68a", "telur"], ["#f5f5f4", "telur"], ["#b45309", "piring"]],
	"pasar-ikan": [["#0e7490", "piring"], ["#94a3b8", "ikan"], ["#f59e0b", "toples"]],
	"pasar-kebun": [["#16a34a", "sayur"], ["#84cc16", "sayur"], ["#fb7185", "toples"]],
	"pasar-tempe": [["#d6b370", "piring"], ["#a16207", "toples"], ["#dc2626", "sayur"]],
	"pasar-sate": [["#7c2d12", "sate"], ["#f472b6", "piring"], ["#fbbf24", "toples"]],
};

function Barang({ warna, bentuk, x }) {
	if (bentuk === "telur")
		return (
			<group position={[x, 0, 0]}>
				<mesh position-y={0.02}>
					<boxGeometry args={[0.36, 0.04, 0.3]} />
					<meshStandardMaterial color="#c9b79c" />
				</mesh>
				{[-0.11, 0, 0.11].flatMap((dx) =>
					[-0.08, 0.08].map((dz) => (
						<mesh key={`${dx}:${dz}`} position={[dx, 0.07, dz]} scale={[1, 1.25, 1]}>
							<sphereGeometry args={[0.045, 8, 6]} />
							<meshStandardMaterial color={warna} />
						</mesh>
					)),
				)}
			</group>
		);
	if (bentuk === "toples")
		return (
			<mesh position={[x, 0.11, 0]}>
				<cylinderGeometry args={[0.09, 0.09, 0.22, 10]} />
				<meshStandardMaterial color={warna} roughness={0.4} />
			</mesh>
		);
	if (bentuk === "gelas")
		return [-0.08, 0.08].map((dx) => (
			<mesh key={dx} position={[x + dx, 0.07, 0]}>
				<cylinderGeometry args={[0.045, 0.035, 0.14, 8]} />
				<meshStandardMaterial color={warna} />
			</mesh>
		));
	if (bentuk === "sayur")
		return (
			<group position={[x, 0, 0]}>
				<mesh position-y={0.05}>
					<boxGeometry args={[0.4, 0.1, 0.3]} />
					<meshStandardMaterial color="#8b5e34" />
				</mesh>
				{[-0.1, 0.05, 0.12].map((dx, i) => (
					<mesh key={i} position={[dx, 0.14, (i - 1) * 0.06]}>
						<icosahedronGeometry args={[0.09, 0]} />
						<meshStandardMaterial color={warna} flatShading />
					</mesh>
				))}
			</group>
		);
	if (bentuk === "sate")
		return [-0.1, 0, 0.1].map((dz) => (
			<mesh key={dz} position={[x, 0.05, dz]} rotation-z={Math.PI / 2}>
				<cylinderGeometry args={[0.025, 0.025, 0.3, 6]} />
				<meshStandardMaterial color={warna} />
			</mesh>
		));
	if (bentuk === "ikan")
		return (
			<mesh position={[x, 0.06, 0]} scale={[1.6, 0.5, 0.6]}>
				<sphereGeometry args={[0.1, 10, 8]} />
				<meshStandardMaterial color={warna} metalness={0.3} roughness={0.4} />
			</mesh>
		);
	return (
		<mesh position={[x, 0.03, 0]}>
			<cylinderGeometry args={[0.15, 0.13, 0.04, 14]} />
			<meshStandardMaterial color={warna} />
		</mesh>
	);
}

// Satu lapak: dinding belakang, tiang, meja saji, atap belang, papan nama.
function Lapak({ l }) {
	const w = WARUNG[l.id];
	const belang = 8;
	const tebal = l.lx / belang;
	return (
		<group position={[l.x, 0, l.z]}>
			<Gabung>
				<mesh position={[0, 1.2, -l.lz / 2 + 0.06]}>
					<boxGeometry args={[l.lx, 2.4, 0.12]} />
					<meshStandardMaterial color="#efe3cc" />
				</mesh>
				{[-1, 1].map((s) => (
					<mesh key={s} position={[s * (l.lx / 2 - 0.06), 1.25, 0.1]}>
						<boxGeometry args={[0.1, 2.5, 0.1]} />
						<meshStandardMaterial color={KAYU_TUA} />
					</mesh>
				))}
				{/* meja saji berwarna lapak */}
				<mesh position={[0, 0.5, l.lz / 2 - 0.25]}>
					<boxGeometry args={[l.lx - 0.15, 1.0, 0.5]} />
					<meshStandardMaterial color={w.warna} />
				</mesh>
				<mesh position={[0, 1.03, l.lz / 2 - 0.22]}>
					<boxGeometry args={[l.lx - 0.05, 0.06, 0.62]} />
					<meshStandardMaterial color={KAYU} />
				</mesh>
				{/* atap kain belang miring ke depan */}
				{Array.from({ length: belang }, (_, i) => (
					<mesh key={i} position={[-l.lx / 2 + tebal * (i + 0.5), 2.55, 0.15]} rotation-x={0.32}>
						<boxGeometry args={[tebal, 0.04, l.lz + 0.7]} />
						<meshStandardMaterial color={i % 2 ? "#fff7ed" : w.warna} />
					</mesh>
				))}
				{/* rak belakang berisi toples */}
				<mesh position={[0, 1.45, -l.lz / 2 + 0.25]}>
					<boxGeometry args={[l.lx - 0.4, 0.05, 0.3]} />
					<meshStandardMaterial color={KAYU} />
				</mesh>
				{[-0.9, -0.45, 0, 0.45, 0.9].map((dx, i) => (
					<mesh key={dx} position={[dx, 1.58, -l.lz / 2 + 0.25]}>
						<cylinderGeometry args={[0.08, 0.08, 0.2, 8]} />
						<meshStandardMaterial color={["#f59e0b", "#84cc16", "#ef4444", "#a16207", "#0ea5e9"][i]} />
					</mesh>
				))}
			</Gabung>
			{/* dagangan & penjual hanya saat dekat */}
			<AreaTampak x={l.x} z={l.z} jarak={50}>
				<group position={[0, 1.06, l.lz / 2 - 0.22]}>
					{DAGANGAN[l.id].map(([warna, bentuk], i) => (
						<Barang key={i} warna={warna} bentuk={bentuk} x={(i - 1) * 0.85} />
					))}
				</group>
				<group position={[0.3, 0.02, -0.15]}>
					<Tokoh penampilan={l.penjual} pose="diam" asal={{ x: l.x + 0.3, z: l.z - 0.15, rot: 0, lantai: 0 }} />
				</group>
			</AreaTampak>
			<Papan
				posisi={[0, 2.95, l.lz / 2 + 0.2]}
				lebar={2.5}
				tinggi={0.62}
				latar="#fffbeb"
				aksen={w.warna}
				bingkai={KAYU_TUA}
				diterangi
				baris={[
					{ teks: `${w.ikon} ${w.nama}`, ukuran: 0.2, tebal: true, warna: "#1c1917", y: 0.3 },
					{ teks: "Bahan dari BUM Desa Kab. Bogor", ukuran: 0.1, warna: "#57534e", y: 0.5 },
				]}
			/>
		</group>
	);
}

function Lantai() {
	const garis = [];
	for (let x = A.x0 + 0.5; x < A.x1; x += 0.5) garis.push(x);
	return (
		<Gabung>
			{/* dek kayu */}
			<mesh position={[(A.x0 + A.x1) / 2, 0.03, (A.z0 + A.z1) / 2]}>
				<boxGeometry args={[A.x1 - A.x0, 0.06, A.z1 - A.z0]} />
				<meshStandardMaterial color="#c49a6c" roughness={0.9} />
			</mesh>
			{garis.map((x) => (
				<mesh key={x} position={[x, 0.062, (A.z0 + A.z1) / 2]}>
					<boxGeometry args={[0.02, 0.004, A.z1 - A.z0]} />
					<meshStandardMaterial color="#9a7550" />
				</mesh>
			))}
			{/* meja panjang & bangku */}
			{MEJA_PASAR.map((m, i) => (
				<group key={i} position={[m.x, 0, m.z]}>
					<mesh position-y={0.73}>
						<boxGeometry args={[m.lx, 0.05, m.lz]} />
						<meshStandardMaterial color={KAYU} />
					</mesh>
					{[-1, 1].map((s) => (
						<mesh key={s} position={[s * (m.lx / 2 - 0.15), 0.36, 0]}>
							<boxGeometry args={[0.07, 0.72, m.lz - 0.15]} />
							<meshStandardMaterial color={KAYU_TUA} />
						</mesh>
					))}
					{[-1, 1].map((s) => (
						<mesh key={`b${s}`} position={[0, 0.22, s * 0.62]}>
							<boxGeometry args={[m.lx, 0.06, 0.32]} />
							<meshStandardMaterial color={KAYU_TUA} />
						</mesh>
					))}
					{[-1, 1].flatMap((s) =>
						[-1, 1].map((t) => (
							<mesh key={`k${s}${t}`} position={[t * (m.lx / 2 - 0.12), 0.1, s * 0.62]}>
								<boxGeometry args={[0.06, 0.2, 0.26]} />
								<meshStandardMaterial color={KAYU_TUA} />
							</mesh>
						)),
					)}
					{/* vas kecil di tengah meja */}
					<mesh position-y={0.82}>
						<cylinderGeometry args={[0.05, 0.04, 0.12, 8]} />
						<meshStandardMaterial color="#e7e5e4" />
					</mesh>
					<mesh position-y={0.92}>
						<icosahedronGeometry args={[0.08, 0]} />
						<meshStandardMaterial color={["#f472b6", "#facc15", "#fb923c"][i % 3]} flatShading />
					</mesh>
				</group>
			))}
			{/* pergola: tiang & balok */}
			{[PG.x0, (PG.x0 + PG.x1) / 2, PG.x1].flatMap((x) =>
				[PG.z0, PG.z1].map((z) => (
					<mesh key={`${x}:${z}`} position={[x, PG.tinggi / 2, z]}>
						<boxGeometry args={[0.16, PG.tinggi, 0.16]} />
						<meshStandardMaterial color={KAYU_TUA} />
					</mesh>
				)),
			)}
			{[PG.z0, PG.z1].map((z) => (
				<mesh key={z} position={[(PG.x0 + PG.x1) / 2, PG.tinggi, z]}>
					<boxGeometry args={[PG.x1 - PG.x0 + 0.4, 0.14, 0.14]} />
					<meshStandardMaterial color={KAYU_TUA} />
				</mesh>
			))}
			{Array.from({ length: 9 }, (_, i) => (
				<mesh key={i} position={[PG.x0 + ((PG.x1 - PG.x0) * i) / 8, PG.tinggi + 0.1, (PG.z0 + PG.z1) / 2]}>
					<boxGeometry args={[0.08, 0.1, PG.z1 - PG.z0 + 0.5]} />
					<meshStandardMaterial color={KAYU} />
				</mesh>
			))}
			{/* pot tanaman di tepi */}
			{[
				[A.x1 - 0.5, A.z0 + 2.5],
				[A.x1 - 0.5, A.z1 - 0.5],
				[A.x0 + 0.6, A.z1 - 0.5],
				[A.x0 + 0.6, A.z0 + 2.6],
				[-37, A.z1 - 0.4],
				[-45.6, A.z1 - 0.4],
			].map(([x, z], i) => (
				<group key={i} position={[x, 0, z]}>
					<mesh position-y={0.25}>
						<cylinderGeometry args={[0.28, 0.2, 0.5, 10]} />
						<meshStandardMaterial color="#9a3412" />
					</mesh>
					<mesh position-y={0.85} scale={[1, 1.4, 1]}>
						<icosahedronGeometry args={[0.45, 0]} />
						<meshStandardMaterial color={i % 2 ? "#3f8a4f" : "#4c9a5b"} flatShading />
					</mesh>
				</group>
			))}
			{/* gerbang timur */}
			{[G.z0, G.z1].map((z) => (
				<mesh key={z} position={[G.x, 1.6, z]}>
					<boxGeometry args={[0.25, 3.2, 0.25]} />
					<meshStandardMaterial color={KAYU_TUA} />
				</mesh>
			))}
			<mesh position={[G.x, 3.25, (G.z0 + G.z1) / 2]}>
				<boxGeometry args={[0.3, 0.22, G.z1 - G.z0 + 0.6]} />
				<meshStandardMaterial color={KAYU_TUA} />
			</mesh>
			{/* kaki papan etalase */}
			{[-0.8, 0.8].map((dz) => (
				<mesh key={dz} position={[E.x, 0.75, E.z + dz]}>
					<boxGeometry args={[0.08, 1.5, 0.08]} />
					<meshStandardMaterial color={KAYU_TUA} />
				</mesh>
			))}
		</Gabung>
	);
}

// lampu gantung (festoon) melengkung di bawah pergola
function LampuGantung() {
	const bohlam = useRef();
	const tali = useMemo(() => {
		const daftar = [];
		for (let k = 0; k < 5; k++) {
			const z = PG.z0 + ((PG.z1 - PG.z0) * (k + 0.5)) / 5;
			const titik = [];
			for (let i = 0; i <= 20; i++) {
				const f = i / 20;
				const x = PG.x0 + (PG.x1 - PG.x0) * f;
				titik.push([x, PG.tinggi - 0.05 - 0.45 * (1 - (2 * f - 1) ** 2), z]);
			}
			daftar.push(titik);
		}
		return daftar;
	}, []);
	const garis = useMemo(
		() =>
			tali.map((t) => {
				const g = new BufferGeometry();
				g.setAttribute("position", new Float32BufferAttribute(t.flat(), 3));
				return new Line(g, new LineBasicMaterial({ color: "#1f2937" }));
			}),
		[tali],
	);
	const N = tali.length * 21;
	useLayoutEffect(() => {
		const o = new Object3D();
		let i = 0;
		for (const t of tali)
			for (const [x, y, z] of t) {
				o.position.set(x, y - 0.07, z);
				o.updateMatrix();
				bohlam.current.setMatrixAt(i++, o.matrix);
			}
		bohlam.current.instanceMatrix.needsUpdate = true;
	}, [tali]);
	useFrame(({ clock }) => {
		BAHAN_BOHLAM.emissiveIntensity = 0.5 + suasana.malam * 2.4 + Math.sin(clock.elapsedTime * 3) * 0.05;
	});
	return (
		<>
			{garis.map((l, i) => (
				<primitive key={i} object={l} />
			))}
			<instancedMesh ref={bohlam} args={[GEO_BOHLAM, BAHAN_BOHLAM, N]} />
		</>
	);
}

const PEMAIN_BAND = [
	{ id: "vokal", dx: 2.45, dz: 0, p: { baju: "#be185d", celana: "#111827", kulit: "#e0b48a", rambut: "#141010", perempuan: true, jilbab: "#f9a8d4" } },
	{ id: "gitar", dx: 1.6, dz: -1.5, p: { baju: "#f8fafc", celana: "#1e3a5f", kulit: "#c68d5e", rambut: "#141010" } },
	{ id: "bas", dx: 1.4, dz: 1.5, p: { baju: "#0f766e", celana: "#111827", kulit: "#b9824f", rambut: "#20160f" } },
	{ id: "cajon", dx: 0.7, dz: 0, p: { baju: "#334155", celana: "#3f3f46", kulit: "#d9ad85", rambut: "#141010" }, duduk: true },
];

function Gitar({ bas }) {
	return (
		<group position={[0.02, 1.0, 0.2]} rotation-z={-0.9}>
			<mesh rotation-x={Math.PI / 2} scale={[1, 1, bas ? 1.2 : 1]}>
				<cylinderGeometry args={[0.16, 0.16, 0.08, 14]} />
				<meshStandardMaterial color={bas ? "#1e3a8a" : "#b45309"} />
			</mesh>
			<mesh position={[0, bas ? 0.45 : 0.37, 0]}>
				<boxGeometry args={[0.05, bas ? 0.6 : 0.46, 0.03]} />
				<meshStandardMaterial color="#3b2a1a" />
			</mesh>
		</group>
	);
}

function Panggung() {
	const band = useRef([]);
	const sorot = useRef([]);
	const bahanSorot = useMemo(() => WARNA_SOROT.map((c) => new MeshBasicMaterial({ color: c, transparent: true, opacity: 0.13, depthWrite: false, side: DoubleSide, blending: AdditiveBlending })), []);
	const bahanLampu = useMemo(() => WARNA_SOROT.map((c) => new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 })), []);
	const cek = useRef({ t: 1, dekat: false });
	useFrame(({ clock }, dt) => {
		const c = cek.current;
		c.t += dt;
		if (c.t > 0.5) {
			c.t = 0;
			c.dekat = posisi.lantai === 0 && Math.hypot(posisi.x - (A.x0 + A.x1) / 2, posisi.z - (A.z0 + A.z1) / 2) < 70;
		}
		if (!c.dekat) return;
		const t = clock.elapsedTime;
		const ketuk = t * (96 / 60) * Math.PI; // 96 BPM, sama dengan lagu "live"
		band.current.forEach((g, i) => {
			if (!g) return;
			g.position.y = S.tinggi + (PEMAIN_BAND[i].duduk ? 0 : Math.abs(Math.sin(ketuk + i)) * 0.03);
			g.rotation.z = Math.sin(ketuk * 0.5 + i) * 0.04;
		});
		sorot.current.forEach((m, i) => {
			if (!m) return;
			m.rotation.z = Math.sin(t * 0.7 + i * 1.6) * 0.45;
			m.rotation.x = Math.cos(t * 0.5 + i) * 0.25;
			bahanSorot[i].opacity = 0.06 + suasana.malam * 0.14 + Math.max(0, Math.sin(t * 2 + i)) * 0.04;
			bahanLampu[i].emissiveIntensity = 1 + Math.max(0, Math.sin(ketuk + i)) * 1.5;
		});
	});
	const tengahZ = (S.z0 + S.z1) / 2;
	const atas = S.tinggi;
	return (
		<group>
			<Gabung>
				<mesh position={[(S.x0 + S.x1) / 2, atas / 2, tengahZ]}>
					<boxGeometry args={[S.x1 - S.x0, atas, S.z1 - S.z0]} />
					<meshStandardMaterial color="#292524" />
				</mesh>
				<mesh position={[(S.x0 + S.x1) / 2, atas + 0.01, tengahZ]}>
					<boxGeometry args={[S.x1 - S.x0 - 0.1, 0.02, S.z1 - S.z0 - 0.1]} />
					<meshStandardMaterial color="#7c5a3c" />
				</mesh>
				{/* dinding latar */}
				<mesh position={[S.x0 + 0.08, atas + 1.5, tengahZ]}>
					<boxGeometry args={[0.16, 3, S.z1 - S.z0]} />
					<meshStandardMaterial color="#1c1917" />
				</mesh>
				{/* rangka lampu */}
				{[S.z0 + 0.1, S.z1 - 0.1].map((z) => (
					<mesh key={z} position={[S.x1 - 0.2, atas + 1.6, z]}>
						<boxGeometry args={[0.1, 3.2, 0.1]} />
						<meshStandardMaterial color="#475569" metalness={0.6} />
					</mesh>
				))}
				<mesh position={[S.x1 - 0.2, atas + 3.2, tengahZ]}>
					<boxGeometry args={[0.12, 0.12, S.z1 - S.z0]} />
					<meshStandardMaterial color="#475569" metalness={0.6} />
				</mesh>
				{/* pengeras suara */}
				{[S.z0 + 0.4, S.z1 - 0.4].map((z) => (
					<group key={z} position={[S.x1 - 0.45, atas, z]}>
						<mesh position-y={0.45}>
							<boxGeometry args={[0.5, 0.9, 0.5]} />
							<meshStandardMaterial color="#111827" />
						</mesh>
						<mesh position={[0.26, 0.55, 0]} rotation-z={Math.PI / 2}>
							<cylinderGeometry args={[0.16, 0.16, 0.02, 14]} />
							<meshStandardMaterial color="#374151" />
						</mesh>
					</group>
				))}
				{/* cajon & stand mic */}
				<mesh position={[S.x0 + 0.7, atas + 0.24, tengahZ]}>
					<boxGeometry args={[0.32, 0.48, 0.32]} />
					<meshStandardMaterial color="#b45309" />
				</mesh>
				<mesh position={[S.x0 + 2.75, atas + 0.75, tengahZ]}>
					<cylinderGeometry args={[0.012, 0.012, 1.5, 6]} />
					<meshStandardMaterial color="#9ca3af" metalness={0.7} />
				</mesh>
			</Gabung>
			<Papan
				posisi={[S.x0 + 0.2, atas + 2.2, tengahZ]}
				rotasi={Math.PI / 2}
				lebar={4.6}
				tinggi={0.95}
				latar="#1c1917"
				aksen="#f472b6"
				diterangi
				baris={[
					{ teks: "🎸 LIVE MUSIC", ukuran: 0.34, tebal: true, warna: "#fde68a", y: 0.42 },
					{ teks: "Akustik Pasar BUMDes · setiap hari", ukuran: 0.13, warna: "#f9a8d4", y: 0.74 },
				]}
			/>
			{PEMAIN_BAND.map((m, i) => (
				<group key={m.id} ref={(el) => (band.current[i] = el)} position={[S.x0 + m.dx, atas, tengahZ + m.dz]} rotation-y={Math.PI / 2}>
					<Tokoh penampilan={m.p} pose={m.duduk ? "duduk" : "diam"} bayangan={false} />
					{(m.id === "gitar" || m.id === "bas") && <Gitar bas={m.id === "bas"} />}
				</group>
			))}
			{/* lampu sorot berwarna & berkas cahayanya */}
			{WARNA_SOROT.map((c, i) => {
				const z = S.z0 + 0.6 + ((S.z1 - S.z0 - 1.2) * i) / (WARNA_SOROT.length - 1);
				return (
					<group key={c} position={[S.x1 - 0.2, atas + 3.05, z]}>
						<mesh material={bahanLampu[i]}>
							<boxGeometry args={[0.18, 0.18, 0.18]} />
						</mesh>
						<group ref={(el) => (sorot.current[i] = el)}>
							<mesh material={bahanSorot[i]} position={[-0.5, -1.4, 0]} rotation-z={-0.35}>
								<coneGeometry args={[0.55, 2.9, 12, 1, true]} />
							</mesh>
						</group>
					</group>
				);
			})}
		</group>
	);
}

function Pengunjung() {
	const daftar = useMemo(() => KURSI_PASAR.filter((k) => k.npc).map((k) => ({ ...k, penampilan: penampilanWarga() })), []);
	return daftar.map((k, i) => (
		<group key={i}>
			<group position={[k.x + Math.sin(k.rot) * 0.05, 0.05, k.z + Math.cos(k.rot) * 0.05]} rotation-y={k.rot}>
				<Tokoh penampilan={k.penampilan} pose="duduk" aktivitas="makan" />
			</group>
			{/* piring & gelas di depannya */}
			<mesh position={[k.x + Math.sin(k.rot) * 0.32, 0.77, k.z + Math.cos(k.rot) * 0.32]}>
				<cylinderGeometry args={[0.12, 0.1, 0.03, 12]} />
				<meshStandardMaterial color="#f8fafc" />
			</mesh>
			<mesh position={[k.x + Math.sin(k.rot) * 0.3 + 0.18, 0.82, k.z + Math.cos(k.rot) * 0.3]}>
				<cylinderGeometry args={[0.04, 0.035, 0.12, 8]} />
				<meshStandardMaterial color={["#f59e0b", "#84cc16", "#4a2c17"][i % 3]} />
			</mesh>
		</group>
	));
}

export default function PasarBumdes() {
	const lapak = useMemo(() => LAPAK_PASAR.map((l) => ({ ...l, penjual: penampilanWarga() })), []);
	return (
		<group name="pasar-bumdes">
			<Lantai />
			{lapak.map((l) => (
				<Lapak key={l.id} l={l} />
			))}
			<LampuGantung />
			<Panggung />
			{/* pengunjung (tokoh + piring) hanya saat dekat */}
			<AreaTampak x={(A.x0 + A.x1) / 2} z={(A.z0 + A.z1) / 2} jarak={55}>
				<Pengunjung />
			</AreaTampak>
			<Papan
				posisi={[G.x + 0.18, 2.75, (G.z0 + G.z1) / 2]}
				rotasi={Math.PI / 2}
				lebar={4.4}
				tinggi={0.8}
				latar="#14532d"
				aksen="#facc15"
				bingkai="#3b2a1a"
				diterangi
				baris={[
					{ teks: "🧺 PASAR BUMDes", ukuran: 0.3, tebal: true, warna: "#fef9c3", y: 0.38 },
					{ teks: "Food Court Produk Desa Kabupaten Bogor · Live Music", ukuran: 0.12, warna: "#bbf7d0", y: 0.68 },
				]}
			/>
			<Papan
				posisi={[E.x + 0.06, 1.55, E.z]}
				rotasi={Math.PI / 2}
				lebar={1.9}
				tinggi={1.0}
				latar="#fefce8"
				aksen="#16a34a"
				bingkai="#3b2a1a"
				diterangi
				baris={[
					{ teks: "🛍️ ETALASE BUM DESA", ukuran: 0.16, tebal: true, warna: "#14532d", y: 0.28 },
					{ teks: "Produk asli BUM Desa se-Kab. Bogor", ukuran: 0.09, warna: "#3f3f46", y: 0.52 },
					{ teks: "Tekan E untuk melihat", ukuran: 0.09, warna: "#16a34a", y: 0.74 },
				]}
			/>
		</group>
	);
}
