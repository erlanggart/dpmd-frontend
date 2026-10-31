import { useLayoutEffect, useMemo, useRef } from "react";
import { Object3D } from "three";
import { JALAN, PAGAR_DEPAN, PAGAR_KANAN, PAPAN_NAMA, POS_SATPAM, RUAS_PAGAR_DEPAN } from "./layout";
import Papan from "./Papan";
import { teksturPavingJalan } from "./tekstur";

// Muka depan kantor dari arah jalan, mengikuti foto aslinya: pagar dinding
// abu-abu berlis hijau dengan lubang-lubang tegak dan tiang batu, gerbang geser
// stainless, pos satpam putih beratap cokelat, papan nama dinas, bak tanaman,
// trotoar berkanstin hitam-putih, dan jalan aspal.

const HIJAU = "#9cc65a";
const BATU = "#6f665c";
const ABU = "#7b8a8c";
const JARAK_TIANG = 3.2;

// Semua ruas pagar (depan & kanan) sebagai garis dari a ke b.
function daftarRuas() {
	const z = PAGAR_DEPAN.z;
	return [...RUAS_PAGAR_DEPAN.map(([x0, x1]) => ({ a: [x0, z], b: [x1, z] })), { a: [PAGAR_KANAN.x, PAGAR_KANAN.z0], b: [PAGAR_KANAN.x, PAGAR_KANAN.z1] }];
}

// Satu InstancedMesh kotak untuk banyak potongan bermateri sama.
function Kotak({ daftar, warna, ...bahan }) {
	const ref = useRef();
	useLayoutEffect(() => {
		const o = new Object3D();
		daftar.forEach(({ p, s, r = 0 }, i) => {
			o.position.set(...p);
			o.scale.set(...s);
			o.rotation.set(0, r, 0);
			o.updateMatrix();
			ref.current.setMatrixAt(i, o.matrix);
		});
		ref.current.instanceMatrix.needsUpdate = true;
	}, [daftar]);
	return (
		<instancedMesh ref={ref} args={[null, null, daftar.length]}>
			<boxGeometry />
			<meshStandardMaterial color={warna} {...bahan} />
		</instancedMesh>
	);
}

function Pagar() {
	const bagian = useMemo(() => {
		const plint = [];
		const panel = [];
		const lis = [];
		const tiang = [];
		const lubang = [];
		const t = PAGAR_DEPAN.tinggi;
		for (const { a, b } of daftarRuas()) {
			const dx = b[0] - a[0];
			const dz = b[1] - a[1];
			const L = Math.hypot(dx, dz);
			const ux = dx / L;
			const uz = dz / L;
			const r = Math.atan2(-dz, dx); // sumbu x lokal searah ruas
			const di = (s) => [a[0] + ux * s, a[1] + uz * s];
			const [cx, cz] = di(L / 2);
			plint.push({ p: [cx, 0.2, cz], s: [L, 0.4, 0.36], r });
			panel.push({ p: [cx, 0.4 + (t - 0.5) / 2, cz], s: [L, t - 0.5, 0.24], r });
			lis.push({ p: [cx, t - 0.05, cz], s: [L, 0.1, 0.34], r });
			const n = Math.max(1, Math.round(L / JARAK_TIANG));
			for (let i = 0; i <= n; i++) {
				const [x, z] = di((L * i) / n);
				tiang.push({ p: [x, (t + 0.2) / 2, z], s: [0.5, t + 0.2, 0.5], r });
				tiang.push({ p: [x, t + 0.25, z], s: [0.6, 0.1, 0.6], r, lis: true });
				if (i === n) break;
				// lubang tegak di tengah tiap panel, tampak dari kedua sisi
				const ruas = L / n;
				for (let k = 1; k <= 5; k++) {
					const [lx, lz] = di((L * i) / n + (ruas * k) / 6);
					lubang.push({ p: [lx, 1.05, lz], s: [0.14, 0.42, 0.26], r });
				}
			}
		}
		return {
			plint,
			panel,
			lis: [...lis, ...tiang.filter((x) => x.lis)],
			tiang: tiang.filter((x) => !x.lis),
			lubang,
		};
	}, []);

	return (
		<group>
			<Kotak daftar={bagian.plint} warna="#9a9a90" />
			<Kotak daftar={bagian.panel} warna={ABU} />
			<Kotak daftar={bagian.lis} warna={HIJAU} />
			<Kotak daftar={bagian.tiang} warna={BATU} />
			<Kotak daftar={bagian.lubang} warna="#2f3a3c" />
		</group>
	);
}

