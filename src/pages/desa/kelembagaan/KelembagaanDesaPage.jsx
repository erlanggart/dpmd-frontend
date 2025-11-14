import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	getKelembagaanSummary,
	createKarangTaruna,
	createLpm,
	createSatlinmas,
	createPkk,
} from "../../../services/kelembagaan";
import {
	LuUsers,
	LuBuilding,
	LuHeart,
	LuShield,
	LuSprout,
	LuBuilding2,
	LuPlus,
	LuCheck,
	LuArrowRight,
} from "react-icons/lu";

const MainCard = ({
	title,
	onClick,
	icon: Icon,
	gradient,
	count,
	description,
}) => (
	<div
		className={`rounded-2xl p-6 shadow-lg bg-gradient-to-br ${gradient} border border-white/20 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105`}
		onClick={onClick}
	>
		<div className="flex items-center justify-between mb-4">
			<div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
				{Icon && <Icon className="w-8 h-8 text-white" />}
			</div>
			<LuArrowRight className="w-5 h-5 text-white/70" />
		</div>
		<div className="text-white">
			<h3 className="font-bold text-xl mb-1">{title}</h3>
			<div className="text-3xl font-bold mb-2">{count}</div>
			<p className="text-white/80 text-sm">{description}</p>
		</div>
	</div>
);

