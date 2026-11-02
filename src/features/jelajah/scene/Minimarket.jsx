import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Matrix4, MeshStandardMaterial } from "three";
import { posisi } from "../jelajahStore";
import { BARANG } from "../toko";
import { GEO_KERANJANG, geometriBarang } from "./barangToko";
import Gabung from "./Gabung";
import { BAHAN_WARNA, gabung } from "./geometri";
import { HALAMAN_TOKO, TOKO } from "./layout";
import Papan from "./Papan";
import { usePudar } from "./pudar";
import { suasana } from "./suasana";
import Tokoh from "./Tokoh";

// Deretan toko di seberang jalan depan kantor yang bisa dimasuki (Alfamart & Koperasi Desa
// Merah Putih): pintu kaca geser yang membuka sendiri, tiga rak berisi barang (tiap sisi satu
// jenis, berlabel harga), kasir, kulkas / tumpukan karung, dan tumpukan keranjang. Dinding &
// atap ikut memudar saat menghalangi kamera. Dipasang di grup halaman (y = TANAH).

const BARANG_PER_ID = Object.fromEntries(BARANG.map((b) => [b.id, b]));
const BAHAN_KACA = new MeshStandardMaterial({ color: "#9cc7e6", transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.3, emissive: "#fff6dd", emissiveIntensity: 0 });
const BAHAN_LAMPU = new MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.4 });
const RAK_TINGKAT = [0.12, 0.55, 0.98, 1.41];

const GAYA = {
	alfamart: {
		dinding: "#f5f5f2",
		bingkai: "#334155",
		rakTiang: "#cbd5e1",
		rakPapan: "#e5e7eb",
		aksen: "#d61f26",
		labelLatar: "#fde047",
		kasir: { seragam: "warga", perempuan: true, jilbab: "#b91c1c", kulit: "#d3a378", rambut: "#21180f", baju: "#d61f26", celana: "#1e3a5f", rok: false },
	},
	koperasi: {
		dinding: "#fbfaf7",
		bingkai: "#c81e1e",
		rakTiang: "#8b5a2b",
		rakPapan: "#c08a4a",
		aksen: "#c81e1e",
		labelLatar: "#ffffff",
		kasir: { seragam: "warga", perempuan: false, kulit: "#c68d5e", rambut: "#1a130d", baju: "#ffffff", celana: "#3f3f46", kacamata: true },
	},
};

// Satu geometri berisi deretan barang di satu sisi rak (4 tingkat × 6 kolom × 2 baris).
function isiSisiRak(rak, sisi) {
	const g = geometriBarang(BARANG_PER_ID[sisi < 0 ? rak.kiri : rak.kanan]);
	const daftar = [];
	const m = new Matrix4();
	const panjang = rak.z1 - rak.z0;
	for (const y of RAK_TINGKAT) {
		for (let i = 0; i < 6; i++) {
			for (const lapis of [0.08, 0.2]) {
				const c = g.clone();
				c.applyMatrix4(m.makeTranslation(rak.x + sisi * lapis, y + 0.03, rak.z0 + 0.35 + (i * (panjang - 0.7)) / 5));
				daftar.push(c);
			}
		}
	}
	return gabung(daftar);
}

function Rak({ rak, gaya }) {
	const isi = useMemo(() => [isiSisiRak(rak, -1), isiSisiRak(rak, 1)], [rak]);
	useEffect(() => () => isi.forEach((g) => g.dispose()), [isi]);
	const tengah = (rak.z0 + rak.z1) / 2;
	const panjang = rak.z1 - rak.z0;
	return (
		<group>
			<Gabung>
				<mesh position={[rak.x, 0.85, tengah]}>
					<boxGeometry args={[0.08, 1.7, panjang]} />
					<meshStandardMaterial color={gaya.rakTiang} />
				</mesh>
				{RAK_TINGKAT.map((y) => (
					<mesh key={y} position={[rak.x, y, tengah]}>
						<boxGeometry args={[0.56, 0.04, panjang]} />
						<meshStandardMaterial color={gaya.rakPapan} />
					</mesh>
				))}
				<mesh position={[rak.x, 0.04, tengah]}>
					<boxGeometry args={[0.6, 0.08, panjang + 0.05]} />
					<meshStandardMaterial color={gaya.aksen} />
				</mesh>
			</Gabung>
			{isi.map((g, i) => (
				<mesh key={i} geometry={g} material={BAHAN_WARNA} />
			))}
			{/* label harga di ujung depan rak, menghadap pintu, untuk kedua sisi */}
			{[-1, 1].map((sisi) => {
				const b = BARANG_PER_ID[sisi < 0 ? rak.kiri : rak.kanan];
				return (
					<Papan
						key={sisi}
						posisi={[rak.x + sisi * 0.15, 1.95, rak.z0 - 0.02]}
						rotasi={Math.PI}
						lebar={0.3}
						tinggi={0.36}
						latar={gaya.labelLatar}
						baris={[
							{ teks: b.ikon, ukuran: 0.11, y: 0.25 },
							{ teks: b.nama, ukuran: 0.045, tebal: true, warna: "#7f1d1d", y: 0.55 },
							{ teks: `🪙 ${b.harga}`, ukuran: 0.07, tebal: true, warna: "#b91c1c", y: 0.8 },
						]}
					/>
				);
			})}
		</group>
	);
}