// Gerbang geser: dua tiang batu, rel di tanah, dan daun stainless yang sedang
// terbuka (bergeser ke kiri di balik pagar).
function Gerbang() {
	const [g0, g1] = PAGAR_DEPAN.gerbang;
	const z = PAGAR_DEPAN.z;
	const lebar = g1 - g0;
	const jeruji = useMemo(() => {
		const hasil = [];
		for (let x = 0.1; x < lebar - 0.05; x += 0.14) hasil.push({ p: [x, 1.35, 0], s: [0.035, 1.1, 0.035] });
		return hasil;
	}, [lebar]);
	return (
		<group>
			{[g0, g1].map((x) => (
				<group key={x} position={[x, 0, z]}>
					<mesh position-y={1.05}>
						<boxGeometry args={[0.7, 2.1, 0.7]} />
						<meshStandardMaterial color={BATU} />
					</mesh>
					<mesh position-y={2.15}>
						<boxGeometry args={[0.8, 0.1, 0.8]} />
						<meshStandardMaterial color={HIJAU} />
					</mesh>
				</group>
			))}
			{/* rel */}
			<mesh position={[(g0 - lebar + g1) / 2, 0.02, z - 0.45]}>
				<boxGeometry args={[lebar * 2, 0.04, 0.08]} />
				<meshStandardMaterial color="#8d9196" metalness={0.5} />
			</mesh>
			{/* daun gerbang di balik pagar */}
			<group position={[g0 - lebar + 0.2, 0, z - 0.45]}>
				<mesh position={[lebar / 2, 0.45, 0]}>
					<boxGeometry args={[lebar, 0.7, 0.05]} />
					<meshStandardMaterial color="#c9ccd0" metalness={0.6} roughness={0.3} />
				</mesh>
				{[0.08, 1.92].map((y) => (
					<mesh key={y} position={[lebar / 2, y, 0]}>
						<boxGeometry args={[lebar, 0.07, 0.07]} />
						<meshStandardMaterial color="#c9ccd0" metalness={0.6} roughness={0.3} />
					</mesh>
				))}
				<group>
					<Kotak daftar={jeruji} warna="#d4d7db" metalness={0.6} roughness={0.3} />
				</group>
				{[0.12, lebar * 0.5, lebar - 0.12].map((x) => (
					<mesh key={x} position={[x, 0.07, 0]}>
						<cylinderGeometry args={[0.07, 0.07, 0.08, 10]} />
						<meshStandardMaterial color="#3a3d40" />
					</mesh>
				))}
			</group>
		</group>
	);
}