const SmallCard = ({
	title,
	subtitle,
	onClick,
	cta,
	onCta,
	icon,
	formed,
	gradient,
}) => {
	const IconComponent = icon;
	return (
		<div
			className={`rounded-xl p-4 shadow-md bg-gradient-to-r ${gradient} border border-white/10 hover:shadow-lg transition-all duration-300 ${
				onClick ? "cursor-pointer hover:scale-105" : ""
			}`}
			onClick={onClick}
		>
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center space-x-3">
					<div className="p-2 bg-white/20 rounded-lg">
						{IconComponent && <IconComponent className="w-5 h-5 text-white" />}
					</div>
					<h4 className="font-semibold text-white">{title}</h4>
				</div>
			{formed && <LuCheck className="w-5 h-5 text-green-300" />}
		</div>

		<div className="text-white/90 text-sm mb-3">{subtitle}</div>

		{cta && (
			<button
				className="w-full px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 backdrop-blur-sm"
				onClick={(e) => {
					e.stopPropagation();
					if (onCta) onCta();
				}}
			>
				<LuPlus className="w-4 h-4" />
				<span>{cta}</span>
			</button>
		)}
	</div>
	);
};export default function KelembagaanDesaPage() {
	const [summary, setSummary] = useState({
		rt: 0,
		rw: 0,
		posyandu: 0,
		karang_taruna: 0,
		lpm: 0,
		pkk: 0,
		satlinmas: 0,
		karang_taruna_formed: false,
		lpm_formed: false,
		satlinmas_formed: false,
		pkk_formed: false,
		total: 0,
	});
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				// Use lightweight summary endpoint - contains all data we need including formation status
				const summaryRes = await getKelembagaanSummary();

				if (!mounted) return;

				setSummary(
					summaryRes.data.data || {
						rt: 0,
						rw: 0,
						posyandu: 0,
						karang_taruna: 0,
						lpm: 0,
						pkk: 0,
						satlinmas: 0,
						karang_taruna_formed: false,
						lpm_formed: false,
						satlinmas_formed: false,
						pkk_formed: false,
						total: 0,
					}
				);
			} catch (e) {
				console.error(e);
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => (mounted = false);
	}, []);

	// Use formation status directly from summary
	const ktFormed = summary.karang_taruna_formed;
	const lpmFormed = summary.lpm_formed;
	const satlinmasFormed = summary.satlinmas_formed;
	const pkkFormed = summary.pkk_formed;

	const showSuccessAlert = (kelembagaanName) => {
		// Simple success notification - bisa diganti dengan SweetAlert2 jika sudah terinstall
		const alertDiv = document.createElement("div");
		alertDiv.className =
			"fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-pulse";
		alertDiv.innerHTML = `
			<div class="flex items-center space-x-2">
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
				</svg>
				<span><strong>Berhasil!</strong> ${kelembagaanName} telah berhasil dibentuk</span>
			</div>
		`;
		document.body.appendChild(alertDiv);

		setTimeout(() => {
			alertDiv.remove();
		}, 3000);
	};

	const handleOneClickForm = async (type) => {
		try {
			let kelembagaanName = "";
			if (type === "karang-taruna") {
				await createKarangTaruna({});
				kelembagaanName = "Karang Taruna";
			}
			if (type === "lpm") {
				await createLpm({});
				kelembagaanName = "LPM";
			}
			if (type === "satlinmas") {
				await createSatlinmas({});
				kelembagaanName = "Satlinmas";
			}
			if (type === "pkk") {
				await createPkk({});
				kelembagaanName = "PKK";
			}

			// Show success notification
			showSuccessAlert(kelembagaanName);

			// Refresh summary data after creating
			const summaryRes = await getKelembagaanSummary();
			setSummary(
				summaryRes.data.data || {
					rt: 0,
					rw: 0,
					posyandu: 0,
					karang_taruna: 0,
					lpm: 0,
					pkk: 0,
					satlinmas: 0,
					karang_taruna_formed: false,
					lpm_formed: false,
					satlinmas_formed: false,
					pkk_formed: false,
					total: 0,
				}
			);
		} catch (err) {
			console.error(err);
			// Error notification
			const alertDiv = document.createElement("div");
			alertDiv.className =
				"fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50";
			alertDiv.innerHTML = `
				<div class="flex items-center space-x-2">
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
					</svg>
					<span><strong>Gagal!</strong> Tidak dapat membentuk kelembagaan</span>
				</div>
			`;
			document.body.appendChild(alertDiv);

			setTimeout(() => {
				alertDiv.remove();
			}, 3000);
		}
	};

	if (loading) {
		return (
			<div className="p-4">
				<div className="animate-pulse text-gray-500">Memuat...</div>
			</div>
		);
	}

	return (
		<div className="rounded-md shadow-md p-6 space-y-6 bg-white min-h-screen">
			{/* Header */}
			<div className="text-center mb-8">
				<h1 className="text-4xl font-bold text-gray-800 mb-2">
					Kelembagaan Desa
				</h1>
				<p className="text-gray-600">Kelola semua kelembagaan di desa Anda</p>
			</div>

			{/* Main Cards Layout - RT/RW dan Posyandu dalam satu kolom */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
				{/* RT/RW Card */}
				<MainCard
					title="RT & RW"
					count={`${summary.rw} RW • ${summary.rt} RT`}
					description="Kelola Rukun Tetangga dan Rukun Warga"
					onClick={() => navigate("/desa/kelembagaan/rw")}
					icon={LuBuilding}
					gradient="from-blue-500 to-blue-600"
				/>

				{/* Posyandu Card */}
				<MainCard
					title="Posyandu"
					count={`${summary.posyandu} Posyandu`}
					description="Pos Pelayanan Terpadu masyarakat"
					onClick={() => navigate("/desa/kelembagaan/posyandu")}
					icon={LuHeart}
					gradient="from-pink-500 to-rose-500"
				/>
			</div>

			{/* Kelembagaan Lainnya - Row berjejer lebih kecil */}
			<div>
				<h2 className="text-xl font-semibold text-gray-800 mb-4">
					Kelembagaan Lainnya
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<SmallCard
						title="Satlinmas"
						subtitle={satlinmasFormed ? "Sudah terbentuk" : "Belum terbentuk"}
						onClick={
							satlinmasFormed
								? () => navigate("/desa/kelembagaan/satlinmas/detail")
								: undefined
						}
						cta={!satlinmasFormed ? "Bentuk Sekarang" : undefined}
						onCta={
							!satlinmasFormed
								? () => handleOneClickForm("satlinmas")
								: undefined
						}
						icon={LuShield}
						formed={satlinmasFormed}
						gradient="from-emerald-500 to-teal-500"
					/>

					<SmallCard
						title="Karang Taruna"
						subtitle={ktFormed ? "Sudah terbentuk" : "Belum terbentuk"}
						onClick={
							ktFormed
								? () => navigate("/desa/kelembagaan/karang-taruna/detail")
								: undefined
						}
						cta={!ktFormed ? "Bentuk Sekarang" : undefined}
						onCta={
							!ktFormed ? () => handleOneClickForm("karang-taruna") : undefined
						}
						icon={LuUsers}
						formed={ktFormed}
						gradient="from-orange-500 to-red-500"
					/>

					<SmallCard
						title="LPM"
						subtitle={lpmFormed ? "Sudah terbentuk" : "Belum terbentuk"}
						onClick={
							lpmFormed
								? () => navigate("/desa/kelembagaan/lpm/detail")
								: undefined
						}
						cta={!lpmFormed ? "Bentuk Sekarang" : undefined}
						onCta={!lpmFormed ? () => handleOneClickForm("lpm") : undefined}
						icon={LuBuilding2}
						formed={lpmFormed}
						gradient="from-purple-500 to-indigo-500"
					/>

					<SmallCard
						title="PKK"
						subtitle={pkkFormed ? "Sudah terbentuk" : "Belum terbentuk"}
						onClick={
							pkkFormed
								? () => navigate("/desa/kelembagaan/pkk/detail")
								: undefined
						}
						cta={!pkkFormed ? "Bentuk Sekarang" : undefined}
						onCta={!pkkFormed ? () => handleOneClickForm("pkk") : undefined}
						icon={LuSprout}
						formed={pkkFormed}
						gradient="from-green-500 to-emerald-500"
					/>
				</div>
			</div>
		</div>
	);
}
