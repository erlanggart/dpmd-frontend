import React, { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Link as ScrollLink } from "react-scroll";
import { FiMenu, FiX, FiChevronDown } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import HeroSection from "../components/HeroSection";
import { useScrollPosition } from "../hooks/useScrollPosition";
import FeatureSection from "../components/landingpage/FeatureSection";
import Footer from "../components/landingpage/Footer";
import StatsSection from "../components/landingpage/StatsSection";
import NewsSection from "../components/landingpage/NewsSection";
import KegiatanSection from "../components/landingpage/KegiatanSection";
import MapSection from "../components/landingpage/MapSection";
import InstallPWA from "../components/InstallPWA";

const LandingPage = () => {
	const scrollY = useScrollPosition();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [activeSection, setActiveSection] = useState("home");

	// Close mobile menu on resize
	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const isScrolled = scrollY > 50;

	const navLinks = [
		{ to: "home", label: "Beranda" },
		{ to: "stats", label: "Statistik" },
		{ to: "peta", label: "Peta" },
		{ to: "kegiatan", label: "Program" },
		{ to: "berita", label: "Berita" },
		{ to: "features", label: "Layanan" },
		{ to: "contact", label: "Kontak" },
	];

	const closeMobileMenu = () => setIsMobileMenuOpen(false);

	return (
		<div className="overflow-x-hidden bg-white">
			{/* ===== ELEGANT NAVBAR ===== */}
			<motion.header
				initial={{ y: -100 }}
				animate={{ y: 0 }}
				transition={{ duration: 0.6, ease: "easeOut" }}
				className={`fixed top-0 z-50 w-full transition-all duration-500 ${
					isScrolled
						? "bg-[rgb(var(--color-primary))]/95 backdrop-blur-xl shadow-2xl shadow-black/10 py-2"
						: "bg-gradient-to-b from-black/60 via-black/30 to-transparent py-4"
				}`}
			>
				<div className="container max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
					{/* Logo */}
					<RouterLink to="/" className="flex items-center space-x-3 group">
						<div className="relative">
							<img
								src="/logo-bogor.png"
								alt="Logo Kabupaten Bogor"
								className={`transition-all duration-300 ${isScrolled ? "h-9" : "h-11"}`}
							/>
							<div className="absolute -inset-1 bg-white/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
						</div>
						<div className={`hidden sm:block transition-all duration-300 ${isScrolled ? "opacity-100" : "opacity-90"}`}>
							<p className="text-white font-bold text-sm leading-tight tracking-wide">DPMD</p>
							<p className="text-white/70 text-[10px] leading-tight">Kabupaten Bogor</p>
						</div>
					</RouterLink>

					{/* Desktop Navigation */}
					<div className="hidden lg:flex items-center space-x-1">
						<nav className="flex items-center bg-white/[0.08] backdrop-blur-sm rounded-full px-2 py-1.5 border border-white/[0.08]">
							{navLinks.map((link) => (
								<ScrollLink
									key={link.to}
									to={link.to}
									spy={true}
									smooth={true}
									offset={-80}
									duration={600}
									className="relative cursor-pointer text-white/80 text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 hover:text-white hover:bg-white/10"
									activeClass="!text-[rgb(var(--color-secondary))] !bg-white/15"
									onSetActive={() => setActiveSection(link.to)}
								>
									{link.label}
								</ScrollLink>
							))}
						</nav>
						<div className="ml-4">
							<InstallPWA compact={true} />
						</div>
					</div>

					{/* Mobile Menu Button */}
					<button
						className="lg:hidden relative w-10 h-10 flex items-center justify-center text-white rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all"
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						aria-label="Toggle menu"
					>
						<span className="transition-transform duration-300" style={{ transform: isMobileMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
							{isMobileMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
						</span>
					</button>
				</div>

				{/* Mobile Navigation */}
				<AnimatePresence>
					{isMobileMenuOpen && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3, ease: "easeInOut" }}
							className="lg:hidden overflow-hidden"
						>
							<div className="bg-[rgb(var(--color-primary))]/98 backdrop-blur-xl border-t border-white/10 mx-4 mt-2 rounded-2xl shadow-2xl">
								<nav className="p-4 space-y-1">
									{navLinks.map((link, i) => (
										<motion.div
											key={link.to}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: i * 0.05 }}
										>
											<ScrollLink
												to={link.to}
												spy={true}
												smooth={true}
												offset={-80}
												duration={600}
												className="flex items-center cursor-pointer text-white/80 hover:text-white py-3 px-4 rounded-xl hover:bg-white/10 transition-all font-medium"
												activeClass="!text-[rgb(var(--color-secondary))] !bg-white/15"
												onClick={closeMobileMenu}
											>
												{link.label}
											</ScrollLink>
										</motion.div>
									))}
									<div className="border-t border-white/10 my-2" />
									<div className="px-4 py-2">
										<InstallPWA />
									</div>
								</nav>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.header>

			{/* ===== PAGE SECTIONS ===== */}
			<section id="home">
				<HeroSection />
			</section>

			<section id="stats">
				<StatsSection />
			</section>

			<section id="peta">
				<MapSection />
			</section>

			<section id="kegiatan">
				<KegiatanSection />
			</section>

			<section id="berita">
				<NewsSection />
			</section>

			<section id="features">
				<FeatureSection />
			</section>

			<Footer />
		</div>
	);
};

export default LandingPage;

