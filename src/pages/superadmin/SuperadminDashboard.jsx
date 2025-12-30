// src/pages/superadmin/SuperadminDashboard.jsx
import React, { useEffect } from "react";
import { FiShield, FiLock, FiKey, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const SuperadminDashboard = () => {
	const { user } = useAuth();

	// Add keyframes for animations
	useEffect(() => {
		const style = document.createElement('style');
		style.id = 'superadmin-dashboard-animations';
		style.textContent = `
			@keyframes fadeInUp {
				from {
					opacity: 0;
					transform: translateY(30px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}

			@keyframes float {
				0%, 100% {
					transform: translateY(0px);
				}
				50% {
					transform: translateY(-20px);
				}
			}

			@keyframes pulse-glow {
				0%, 100% {
					box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
				}
				50% {
					box-shadow: 0 0 40px rgba(59, 130, 246, 0.8);
				}
			}

			.animate-float {
				animation: float 3s ease-in-out infinite;
			}

			.animate-pulse-glow {
				animation: pulse-glow 2s ease-in-out infinite;
			}
		`;
		
		// Check if style already exists, remove it first
		const existingStyle = document.getElementById('superadmin-dashboard-animations');
		if (existingStyle) {
			existingStyle.remove();
		}
		
		document.head.appendChild(style);

		// Cleanup function to remove style when component unmounts
		return () => {
			const styleToRemove = document.getElementById('superadmin-dashboard-animations');
			if (styleToRemove) {
				styleToRemove.remove();
			}
		};
	}, []);

	const privileges = [
		{
			icon: FiShield,
			title: "Full System Access",
			description: "Akses penuh ke seluruh fitur sistem tanpa batasan"
		},
		{
			icon: FiKey,
			title: "User Management",
			description: "Kelola semua user, role, dan permissions sistem"
		},
		{
			icon: FiLock,
			title: "Security Control",
			description: "Monitor dan kontrol keamanan sistem secara menyeluruh"
		},
		{
			icon: FiCheckCircle,
			title: "Data Oversight",
			description: "Supervisi dan validasi semua data dari seluruh bidang"
		}
	];

	return (
		<div className="min-h-screen flex items-center justify-center p-4 md:p-8">
			<div className="max-w-5xl w-full">
				{/* Main Welcome Card */}
				<div 
					className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-8 md:p-16 shadow-2xl"
					style={{
						animation: 'fadeInUp 0.8s ease-out forwards'
					}}
				>
					{/* Animated Background Elements */}
					<div className="absolute inset-0 opacity-20">
						<div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
						<div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
						<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full blur-3xl"></div>
					</div>

					{/* Content */}
					<div className="relative z-10 text-center">
						{/* Shield Icon with Animation */}
						<div className="flex justify-center mb-8">
							<div 
								className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl animate-pulse-glow"
							>
								<FiShield className="w-16 h-16 text-white animate-float" />
							</div>
						</div>

						{/* Welcome Text */}
						<h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
							Selamat Datang, Superadmin! 👋
						</h1>
						<p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
							{user?.name || 'Administrator'}
						</p>

					

						{/* Privileges Grid */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
							{privileges.map((privilege, index) => (
								<div
									key={index}
									className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all group text-left"
									style={{
										animation: `fadeInUp 0.8s ease-out ${index * 0.1 + 0.3}s forwards`,
										opacity: 0
									}}
								>
									<div className="flex items-start gap-4">
										<div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
											<privilege.icon className="w-6 h-6 text-white" />
										</div>
										<div>
											<h3 className="font-bold text-white text-lg mb-2">
												{privilege.title}
											</h3>
											<p className="text-white/80 text-sm">
												{privilege.description}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>

						{/* Footer Info */}
						<div className="text-white/70 text-sm">
							<p className="mb-2">
								💡 <span className="font-semibold">Tip:</span> Gunakan menu di sidebar kiri untuk navigasi cepat ke berbagai modul sistem
							</p>
							<p className="text-xs text-white/50">
								Role: <span className="font-semibold text-white/70">Superadmin</span> • 
								Full Access • 
								System Administrator
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SuperadminDashboard;
