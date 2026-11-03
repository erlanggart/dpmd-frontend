import { useEffect, useRef, useState } from "react";
import { Player } from "@remotion/player";
import api from "../../../api";
import JudulBagian from "../JudulBagian";
import { useSlideAktif } from "../dek/slideAktif";
import BogorDalamAngka, { DURASI } from "./BogorDalamAngka";

const tenang = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Angka cadangan bila API belum menjawab (data produksi November 2026). */
const CADANGAN = { desa: 416, kelurahan: 19, kecamatan: 40, bumdes: 390, lembaga: 28191 };

export default function SectionAngka() {
	const [data, setData] = useState(CADANGAN);
	const pemutar = useRef(null);
	const wadah = useRef(null);

	useEffect(() => {
		Promise.allSettled([api.get("/public/stats"), api.get("/public/landing-stats")]).then(([a, b]) => {
			const s = a.value?.data?.data || {};
			const l = b.value?.data?.data || {};
			setData((d) => ({
				desa: s.desa || d.desa,
				kelurahan: s.kelurahan || d.kelurahan,
				kecamatan: s.kecamatan || d.kecamatan,
				bumdes: l.bumdes_aktif || d.bumdes,
				lembaga: l.total_kelembagaan || d.lembaga,
			}));
		});
	}, []);

	// Diputar hanya saat terlihat: tergulir ke layar (ponsel) dan slide-nya aktif (dek desktop).
	const slideAktif = useSlideAktif();
	const [diLayar, setDiLayar] = useState(false);
	useEffect(() => {
		const io = new IntersectionObserver(([e]) => setDiLayar(e.isIntersecting), { threshold: 0.35 });
		if (wadah.current) io.observe(wadah.current);
		return () => io.disconnect();
	}, []);
	useEffect(() => {
		const p = pemutar.current;
		if (!p || tenang) return;
		if (diLayar && slideAktif) p.play();
		else p.pause();
	}, [diLayar, slideAktif]);

	return (
		<div className="border-t border-[#1e293b] bg-[#0a1220] px-4 py-20 md:pb-10 md:pt-24 lg:px-8">
			<div className="mx-auto max-w-6xl">
				<JudulBagian judul="Bogor dalam angka" />
				<div ref={wadah} data-masuk style={{ "--urut": 3 }} className="mx-auto mt-10 w-full max-w-[min(72rem,calc((100dvh-15rem)*16/9))] overflow-hidden rounded-xl border border-[#1e293b] bg-[#101b2e]">
					<Player
						ref={pemutar}
						component={BogorDalamAngka}
						inputProps={data}
						durationInFrames={DURASI}
						fps={30}
						compositionWidth={1280}
						compositionHeight={720}
						style={{ width: "100%", aspectRatio: "16 / 9" }}
						loop
						initiallyMuted
						autoPlay={!tenang}
						initialFrame={tenang ? 120 : 0}
						controls={tenang}
						clickToPlay={false}
						doubleClickToFullscreen={false}
						spaceKeyToPlayOrPause={false}
					/>
				</div>
			</div>
		</div>
	);
}
