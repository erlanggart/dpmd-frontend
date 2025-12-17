import React from "react";
import { FiPlay, FiYoutube } from "react-icons/fi";

const VideoTutorialSection = () => {
	const handleVideoClick = () => {
		window.open("https://youtu.be/AVdyrfX7Iqo?si=bvjV1DlFjzSYsizU", "_blank");
	};

	return (
		<section className="bg-gradient-to-br from-slate-50 to-blue-50 py-20">
			<div className="container max-w-7xl mx-auto px-4">
				<div className="text-center mb-12">
					<h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
						Video Tutorial Penggunaan Aplikasi
					</h2>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
						Pelajari cara menggunakan aplikasi SIPANDA Kabupaten Bogor dengan mudah melalui video tutorial lengkap kami
					</p>
				</div>

				<div className="max-w-4xl mx-auto">
					<div className="relative">
						{/* Video Thumbnail Container */}
						<div 
							className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl cursor-pointer group transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]"
							onClick={handleVideoClick}
						>
							{/* Background Image from attachment */}
							<div className="absolute inset-0">
								<img 
									src="/video-tutorial-bg.jpg" 
									alt="Video Tutorial SIPANDA Kabupaten Bogor Background"
									className="w-full h-full object-cover"
								/>
								{/* Dark overlay for better text readability */}
								<div className="absolute inset-0 bg-black/40"></div>
							</div>
							
							{/* Main Content Overlay */}
							<div className="relative z-10 flex items-center justify-center h-full text-center text-white px-8">
								<div>
									{/* Logo */}
									<div className="mb-6">
										<img
											src="/logo-bogor.png"
											alt="Logo Kabupaten Bogor"
											className="h-16 w-16 mx-auto mb-4 filter drop-shadow-2xl"
											onError={(e) => {
												e.target.style.display = 'none';
											}}
										/>
									</div>
									
									{/* YouTube Icon */}
									<div className="mb-6">
										<FiYoutube className="w-20 h-20 mx-auto opacity-90 drop-shadow-2xl" />
									</div>
									
									{/* Title */}
									<h3 className="text-2xl md:text-3xl font-bold mb-3 drop-shadow-2xl">
										Video Tutorial Penggunaan
									</h3>
									<p className="text-white/90 text-lg font-medium mb-2 drop-shadow-lg">
										APLIKASI SIPANDA
									</p>
									<p className="text-white/80 text-base drop-shadow-lg">
										Kabupaten Bogor
									</p>
									
									{/* Decorative Elements */}
									<div className="mt-8 flex justify-center space-x-2">
										<div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
										<div className="w-2 h-2 bg-white/60 rounded-full animate-pulse delay-75"></div>
										<div className="w-2 h-2 bg-white/60 rounded-full animate-pulse delay-150"></div>
									</div>
								</div>
							</div>

							{/* Play Button Overlay */}
							<div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-all duration-300">
								<div className="bg-white/90 backdrop-blur-sm rounded-full p-6 group-hover:bg-white group-hover:scale-110 transition-all duration-300 shadow-xl">
									<FiPlay className="w-8 h-8 text-blue-600 ml-1" />
								</div>
							</div>

							{/* Duration Badge */}
							<div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-1 rounded-lg text-sm font-medium">
								Tutorial Lengkap
							</div>
						</div>

						{/* Video Info */}
						<div className="mt-8 text-center">
							<h3 className="text-xl font-semibold text-gray-800 mb-2">
								Tutorial Penggunaan Aplikasi SIPANDA
							</h3>
							<p className="text-gray-600 mb-6">
								Panduan lengkap penggunaan aplikasi untuk meningkatkan efektivitas kerja di lingkungan Kabupaten Bogor
							</p>
							
							{/* CTA Button */}
							<button
								onClick={handleVideoClick}
								className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105"
							>
								<FiYoutube className="w-5 h-5" />
								Tonton di YouTube
							</button>
						</div>
					</div>

					{/* Additional Info Cards */}
					<div className="grid md:grid-cols-3 gap-6 mt-12">
						<div className="bg-white p-6 rounded-xl shadow-lg text-center">
							<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
								<FiPlay className="w-6 h-6 text-blue-600" />
							</div>
							<h4 className="font-semibold text-gray-800 mb-2">Mudah Dipahami</h4>
							<p className="text-gray-600 text-sm">Tutorial step-by-step yang mudah diikuti untuk semua pengguna</p>
						</div>
						
						<div className="bg-white p-6 rounded-xl shadow-lg text-center">
							<div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
								<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h4 className="font-semibold text-gray-800 mb-2">Panduan Lengkap</h4>
							<p className="text-gray-600 text-sm">Mencakup semua fitur utama aplikasi SIPANDA</p>
						</div>
						
						<div className="bg-white p-6 rounded-xl shadow-lg text-center">
							<div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
								<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
							</div>
							<h4 className="font-semibold text-gray-800 mb-2">Akses Cepat</h4>
							<p className="text-gray-600 text-sm">Tersedia 24/7 untuk referensi kapan saja</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default VideoTutorialSection;