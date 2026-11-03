import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import { BarChart3, House, LayoutGrid, ListChecks, Map as IkonPeta, Newspaper } from "lucide-react";
import "@fontsource-variable/plus-jakarta-sans";
import { useScrollPosition } from "../hooks/useScrollPosition";
import HeroRelief from "../components/landingpage/HeroRelief";
import SectionAngka from "../components/landingpage/angka/SectionAngka";
import FeatureSection from "../components/landingpage/FeatureSection";
import Footer from "../components/landingpage/Footer";
import NewsSection from "../components/landingpage/NewsSection";
import KegiatanSection from "../components/landingpage/KegiatanSection";
import MapSection from "../components/landingpage/MapSection";
import InstallPWA from "../components/InstallPWA";
import DokBagian from "../components/landingpage/dek/DokBagian";
import { useDek } from "../components/landingpage/dek/useDek";
import { KonteksSlide } from "../components/landingpage/dek/slideAktif";
import "../components/landingpage/dek/dek.css";

/*
 * Landing page DPMD Kabupaten Bogor.
 * Huruf: Plus Jakarta Sans (Tokotype, Indonesia). Warna: navy dan slate,
 * aksen kuning padi dari lambang Kabupaten Bogor: #0a1220, #e3b23c, #eef2f7.
 *
 * Desktop: dek slide ala Simpaskor, satu layar satu bagian, navbar pil di
 * tengah atas. Ponsel: satu halaman panjang yang digulir bebas, karena
 * menggulir memang cara orang membaca di layar sentuh.
 */

const BAGIAN = [
	{ id: "beranda", label: "Beranda", ikon: House, isi: <HeroRelief /> },
	{ id: "angka", label: "Angka", ikon: BarChart3, isi: <SectionAngka /> },
	{ id: "peta", label: "Peta", ikon: IkonPeta, isi: <MapSection /> },
	{ id: "program", label: "Program", ikon: ListChecks, isi: <KegiatanSection /> },
	{ id: "berita", label: "Berita", ikon: Newspaper, isi: <NewsSection /> },
	// footer ikut slide terakhir: sebagai slide sendiri ia hanya pita di tengah layar kosong
	{ id: "layanan", label: "Layanan", ikon: LayoutGrid, isi: <><FeatureSection /><Footer /></> },
];

const MQ_DEK = "(min-width: 768px)";

const LandingPage = () => {
	const scrollY = useScrollPosition();
	const [menuBuka, setMenuBuka] = useState(false);

	// Dek hanya di desktop; matchMedia supaya jendela yang dikecilkan ikut berpindah
	// perilaku (dan penangkap roda tetikus dilepas).
	const [dekAktif, setDekAktif] = useState(() => typeof window === "undefined" || window.matchMedia(MQ_DEK).matches);
	useEffect(() => {
		const mq = window.matchMedia(MQ_DEK);
		const ubah = (e) => { setDekAktif(e.matches); if (e.matches) setMenuBuka(false); };
		mq.addEventListener("change", ubah);
		return () => mq.removeEventListener("change", ubah);
	}, []);
	const { aktif, keSlide, wadahRef } = useDek(BAGIAN.length, dekAktif);

	const pilih = (i) => {
		setMenuBuka(false);
		if (dekAktif) keSlide(i);
		else document.getElementById(`bagian-${BAGIAN[i].id}`)?.scrollIntoView({ behavior: "smooth" });
	};

	const pekat = dekAktif ? aktif > 0 : scrollY > 40 || menuBuka;

	return (
		<div style={{ "--color-primary": "10 18 32" }} className="overflow-x-hidden bg-[#0a1220] font-['Plus_Jakarta_Sans_Variable',sans-serif] text-[#eef2f7]">
			<header className={`fixed top-0 z-50 w-full transition-colors duration-500 ${pekat ? "bg-[#0a1220]/90 shadow-[0_1px_0_rgba(238,242,247,.06)] backdrop-blur-xl" : "bg-transparent"}`}>
				<div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:h-[4.5rem] lg:px-8">
					<RouterLink to="/" onClick={() => pilih(0)} className="flex shrink-0 items-center gap-3 text-[#eef2f7]">
						<img src="/logo-bogor.png" alt="Logo Kabupaten Bogor" className="h-9 w-auto" />
						<span className="hidden leading-tight sm:block">
							<span className="block text-[15px] font-extrabold tracking-[-0.01em]">DPMD</span>
							<span className="block text-[11.5px] text-[#eef2f7]/65">Kabupaten Bogor</span>
						</span>
					</RouterLink>

					{dekAktif && <DokBagian bagian={BAGIAN} aktif={aktif} onPilih={pilih} />}

					<div className="flex shrink-0 items-center gap-2">
						<div className="hidden xl:block"><InstallPWA compact /></div>
						<RouterLink to="/login" className="hidden rounded-md bg-[#e3b23c] px-4 py-2 text-[14px] font-bold text-[#0a1220] transition hover:bg-[#edc35a] sm:block">
							Masuk
						</RouterLink>
						{!dekAktif && (
							<button type="button" onClick={() => setMenuBuka((b) => !b)} aria-label={menuBuka ? "Tutup menu" : "Buka menu"} aria-expanded={menuBuka}
								className="flex h-10 w-10 items-center justify-center rounded-md text-[#eef2f7] hover:bg-[#eef2f7]/10">
								{menuBuka ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
							</button>
						)}
					</div>
				</div>

				{menuBuka && !dekAktif && (
					<nav className="border-t border-[#eef2f7]/10 bg-[#0a1220] px-5 pb-5 pt-2" aria-label="Navigasi halaman">
						{BAGIAN.map((b, i) => (
							<button key={b.id} type="button" onClick={() => pilih(i)}
								className="block w-full border-b border-[#eef2f7]/10 py-3.5 text-left text-[16px] font-medium text-[#eef2f7]/85">
								{b.label}
							</button>
						))}
						<div className="mt-4 flex items-center gap-3">
							<RouterLink to="/login" className="flex-1 rounded-md bg-[#e3b23c] px-4 py-3 text-center text-[15px] font-bold text-[#0a1220]">Masuk ke sistem</RouterLink>
							<InstallPWA compact />
						</div>
					</nav>
				)}
			</header>

			<div className="dek" ref={wadahRef}>
				{BAGIAN.map((b, i) => {
					const posisi = i === aktif ? "is-active" : i < aktif ? "is-before" : "is-after";
					const tersembunyi = dekAktif && i !== aktif;
					return (
						<section key={b.id} id={`bagian-${b.id}`} data-bagian={b.id} className={`dek-slide scroll-mt-16 ${dekAktif ? posisi : ""}`} aria-hidden={tersembunyi} inert={tersembunyi}>
							<div className="dek-isi" data-dek-gulir>
								<KonteksSlide.Provider value={!dekAktif || i === aktif}>{b.isi}</KonteksSlide.Provider>
							</div>
						</section>
					);
				})}
			</div>
		</div>
	);
};

export default LandingPage;
