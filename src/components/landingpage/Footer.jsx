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
} from "react-icons/fi";

const Footer = () => {
	// Anda bisa mengganti link # dengan URL sosial media Anda
	const socialLinks = [
		{ icon: <FiFacebook size={20} />, href: "#" },
		{ icon: <FiTwitter size={20} />, href: "#" },
		{ icon: <FiInstagram size={20} />, href: "#" },
		{ icon: <FiYoutube size={20} />, href: "#" },
	];

	return (
		<footer className="bg-gray-900 text-white">
			<div className="container max-w-7xl mx-auto px-4 md:px-6 py-12">
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
					{/* Kolom 1: Logo & Nama Instansi */}
					<div>
						<div className="flex items-center">
							<img
								src="/logo-kab.png"
								alt="Logo Kabupaten Bogor"
								className="h-12"
							/>
							<div className="ml-4">
								<h2 className="text-base font-bold uppercase">
									Dinas Pemberdayaan Masyarakat dan Desa
								</h2>
								<p className="text-sm text-gray-400">Kabupaten Bogor</p>
							</div>
						</div>
					</div>

					{/* Kolom 2: Info Kontak */}
					<div>
						<h3 className="text-lg font-semibold uppercase tracking-wider">
							Kontak
						</h3>
						<div className="mt-4 flex flex-col space-y-4">
							<div className="flex items-start">
								<FiMapPin className="mr-3 h-5 w-5 flex-shrink-0" />
								<p className="text-gray-300">
									Jl. KSR Dadi Kusmayadi, Tengah, Cibinong, Bogor, Jawa Barat
									16914.
								</p>
							</div>
							<div className="flex items-center">
								<FiPhone className="mr-3 h-5 w-5" />
								<span className="text-gray-300">(021) 8754102</span>
							</div>
							<div className="flex items-center">
								<FiMail className="mr-3 h-5 w-5" />
								<span className="text-gray-300">dpmd@bogorkab.go.id</span>
							</div>
						</div>
					</div>

					{/* Kolom 3: Jam Operasional */}
					<div>
						<h3 className="text-lg font-semibold uppercase tracking-wider">
							Jam Operasional
						</h3>
						<div className="mt-4 flex items-center">
							<FiClock className="mr-3 h-5 w-5" />
							<div>
								<p className="text-gray-300">07.30 – 16.00 WIB</p>
								<p className="text-sm text-gray-400">Senin – Jum'at</p>
							</div>
						</div>
					</div>

					{/* Kolom 4: Sosial Media */}
					<div>
						<h3 className="text-lg font-semibold uppercase tracking-wider">
							Ikuti Kami
						</h3>
						<div className="mt-4 flex space-x-4">
							{socialLinks.map((link, index) => (
								<a
									key={index}
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									className="rounded-full bg-gray-700 p-3 text-white transition-colors hover:bg-[rgb(var(--color-primary))]"
								>
									{link.icon}
								</a>
							))}
						</div>
					</div>
				</div>

				{/* Garis Pemisah dan Copyright */}
				<div className="mt-12 border-t border-gray-700 pt-6 text-center">
					<p className="text-sm text-gray-400">
						&copy; {new Date().getFullYear()} Dinas Pemberdayaan Masyarakat dan
						Desa. All Rights Reserved.
					</p>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
