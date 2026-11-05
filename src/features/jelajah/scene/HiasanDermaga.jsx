import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import { IKAN_PER_ID, useKoleksi } from "../pancing";
import Gabung from "./Gabung";
import Papan from "./Papan";
import Tokoh from "./Tokoh";
import { AIR_Y, BAGIAN_DERMAGA, DEK_Y, KIOS_DERMAGA, KIOS_PERAHU } from "./situ";
import { suasana } from "./suasana";

// Hiasan spot mancing di satu dermaga (koordinat lokal dermaga: x = lebar w, z = panjang s,
// y relatif tanah): untaian lampu di pagar titian, perlengkapan pemancing di panggung, teratai
// & eceng di air, deretan pelampung penanda zona mancing, kunang-kunang malam, papan rekor
// tangkapan tamu, dan kios Toko Pancing di darat.


const BAHAN_BOHLAM = new MeshStandardMaterial({ color: "#fff3c4", emissive: "#ffc861", emissiveIntensity: 0 });
const BAHAN_KUNANG = new MeshStandardMaterial({ color: "#d9f99d", emissive: "#bef264", emissiveIntensity: 2, transparent: true, opacity: 0 });
const BAHAN_PELAMPUNG = [new MeshStandardMaterial({ color: "#f97316" }), new MeshStandardMaterial({ color: "#f8fafc" })];
const AIR = AIR_Y + 0.02;
// penjaga kios: berdiri di belakang meja, menghadap pembeli
const PENJAGA_PANCING = { seragam: "warga", perempuan: false, kulit: "#b57a4a", rambut: "#1a1410", baju: "#0f766e", celana: "#334155" };
const PENJAGA_PERAHU = { seragam: "warga", perempuan: true, kulit: "#e0b48a", rambut: "#2a1a12", baju: "#f8fafc", celana: "#1e3a8a" };

const acak = (biji) => {
	let s = biji;
	return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

function Pelampung({ s0 }) {
	const grup = useRef();
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		grup.current.children.forEach((m, i) => {
			m.position.y = AIR + 0.06 + Math.sin(t * 1.6 + i * 0.9) * 0.05;
			m.rotation.z = Math.sin(t * 1.3 + i) * 0.15;
		});
	});
	// busur pelampung di depan panggung, menandai zona mancing
	const titik = Array.from({ length: 11 }, (_, i) => {
		const a = (i / 10 - 0.5) * 2.2;
		return [Math.sin(a) * 9, s0 + 4 + Math.cos(a) * 7];
	});
	return (
		<group ref={grup}>
			{titik.map(([w, s], i) => (
				<mesh key={i} position={[w, AIR, s]} material={BAHAN_PELAMPUNG[i % 2]}>
					<sphereGeometry args={[0.18, 10, 8]} />
				</mesh>
			))}
		</group>
	);
}

function Kunang({ n = 18 }) {
	const grup = useRef();
	const data = useMemo(() => {
		const r = acak(77);
		return Array.from({ length: n }, () => ({ w: (r() - 0.5) * 10, s: r() * 16 - 2, h: 0.6 + r() * 1.6, f: r() * 6 }));
	}, [n]);
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		BAHAN_KUNANG.opacity = Math.max(0, suasana.malam - 0.4) * 1.6;
		grup.current.visible = suasana.malam > 0.4;
		if (!grup.current.visible) return;
		grup.current.children.forEach((m, i) => {
			const d = data[i];
			m.position.set(d.w + Math.sin(t * 0.4 + d.f) * 0.8, d.h + Math.sin(t * 0.9 + d.f * 2) * 0.3, d.s + Math.cos(t * 0.35 + d.f) * 0.8);
			m.scale.setScalar(0.6 + Math.max(0, Math.sin(t * 3 + d.f * 3)) * 0.8);
		});
	});
	return (
		<group ref={grup} visible={false}>
			{data.map((_, i) => (
				<mesh key={i} material={BAHAN_KUNANG}>
					<sphereGeometry args={[0.04, 6, 4]} />
				</mesh>
			))}
		</group>
	);
}

