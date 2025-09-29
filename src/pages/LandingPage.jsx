import React from "react";
import { Link as RouterLink } from "react-router-dom"; // Link untuk navigasi halaman
import { Link as ScrollLink } from "react-scroll"; // Link BARU untuk scrolling
import { FiLogIn } from "react-icons/fi";
import HeroSection from "../components/HeroSection";
import MusdesusHeroSection from "../components/MusdesusHeroSection";
import { useScrollPosition } from "../hooks/useScrollPosition";
import FeatureSection from "../components/landingpage/FeatureSection";
import Footer from "../components/landingpage/Footer";
import StatsSection from "../components/landingpage/StatsSection";

const LandingPage = () => {
	const scrollY = useScrollPosition();

	const headerClasses = `
    fixed top-0 z-50 w-full p-4 transition-all duration-300
    ${
			scrollY > 50
				? "bg-[rgb(var(--color-primary))] shadow-lg"
				: "bg-gradient-to-b from-black/70 to-transparent"
		}
  `;

	// Daftar link navigasi
	const navLinks = [
		{ to: "home", label: "Beranda" },
		{ to: "stats", label: "Statistik" },
		{ to: "features", label: "Fitur" },
		{ to: "contact", label: "Kontak" },
	];

	// Styling untuk link navigasi
	const navLinkClasses =
		"cursor-pointer  text-white transition-colors hover:text-secondary";

	return (
		<div>
			<header className={headerClasses}>
				<div className="container w-7xl mx-auto flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<img
							src="/logo-kab.png"
							alt="Logo Kabupaten Bogor"
							className="h-10"
						/>
						<div>
							<h1 className="text-lg font-bold text-white md:text-sm">
								Dinas Pemberdayaan Masyarakat dan Desa
							</h1>
							<h2 className="font-semibold text-white/90">Kabupaten Bogor</h2>
						</div>
					</div>
					<div className="flex items-center space-x-8">
						{/* Navigasi untuk Scroll (hanya di desktop) */}
						<nav className="hidden items-center space-x-8 lg:flex">
							{navLinks.map((link) => (
								<ScrollLink
									key={link.to}
									to={link.to}
									spy={true} // Membuat link aktif saat section di-scroll
									smooth={true} // Animasi smooth scroll
									offset={-70} // Offset agar tidak tertutup header
									duration={500} // Durasi animasi (ms)
									className={navLinkClasses}
									activeClass="text-secondary" // Kelas saat link aktif
								>
									{link.label}
								</ScrollLink>
							))}
						</nav>

						{/* Tombol Login */}
						{/* <RouterLink
							to="/login"
							className={`hidden items-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-colors md:flex ${
								scrollY > 50
									? "bg-secondary text-white hover:bg-secondary/90"
									: "bg-white text-primary hover:bg-gray-200"
							}`}
						>
							<FiLogIn />
							<span>Login</span>
						</RouterLink> */}
					</div>
				</div>
			</header>

			{/* Pastikan setiap komponen ini memiliki ID yang sesuai */}
			<section id="home">
				<HeroSection />
			</section>
			<section id="musdesus">
				<MusdesusHeroSection />
			</section>
			<section id="stats">
				<StatsSection />
			</section>
			<section id="features" className="bg-white py-20">
				<FeatureSection />
			</section>
			<Footer />
		</div>
	);
};

export default LandingPage;

