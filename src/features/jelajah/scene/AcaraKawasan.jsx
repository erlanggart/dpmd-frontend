import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import Gabung from "./Gabung";
import Papan from "./Papan";
import Tokoh from "./Tokoh";
import { PENGHALANG, TANAH, penampilanWarga } from "./layout";
import { AIR_Y } from "./situ";
import { GERBANG_JETSKI, PENGHALANG_BAZAR, TENDA_BAZAR, TITIK_PANITIA } from "./acaraData";
import { posisi } from "../jelajahStore";
import { acaraKini, formatNomor, kantor, majukanLomba, useKantor } from "../kantorHidup";

// Acara harian kawasan: bazar desa (empat tenda) atau stand panitia + gerbang lomba jetski
// di Situ Pemda, bergantian tiap hari (lihat kantorHidup.js). Papan antrean lobi ikut di sini.

const TINGGI_TENDA = 2.6;
// papan nama di bawah tepi atap depan (tepi atap turun sampai ±2,4 m dan menutupi yang lebih tinggi)
const Y_PAPAN = 2.1;
const BARANG = ["#fde68a", "#fca5a5", "#a7f3d0", "#c4b5fd", "#fdba74"];

// Tenda sederhana: lokal menghadap -z (pembeli di depan, penjual di balik meja), diputar `rot`
// dan dipusatkan di (cx, cz). Papan nama menempel pada balok depan.
function Tenda({ cx, cz, lx, lz = 3.2, rot = 0, warna, judul, orang, barang = BARANG }) {
	const z0 = -lz / 2;
	const s = Math.sin(rot);
	const c = Math.cos(rot);
	// posisi penjual (lokal 0, 0.1) → dunia, supaya kepalanya menoleh ke pembeli
	const asal = { x: cx + 0.1 * s, z: cz + 0.1 * c, rot: rot + Math.PI, lantai: 0 };
	return (
		<group position={[cx, 0, cz]} rotation-y={rot}>
			<Gabung>
				{[-1, 1].flatMap((sx) =>
					[-1, 1].map((sz) => (
						<mesh key={`${sx}:${sz}`} position={[(sx * lx) / 2, TINGGI_TENDA / 2, (sz * lz) / 2]}>
							<cylinderGeometry args={[0.05, 0.05, TINGGI_TENDA, 6]} />
							<meshStandardMaterial color="#9ca3af" metalness={0.5} />
						</mesh>
					)),
				)}
				{[-1, 1].map((sz) => (
					<mesh key={sz} position={[0, TINGGI_TENDA + 0.28, (sz * lz) / 4]} rotation-x={sz * 0.3}>
						<boxGeometry args={[lx + 0.5, 0.05, lz / 2 / Math.cos(0.3) + 0.3]} />
						<meshStandardMaterial color={warna} />
					</mesh>
				))}
				{/* balok depan tempat papan nama menempel */}
				<mesh position={[0, Y_PAPAN, z0]}>
					<boxGeometry args={[lx, 0.46, 0.06]} />
					<meshStandardMaterial color="#f8fafc" />
				</mesh>
				<mesh position={[0, 0.375, z0 + 0.7]}>
					<boxGeometry args={[lx, 0.75, 1]} />
					<meshStandardMaterial color="#a16207" />
				</mesh>
				{barang.map((b, i) => (
					<mesh key={i} position={[((i - (barang.length - 1) / 2) * (lx - 0.8)) / barang.length, 0.88, z0 + 0.7]}>
						<boxGeometry args={[0.45, 0.26, 0.4]} />
						<meshStandardMaterial color={b} />
					</mesh>
				))}
			</Gabung>
			<group position={[0, 0, 0.1]} rotation-y={Math.PI}>
				<Tokoh penampilan={orang} pose="diam" asal={asal} />
			</group>
			<Papan posisi={[0, Y_PAPAN, z0 - 0.04]} rotasi={Math.PI} lebar={lx - 0.4} tinggi={0.4} latar={warna} baris={[{ teks: judul, ukuran: 0.2, tebal: true, warna: "#ffffff", y: 0.5 }]} />
		</group>
	);
}

