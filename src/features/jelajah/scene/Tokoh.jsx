import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { posisi } from "../jelajahStore";
import { BAHAN_ORANG, buangOrang, rakitOrang } from "./orang";

const sudutDekat = (dari, ke) => dari + Math.atan2(Math.sin(ke - dari), Math.cos(ke - dari));

// Satu tokoh manusia, menghadap +z.
// - pose "jalan": kaki & lengan berayun mengikuti `gerak.current` = { laju 0..1, fase }.
// - pose "diam": berdiri; "duduk": duduk di kursi, tangan bergerak sesuai `aktivitas`
//   (mengetik, rapat, menunggu).
// - `asal` = { x, z, rot, lantai }: bila diisi, kepala menoleh ke pengunjung yang mendekat.
export default function Tokoh({ penampilan, pose = "jalan", gerak, aktivitas, asal, bayangan = true }) {
	const g = useMemo(() => rakitOrang(penampilan, pose), [penampilan, pose]);
	useEffect(() => () => buangOrang(g), [g]);

	const badan = useRef();
	const kepala = useRef();
	const tangan = useRef();
	const lka = useRef();
	const lkn = useRef();
	const sbka = useRef();
	const sbkn = useRef();
	const kki = useRef();
	const kka = useRef();
	const geser = useMemo(() => Math.random() * 20, []);

	useFrame(({ clock }, dt) => {
		const t = clock.elapsedTime + geser;

		// --- kepala: menoleh ke pengunjung, atau gerak santai sesuai aktivitas ---
		let tujuan = 0;
		let angguk = 0;
		if (aktivitas === "rapat") tujuan = Math.sin(t * 0.35) * 0.7;
		else if (aktivitas === "menunggu") tujuan = Math.sin(t * 0.25) * 0.9;
		else if (aktivitas === "jaga") tujuan = Math.sin(t * 0.3) * 0.8;
		else if (aktivitas === "mengepel") angguk = 0.25;
		else if (aktivitas === "diskusi") angguk = Math.max(0, Math.sin(t * 1.3)) * 0.15;
		else if (aktivitas === "mengetik") angguk = 0.06 + Math.sin(t * 0.6) * 0.03;
		if (asal && posisi.lantai === asal.lantai) {
			const dx = posisi.x - asal.x;
			const dz = posisi.z - asal.z;
			if (dx * dx + dz * dz < 9) {
				let relatif = Math.atan2(dx, dz) - asal.rot;
				relatif = Math.atan2(Math.sin(relatif), Math.cos(relatif));
				tujuan = Math.max(-1.1, Math.min(1.1, relatif));
				angguk = 0;
			}
		}
		const k = kepala.current;
		k.rotation.y += (sudutDekat(k.rotation.y, tujuan) - k.rotation.y) * (1 - Math.exp(-4 * dt));
		k.rotation.x += (angguk - k.rotation.x) * (1 - Math.exp(-6 * dt));

		// --- tangan pegawai yang duduk ---
		if (tangan.current) {
			const tg = tangan.current;
			if (aktivitas === "mengetik") {
				tg.position.y = Math.abs(Math.sin(t * 13)) * 0.012;
				tg.position.x = Math.sin(t * 0.9) * 0.015;
			} else if (aktivitas === "rapat") {
				tg.position.y = Math.max(0, Math.sin(t * 0.7)) * 0.05;
				tg.position.z = Math.sin(t * 0.7) * 0.02;
			}
		}

		// --- ayunan jalan ---
		if (pose === "jalan" && aktivitas === "mengepel") {
			// dua tangan menggenggam gagang, mendorong-menarik pel/sapu
			const dorong = Math.sin(t * 2.2);
			lkn.current.rotation.x = -0.45 + dorong * 0.3;
			sbkn.current.rotation.x = -0.55;
			lka.current.rotation.x = -0.7 + dorong * 0.25;
			sbka.current.rotation.x = -0.9;
			kki.current.rotation.x = 0.1;
			kka.current.rotation.x = -0.15;
			badan.current.rotation.x = 0.12;
		} else if (pose === "jalan" && gerak?.current?.udara) {
			// melayang saat meloncat: lutut ditekuk, lengan terangkat
			kki.current.rotation.x = -0.7;
			kka.current.rotation.x = 0.35;
			lka.current.rotation.x = -2.2;
			lkn.current.rotation.x = -2.2;
			sbka.current.rotation.x = -0.2;
			sbkn.current.rotation.x = -0.2;
		} else if (pose === "jalan") {
			const { laju = 0, fase = 0 } = gerak?.current || {};
			const ayun = Math.sin(fase) * 0.7 * laju;
			kki.current.rotation.x = ayun;
			kka.current.rotation.x = -ayun;
			lka.current.rotation.x = -ayun * 0.8;
			lkn.current.rotation.x = penampilan.map ? -0.2 : ayun * 0.8;
			sbka.current.rotation.x = -0.15 - Math.max(0, -ayun) * 0.4;
			sbkn.current.rotation.x = penampilan.map ? -1.25 : -0.15 - Math.max(0, ayun) * 0.4;
			badan.current.position.y = Math.abs(Math.sin(fase)) * 0.04 * laju;
		}

		// --- gerak isyarat tamu: melambai (lengan kanan terangkat ke samping) & tepuk tangan ---
		if (pose === "jalan") {
			const isyarat = gerak?.current?.isyarat;
			lkn.current.rotation.z = 0;
			sbkn.current.rotation.z = 0;
			lka.current.rotation.z = 0;
			if (isyarat === "lambai") {
				lkn.current.rotation.x = 0;
				lkn.current.rotation.z = 2.55 + Math.sin(t * 11) * 0.3;
				sbkn.current.rotation.x = 0;
				sbkn.current.rotation.z = 0.25;
			} else if (isyarat === "tepuk") {
				const buka = Math.abs(Math.sin(t * 9)) * 0.25;
				lka.current.rotation.x = -1.25;
				lkn.current.rotation.x = -1.25;
				lka.current.rotation.z = 0.35 + buka;
				lkn.current.rotation.z = -0.35 - buka;
				sbka.current.rotation.x = -0.3;
				sbkn.current.rotation.x = -0.3;
			}
		}
	});

	return (
		<group>
			{bayangan && pose !== "duduk" && (
				<mesh rotation-x={-Math.PI / 2} position-y={0.015}>
					<circleGeometry args={[0.4, 16]} />
					<meshBasicMaterial color="#000" transparent opacity={0.2} depthWrite={false} />
				</mesh>
			)}
			<group ref={badan}>
				<mesh geometry={g.badan} material={BAHAN_ORANG} />
				<group ref={kepala} position-y={g.kepalaY}>
					<mesh geometry={g.kepala} material={BAHAN_ORANG} />
				</group>
				{g.tangan && <mesh ref={tangan} geometry={g.tangan} material={BAHAN_ORANG} />}
				{pose === "jalan" && (
					<>
						<group ref={lka} position={[-0.245, 1.43, 0]}>
							<mesh geometry={g.lenganAtas} material={BAHAN_ORANG} />
							<group ref={sbka} position-y={-0.29}>
								<mesh geometry={g.lenganBawahKiri} material={BAHAN_ORANG} />
							</group>
						</group>
						<group ref={lkn} position={[0.245, 1.43, 0]}>
							<mesh geometry={g.lenganAtas} material={BAHAN_ORANG} />
							<group ref={sbkn} position-y={-0.29}>
								<mesh geometry={g.lenganBawahKanan} material={BAHAN_ORANG} />
							</group>
						</group>
						<group ref={kki} position={[-0.095, 0.9, 0]}>
							<mesh geometry={g.kaki} material={BAHAN_ORANG} />
						</group>
						<group ref={kka} position={[0.095, 0.9, 0]}>
							<mesh geometry={g.kaki} material={BAHAN_ORANG} />
						</group>
					</>
				)}
			</group>
		</group>
	);
}
