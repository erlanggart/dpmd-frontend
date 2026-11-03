import React, { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import { BarChart3, House, LayoutGrid, Map as IkonPeta, Newspaper, Phone } from "lucide-react";
import "@fontsource-variable/plus-jakarta-sans";
import { useScrollPosition } from "../hooks/useScrollPosition";
import HeroRelief from "../components/landingpage/HeroRelief";
import SectionAngka from "../components/landingpage/angka/SectionAngka";
import FeatureSection from "../components/landingpage/FeatureSection";
import SectionKontak from "../components/landingpage/SectionKontak";
import NewsSection from "../components/landingpage/NewsSection";
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
	{ id: "berita", label: "Berita", ikon: Newspaper, isi: <NewsSection /> },
	{ id: "layanan", label: "Layanan", ikon: LayoutGrid, isi: <FeatureSection /> },
	{ id: "kontak", label: "Kontak", ikon: Phone, isi: <SectionKontak /> },
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
	const [siap, setSiap] = useState(false);
	useEffect(() => {
		let b;
		const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setSiap(true)); });
		return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
	}, []);

	const pilih = (i) => {
		setMenuBuka(false);
		if (dekAktif) keSlide(i);
		else document.getElementById(`bagian-${BAGIAN[i].id}`)?.scrollIntoView({ behavior: "smooth" });
	};

	const pekat = dekAktif ? aktif > 0 : scrollY > 40 || menuBuka;

	/* Setiap slide pas satu layar: isi yang lebih tinggi dari layar (layar laptop
	   pendek) diperkecil dengan CSS zoom sampai muat, tidak digulir atau dipotong.
	   Diukur ulang saat slide didatangi (isinya bisa baru termuat) dan saat jendela
	   berubah ukuran. */
	const pasRef = useRef([]);
	useEffect(() => {
		if (!dekAktif) {
			pasRef.current.forEach((el) => el && (el.style.zoom = ""));
			return undefined;
		}
		const pas = () => pasRef.current.forEach((el) => {
			if (!el) return;
			el.style.zoom = "1";
			const tinggi = el.scrollHeight, layar = el.parentElement.clientHeight;
			el.style.zoom = tinggi > layar + 1 ? String(Math.max(0.6, layar / tinggi)) : "1";
		});
		pas();
		const t = [setTimeout(pas, 400), setTimeout(pas, 1500)];
		let jeda;
		const ubah = () => { clearTimeout(jeda); jeda = setTimeout(pas, 150); };
		window.addEventListener("resize", ubah);
		return () => { t.forEach(clearTimeout); clearTimeout(jeda); window.removeEventListener("resize", ubah); };
	}, [dekAktif, aktif]);

	// Ponsel: isi bagian "dibangun" saat tergulir ke layar (di dek: saat slide aktif).
	const slideRef = useRef([]);
	useEffect(() => {
		if (dekAktif) return undefined;
		const io = new IntersectionObserver((daftar) => daftar.forEach((e) => e.isIntersecting && e.target.classList.add("terlihat")), { threshold: 0.12 });
		slideRef.current.forEach((el) => el && io.observe(el));
		return () => io.disconnect();
	}, [dekAktif]);

	return (
		<div style={{ "--color-primary": "10 18 32" }} className="overflow-x-hidden bg-[#0a1220] font-['Plus_Jakarta_Sans_Variable',sans-serif] text-[#eef2f7]">
			<header className={`fixed top-0 z-50 w-full transition-colors duration-500 ${pekat ? "bg-[#0a1220]/90 shadow-[0_1px_0_rgba(238,242,247,.06)] backdrop-blur-xl" : "bg-transparent"}`}>
				<div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:h-[4.5rem] lg:px-8">
					<RouterLink to="/" onClick={() => pilih(0)} className="flex shrink-0 items-center gap-3 text-[#eef2f7]">
						<img src="/logo-dpmd-192.png" alt="Logo DPMD Kabupaten Bogor" className="-my-1 h-12 w-12 object-contain" />
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
					const posisi = i === aktif && siap ? "is-active" : i < aktif ? "is-before" : "is-after";
					const tersembunyi = dekAktif && i !== aktif;
					return (
						<section key={b.id} ref={(el) => (slideRef.current[i] = el)} id={`bagian-${b.id}`} data-bagian={b.id} className={`dek-slide scroll-mt-16 ${dekAktif ? posisi : ""}`} aria-hidden={tersembunyi} inert={tersembunyi}>
							<div className="dek-isi">
								<div className="dek-pas" ref={(el) => (pasRef.current[i] = el)}>
									<KonteksSlide.Provider value={!dekAktif || i === aktif}>{b.isi}</KonteksSlide.Provider>
								</div>
							</div>
						</section>
					);
				})}
			</div>

			{dekAktif && (
				<>
					{/* rel kemajuan: urutan slide memang berurutan, jadi nomornya bermakna */}
					<nav aria-label="Kemajuan halaman" className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-2.5 lg:flex">
						{BAGIAN.map((b, i) => (
							<button key={b.id} type="button" onClick={() => pilih(i)} aria-label={`Ke bagian ${b.label}`} aria-current={i === aktif ? "true" : undefined} className="group flex items-center gap-3 py-1">
								<span className={`text-[11px] font-semibold tabular-nums transition-all duration-500 ${i === aktif ? "text-[#e3b23c]" : "text-[#eef2f7]/60"} opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100`}>
									{String(i + 1).padStart(2, "0")} {b.label}
								</span>
								<span className={`block h-[3px] rounded-full transition-all duration-500 ${i === aktif ? "w-8 bg-[#e3b23c]" : "w-3 bg-[#eef2f7]/25 group-hover:bg-[#eef2f7]/60"}`} />
							</button>
						))}
					</nav>

					{/* petunjuk gulir, hanya di slide pertama */}
					<button type="button" onClick={() => pilih(1)} aria-label="Ke bagian berikutnya"
						className={`fixed bottom-7 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2 text-[11px] font-semibold text-[#eef2f7]/55 transition-opacity duration-500 hover:text-[#eef2f7] ${aktif === 0 ? "opacity-100" : "pointer-events-none opacity-0"}`}>
						Gulir
						<span className="relative block h-9 w-px overflow-hidden bg-[#eef2f7]/15">
							<span className="absolute inset-x-0 top-0 h-1/2 bg-[#e3b23c] motion-safe:animate-[turunGaris_1.8s_cubic-bezier(0.7,0,0.2,1)_infinite]" />
						</span>
					</button>
				</>
			)}
		</div>
	);
};

export default LandingPage;
