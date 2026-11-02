import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { posisi } from "../jelajahStore";
import { BAHAN_ORANG, buangOrang, rakitOrang } from "./orang";

const sudutDekat = (dari, ke) => dari + Math.atan2(Math.sin(ke - dari), Math.cos(ke - dari));
// Tampak bila dirinya dan semua induknya tampak (lantai lain / di balik dinding = tidak).
const tampak = (o) => {
	for (let p = o; p; p = p.parent) if (!p.visible) return false;
	return true;
};

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
	const miring = useRef(false);
	const akar = useRef();

	useFrame(({ clock, camera }, dt) => {
		// hemat: tokoh di balik kabut tidak digambar, yang jauh tidak dianimasikan
		const e = akar.current.matrixWorld.elements;
		const jauh2 = (e[12] - camera.position.x) ** 2 + (e[14] - camera.position.z) ** 2;
		akar.current.visible = jauh2 < 110 * 110;
		// tokoh yang tidak tergambar tidak perlu dianimasikan
		if (!tampak(akar.current) || jauh2 > 45 * 45) return;
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
			const akt = gerak?.current?.aktivitas ?? aktivitas;
			if (akt === "makan") {
				// menyuap: tangan naik ke mulut lalu turun lagi ke mangkuk
				const suap = Math.max(0, Math.sin(t * 2.4));
				tg.position.y = suap * 0.16;
				tg.position.z = -suap * 0.12;
			} else if (aktivitas === "mengetik") {
				tg.position.y = Math.abs(Math.sin(t * 13)) * 0.012;
				tg.position.x = Math.sin(t * 0.9) * 0.015;
			} else if (aktivitas === "rapat") {
				tg.position.y = Math.max(0, Math.sin(t * 0.7)) * 0.05;
				tg.position.z = Math.sin(t * 0.7) * 0.02;
			} else if (gerak) tg.position.set(0, 0, 0);
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
			const gp = gerak?.current?.gayaPancing;
			lkn.current.rotation.z = 0;
			sbkn.current.rotation.z = 0;
			lka.current.rotation.z = 0;
			if (miring.current && !(gp && (isyarat === "mancing" || isyarat === "angkat"))) {
				badan.current.rotation.x = 0;
				badan.current.position.z = 0;
				miring.current = false;
			}
			if (isyarat === "lambai") {
				lkn.current.rotation.x = 0;
				lkn.current.rotation.z = 2.55 + Math.sin(t * 11) * 0.3;
				sbkn.current.rotation.x = 0;
				sbkn.current.rotation.z = 0.25;
			} else if (isyarat === "mancing") {
				// dua tangan menggenggam joran di depan perut; pemain sendiri ikut bergaya sesuai
				// fase: ancang-ancang, menyabet, condong menahan tarikan, mengengkol gulungan
				const lengan = gp?.lengan ?? 0;
				const putar = gp?.putar ?? 0;
				const e = gp?.engkol ?? 0;
				lkn.current.rotation.x = -0.95 - lengan;
				sbkn.current.rotation.x = -0.55 - lengan * 0.25;
				lka.current.rotation.x = -0.85 - lengan * 0.9 + Math.sin(e) * 0.3 * putar;
				lka.current.rotation.z = -0.3 + Math.cos(e) * 0.14 * putar;
				sbka.current.rotation.x = -0.75 + Math.cos(e) * 0.35 * putar;
				if (gp) {
					// condong dari pinggul: badan diputar, pinggul digeser kembali ke atas kaki,
					// kaki tetap tegak (kuda-kuda sedikit terbuka)
					const c = gp.condong;
					badan.current.rotation.x = c;
					badan.current.position.z = -0.9 * Math.sin(c);
					kki.current.rotation.x = -c + gp.lutut;
					kka.current.rotation.x = -c - gp.lutut * 0.6;
					miring.current = true;
				}
			} else if (isyarat === "angkat") {
				// gembira memegang ikan hasil tangkapan di depan dada sambil berjingkrak
				lka.current.rotation.x = -1.05;
				lkn.current.rotation.x = -1.05;
				lka.current.rotation.z = 0.25;
				lkn.current.rotation.z = -0.25;
				sbka.current.rotation.x = -0.35;
				sbkn.current.rotation.x = -0.35;
				// lompat girang sesaat setelah ikan sampai di tangan
				const lompat = gp?.lompat ?? 0;
				badan.current.position.y = Math.abs(Math.sin(t * 7)) * 0.06 + lompat * 0.32;
				kki.current.rotation.x = -0.6 * lompat;
				kka.current.rotation.x = 0.3 * lompat;
				kepala.current.rotation.x = -0.18 + Math.sin(t * 7) * 0.05 - lompat * 0.2;
			} else if (isyarat === "keranjang" || isyarat === "ambil") {
				// tangan kiri menenteng keranjang belanja; saat "ambil" tangan kanan menjangkau rak
				lka.current.rotation.x = 0;
				lka.current.rotation.z = -0.2;
				sbka.current.rotation.x = -0.05;
				if (isyarat === "ambil") {
					const r = gerak.current.ambil || 0;
					lkn.current.rotation.x = -1.4 * r;
					sbkn.current.rotation.x = -0.15 - 0.2 * r;
				}
			} else if (isyarat === "renang") {
				// gaya bebas: lengan berputar bergantian; mengapung: lengan mengayuh ke samping
				const f = gerak.current.renang ?? 1;
				const fs = gerak.current.fase || 0;
				lka.current.rotation.x = -f * ((fs * 0.5) % (Math.PI * 2));
				lkn.current.rotation.x = -f * ((fs * 0.5 + Math.PI) % (Math.PI * 2));
				lka.current.rotation.z = -(1 - f) * (0.9 + Math.sin(t * 3) * 0.35);
				lkn.current.rotation.z = (1 - f) * (0.9 + Math.sin(t * 3) * 0.35);
				sbka.current.rotation.x = -0.1;
				sbkn.current.rotation.x = -0.1;
				kki.current.rotation.x = Math.sin(t * 9) * 0.35;
				kka.current.rotation.x = -Math.sin(t * 9) * 0.35;
				kepala.current.rotation.x = -0.95 * f;
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
		<group ref={akar}>
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