// Segitiga dinding pelana (muka & belakang atap koperasi), bidang xy menghadap ±z.
function geomPelana(lebar, tinggi) {
	const g = new BufferGeometry();
	g.setAttribute("position", new Float32BufferAttribute([-lebar / 2, 0, 0, lebar / 2, 0, 0, 0, tinggi, 0], 3));
	g.computeVertexNormals();
	return g;
}

// Dinding, atap, & pita nama: bahan sendiri supaya bisa dipudarkan saat menghalangi kamera.
function Cangkang({ t, gaya, daftarDinding }) {
	const grup = usePudar(daftarDinding);

	const lebar = t.x1 - t.x0;
	const dalam = t.z1 - t.z0;
	const cx = (t.x0 + t.x1) / 2;
	const cz = (t.z0 + t.z1) / 2;
	const koperasi = t.id === "koperasi";
	// atap pelana genteng koperasi: bubungan sepanjang z, pelana menghadap jalan
	const miring = 0.42;
	const naik = (lebar / 2 + 0.5) * Math.tan(miring);
	const pelana = useMemo(() => geomPelana(lebar, (lebar / 2) * Math.tan(miring)), [lebar]);
	return (
		<group ref={grup}>
			<mesh position={[cx, t.tinggi / 2, t.z1 - 0.1]}>
				<boxGeometry args={[lebar, t.tinggi, 0.2]} />
				<meshStandardMaterial color={gaya.dinding} />
			</mesh>
			{[t.x0 + 0.1, t.x1 - 0.1].map((x) => (
				<mesh key={x} position={[x, t.tinggi / 2, cz]}>
					<boxGeometry args={[0.2, t.tinggi, dalam]} />
					<meshStandardMaterial color={gaya.dinding} />
				</mesh>
			))}
			{koperasi ? (
				<>
					{[-1, 1].map((s) => (
						<mesh key={s} position={[cx + (s * (lebar / 2 + 0.5)) / 2, t.tinggi + naik / 2, cz - 0.2]} rotation-z={-s * miring}>
							<boxGeometry args={[(lebar / 2 + 0.5) / Math.cos(miring), 0.16, dalam + 1.6]} />
							<meshStandardMaterial color="#b4472c" />
						</mesh>
					))}
					{[t.z0 + 0.02, t.z1 - 0.02].map((z) => (
						<mesh key={z} geometry={pelana} position={[cx, t.tinggi, z]}>
							<meshStandardMaterial color={gaya.dinding} side={DoubleSide} />
						</mesh>
					))}
					{/* dinding muka di atas kaca, sampai kaki pelana */}
					<mesh position={[cx, 3.85, t.z0 + 0.05]}>
						<boxGeometry args={[lebar, 1.1, 0.2]} />
						<meshStandardMaterial color={gaya.dinding} />
					</mesh>
					{/* kanopi genteng di atas muka toko */}
					<mesh position={[cx, 3.35, t.z0 - 0.75]} rotation-x={-0.32}>
						<boxGeometry args={[lebar + 0.4, 0.12, 1.7]} />
						<meshStandardMaterial color="#b4472c" />
					</mesh>
				</>
			) : (
				<>
					<mesh position={[cx, t.tinggi + 0.15, cz]}>
						<boxGeometry args={[lebar + 0.4, 0.3, dalam + 0.4]} />
						<meshStandardMaterial color="#cbd5e1" />
					</mesh>
					<mesh position={[cx, 3.85, t.z0 - 0.02]}>
						<boxGeometry args={[lebar + 0.4, 1.1, 0.25]} />
						<meshStandardMaterial color="#d61f26" />
					</mesh>
					<mesh position={[cx, 3.3, t.z0 - 0.95]}>
						<boxGeometry args={[lebar + 0.6, 0.12, 1.9]} />
						<meshStandardMaterial color="#e2e8f0" />
					</mesh>
				</>
			)}
		</group>
	);
}

