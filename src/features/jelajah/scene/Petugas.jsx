import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { LOBI, RUANGAN, TINGGI_LANTAI, titikDepanPetugas } from "../kantorConfig";
import { ambilKeadaan, kendali, posisi } from "../jelajahStore";
import Tokoh from "./Tokoh";

// Petugas layanan tiap bidang (dan resepsionis): berseragam PDH, berdiri di
// belakang meja layanan, menoleh ke pengunjung yang mendekat.
const PENAMPILAN = {
	lobi: { perempuan: true, jilbab: "#1f6b50", kulit: "#d9ad85" },
	sekretariat: { perempuan: false, rambut: "#1d1712", kulit: "#c08d63", kacamata: true },
	pemdes: { perempuan: true, jilbab: "#7c2d12", kulit: "#e2b48c", rok: true },
	spked: { perempuan: false, rambut: "#2b2118", kulit: "#b07a50" },
	kkd: { perempuan: true, jilbab: "#4c1d95", kulit: "#d3a378" },
	pmd: { perempuan: false, rambut: "#3a2a1c", kulit: "#d9ad85" },
	prolap: { perempuan: true, jilbab: "#a8875c", kulit: "#c08d63", kacamata: true },
	keuangan: { perempuan: false, rambut: "#15100c", kulit: "#e2b48c" },
};

const sudutDekat = (dari, ke) => dari + Math.atan2(Math.sin(ke - dari), Math.cos(ke - dari));

function SatuPetugas({ area, sudahDikunjungi, data }) {
	const tubuh = useRef();
	const penanda = useRef();
	const cincin = useRef();
	const { x, z, arah } = area.npc;
	const hadapAwal = Math.atan2(arah[0], arah[1]);
	// Dengan data pegawai, petugas tampil sesuai orangnya; tanpa data, penampilan bawaan.
	const penampilan = useMemo(() => data?.penampilan ?? { seragam: "pdh", rambut: "#1d1712", ...PENAMPILAN[area.id] }, [area.id, data]);
	// Resepsionis duduk di balik meja supaya tulisan dinding sambutan di belakangnya terbaca.
	const duduk = area.id === "lobi";

	useFrame(({ clock }, dt) => {
		const t = clock.elapsedTime;
		// Badan berputar ke pengunjung yang mendekat (di lantai yang sama), lalu kembali.
		const jarak = Math.hypot(posisi.x - x, posisi.z - z);
		const tujuan = !duduk && jarak < 5 && posisi.lantai === area.lantai ? Math.atan2(posisi.x - x, posisi.z - z) : hadapAwal;
		const r = tubuh.current.rotation;
		r.y += (sudutDekat(r.y, tujuan) - r.y) * (1 - Math.exp(-5 * dt));

		penanda.current.rotation.y = t * 1.6;
		penanda.current.position.y = 2.45 + Math.sin(t * 2.4) * 0.08;

		// Saat pengunjung sudah dekat, cincin di lantai menggantikan penanda di atas kepala
		// (penanda itu menutupi tulisan poster bila dilihat dari depan meja).
		const aktif = ambilKeadaan().dekat === area.id;
		cincin.current.visible = aktif;
		penanda.current.visible = !aktif;
		if (aktif) cincin.current.material.opacity = 0.45 + Math.sin(t * 5) * 0.2;
	});

	const bukaSaatTiba = (e) => {
		e.stopPropagation();
		if (e.delta > 8) return;
		const t = titikDepanPetugas(area);
		kendali.target = { x: t.x, z: t.z, lantai: t.lantai, buka: area.id };
	};

	return (
		<group position={[x, area.lantai * TINGGI_LANTAI, z]}>
			<group ref={tubuh} rotation-y={hadapAwal} onClick={bukaSaatTiba}>
				{duduk ? (
					<Tokoh penampilan={penampilan} pose="duduk" aktivitas="mengetik" asal={{ x, z, rot: hadapAwal, lantai: area.lantai }} />
				) : (
					<Tokoh penampilan={penampilan} pose="diam" />
				)}
			</group>
			<mesh ref={penanda} position-y={2.45} scale={sudahDikunjungi ? 0.55 : 1}>
				<octahedronGeometry args={[0.2, 0]} />
				<meshStandardMaterial
					color={sudahDikunjungi ? "#9ca3af" : area.warna}
					emissive={sudahDikunjungi ? "#000000" : area.warna}
					emissiveIntensity={0.6}
				/>
			</mesh>
			<mesh ref={cincin} rotation-x={-Math.PI / 2} position-y={0.03} visible={false}>
				<ringGeometry args={[0.55, 0.7, 32]} />
				<meshBasicMaterial color={area.warna} transparent opacity={0.5} depthWrite={false} />
			</mesh>
		</group>
	);
}

export default function Petugas({ dikunjungi, lantai, dataPetugas = {} }) {
	return [LOBI, ...RUANGAN]
		.filter((a) => a.lantai === lantai)
		.map((a) => <SatuPetugas key={a.id} area={a} data={dataPetugas[a.id]} sudahDikunjungi={a.id !== "lobi" && dikunjungi.has(a.id)} />);
}
