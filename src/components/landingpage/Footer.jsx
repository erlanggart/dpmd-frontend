import React from "react";
import {
	FiMapPin,
	FiPhone,
	FiMail,
	FiClock,
	FiFacebook,
	FiTwitter,
	FiInstagram,
	FiYoutube,
	FiArrowUpRight,
} from "react-icons/fi";

const Footer = () => {
	const socialLinks = [
		{ icon: <FiFacebook size={18} />, href: "#", label: "Facebook" },
		{ icon: <FiTwitter size={18} />, href: "#", label: "Twitter" },
		{ icon: <FiInstagram size={18} />, href: "#", label: "Instagram" },
		{ icon: <FiYoutube size={18} />, href: "#", label: "YouTube" },
	];

	const quickLinks = [
		{ label: "Bantuan Keuangan", href: "/bantuan-keuangan" },
		{ label: "Data BUMDes", href: "/login" },
		{ label: "Kelembagaan", href: "/login" },
		{ label: "Produk Hukum", href: "/login" },
	];

	return (
		<footer id="contact" className="relative bg-gray-950 text-white overflow-hidden">
			{/* Top Accent */}
			<div className="h-px bg-gradient-to-r from-transparent via-[rgb(var(--color-secondary))]/40 to-transparent" />
			
			{/* Background Decoration */}
			<div className="absolute -top-48 -right-48 w-96 h-96 bg-[rgb(var(--color-secondary))]/[0.02] rounded-full blur-[100px]" />
			<div className="absolute -bottom-48 -left-48 w-96 h-96 bg-blue-500/[0.02] rounded-full blur-[100px]" />

			<div className="container max-w-7xl mx-auto px-4 md:px-6 relative z-10">
				{/* Main Content */}
				<div className="py-16 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-12">
					{/* Brand Column */}
					<div className="lg:col-span-4">
						<div className="flex items-center space-x-3 mb-6">
							<img
								src="/logo-bogor.png"
								alt="Logo Kabupaten Bogor"
								className="h-12"
							/>
							<div>
								<h2 className="text-sm font-bold uppercase tracking-wider text-white">
									DPMD Kabupaten Bogor
								</h2>
								<p className="text-xs text-white/40 mt-0.5">
									Dinas Pemberdayaan Masyarakat dan Desa
								</p>
							</div>
						</div>
						<p className="text-white/40 text-sm leading-relaxed max-w-xs mb-8">
							Platform digital terpadu untuk pemberdayaan masyarakat dan pengelolaan desa di Kabupaten Bogor.
						</p>
						
						{/* Social Links */}
						<div className="flex space-x-3">
							{socialLinks.map((link, index) => (
								<a
									key={index}
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={link.label}
									className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:bg-[rgb(var(--color-secondary))]/20 hover:text-[rgb(var(--color-secondary))] hover:border-[rgb(var(--color-secondary))]/30 transition-all duration-300"
								>
									{link.icon}
								</a>
							))}
						</div>
					</div>

					{/* Quick Links */}
					<div className="lg:col-span-2">
						<h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-6">
							Layanan
						</h3>
						<ul className="space-y-3">
							{quickLinks.map((link, index) => (
								<li key={index}>
									<a
										href={link.href}
										className="group flex items-center text-sm text-white/50 hover:text-white transition-colors"
									>
										<span>{link.label}</span>
										<FiArrowUpRight className="ml-1 w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
									</a>
								</li>
							))}
						</ul>
					</div>

					{/* Contact Info */}
					<div className="lg:col-span-3">
						<h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-6">
							Kontak
						</h3>
						<div className="space-y-4">
							<div className="flex items-start space-x-3">
								<div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0 mt-0.5">
									<FiMapPin className="w-3.5 h-3.5 text-white/40" />
								</div>
								<p className="text-sm text-white/50 leading-relaxed">
									Jl. KSR Dadi Kusmayadi, Cibinong, Bogor, Jawa Barat 16914
								</p>
							</div>
							<div className="flex items-center space-x-3">
								<div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
									<FiPhone className="w-3.5 h-3.5 text-white/40" />
								</div>
								<span className="text-sm text-white/50">(021) 8754102</span>
							</div>
							<div className="flex items-center space-x-3">
								<div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
									<FiMail className="w-3.5 h-3.5 text-white/40" />
								</div>
								<span className="text-sm text-white/50">dpmd@bogorkab.go.id</span>
							</div>
						</div>
					</div>

					{/* Hours */}
					<div className="lg:col-span-3">
						<h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-6">
							Jam Operasional
						</h3>
						<div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
							<div className="flex items-center space-x-3 mb-4">
								<div className="w-8 h-8 rounded-lg bg-[rgb(var(--color-secondary))]/10 flex items-center justify-center">
									<FiClock className="w-3.5 h-3.5 text-[rgb(var(--color-secondary))]" />
								</div>
								<div>
									<p className="text-sm font-medium text-white/80">07.30 – 16.00 WIB</p>
									<p className="text-xs text-white/30">Senin – Jum'at</p>
								</div>
							</div>
							<div className="flex items-center space-x-2">
								<span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
								<span className="text-xs text-emerald-400/80 font-medium">Sistem Online 24/7</span>
							</div>
						</div>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="border-t border-white/[0.06] py-6 flex flex-col md:flex-row items-center justify-between gap-4">
					<p className="text-xs text-white/25">
						&copy; {new Date().getFullYear()} Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor
					</p>
					<p className="text-xs text-white/20">
						Sistem Informasi Pemberdayaan Desa v2.0
					</p>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