// Pos satpam: dinding putih, kaca lebar menghadap gerbang & jalan, atap limas cokelat.
function PosSatpam() {
	const { x, z, lx, lz, tinggi } = POS_SATPAM;
	const PUTIH = "#f2f1ec";
	const kaca = <meshStandardMaterial color="#9fc0cf" transparent opacity={0.3} />;
	return (
		<group position={[x, 0, z]}>
			<mesh position-y={0.03}>
				<boxGeometry args={[lx + 0.3, 0.06, lz + 0.3]} />
				<meshStandardMaterial color="#cfcac0" />
			</mesh>
			{/* dinding belakang (berpintu) & kanan: penuh */}
			<mesh position={[0, tinggi / 2, -lz / 2 + 0.06]}>
				<boxGeometry args={[lx, tinggi, 0.12]} />
				<meshStandardMaterial color={PUTIH} />
			</mesh>
			<mesh position={[0.6, 1.0, -lz / 2 - 0.01]} rotation-y={Math.PI}>
				<planeGeometry args={[0.85, 2.0]} />
				<meshStandardMaterial color="#6b4a32" />
			</mesh>
			<mesh position={[lx / 2 - 0.06, tinggi / 2, 0]}>
				<boxGeometry args={[0.12, tinggi, lz]} />
				<meshStandardMaterial color={PUTIH} />
			</mesh>
			{/* sisi depan (jalan) & kiri (gerbang): dinding bawah, kaca, dinding atas */}
			{[
				{ p: [0, 0, lz / 2 - 0.06], s: [lx, 0.12], r: 0 },
				{ p: [-lx / 2 + 0.06, 0, 0], s: [lz, 0.12], r: Math.PI / 2 },
			].map(({ p, s, r }, i) => (
				<group key={i} position={p} rotation-y={r}>
					<mesh position-y={0.5}>
						<boxGeometry args={[s[0], 1.0, s[1]]} />
						<meshStandardMaterial color={PUTIH} />
					</mesh>
					<mesh position-y={1.55}>
						<boxGeometry args={[s[0] - 0.2, 1.1, 0.03]} />
						{kaca}
					</mesh>
					<mesh position-y={(2.1 + tinggi) / 2}>
						<boxGeometry args={[s[0], tinggi - 2.1, s[1]]} />
						<meshStandardMaterial color={PUTIH} />
					</mesh>
					{[-s[0] / 2 + 0.06, s[0] / 2 - 0.06].map((t) => (
						<mesh key={t} position={[t, 1.55, 0]}>
							<boxGeometry args={[0.12, 1.1, s[1]]} />
							<meshStandardMaterial color={PUTIH} />
						</mesh>
					))}
				</group>
			))}
			{/* meja jaga menghadap kaca gerbang & kursi satpam (di slot pegawai 14.4, 26.2) */}
			<group position={[14.4 - x, 0, 26.2 - z]}>
				<mesh position={[-0.7, 0.74, 0]}>
					<boxGeometry args={[0.6, 0.05, 1.2]} />
					<meshStandardMaterial color="#8a6a4a" />
				</mesh>
				<mesh position={[-0.95, 0.37, 0]}>
					<boxGeometry args={[0.05, 0.72, 1.1]} />
					<meshStandardMaterial color="#6f5238" />
				</mesh>
				<mesh position={[0, 0.45, 0]}>
					<boxGeometry args={[0.45, 0.06, 0.45]} />
					<meshStandardMaterial color="#2a2d31" />
				</mesh>
				<mesh position={[0.22, 0.75, 0]}>
					<boxGeometry args={[0.05, 0.6, 0.45]} />
					<meshStandardMaterial color="#2a2d31" />
				</mesh>
			</group>
			{/* plafon & atap limas */}
			<mesh position-y={tinggi + 0.03}>
				<boxGeometry args={[lx + 0.6, 0.06, lz + 0.6]} />
				<meshStandardMaterial color="#e7e2d8" />
			</mesh>
			<group position-y={tinggi + 0.55} scale={[(lx / 2 + 0.5) / Math.SQRT1_2, 1, (lz / 2 + 0.5) / Math.SQRT1_2]}>
				<mesh rotation-y={Math.PI / 4}>
					<coneGeometry args={[1, 1.1, 4]} />
					<meshStandardMaterial color="#8a4f2e" flatShading />
				</mesh>
			</group>
			<Papan
				posisi={[-0.4, tinggi - 0.22, lz / 2 + 0.01]}
				lebar={1.5}
				tinggi={0.3}
				latar="#1e3a5f"
				baris={[{ teks: "POS SATPAM", ukuran: 0.18, tebal: true, warna: "#ffffff", y: 0.52 }]}
			/>
		</group>
	);
}

function PapanNama() {
	const { x, z } = PAPAN_NAMA;
	return (
		<group position={[x, 0, z]}>
			{[-1.3, 1.3].map((t) => (
				<mesh key={t} position={[t, 1.4, 0]}>
					<boxGeometry args={[0.16, 2.8, 0.16]} />
					<meshStandardMaterial color="#3b2f25" />
				</mesh>
			))}
			<mesh position={[0, 2.05, -0.06]}>
				<boxGeometry args={[3.1, 1.6, 0.08]} />
				<meshStandardMaterial color="#3b2f25" />
			</mesh>
			<Papan
				posisi={[0, 2.05, 0]}
				lebar={2.9}
				tinggi={1.4}
				latar="#4a3a2c"
				bingkai={HIJAU}
				baris={[
					{ teks: "PEMERINTAH KABUPATEN BOGOR", ukuran: 0.15, warna: "#f3ead2", y: 0.22 },
					{ teks: "DINAS PEMBERDAYAAN", ukuran: 0.22, tebal: true, warna: "#f3ead2", y: 0.48 },
					{ teks: "MASYARAKAT DAN DESA", ukuran: 0.22, tebal: true, warna: "#f3ead2", y: 0.7 },
				]}
			/>
		</group>
	);
}