// Bendera merah putih berkibar di puncak pelana koperasi.
function Bendera({ x, y, z }) {
	const kain = useRef();
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		kain.current.rotation.y = Math.sin(t * 2.1) * 0.25;
		kain.current.rotation.z = Math.sin(t * 3.3) * 0.04;
	});
	return (
		<group position={[x, y, z]}>
			<mesh position-y={1.1}>
				<cylinderGeometry args={[0.03, 0.03, 2.2, 6]} />
				<meshStandardMaterial color="#e5e7eb" metalness={0.5} />
			</mesh>
			<group ref={kain} position={[0.03, 1.95, 0]}>
				<mesh position={[0.45, 0.13, 0]}>
					<boxGeometry args={[0.9, 0.26, 0.01]} />
					<meshStandardMaterial color="#dc2626" />
				</mesh>
				<mesh position={[0.45, -0.13, 0]}>
					<boxGeometry args={[0.9, 0.26, 0.01]} />
					<meshStandardMaterial color="#f8fafc" />
				</mesh>
			</group>
		</group>
	);
}

function Toko({ t, daftarDinding }) {
	const gaya = GAYA[t.id];
	const koperasi = t.id === "koperasi";
	const lebar = t.x1 - t.x0;
	const dalam = t.z1 - t.z0;
	const cx = (t.x0 + t.x1) / 2;
	const cz = (t.z0 + t.z1) / 2;
	const mk = t.mejaKasir;
	const pintuKiri = useRef();
	const pintuKanan = useRef();
	const buka = useRef(0);
	const lebarPintu = (t.pintu.x1 - t.pintu.x0) / 2;

	const tumpukan = useMemo(() => gabung([0, 1, 2, 3, 4].map((i) => GEO_KERANJANG.clone().translate(0, i * 0.07, 0))), []);
	useEffect(() => () => tumpukan.dispose(), [tumpukan]);
	// tumpukan karung beras di dinding belakang koperasi
	const karung = useMemo(() => {
		if (!koperasi) return null;
		const daftar = [];
		for (let i = 0; i < 9; i++) for (let j = 0; j < 3 - (i % 2); j++) daftar.push(geometriBarang(BARANG_PER_ID.beras).clone().scale(3.2, 2.2, 3.2).translate(cx - 4 + i, 0.06 + j * 0.42, t.z1 - 0.6));
		return gabung(daftar);
	}, [koperasi, cx, t.z1]);
	useEffect(() => () => karung?.dispose(), [karung]);

	useFrame((_, dt) => {
		// pintu geser membuka sendiri saat ada orang di dekatnya
		const dekat = Math.abs(posisi.x - (t.pintu.x0 + t.pintu.x1) / 2) < 2.2 && Math.abs(posisi.z - t.pintu.z) < 2.4;
		buka.current += ((dekat ? 1 : 0) - buka.current) * (1 - Math.exp(-6 * dt));
		const geser = buka.current * (lebarPintu - 0.05);
		pintuKiri.current.position.x = t.pintu.x0 + lebarPintu / 2 - geser;
		pintuKanan.current.position.x = t.pintu.x1 - lebarPintu / 2 + geser;
	});

	return (
		<group>
			<Gabung>
				{/* teras & lantai dalam */}
				<mesh position={[cx, 0.04, t.z0 - 0.9]}>
					<boxGeometry args={[lebar + 0.6, 0.08, 1.8]} />
					<meshStandardMaterial color={koperasi ? "#cfc8bb" : "#d6d3cb"} />
				</mesh>
				<mesh position={[cx, 0.03, cz]}>
					<boxGeometry args={[lebar - 0.4, 0.06, dalam - 0.2]} />
					<meshStandardMaterial color={koperasi ? "#e9e4da" : "#eeece9"} />
				</mesh>
				{/* bingkai muka toko */}
				{[t.x0 + 0.15, t.pintu.x0, t.pintu.x1, t.x1 - 0.15].map((x) => (
					<mesh key={x} position={[x, 1.6, t.z0 + 0.05]}>
						<boxGeometry args={[koperasi ? 0.32 : 0.16, 3.2, koperasi ? 0.3 : 0.16]} />
						<meshStandardMaterial color={gaya.bingkai} metalness={koperasi ? 0 : 0.4} />
					</mesh>
				))}
				<mesh position={[cx, 3.25, t.z0 + 0.05]}>
					<boxGeometry args={[lebar, 0.18, 0.2]} />
					<meshStandardMaterial color={gaya.bingkai} metalness={koperasi ? 0 : 0.4} />
				</mesh>
				{koperasi ? (
					<>
						{/* lis bawah merah & pot tanaman di kedua sisi pintu */}
						<mesh position={[cx, 0.2, t.z0 - 0.02]}>
							<boxGeometry args={[lebar, 0.4, 0.12]} />
							<meshStandardMaterial color="#c81e1e" />
						</mesh>
						{[t.pintu.x0 - 0.8, t.pintu.x1 + 0.8].map((x) => (
							<group key={x}>
								<mesh position={[x, 0.25, t.z0 - 0.5]}>
									<cylinderGeometry args={[0.24, 0.18, 0.5, 10]} />
									<meshStandardMaterial color="#c2410c" />
								</mesh>
								<mesh position={[x, 0.75, t.z0 - 0.5]}>
									<sphereGeometry args={[0.38, 8, 6]} />
									<meshStandardMaterial color="#3f7d3a" />
								</mesh>
							</group>
						))}
					</>
				) : (
					<>
						<mesh position={[cx, 3.2, t.z0 - 0.13]}>
							<boxGeometry args={[lebar + 0.4, 0.1, 0.06]} />
							<meshStandardMaterial color="#1d4ed8" />
						</mesh>
						<mesh position={[cx, 3.1, t.z0 - 0.13]}>
							<boxGeometry args={[lebar + 0.4, 0.1, 0.06]} />
							<meshStandardMaterial color="#facc15" />
						</mesh>
						{/* kulkas minuman di dinding belakang */}
						<mesh position={[cx, 1.1, t.z1 - 0.55]}>
							<boxGeometry args={[lebar - 2, 2.2, 0.8]} />
							<meshStandardMaterial color="#94a3b8" />
						</mesh>
						{[-3, -1, 1, 3].map((x) => (
							<mesh key={x} position={[cx + x, 1.15, t.z1 - 0.94]}>
								<boxGeometry args={[1.85, 1.9, 0.03]} />
								<meshStandardMaterial color="#bae6fd" />
							</mesh>
						))}
					</>
				)}
				{/* meja kasir & mesin kasir */}
				<mesh position={[(mk.x0 + mk.x1) / 2, 0.5, (mk.z0 + mk.z1) / 2]}>
					<boxGeometry args={[mk.x1 - mk.x0, 1.0, mk.z1 - mk.z0]} />
					<meshStandardMaterial color={gaya.aksen} />
				</mesh>
				<mesh position={[mk.x1 - 0.3, 1.18, mk.z0 + 0.9]}>
					<boxGeometry args={[0.35, 0.32, 0.45]} />
					<meshStandardMaterial color="#1f2937" />
				</mesh>
				<mesh position={[mk.x1 - 0.3, 1.5, mk.z0 + 0.9]}>
					<boxGeometry args={[0.05, 0.25, 0.35]} />
					<meshStandardMaterial color="#0f172a" />
				</mesh>
			</Gabung>

			<Cangkang t={t} gaya={gaya} daftarDinding={daftarDinding} />
			{t.rak.map((r) => (
				<Rak key={r.x} rak={r} gaya={gaya} />
			))}
			<mesh geometry={tumpukan} material={BAHAN_WARNA} position={[t.keranjang.x, 0.06, t.keranjang.z]} />
			{karung && <mesh geometry={karung} material={BAHAN_WARNA} />}

			{/* kaca muka toko & daun pintu geser */}
			{[
				[t.x0 + 0.15, t.pintu.x0],
				[t.pintu.x1, t.x1 - 0.15],
			].map(([a, b]) => (
				<mesh key={a} position={[(a + b) / 2, 1.6, t.z0 + 0.05]} material={BAHAN_KACA}>
					<boxGeometry args={[b - a - 0.16, 3.0, 0.05]} />
				</mesh>
			))}
			<mesh ref={pintuKiri} position={[t.pintu.x0 + lebarPintu / 2, 1.4, t.z0 - 0.04]} material={BAHAN_KACA}>
				<boxGeometry args={[lebarPintu, 2.6, 0.05]} />
			</mesh>
			<mesh ref={pintuKanan} position={[t.pintu.x1 - lebarPintu / 2, 1.4, t.z0 - 0.04]} material={BAHAN_KACA}>
				<boxGeometry args={[lebarPintu, 2.6, 0.05]} />
			</mesh>

			{/* lampu langit-langit */}
			{[-3, 0, 3].map((x) => (
				<mesh key={x} position={[cx + x, t.tinggi - 0.1, cz]} material={BAHAN_LAMPU}>
					<boxGeometry args={[0.25, 0.05, dalam - 2]} />
				</mesh>
			))}
			{/* kasir berdiri di balik meja, menghadap pembeli */}
			<group position={[mk.x0 - 0.3, 0.06, (mk.z0 + mk.z1) / 2]} rotation-y={Math.PI / 2}>
				<Tokoh penampilan={gaya.kasir} pose="diam" asal={{ x: mk.x0 - 0.3, z: (mk.z0 + mk.z1) / 2, rot: Math.PI / 2, lantai: 0 }} />
			</group>
			<Papan
				posisi={[(mk.x0 + mk.x1) / 2 + 0.1, 2.3, mk.z0 - 0.05]}
				rotasi={Math.PI}
				lebar={0.9}
				tinggi={0.35}
				latar={koperasi ? "#c81e1e" : "#1d4ed8"}
				baris={[{ teks: "KASIR", ukuran: 0.18, tebal: true, warna: "#ffffff", y: 0.52 }]}
			/>
			{koperasi ? (
				<>
					{/* papan nama di pelana: atas merah "KOPERASI DESA", bawah putih "MERAH PUTIH" */}
					<Papan posisi={[cx, 5.05, t.z0 - 0.08]} rotasi={Math.PI} lebar={6.6} tinggi={0.7} latar="#c81e1e" baris={[{ teks: "KOPERASI DESA", ukuran: 0.42, tebal: true, warna: "#ffffff", y: 0.55 }]} />
					<Papan posisi={[cx, 4.35, t.z0 - 0.08]} rotasi={Math.PI} lebar={6.6} tinggi={0.7} latar="#ffffff" baris={[{ teks: "MERAH PUTIH", ukuran: 0.46, tebal: true, warna: "#c81e1e", y: 0.55 }]} />
					<Papan posisi={[cx + 3.6, 3.88, t.z0 - 0.08]} rotasi={Math.PI} lebar={3.6} tinggi={0.4} latar="#b91c1c" baris={[{ teks: "MINI MARKET", ukuran: 0.22, tebal: true, warna: "#ffffff", y: 0.55 }]} />
					<Papan posisi={[cx - 3.6, 3.88, t.z0 - 0.08]} rotasi={Math.PI} lebar={3.6} tinggi={0.4} latar="#b91c1c" baris={[{ teks: "LAYANAN SIMPAN PINJAM", ukuran: 0.2, tebal: true, warna: "#ffffff", y: 0.55 }]} />
					<Bendera x={cx} y={t.tinggi + (lebar / 2) * Math.tan(0.42) - 0.1} z={t.z0 + 0.6} />
				</>
			) : (
				<Papan posisi={[cx, 3.85, t.z0 - 0.16]} rotasi={Math.PI} lebar={6.4} tinggi={0.95} latar="#d61f26" baris={[{ teks: "Alfamart", ukuran: 0.7, tebal: true, warna: "#ffffff", y: 0.52 }]} />
			)}
		</group>
	);
}

export default function Minimarket({ daftarDinding }) {
	const h = HALAMAN_TOKO;
	useFrame(() => {
		BAHAN_KACA.emissiveIntensity = 0.15 + suasana.malam * 0.6;
		BAHAN_LAMPU.emissiveIntensity = 0.4 + suasana.malam * 1.4;
	});
	return (
		<group>
			<Gabung>
				{/* halaman parkir beton & garis parkir */}
				<mesh rotation-x={-Math.PI / 2} position={[(h.x0 + h.x1) / 2, 0.012, (h.z0 + h.z1) / 2]}>
					<planeGeometry args={[h.x1 - h.x0, h.z1 - h.z0]} />
					<meshStandardMaterial color="#b9b6ae" />
				</mesh>
				{[-7.5, -5, 5, 7.5, 9.5, 12, 20, 22.5].map((x) => (
					<mesh key={x} position={[x, 0.02, (h.z0 + h.z1) / 2]}>
						<boxGeometry args={[0.1, 0.01, 4]} />
						<meshStandardMaterial color="#f4efe4" />
					</mesh>
				))}
			</Gabung>
			{TOKO.map((t) => (
				<Toko key={t.id} t={t} daftarDinding={daftarDinding} />
			))}
		</group>
	);
}