// Papan rekor di darat samping kios: tangkapan terberat tamu ini (dari koleksinya).
// Papan selebar 2,4 m, atap kios selebar 2,1 m: jarak pusatnya harus di atas 2,25 m supaya tidak menumbuk kios.
const S_PAPAN_REKOR = KIOS_DERMAGA.s - 2.6;
function PapanRekor({ d }) {
	const { koleksi, tangkapan } = useKoleksi();
	const terbaik = Object.entries(koleksi)
		.map(([id, c]) => ({ ikan: IKAN_PER_ID[id], kg: c.terberat }))
		.filter((x) => x.ikan)
		.sort((a, b) => b.ikan.kelas - a.ikan.kelas || b.kg - a.kg)
		.slice(0, 3);
	return (
		<Papan
			posisi={[KIOS_DERMAGA.w, 1.55, S_PAPAN_REKOR]}
			rotasi={-Math.PI / 2}
			lebar={2.4}
			tinggi={1.25}
			latar="#0f172a"
			aksen="#f59e0b"
			bingkai="#5c3d24"
			baris={[
				{ teks: "🏆 REKOR ANDA", ukuran: 0.2, tebal: true, warna: "#fbbf24", y: 0.2 },
				...(terbaik.length
					? terbaik.map((x, i) => ({ teks: `${["🥇", "🥈", "🥉"][i]} ${x.ikan.nama} · ${x.kg.toLocaleString("id-ID")} kg`, ukuran: 0.12, warna: "#f8fafc", y: 0.42 + i * 0.17 }))
					: [{ teks: "Belum ada tangkapan — ayo mancing!", ukuran: 0.11, warna: "#cbd5e1", y: 0.5 }]),
				{ teks: `${tangkapan} ikan ditangkap · ${d.nama}`, ukuran: 0.09, warna: "#94a3b8", y: 0.92 },
			]}
		/>
	);
}