function Bazar() {
	const orang = useMemo(() => TENDA_BAZAR.map(() => penampilanWarga()), []);
	useEffect(() => {
		PENGHALANG[0].push(...PENGHALANG_BAZAR);
		return () => {
			for (const b of PENGHALANG_BAZAR) {
				const i = PENGHALANG[0].indexOf(b);
				if (i >= 0) PENGHALANG[0].splice(i, 1);
			}
		};
	}, []);
	return TENDA_BAZAR.map((t, i) => <Tenda key={t.id} cx={t.x} cz={t.z} lx={3.8} warna={t.warna} judul={t.nama} orang={orang[i]} />);
}

// arah tiap gerbang: menghadap gerbang berikutnya (yang terakhir menghadap searah kedatangan)
const SUDUT_GERBANG = GERBANG_JETSKI.map((g, i) => {
	const a = GERBANG_JETSKI[i + 1] ? g : GERBANG_JETSKI[i - 1];
	const b = GERBANG_JETSKI[i + 1] || g;
	return Math.atan2(b.x - a.x, b.z - a.z);
});

function Jetski() {
	const petugas = useMemo(() => penampilanWarga(), []);
	const bahan = useRef([]);
	const lomba = kantor.lomba;
	const aktif = lomba ? lomba.gerbang : 0;
	useFrame(({ clock }) => {
		const g = kantor.lomba ? kantor.lomba.gerbang : 0;
		const t = clock.elapsedTime;
		bahan.current.forEach((m, i) => {
			if (m) m.emissiveIntensity = i === g ? 0.9 + 0.5 * Math.sin(t * 5) : 0.08;
		});
	});
	return (
		<>
			{/* stand panitia menghadap +x (ke arah titik tiba), dekat dermaga */}
			<Tenda cx={TITIK_PANITIA.x - 2.4} cz={TITIK_PANITIA.z} lx={3} rot={-Math.PI / 2} warna="#e11d48" judul="LOMBA JETSKI" orang={petugas} barang={["#fbbf24", "#e2e8f0", "#fbbf24"]} />
			<group position-y={AIR_Y}>
				{GERBANG_JETSKI.map(
					(g, i) =>
						(lomba ? i >= aktif : i === 0) && (
							<mesh key={i} position={[g.x, 5, g.z]} rotation-y={SUDUT_GERBANG[i]}>
								<torusGeometry args={[6, 0.28, 10, 36]} />
								<meshStandardMaterial ref={(m) => { bahan.current[i] = m; }} color={i === aktif ? "#f59e0b" : "#94a3b8"} emissive={i === aktif ? "#f59e0b" : "#94a3b8"} emissiveIntensity={0.1} />
							</mesh>
						),
				)}
			</group>
		</>
	);
}

export default function AcaraKawasan() {
	useKantor();
	const acara = acaraKini();
	useFrame(() => {
		if (kantor.lomba) majukanLomba(posisi.kend);
	});
	return (
		<group position-y={TANAH}>
			{acara === "bazar" && <Bazar />}
			{(acara === "jetski" || kantor.lomba) && <Jetski />}
		</group>
	);
}

// Papan nomor antrean di dinding lobi, menghadap ke dalam.
export function PapanAntrean() {
	useKantor();
	const t = kantor.tiket;
	return (
		<Papan
			posisi={[7.83, 1.75, 10.75]}
			rotasi={-Math.PI / 2}
			lebar={1.5}
			tinggi={0.95}
			latar="#0f172a"
			aksen="#f59e0b"
			bingkai="#7a6a52"
			baris={[
				{ teks: "NOMOR DIPANGGIL", ukuran: 0.11, tebal: true, warna: "#cbd5e1", y: 0.28 },
				{ teks: formatNomor(kantor.dipanggil), ukuran: 0.34, tebal: true, warna: "#fbbf24", y: 0.55 },
				{ teks: t ? `Nomor Anda ${formatNomor(t.nomor)}` : "Ambil nomor di resepsionis", ukuran: 0.1, warna: "#e2e8f0", y: 0.85 },
			]}
		/>
	);
}