// Bak tanaman di depan pagar, trotoar, kanstin hitam-putih, jalan aspal.
function Jalan() {
	const { trotoar, kanstin, aspal0, aspal1 } = JALAN;
	const [g0, g1] = PAGAR_DEPAN.gerbang;
	const zPagar = PAGAR_DEPAN.z + 0.2;
	const { kanstinHitam, kanstinPutih, tanaman } = useMemo(() => {
		const hasil = { kanstinHitam: [], kanstinPutih: [], tanaman: [] };
		for (let x = -60; x < 60; x += 1) {
			if (x + 1 > g0 - 0.5 && x < g1 + 0.5) continue;
			const k = { p: [x + 0.5, 0.09, kanstin + 0.15], s: [0.98, 0.18, 0.3] };
			(Math.abs(x) % 2 ? hasil.kanstinHitam : hasil.kanstinPutih).push(k);
		}
		// tanaman lidah mertua berjajar di bak
		for (let x = PAGAR_DEPAN.x0 + 0.6; x < PAGAR_DEPAN.x1 - 0.3; x += 1.1) {
			if (x > g0 - 0.6 && x < g1 + 0.6) continue;
			hasil.tanaman.push({ p: [x, 0.3, (zPagar + trotoar) / 2 + Math.sin(x * 3.1) * 0.2], s: [0.16, 0.5, 0.16], r: x });
		}
		return hasil;
	}, [g0, g1, kanstin, trotoar, zPagar]);
	const marka = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ p: [-58 + i * 4, 0.01, (aspal0 + aspal1) / 2], s: [2, 0.01, 0.15] })), [aspal0, aspal1]);
	const lebarBak = trotoar - zPagar;
	const ubin = useMemo(() => teksturPavingJalan([120 / 1.6, (kanstin - trotoar) / 1.6]), [kanstin, trotoar]);
	return (
		<group>
			{/* bak tanaman: tanah + bibir beton, terputus di gerbang */}
			{[
				[PAGAR_DEPAN.x0, g0 - 0.4],
				[g1 + 0.4, PAGAR_DEPAN.x1],
			].map(([a, b]) => (
				<group key={a}>
					<mesh rotation-x={-Math.PI / 2} position={[(a + b) / 2, 0.012, zPagar + lebarBak / 2]}>
						<planeGeometry args={[b - a, lebarBak]} />
						<meshStandardMaterial color="#6b4a33" />
					</mesh>
					<mesh position={[(a + b) / 2, 0.12, trotoar - 0.06]}>
						<boxGeometry args={[b - a, 0.24, 0.12]} />
						<meshStandardMaterial color="#8f8c84" />
					</mesh>
				</group>
			))}
			<Kotak daftar={tanaman} warna="#4f8a3c" flatShading />
			{/* trotoar ubin & jalan masuk beton di depan gerbang */}
			<mesh rotation-x={-Math.PI / 2} position={[0, 0.01, (trotoar + kanstin) / 2]}>
				<planeGeometry args={[120, kanstin - trotoar]} />
				<meshStandardMaterial map={ubin} />
			</mesh>
			<mesh rotation-x={-Math.PI / 2} position={[(g0 + g1) / 2, 0.016, (zPagar + aspal0) / 2]}>
				<planeGeometry args={[g1 - g0 + 1, aspal0 - zPagar]} />
				<meshStandardMaterial color="#c9c4b8" />
			</mesh>
			<Kotak daftar={kanstinHitam} warna="#26282b" />
			<Kotak daftar={kanstinPutih} warna="#eeeeea" />
			{/* aspal + marka putus-putus di tengah */}
			<mesh rotation-x={-Math.PI / 2} position={[0, 0.008, (aspal0 + aspal1) / 2]}>
				<planeGeometry args={[120, aspal1 - aspal0]} />
				<meshStandardMaterial color="#4b4e52" />
			</mesh>
			<Kotak daftar={marka} warna="#f1f1ec" />
			{/* trotoar seberang */}
			<mesh rotation-x={-Math.PI / 2} position={[0, 0.01, aspal1 + 0.9]}>
				<planeGeometry args={[120, 1.8]} />
				<meshStandardMaterial color="#b7aa9a" />
			</mesh>
		</group>
	);
}

export default function PagarDepan() {
	return (
		<group>
			<Pagar />
			<Gerbang />
			<PosSatpam />
			<PapanNama />
			<Jalan />
		</group>
	);
}
