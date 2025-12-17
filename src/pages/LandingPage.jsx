import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom"; // Link untuk navigasi halaman
import { Link as ScrollLink } from "react-scroll"; // Link BARU untuk scrolling
import { FiLogIn, FiMenu, FiX } from "react-icons/fi";
import HeroSection from "../components/HeroSection";
import { useScrollPosition } from "../hooks/useScrollPosition";
import FeatureSection from "../components/landingpage/FeatureSection";
import Footer from "../components/landingpage/Footer";
import StatsSection from "../components/landingpage/StatsSection";
import NewsSection from "../components/landingpage/NewsSection";
import KegiatanSection from "../components/landingpage/KegiatanSection";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import InstallPWA from "../components/InstallPWA";

const LandingPage = () => {
	const scrollY = useScrollPosition();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const headerClasses = `
    fixed top-0 z-50 w-full px-4 py-3 transition-all duration-300
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
		{ to: "kegiatan", label: "Kegiatan" },
		{ to: "berita", label: "Berita" },
		{ to: "features", label: "Fitur" },
		{ to: "contact", label: "Kontak" },
	];

	// Styling untuk link navigasi
	const navLinkClasses =
		"cursor-pointer text-white transition-colors hover:text-secondary block py-2 px-4 lg:p-0";

	const closeMobileMenu = () => {
		setIsMobileMenuOpen(false);
	};

	return (
		<div className="overflow-x-hidden">
			<header className={headerClasses}>
				<div className="container max-w-7xl mx-auto flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<img
							src="/logo-bogor.png"
							alt="Logo Kabupaten Bogor"
							className="h-8 md:h-10"
						/>

					</div>
					
					{/* Desktop Navigation */}
					<div className="hidden lg:flex items-center space-x-8">
						<nav className="flex items-center space-x-8">
					{navLinks.map((link) => (
						<ScrollLink
							key={link.to}
							to={link.to}
							spy={true}
							smooth={true}
							offset={-70}
							duration={500}
							className="cursor-pointer text-white transition-colors hover:text-secondary"
							activeClass="text-secondary"
							onClick={closeMobileMenu}
						>
							{link.label}
						</ScrollLink>
					))}
				</nav>
				<InstallPWA compact={true} />
			</div>				{/* Mobile Menu Button */}
					<button
						className="lg:hidden text-white p-2 rounded-md hover:bg-white/10 transition-colors"
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						aria-label="Toggle menu"
					>
						{isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
					</button>
				</div>

				{/* Mobile Navigation Menu */}
				{isMobileMenuOpen && (
					<div className="lg:hidden bg-slate-800/95 backdrop-blur-sm border-t border-white/20">
						<nav className="container max-w-7xl mx-auto px-4 py-4 space-y-2">
							{navLinks.map((link) => (
								<ScrollLink
									key={link.to}
									to={link.to}
									spy={true}
									smooth={true}
									offset={-70}
									duration={500}
									className={navLinkClasses}
									activeClass="text-secondary bg-white/10 rounded-md"
									onClick={closeMobileMenu}
								>
									{link.label}
								</ScrollLink>
							))}
							
							{/* Divider */}
							<div className="border-t border-white/20 my-3"></div>
							
							{/* Install PWA Button */}
							<div className="px-4 pb-2">
								<InstallPWA />
							</div>
						</nav>
					</div>
				)}
		</header>			{/* Pastikan setiap komponen ini memiliki ID yang sesuai */}
			<section id="home">
				<HeroSection />
			</section>
			<section id="stats">
				<StatsSection />
			</section>
			<section id="kegiatan">
				<KegiatanSection />
			</section>
			<section id="berita">
				<NewsSection />
			</section>
			<section id="features" className="bg-white py-20">
				<FeatureSection />
			</section>
			<Footer />
			{/* PWA disabled temporarily - causing click blocking */}
			{/* <PWAInstallPrompt showOnLanding={true} /> */}
		</div>
	);
};

export default LandingPage;

