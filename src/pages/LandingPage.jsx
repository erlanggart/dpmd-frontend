import React from "react";
import { Link } from "react-router-dom";
import { FiLogIn } from "react-icons/fi";
import HeroSection from "../components/HeroSection"; // Kita akan buat HeroSection terpisah
import { useScrollPosition } from "../hooks/useScrollPosition";
import FeatureSection from "../components/landingpage/FeatureSection";
import Footer from "../components/landingpage/Footer";

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

	return (
		<div>
			<header className={headerClasses}>
				<div className="w-7xl mx-auto flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<img
							src="/logo-kab.png"
							alt="Logo Kabupaten Bogor"
							className="h-10"
						/>
						<div>
							<h1
								className={`text-lg font-bold md:text-sm transition-colors ${
									scrollY > 50 ? "text-white" : "text-white"
								}`}
							>
								Dinas Pemberdayaan Masyarakat dan Desa
							</h1>
							<h2
								className={`font-semibold transition-colors ${
									scrollY > 50 ? "text-gray-200" : "text-white"
								}`}
							>
								Kabupaten Bogor
							</h2>
						</div>
					</div>
					<Link
						to="/login"
						className={`hidden items-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-colors md:flex text-white ${
							scrollY > 50
								? "bg-[rgb(var(--color-secondary))] hover:bg-[rgb(var(--color-secondary))]/80 "
								: "bg-primary hover:bg-[rgb(var(--color-primary))]/90"
						}`}
					>
						<FiLogIn />
						<span>Login</span>
					</Link>
				</div>
			</header>
			<HeroSection />
			<section id="features" className="bg-white py-20">
				<FeatureSection />
			</section>
			<Footer />
		</div>
	);
};

export default LandingPage;