export default function HiasanDermaga({ d }) {
	const [titian, panggung] = BAGIAN_DERMAGA;
	useFrame(() => {
		BAHAN_BOHLAM.emissiveIntensity = 0.15 + suasana.malam * 2.4;
	});
	// teratai & eceng di air sekitar dermaga (tetap per dermaga)
	const tanaman = useMemo(() => {
		const r = acak(d.id.length * 131 + 7);
		const teratai = [];
		const eceng = [];
		for (let i = 0; i < 26; i++) {
			const sisi = r() < 0.5 ? -1 : 1;
			teratai.push({ w: sisi * (2.6 + r() * 7), s: 1 + r() * 18, r: 0.25 + r() * 0.3, bunga: r() < 0.3, a: r() * 6 });
		}
		for (let i = 0; i < 14; i++) {
			const sisi = r() < 0.5 ? -1 : 1;
			eceng.push({ w: sisi * (2 + r() * 5), s: -0.8 + r() * 2.5, h: 0.5 + r() * 0.6 });
		}
		return { teratai, eceng };
	}, [d.id]);
	// bohlam di sepanjang pagar titian
	const bohlam = [];
	for (const sisi of [-1, 1]) for (let s = 0.8; s < titian.s1 - 0.3; s += 1.5) bohlam.push([sisi * (titian.w - 0.05), s]);
	const k = KIOS_DERMAGA;
	const kp = KIOS_PERAHU;

	return (
		<group>
			<Gabung>
				{/* kabel lampu di atas pagar */}
				{[-1, 1].map((sisi) => (
					<mesh key={sisi} position={[sisi * (titian.w - 0.05), DEK_Y + 1.05, (titian.s1 + 0.6) / 2]}>
						<boxGeometry args={[0.015, 0.015, titian.s1 - 0.6]} />
						<meshStandardMaterial color="#1f2937" />
					</mesh>
				))}
				{/* perlengkapan di panggung: rak joran, ember berisi ikan, cool box, kursi lipat */}
				<group position={[-panggung.w + 0.55, DEK_Y, panggung.s0 + 1.2]}>
					<mesh position={[0, 0.5, 0]}>
						<boxGeometry args={[0.5, 0.05, 0.25]} />
						<meshStandardMaterial color="#5c3d24" />
					</mesh>
					{[-0.18, 0, 0.18].map((x, i) => (
						<mesh key={x} position={[x, 1.05, -0.05]} rotation-x={-0.12}>
							<cylinderGeometry args={[0.012, 0.022, 2.1, 5]} />
							<meshStandardMaterial color={["#1f2937", "#0369a1", "#a16207"][i]} />
						</mesh>
					))}
				</group>
				<group position={[panggung.w - 0.6, DEK_Y, panggung.s0 + 1.1]}>
					<mesh position-y={0.17}>
						<cylinderGeometry args={[0.2, 0.16, 0.34, 12]} />
						<meshStandardMaterial color="#2563eb" />
					</mesh>
					<mesh position={[0.05, 0.38, 0]} rotation-z={0.6}>
						<coneGeometry args={[0.07, 0.18, 4]} />
						<meshStandardMaterial color="#64748b" />
					</mesh>
				</group>
				<group position={[panggung.w - 0.6, DEK_Y, panggung.s0 + 1.8]}>
					<mesh position-y={0.18}>
						<boxGeometry args={[0.55, 0.36, 0.38]} />
						<meshStandardMaterial color="#dc2626" />
					</mesh>
					<mesh position-y={0.38}>
						<boxGeometry args={[0.57, 0.06, 0.4]} />
						<meshStandardMaterial color="#f8fafc" />
					</mesh>
				</group>
				{[-1, 1].map((sw) => (
					<group key={sw} position={[sw * 1.6, DEK_Y, panggung.s0 + 0.9]} rotation-y={sw * 0.3}>
						<mesh position-y={0.4}>
							<boxGeometry args={[0.45, 0.04, 0.4]} />
							<meshStandardMaterial color="#166534" />
						</mesh>
						<mesh position={[0, 0.65, -0.2]} rotation-x={-0.2}>
							<boxGeometry args={[0.45, 0.45, 0.04]} />
							<meshStandardMaterial color="#166534" />
						</mesh>
						{[-0.2, 0.2].map((x) => (
							<mesh key={x} position={[x, 0.2, 0]} rotation-x={0.4}>
								<boxGeometry args={[0.03, 0.45, 0.03]} />
								<meshStandardMaterial color="#9ca3af" />
							</mesh>
						))}
					</group>
				))}
				{/* teratai & eceng gondok */}
				{tanaman.teratai.map((t, i) => (
					<group key={i}>
						<mesh position={[t.w, AIR, t.s]} rotation-y={t.a}>
							<cylinderGeometry args={[t.r, t.r, 0.02, 10, 1, false, 0.4, Math.PI * 2 - 0.4]} />
							<meshStandardMaterial color="#3f8f3a" />
						</mesh>
						{t.bunga && (
							<mesh position={[t.w + 0.05, AIR + 0.07, t.s]}>
								<coneGeometry args={[0.09, 0.12, 6]} />
								<meshStandardMaterial color="#f9a8d4" />
							</mesh>
						)}
					</group>
				))}
				{tanaman.eceng.map((e, i) => (
					<mesh key={i} position={[e.w, AIR + e.h / 2 - 0.1, e.s]}>
						<coneGeometry args={[0.18, e.h, 5]} />
						<meshStandardMaterial color="#4d7c0f" />
					</mesh>
				))}
				{/* kios Toko Pancing di darat */}
				<group position={[k.w, 0, k.s]} rotation-y={-Math.PI / 2}>
					<mesh position-y={0.5}>
						<boxGeometry args={[1.8, 1, 0.8]} />
						<meshStandardMaterial color="#0f766e" />
					</mesh>
					<mesh position-y={1.02}>
						<boxGeometry args={[1.9, 0.05, 0.9]} />
						<meshStandardMaterial color="#e5e7eb" />
					</mesh>
					{[-0.85, 0.85].map((x) => (
						<mesh key={x} position={[x, 1.3, -0.3]}>
							<boxGeometry args={[0.06, 2.6, 0.06]} />
							<meshStandardMaterial color="#334155" />
						</mesh>
					))}
					<mesh position={[0, 2.55, 0.05]} rotation-x={0.35}>
						<boxGeometry args={[2.1, 0.06, 1.2]} />
						<meshStandardMaterial color="#f59e0b" />
					</mesh>
					{[-0.5, -0.2, 0.1, 0.4].map((x, i) => (
						<mesh key={x} position={[x, 1.75, -0.32]} rotation-z={0.05 * i}>
							<cylinderGeometry args={[0.012, 0.02, 1.5, 5]} />
							<meshStandardMaterial color={["#a16207", "#1f2937", "#0369a1", "#ca8a04"][i]} />
						</mesh>
					))}
				</group>
				{/* kios Toko Perahu di darat, di seberang titian dari kios joran */}
				<group position={[kp.w, 0, kp.s]} rotation-y={Math.PI / 2}>
					<mesh position-y={0.5}>
						<boxGeometry args={[1.8, 1, 0.8]} />
						<meshStandardMaterial color="#1d4ed8" />
					</mesh>
					<mesh position-y={1.02}>
						<boxGeometry args={[1.9, 0.05, 0.9]} />
						<meshStandardMaterial color="#e5e7eb" />
					</mesh>
					{[-0.95, 0.95].map((x) => (
						<mesh key={x} position={[x, 1.3, 0.45]}>
							<boxGeometry args={[0.06, 2.5, 0.06]} />
							<meshStandardMaterial color="#334155" />
						</mesh>
					))}
					{/* atap datar; papan nama duduk di tepi depannya */}
					<mesh position={[0, 2.54, 0.1]}>
						<boxGeometry args={[2.3, 0.08, 1.2]} />
						<meshStandardMaterial color="#f8fafc" />
					</mesh>
					<mesh position={[0, 2.5, 0.705]}>
						<boxGeometry args={[2.3, 0.1, 0.02]} />
						<meshStandardMaterial color="#f97316" />
					</mesh>
					{/* pelampung bundar di dinding depan & dayung bersandar */}
					<mesh position={[0, 0.55, 0.41]}>
						<torusGeometry args={[0.17, 0.05, 8, 16]} />
						<meshStandardMaterial color="#f97316" />
					</mesh>
					<mesh position={[0.78, 1.6, -0.1]} rotation-z={0.12}>
						<cylinderGeometry args={[0.02, 0.02, 1.2, 6]} />
						<meshStandardMaterial color="#a16207" />
					</mesh>
					{/* pajangan mini di atas meja: perahu fiber & jetski */}
					<group position={[-0.45, 1.045, 0.1]}>
						<mesh position-y={0.04}>
							<boxGeometry args={[0.5, 0.08, 0.2]} />
							<meshStandardMaterial color="#f8fafc" />
						</mesh>
						<mesh position={[0.3, 0.04, 0]} rotation-y={Math.PI / 4}>
							<boxGeometry args={[0.14, 0.08, 0.14]} />
							<meshStandardMaterial color="#f8fafc" />
						</mesh>
						<mesh position-y={0.081}>
							<boxGeometry args={[0.52, 0.02, 0.07]} />
							<meshStandardMaterial color="#2563eb" />
						</mesh>
					</group>
					<group position={[0.45, 1.045, 0.1]}>
						<mesh position-y={0.04}>
							<boxGeometry args={[0.46, 0.08, 0.15]} />
							<meshStandardMaterial color="#e11d48" />
						</mesh>
						<mesh position={[0.1, 0.11, 0]}>
							<boxGeometry args={[0.14, 0.07, 0.07]} />
							<meshStandardMaterial color="#111827" />
						</mesh>
						<mesh position={[-0.05, 0.1, 0]}>
							<boxGeometry args={[0.1, 0.05, 0.05]} />
							<meshStandardMaterial color="#f1f5f9" />
						</mesh>
					</group>
				</group>
			</Gabung>
			{bohlam.map(([w, s], i) => (
				<mesh key={i} position={[w, DEK_Y + 1.0, s]} material={BAHAN_BOHLAM}>
					<sphereGeometry args={[0.055, 8, 6]} />
				</mesh>
			))}
			<group position={[k.w, 0, k.s]} rotation-y={-Math.PI / 2}>
				<group position={[0, 0, -0.8]}>
					<Tokoh penampilan={PENJAGA_PANCING} pose="diam" />
				</group>
			</group>
			<group position={[kp.w, 0, kp.s]} rotation-y={Math.PI / 2}>
				<group position={[0, 0, -0.8]}>
					<Tokoh penampilan={PENJAGA_PERAHU} pose="diam" />
				</group>
			</group>
			<Pelampung s0={panggung.s1} />
			<Kunang />
			<PapanRekor d={d} />
			{/* tiang papan rekor */}
			{[-1, 1].map((sisi) => (
				<mesh key={sisi} position={[KIOS_DERMAGA.w + 0.05, 0.8, S_PAPAN_REKOR + sisi * 1.1]}>
					<boxGeometry args={[0.08, 1.6, 0.08]} />
					<meshStandardMaterial color="#5c3d24" />
				</mesh>
			))}
			<group position={[k.w, 0, k.s]} rotation-y={-Math.PI / 2}>
				<Papan
					posisi={[0, 2.15, 0.43]}
					lebar={1.6}
					tinggi={0.42}
					latar="#0f766e"
					baris={[{ teks: "🎣 TOKO PANCING", ukuran: 0.2, tebal: true, warna: "#fef3c7", y: 0.52 }]}
				/>
			</group>
			<group position={[kp.w, 0, kp.s]} rotation-y={Math.PI / 2}>
				<Papan
					posisi={[0, 2.84, 0.6]}
					lebar={1.7}
					tinggi={0.42}
					latar="#1d4ed8"
					bingkai="#f8fafc"
					baris={[{ teks: "⚓ TOKO PERAHU", ukuran: 0.2, tebal: true, warna: "#fef3c7", y: 0.52 }]}
				/>
			</group>
		</group>
	);
}
