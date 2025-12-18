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
	LuInfo,
	LuX,
	LuChevronDown,
	LuChevronUp,
	LuBookOpen,
	LuScale,
	LuFileText,
	LuDownload,
	LuExternalLink,
} from "react-icons/lu";

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, description, icon: Icon, gradient, loading }) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
			<div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full overflow-hidden animate-slideUp">
				{/* Header with Gradient */}
				<div className={`bg-gradient-to-r ${gradient} p-6 text-white`}>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							{Icon && (
								<div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
									<Icon className="w-6 h-6" />
								</div>
							)}
							<h3 className="text-xl font-bold">{title}</h3>
						</div>
						<button
							onClick={onClose}
							disabled={loading}
							className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
						>
							<LuX className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="p-6">
					<div className="space-y-4 mb-6">
						<div className="flex items-start space-x-3">
							<div className={`p-2 bg-gradient-to-br ${gradient} rounded-lg flex-shrink-0`}>
								<LuInfo className="w-5 h-5 text-white" />
							</div>
							<div className="flex-1 prose prose-sm max-w-none">
								<div className="text-gray-700 leading-relaxed space-y-3">
									{description.split('\n\n').map((paragraph, idx) => {
										// Check if paragraph contains numbered list (1., 2., etc)
										if (/^\d+\./.test(paragraph.trim())) {
											const items = paragraph.split('\n').filter(item => item.trim());
											return (
												<ol key={idx} className="list-decimal list-inside space-y-2 bg-gray-50 p-4 rounded-lg">
													{items.map((item, itemIdx) => (
														<li key={itemIdx} className="text-gray-700">
															{item.replace(/^\d+\.\s*/, '')}
														</li>
													))}
												</ol>
											);
										}
										// Check if paragraph contains lettered list (a., b., etc)
										else if (/^[a-z]\./.test(paragraph.trim())) {
											const items = paragraph.split('\n').filter(item => item.trim());
											return (
												<ol key={idx} className="list-[lower-alpha] list-inside space-y-2 bg-gray-50 p-4 rounded-lg">
													{items.map((item, itemIdx) => (
														<li key={itemIdx} className="text-gray-700 ml-4">
															{item.replace(/^[a-z]\.\s*/, '')}
														</li>
													))}
												</ol>
											);
										}
										// Regular paragraph
										else if (paragraph.trim()) {
											return (
												<p key={idx} className="text-gray-700">
													{paragraph}
												</p>
											);
										}
										return null;
									})}
								</div>
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex space-x-3">
						<button
							onClick={onClose}
							disabled={loading}
							className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Batal
						</button>
						<button
							onClick={onConfirm}
							disabled={loading}
							className={`flex-1 px-4 py-3 bg-gradient-to-r ${gradient} text-white rounded-xl hover:shadow-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
						>
							{loading ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
									<span>Memproses...</span>
								</>
							) : (
								<>
									<LuCheck className="w-5 h-5" />
									<span>Oke, Bentuk</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

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
		desa_nama: null,
		status_pemerintahan: 'desa', // Add status_pemerintahan
	});
	const [loading, setLoading] = useState(true);
	const [modalConfig, setModalConfig] = useState({
		isOpen: false,
		type: null,
		title: '',
		description: '',
		icon: null,
		gradient: '',
	});
	const [creatingLembaga, setCreatingLembaga] = useState(false);
	const navigate = useNavigate();
	
	// Get desa name and status from summary
	const desaName = summary.desa_nama || "Desa";
	const statusPemerintahan = summary.status_pemerintahan || 'desa';
	const wilayahLabel = statusPemerintahan === 'kelurahan' ? 'Kelurahan' : 'Desa';
	
	// Konfigurasi keterangan untuk setiap lembaga
	// TODO: Isi keterangan sesuai dengan kebutuhan masing-masing lembaga
	const lembagaDescriptions = {
		'satlinmas': `Satuan Pelindungan Masyarakat yang selanjutnya disebut Satlinmas adalah organisasi yang beranggotakan unsur masyarakat yang berada di kelurahan dan/atau desa dibentuk oleh lurah dan/atau kepala desa untuk melaksanakan Linmas.

			1.	Kepala Desa/Lurah membentuk Satlinmas di Desa/Kelurahan.
			2. Pembentukan Satlinmas di Desa sebagaimana dimaksud pada poin (1), ditetapkan dengan keputusan Kepala Desa

			Apakah Anda yakin ingin membentuk Satlinmas ${wilayahLabel} ${desaName}?`,
		
		'karang-taruna': `Karang Taruna adalah organisasi kepemudaan di Indonesia sebagai wadah pembinaan dan pengembangan generasi muda.

			Karang Taruna adalah Lembaga Kemasyarakatan yang merupakan wadah pengembangan generasi muda yang tumbuh dan berkembang atas dasar kesadaran dan rasa tanggung jawab sosial dari, oleh dan untuk masyarakat terutama generasi muda di Desa/Kelurahan dan terutama bergerak di bidang usaha kesejahteraan sosial.

			Pembentukan Karang Taruna diatur dengan tata cara sebagai berikut :

			a. Karang Taruna dibentuk melalui musyawarah yang difasilitasi Kepala Desa/Lurah, dan dihadiri tokoh masyarakat dan pengurus Karang Taruna Kecamatan.
			b. Hasil musyawarah sebagaimana dimaksud pada huruf a dituangkan dalam berita acara dan disampaikan kepada Kepala Desa/Lurah untuk mendapatkan penetapan.

A			pakah Anda yakin ingin membentuk Karang Taruna ${wilayahLabel} ${desaName}?`,
		
		'lpm': `Lembaga Pemberdayaan Masyarakat (LPM) adalah lembaga yang bertugas menyusun rencana pembangunan secara partisipatif.

			Lembaga Pemberdayaan Masyarakat Desa/Kelurahan yang selanjutnya disingkat LPMD/LPMK adalah lembaga kemasyarakatan yang dibentuk atas prakarsa masyarakat untuk membantu Pemerintah Desa/Kelurahan dalam menampung aspirasi masyarakat, merencanakan dan melaksanakan pembangunan, serta menumbuhkembangkan swadaya masyarakat dalam pembangunan.

			Pembentukan LPMD/LPMK diatur dengan tata cara sebagai berikut :

			a. LPMD dibentuk melalui musyawarah oleh Kepala Desa, BPD dan tokoh masyarakat.
			b. LPMK dibentuk melalui musyawarah oleh Lurah bersama tokoh masyarakat.
			c. Pembentukan LPMD dan LPMK sebagaimana dimaksud pada huruf a dan huruf b dihadiri oleh pejabat.
			d. Hasil musyawarah sebagaimana dimaksud pada huruf a dan huruf b dituangkan dalam berita acara dan disampaikan kepada Kepala Desa/Lurah untuk mendapat penetapan.

			Apakah Anda yakin ingin membentuk LPM ${wilayahLabel} ${desaName}?`,
		
		'pkk': `Pemberdayaan Kesejahteraan Keluarga (PKK) adalah organisasi kemasyarakatan yang memberdayakan wanita untuk turut berpartisipasi dalam pembangunan Indonesia.

			Tim Penggerak Pemberdayaan dan Kesejahteraan Keluarga Desa/Kelurahan yang selanjutnya disebut TP PKK Desa/Kelurahan adalah lembaga kemasyarakatan sebagai mitra erja Pemerintah dan Organisasi Kemasyarakatan lainnya, yang berfungsi sebagai fasilitator, perencana, pelaksana, pengendali dan penggerak pada masing-masing jenjang pemerintahan untuk terlaksananya program PKK.

			Pembentukan Tim Penggerak PKK diatur dengan tata cara sebagai berikut :

			a. TP PKK dibentuk melalui musyawarah yang difasilitasi Kepala Desa/Lurah, dan dihadiri tokoh masyarakat, Kader dan dihadiri oleh TP PKK Kecamatan.
			b. Hasil musyawarah sebagaimana dimaksud pada huruf a dituangkan dalam berita acara dan disampaikan kepada Kepala Desa/Lurah untuk mendapatkan penetapan.

			Apakah Anda yakin ingin membentuk PKK ${wilayahLabel} ${desaName}?`,
	};

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				// Use lightweight summary endpoint - contains all data we need including formation status
				const summaryRes = await getKelembagaanSummary();

				if (!mounted) return;

				const data = summaryRes.data.data || {};
				
				// Map backend field names to frontend expected names
				setSummary({
					rt: data.rt || 0,
					rw: data.rw || 0,
					posyandu: data.posyandu || 0,
					karang_taruna: data.karang_taruna || 0,
					lpm: data.lpm || 0,
					pkk: data.pkk || 0,
					satlinmas: data.satlinmas || 0,
					// Backend uses has_* format, map to *_formed
					karang_taruna_formed: data.has_karang_taruna || false,
					lpm_formed: data.has_lpm || false,
					satlinmas_formed: data.has_satlinmas || false,
					pkk_formed: data.has_pkk || false,
					total: data.total || 0,
					desa_nama: data.desa_nama || null,
					status_pemerintahan: data.status_pemerintahan || 'desa',
				});
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

	// Fungsi untuk membuka modal konfirmasi
	const handleOpenModal = (type) => {
		const configs = {
			'satlinmas': {
				title: 'Bentuk Satlinmas',
				icon: LuShield,
				gradient: 'from-emerald-500 to-teal-500',
			},
			'karang-taruna': {
				title: 'Bentuk Karang Taruna',
				icon: LuUsers,
				gradient: 'from-orange-500 to-red-500',
			},
			'lpm': {
				title: 'Bentuk LPM',
				icon: LuBuilding2,
				gradient: 'from-yellow-500 to-orange-500',
			},
			'pkk': {
				title: 'Bentuk PKK',
				icon: LuSprout,
				gradient: 'from-pink-500 to-rose-500',
			},
		};

		const config = configs[type];
		if (config) {
			setModalConfig({
				isOpen: true,
				type: type,
				title: config.title,
				description: lembagaDescriptions[type],
				icon: config.icon,
				gradient: config.gradient,
			});
		}
	};

	// Fungsi untuk menutup modal
	const handleCloseModal = () => {
		if (!creatingLembaga) {
			setModalConfig({
				isOpen: false,
				type: null,
				title: '',
				description: '',
				icon: null,
				gradient: '',
			});
		}
	};

	// Fungsi untuk create lembaga setelah konfirmasi
	const handleConfirmCreate = async () => {
		const type = modalConfig.type;
		if (!type) return;

		setCreatingLembaga(true);
		try {
			let kelembagaanName = "";
			let fullName = "";
			
			// Use else if to ensure only one is set
			if (type === "karang-taruna") {
				kelembagaanName = "Karang Taruna";
				fullName = `Karang Taruna ${wilayahLabel} ${desaName}`;
				await createKarangTaruna({ nama: fullName });
			} else if (type === "lpm") {
				kelembagaanName = "LPM";
				fullName = `LPM ${wilayahLabel} ${desaName}`;
				await createLpm({ nama: fullName });
			} else if (type === "satlinmas") {
				kelembagaanName = "Satlinmas";
				fullName = `Satlinmas ${wilayahLabel} ${desaName}`;
				await createSatlinmas({ nama: fullName });
			} else if (type === "pkk") {
				kelembagaanName = "PKK";
				fullName = `PKK ${wilayahLabel} ${desaName}`;
				await createPkk({ nama: fullName });
			}

			// Close modal
			handleCloseModal();

			// Show success notification
			showSuccessAlert(kelembagaanName);

			// Refresh summary data after creating
			const summaryRes = await getKelembagaanSummary();
			const data = summaryRes.data.data || {};
			
			setSummary({
				rt: data.rt || 0,
				rw: data.rw || 0,
				posyandu: data.posyandu || 0,
				karang_taruna: data.karang_taruna || 0,
				lpm: data.lpm || 0,
				pkk: data.pkk || 0,
				satlinmas: data.satlinmas || 0,
				karang_taruna_formed: data.has_karang_taruna || false,
				lpm_formed: data.has_lpm || false,
				satlinmas_formed: data.has_satlinmas || false,
				pkk_formed: data.has_pkk || false,
				total: data.total || 0,
				desa_nama: data.desa_nama || null,
				status_pemerintahan: data.status_pemerintahan || 'desa',
			});
		} catch (err) {
			console.error(err);
			
			// Close modal on error
			handleCloseModal();
			
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
		} finally {
			setCreatingLembaga(false);
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
		<div className="min-h-screen space-y-4" >
			{/* Header */}
			<div className="bg-white rounded-md shadow-md p-6 text-center">
				<h1 className="text-4xl font-bold text-gray-800 mb-2">
					Kelembagaan Desa
				</h1>
				<p className="text-gray-600">Kelola semua kelembagaan di desa Anda</p>
			</div>

			{/* Info Section - Tentang Lembaga Kemasyarakatan Desa */}
			<div className="mb-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-200 shadow-md overflow-hidden">
				<div className="p-6">
					<div className="flex items-start space-x-4 mb-4">
						<div className="p-3 bg-blue-500 rounded-xl flex-shrink-0">
							<LuInfo className="w-6 h-6 text-white" />
						</div>
						<div>
							<h3 className="text-xl font-bold text-blue-900 mb-2">
								Tentang Lembaga Kemasyarakatan Desa
							</h3>
							<p className="text-gray-700 leading-relaxed mb-4">
								Lembaga Kemasyarakatan Desa (LKD) adalah organisasi yang dibentuk oleh Pemerintah Desa bersama masyarakat untuk membantu tugas-tugas pemerintahan dan pembangunan desa. 
								LKD bekerja secara partisipatif dalam meningkatkan kesejahteraan masyarakat desa.
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						{/* Tugas Utama */}
						<div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
							<h4 className="font-semibold text-blue-900 mb-3 flex items-center">
								<LuCheck className="w-5 h-5 mr-2 text-green-600" />
								Tugas Utama LKD
							</h4>
							<ul className="space-y-2 text-sm text-gray-700">
								<li className="flex items-start">
									<span className="text-blue-500 mr-2">•</span>
									<span>Memberdayakan masyarakat desa dalam berbagai bidang</span>
								</li>
								<li className="flex items-start">
									<span className="text-blue-500 mr-2">•</span>
									<span>Ikut serta dalam perencanaan dan pelaksanaan pembangunan</span>
								</li>
								<li className="flex items-start">
									<span className="text-blue-500 mr-2">•</span>
									<span>Meningkatkan pelayanan kepada masyarakat desa</span>
								</li>
								<li className="flex items-start">
									<span className="text-blue-500 mr-2">•</span>
									<span>Menampung dan menyalurkan aspirasi masyarakat</span>
								</li>
							</ul>
						</div>

						{/* Jenis LKD */}
						<div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
							<h4 className="font-semibold text-blue-900 mb-3 flex items-center">
								<LuUsers className="w-5 h-5 mr-2 text-indigo-600" />
								Jenis Lembaga Wajib
							</h4>
							<ul className="space-y-2 text-sm text-gray-700">
								<li className="flex items-start">
									<span className="text-indigo-500 mr-2">•</span>
									<span><strong>RT & RW</strong> - Membantu pelayanan pemerintahan dan data kependudukan</span>
								</li>
								<li className="flex items-start">
									<span className="text-indigo-500 mr-2">•</span>
									<span><strong>PKK</strong> - Pemberdayaan kesejahteraan keluarga</span>
								</li>
								<li className="flex items-start">
									<span className="text-indigo-500 mr-2">•</span>
									<span><strong>Karang Taruna</strong> - Pengembangan generasi muda dan kesejahteraan sosial</span>
								</li>
								<li className="flex items-start">
									<span className="text-indigo-500 mr-2">•</span>
									<span><strong>Posyandu</strong> - Peningkatan pelayanan kesehatan masyarakat</span>
								</li>
								<li className="flex items-start">
									<span className="text-indigo-500 mr-2">•</span>
									<span><strong>LPM</strong> - Perencanaan pembangunan dan swadaya gotong-royong</span>
								</li>
							</ul>
						</div>
					</div>

					{/* Persyaratan Pembentukan */}
					<div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
						<h4 className="font-semibold text-amber-900 mb-3 flex items-center">
							<LuBuilding2 className="w-5 h-5 mr-2" />
							Persyaratan Pembentukan
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
								<span>Berasaskan Pancasila dan UUD 1945</span>
							</div>
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
								<span>Bermanfaat bagi masyarakat desa</span>
							</div>
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
								<span>Memiliki kepengurusan tetap</span>
							</div>
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
								<span>Memiliki sekretariat tetap</span>
							</div>
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
								<span>Tidak berafiliasi partai politik</span>
							</div>
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
								<span>Ditetapkan dengan Peraturan Desa</span>
							</div>
						</div>
					</div>

					{/* Info Pengurus */}
					<div className="mt-4 flex items-start space-x-2 bg-blue-100 rounded-lg p-3">
						<LuInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-blue-800">
							<p className="font-medium mb-1">Ketentuan Pengurus:</p>
							<p>Pengurus LKD menjabat selama <strong>5 tahun</strong> dan dapat dipilih kembali maksimal <strong>2 kali masa jabatan</strong>. Pengurus tidak boleh merangkap jabatan di LKD lain atau menjadi anggota partai politik.</p>
						</div>
					</div>
				</div>
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
					gradient="from-purple-500 to-purple-700"
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
								? () => handleOpenModal("satlinmas")
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
							!ktFormed ? () => handleOpenModal("karang-taruna") : undefined
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
						onCta={!lpmFormed ? () => handleOpenModal("lpm") : undefined}
						icon={LuBuilding2}
						formed={lpmFormed}
						gradient="from-yellow-500 to-orange-500"
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
						onCta={!pkkFormed ? () => handleOpenModal("pkk") : undefined}
						icon={LuSprout}
						formed={pkkFormed}
						gradient="from-pink-500 to-rose-500"
					/>
				</div>
			</div>

			{/* Ketentuan Hukum Accordion Section */}
			<div className="mt-12">
				<div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-t-2xl p-6">
					<div className="flex items-center space-x-3">
						<div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
							<LuScale className="w-6 h-6 text-white" />
						</div>
						<div>
							<h2 className="text-2xl font-bold text-white">Ketentuan Hukum</h2>
							<p className="text-slate-200 text-sm mt-1">Lembaga Kemasyarakatan Desa</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-b-2xl shadow-lg border border-slate-200 overflow-hidden">
					<AccordionSection
						title="Pembentukan dan Penetapan"
						icon={LuBookOpen}
						color="blue"
					>
						<div className="space-y-4">
							<p className="font-bold text-slate-900 mb-3">Pasal 3</p>
							<div>
								<p className="font-medium text-slate-800 mb-2">(1) LKD dibentuk atas prakarsa Pemerintah Desa dan masyarakat.</p>
							</div>
							<div>
								<p className="font-medium text-slate-800 mb-2">(2) Pembentukan LKD sebagaimana dimaksud pada ayat (1) dengan memenuhi persyaratan:</p>
								<div className="ml-4 space-y-2">
									<div className="flex items-start">
										<span className="font-semibold text-blue-600 mr-2 flex-shrink-0">a.</span>
										<span className="text-slate-700">berasaskan Pancasila dan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-blue-600 mr-2 flex-shrink-0">b.</span>
										<span className="text-slate-700">berkedudukan di Desa setempat;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-blue-600 mr-2 flex-shrink-0">c.</span>
										<span className="text-slate-700">keberadaannya bermanfaat dan dibutuhkan masyarakat Desa;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-blue-600 mr-2 flex-shrink-0">d.</span>
										<span className="text-slate-700">memiliki kepengurusan yang tetap;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-blue-600 mr-2 flex-shrink-0">e.</span>
										<span className="text-slate-700">memiliki sekretariat yang bersifat tetap; dan</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-blue-600 mr-2 flex-shrink-0">f.</span>
										<span className="text-slate-700">tidak berafiliasi kepada partai politik.</span>
									</div>
								</div>
							</div>
							<div>
								<p className="font-medium text-slate-800">(3) Ketentuan lebih lanjut mengenai Pembentukan LKD sebagaimana dimaksud pada ayat (1) diatur dengan Peraturan Desa</p>
							</div>
						</div>
					</AccordionSection>

					<AccordionSection
						title="Tugas dan Fungsi"
						icon={LuBookOpen}
						color="indigo"
					>
						<div className="space-y-6">
							{/* Pasal 4 - Tugas */}
							<div>
								<p className="font-bold text-slate-900 mb-3">Pasal 4</p>
								<div className="space-y-3">
									<div>
										<p className="font-medium text-slate-800 mb-2">(1) LKD bertugas:</p>
										<div className="ml-4 space-y-2">
											<div className="flex items-start">
												<span className="font-semibold text-indigo-600 mr-2 flex-shrink-0">a.</span>
												<span className="text-slate-700">melakukan pemberdayaan masyarakat Desa;</span>
											</div>
											<div className="flex items-start">
												<span className="font-semibold text-indigo-600 mr-2 flex-shrink-0">b.</span>
												<span className="text-slate-700">ikut serta dalam perencanaan dan pelaksanaan pembangunan; dan</span>
											</div>
											<div className="flex items-start">
												<span className="font-semibold text-indigo-600 mr-2 flex-shrink-0">c.</span>
												<span className="text-slate-700">meningkatkan pelayanan masyarakat Desa.</span>
											</div>
										</div>
									</div>
									<div>
										<p className="font-medium text-slate-800">(2) Dalam melaksanakan tugas sebagaimana dimaksud pada ayat (1) huruf b, LKD mengusulkan program dan kegiatan kepada Pemerintah Desa.</p>
									</div>
								</div>
							</div>

							{/* Fungsi */}
							<div className="pt-4 border-t border-slate-200">
								<p className="font-bold text-slate-900 mb-3">Pasal 5</p>
								<p className="font-medium text-slate-800 mb-2">Dalam melaksanakan tugas sebagaimana dimaksud dalam Pasal 4, LKD memiliki fungsi:</p>
								<div className="ml-4 space-y-2">
									<div className="flex items-start">
										<span className="font-semibold text-indigo-600 mr-2 flex-shrink-0">a.</span>
										<span className="text-slate-700">menampung dan menyalurkan aspirasi masyarakat;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-indigo-600 mr-2 flex-shrink-0">b.</span>
										<span className="text-slate-700">menanamkan dan memupuk rasa persatuan dan kesatuan masyarakat;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-indigo-600 mr-2 flex-shrink-0">c.</span>
										<span className="text-slate-700">meningkatkan kualitas dan mempercepat pelayanan Pemerintah Desa kepada masyarakat Desa;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-indigo-600 mr-2 flex-shrink-0">d.</span>
										<span className="text-slate-700">menyusun rencana, melaksanakan, mengendalikan, melestarikan, dan mengembangkan hasil pembangunan secara partisipatif;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-indigo-600 mr-2 flex-shrink-0">e.</span>
										<span className="text-slate-700">menumbuhkan, mengembangkan, dan menggerakkan prakarsa, partisipasi, swadaya, serta gotong royong masyarakat;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-indigo-600 mr-2 flex-shrink-0">f.</span>
										<span className="text-slate-700">meningkatkan kesejahteraan keluarga; dan</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-indigo-600 mr-2 flex-shrink-0">g.</span>
										<span className="text-slate-700">meningkatkan kualitas sumber daya manusia.</span>
									</div>
								</div>
							</div>
						</div>
					</AccordionSection>

					<AccordionSection
						title="Jenis Lembaga Kemasyarakatan Desa"
						icon={LuBookOpen}
						color="purple"
					>
						<div className="space-y-4">
							<div>
								<p className="font-bold text-slate-900 mb-3">Pasal 6</p>
								<p className="font-medium text-slate-800 mb-2">(1) Jenis LKD paling sedikit meliputi:</p>
								<div className="ml-4 space-y-2">
									<div className="flex items-start">
										<span className="font-semibold text-purple-600 mr-2 flex-shrink-0">a.</span>
										<span className="text-slate-700">Rukun Tetangga;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-purple-600 mr-2 flex-shrink-0">b.</span>
										<span className="text-slate-700">Rukun Warga;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-purple-600 mr-2 flex-shrink-0">c.</span>
										<span className="text-slate-700">Pemberdayaan Kesejahteraan Keluarga;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-purple-600 mr-2 flex-shrink-0">d.</span>
										<span className="text-slate-700">Karang Taruna;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-purple-600 mr-2 flex-shrink-0">e.</span>
										<span className="text-slate-700">Pos Pelayanan Terpadu; dan</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-purple-600 mr-2 flex-shrink-0">f.</span>
										<span className="text-slate-700">Lembaga Pemberdayaan Masyarakat.</span>
									</div>
								</div>
							</div>
							<div>
								<p className="font-medium text-slate-800">(2) Pemerintah Desa dan masyarakat Desa dapat membentuk LKD selain sebagaimana dimaksud pada ayat (1) sesuai dengan perkembangan dan kebutuhan.</p>
							</div>
							<div>
								<p className="font-medium text-slate-800">(3) Ketentuan lebih lanjut mengenai jenis LKD sebagaimana dimaksud pada ayat (1) ditetapkan dalam Peraturan Desa.</p>
							</div>
						</div>
					</AccordionSection>

					<AccordionSection
						title="Tugas Spesifik Setiap Jenis LKD"
						icon={LuBookOpen}
						color="emerald"
					>
						<div className="space-y-6">
							{/* RT dan RW */}
							<div>
								<p className="font-bold text-slate-900 mb-3">Pasal 7</p>
								<p className="font-medium text-slate-800 mb-2">(1) Rukun Tetangga dan Rukun Warga sebagaimana dimaksud dalam Pasal 6 ayat (1) huruf a dan huruf b bertugas:</p>
								<div className="ml-4 space-y-2">
									<div className="flex items-start">
										<span className="font-semibold text-emerald-600 mr-2 flex-shrink-0">a.</span>
										<span className="text-slate-700">membantu Kepala Desa dalam bidang pelayanan pemerintahan;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-emerald-600 mr-2 flex-shrink-0">b.</span>
										<span className="text-slate-700">membantu Kepala Desa dalam menyediakan data kependudukan dan perizinan; dan</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-emerald-600 mr-2 flex-shrink-0">c.</span>
										<span className="text-slate-700">melaksanakan tugas lain yang diberikan oleh Kepala Desa.</span>
									</div>
								</div>
							</div>

							{/* PKK */}
							<div className="pt-4 border-t border-slate-200">
								<p className="font-medium text-slate-800 mb-2">(2) Pemberdayaan Kesejahteraan Keluarga sebagaimana dimaksud dalam Pasal 6 ayat (1) huruf c, bertugas membantu Kepala Desa dalam melaksanakan pemberdayaan kesejahteraan keluarga.</p>
							</div>

							{/* Karang Taruna */}
							<div className="pt-4 border-t border-slate-200">
								<p className="font-medium text-slate-800 mb-2">(3) Karang Taruna sebagaimana dimaksud dalam Pasal 6 ayat (1) huruf d, bertugas membantu Kepala Desa dalam menanggulangi masalah kesejahteraan sosial dan pengembangan generasi muda.</p>
							</div>

							{/* Posyandu */}
							<div className="pt-4 border-t border-slate-200">
								<p className="font-medium text-slate-800 mb-2">(4) Pos Pelayanan Terpadu sebagaimana dimaksud dalam Pasal 6 ayat (1) huruf e bertugas membantu Kepala Desa dalam peningkatan pelayanan kesehatan masyarakat Desa.</p>
							</div>

							{/* LPM */}
							<div className="pt-4 border-t border-slate-200">
								<p className="font-medium text-slate-800 mb-2">(5) Lembaga Pemberdayaan Masyarakat sebagaimana dimaksud dalam Pasal 6 ayat (1) huruf f, bertugas membantu Kepala Desa dalam menyerap aspirasi masyarakat terkait perencanaan pembangunan desa dan menggerakkan masyarakat dalam pelaksanaan pembangunan desa dengan swadaya gotong-royong.</p>
							</div>
						</div>
					</AccordionSection>

					<AccordionSection
						title="Kepengurusan"
						icon={LuBookOpen}
						color="amber"
					>
						<div className="space-y-4">
							<div>
								<p className="font-bold text-slate-900 mb-3">Pasal 8</p>
								<p className="font-medium text-slate-800 mb-2">(1) Pengurus LKD terdiri atas:</p>
								<div className="ml-4 space-y-2">
									<div className="flex items-start">
										<span className="font-semibold text-amber-600 mr-2 flex-shrink-0">a.</span>
										<span className="text-slate-700">ketua;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-amber-600 mr-2 flex-shrink-0">b.</span>
										<span className="text-slate-700">sekretaris;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-amber-600 mr-2 flex-shrink-0">c.</span>
										<span className="text-slate-700">bendahara; dan</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-amber-600 mr-2 flex-shrink-0">d.</span>
										<span className="text-slate-700">bidang sesuai dengan kebutuhan.</span>
									</div>
								</div>
							</div>
							<div>
								<p className="font-medium text-slate-800">(2) Ketentuan lebih lanjut mengenai pengurus LKD sebagaimana dimaksud pada ayat (1) ditetapkan dengan Keputusan Kepala Desa.</p>
							</div>
							<div>
								<p className="font-medium text-slate-800">(3) Pengurus LKD sebagaimana dimaksud pada ayat (1) memegang jabatan selama <span className="font-bold text-amber-700">5 (lima) tahun</span> terhitung sejak tanggal ditetapkan.</p>
							</div>
							<div>
								<p className="font-medium text-slate-800">(4) Pengurus LKD sebagaimana dimaksud pada ayat (1) dapat menjabat paling banyak <span className="font-bold text-amber-700">2 (dua) kali masa jabatan</span> secara berturut-turut atau tidak secara berturut-turut.</p>
							</div>
							<div>
								<p className="font-medium text-slate-800">(5) Pengurus LKD <span className="font-bold text-red-600">dilarang merangkap jabatan</span> pada LKD lainnya dan <span className="font-bold text-red-600">dilarang menjadi anggota</span> salah satu partai politik.</p>
							</div>
						</div>
					</AccordionSection>
				</div>
			</div>

			{/* Dokumen Peraturan Section */}
			<div className="mt-12">
				<div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-t-2xl p-6">
					<div className="flex items-center space-x-3">
						<div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
							<LuFileText className="w-6 h-6 text-white" />
						</div>
						<div>
							<h2 className="text-2xl font-bold text-white">Dokumen Peraturan</h2>
							<p className="text-blue-200 text-sm mt-1">Unduh peraturan terkait Lembaga Kemasyarakatan Desa</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-b-2xl shadow-lg border border-slate-200 p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{/* Permendagri 18/2018 */}
						<PeraturanCard
							title="Permendagri No. 18 Tahun 2018"
							description="Peraturan Menteri Dalam Negeri Nomor 18 Tahun 2018 tentang Lembaga Kemasyarakatan Desa dan Lembaga Adat Desa"
							fileUrl="/peraturan/Permendagri No. 18 Tahun 2018.pdf"
							color="emerald"
						/>

							{/* Permendagri 26/2020 - Linmas */}
						<PeraturanCard
							title="Permendagri No. 26 Tahun 2020"
							description="Permendagri Nomor 26 Tahun 2020 tentang Penyelenggaraan Ketertiban Umum dan Ketenteraman Masyarakat serta Pelindungan Masyarakat (Tibum Tranmas)"
							fileUrl="/peraturan/Permendagri-26-Thn-2020-ttg-Linmas.pdf"
							color="amber"
						/>

						{/* Permendagri 36/2020 */}
						<PeraturanCard
							title="Permendagri No. 36 Tahun 2020"
							description="Peraturan Menteri Dalam Negeri tentang Peraturan Pelaksanaan Peraturan Presiden Nomor 99 Tahun 2017 tentang Gerakan Pemberdayaan dan Kesejahteraan Keluarga (Gerakan PKK)"
							fileUrl="/peraturan/PERMENDAGRI_36_TAHUN_2020 (1).pdf"
							color="blue"
						/>						

						{/* Permendagri 11/2023 */}
						<PeraturanCard
							title="Permendagri No. 11 Tahun 2023"
							description="Peraturan Menteri Dalam Negeri No. 11 Tahun 2023 adalah Peraturan Menteri Dalam Negeri tentang
Sarana dan Prasarana bagi Satuan Tugas (Satgas) Linmas dan Satuan Perlindungan Masyarakat (Satlinmas)"
							fileUrl="/peraturan/Permendagri Nomor 11 Tahun 2023.pdf"
							color="teal"
						/>

						{/* Permendagri 13/2024 */}
						<PeraturanCard
							title="Permendagri No. 13 Tahun 2024"
							description="Permendagri Nomor 13 Tahun 2024 adalah peraturan Menteri Dalam Negeri tentang
Pos Pelayanan Terpadu (Posyandu)"
							fileUrl="/peraturan/Permendagri No 13 Tahun 2024.pdf"
							color="purple"
						/>

						{/* Perda 9/2011 */}
						<PeraturanCard
							title="Perda No. 9 Tahun 2011"
							description="Peraturan Daerah Kabupaten Bogor Nomor 9 Tahun 2011 Tentang Lembaga Kemasyarakatan di Desa dan Kelurahan"
							fileUrl="/peraturan/perda no 9 tahun 2011.pdf"
							color="rose"
						/>

						{/* Perbup 31/2012 */}
						<PeraturanCard
							title="Perbup No. 31 Tahun 2012"
							description="Peraturan Bupati Bogor Nomor 31 Tahun 2012 Tentang Tata Cara Pembentukan, Pengangkatan Dan Pemberhentian Pengurus Lembaga Pemberdayaan Masyarakat Desa/Kelurahan, Rukun Warga Dan Rukun Tetangga"
							fileUrl="/peraturan/Perbup 31 Tahun 2012 - Tata Cara Pembentukan LPM Desa, Kel, RW dan RT.pdf"
							color="indigo"
						/>
					</div>
				</div>
			</div>

			{/* Confirmation Modal */}
			<ConfirmationModal
				isOpen={modalConfig.isOpen}
				onClose={handleCloseModal}
				onConfirm={handleConfirmCreate}
				title={modalConfig.title}
				description={modalConfig.description}
				icon={modalConfig.icon}
				gradient={modalConfig.gradient}
				loading={creatingLembaga}
			/>
		</div>
	);
}

// Peraturan Card Component
function PeraturanCard({ title, description, fileUrl, color = "blue" }) {
	const colorClasses = {
		blue: {
			bg: 'from-blue-500 to-blue-600',
			border: 'border-blue-200',
			hover: 'hover:shadow-blue-200',
			icon: 'text-blue-600',
		},
		indigo: {
			bg: 'from-indigo-500 to-indigo-600',
			border: 'border-indigo-200',
			hover: 'hover:shadow-indigo-200',
			icon: 'text-indigo-600',
		},
		purple: {
			bg: 'from-purple-500 to-purple-600',
			border: 'border-purple-200',
			hover: 'hover:shadow-purple-200',
			icon: 'text-purple-600',
		},
		emerald: {
			bg: 'from-emerald-500 to-emerald-600',
			border: 'border-emerald-200',
			hover: 'hover:shadow-emerald-200',
			icon: 'text-emerald-600',
		},
		teal: {
			bg: 'from-teal-500 to-teal-600',
			border: 'border-teal-200',
			hover: 'hover:shadow-teal-200',
			icon: 'text-teal-600',
		},
		amber: {
			bg: 'from-amber-500 to-amber-600',
			border: 'border-amber-200',
			hover: 'hover:shadow-amber-200',
			icon: 'text-amber-600',
		},
		rose: {
			bg: 'from-rose-500 to-rose-600',
			border: 'border-rose-200',
			hover: 'hover:shadow-rose-200',
			icon: 'text-rose-600',
		},
	};

	const classes = colorClasses[color] || colorClasses.blue;

	return (
		<div className={`bg-white rounded-xl border-2 ${classes.border} ${classes.hover} hover:shadow-lg transition-all duration-300 overflow-hidden group flex flex-col h-full`}>
			<div className={`bg-gradient-to-r ${classes.bg} p-4`}>
				<div className="flex items-center space-x-3">
					<div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
						<LuFileText className="w-5 h-5 text-white" />
					</div>
					<h4 className="font-bold text-white text-sm">{title}</h4>
				</div>
			</div>
			<div className="p-4 flex flex-col flex-grow">
				<p className="text-sm text-gray-600 mb-4 flex-grow">{description}</p>
				<div className="flex space-x-2 mt-auto">
					<a
						href={fileUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-gradient-to-r ${classes.bg} text-white rounded-lg hover:shadow-md transition-all text-sm font-medium`}
					>
						<LuExternalLink className="w-4 h-4" />
						<span>Buka</span>
					</a>
					<a
						href={fileUrl}
						download
						className="flex items-center justify-center px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
						title="Unduh"
					>
						<LuDownload className="w-4 h-4" />
					</a>
				</div>
			</div>
		</div>
	);
}

// Accordion Section Component
function AccordionSection({ title, children, icon: Icon, color = "blue" }) {
	const [isOpen, setIsOpen] = useState(false);

	const colorClasses = {
		blue: {
			border: 'border-blue-200',
			bg: 'bg-blue-50',
			hover: 'hover:bg-blue-100',
			text: 'text-blue-700',
			icon: 'text-blue-600',
		},
		indigo: {
			border: 'border-indigo-200',
			bg: 'bg-indigo-50',
			hover: 'hover:bg-indigo-100',
			text: 'text-indigo-700',
			icon: 'text-indigo-600',
		},
		purple: {
			border: 'border-purple-200',
			bg: 'bg-purple-50',
			hover: 'hover:bg-purple-100',
			text: 'text-purple-700',
			icon: 'text-purple-600',
		},
		emerald: {
			border: 'border-emerald-200',
			bg: 'bg-emerald-50',
			hover: 'hover:bg-emerald-100',
			text: 'text-emerald-700',
			icon: 'text-emerald-600',
		},
		amber: {
			border: 'border-amber-200',
			bg: 'bg-amber-50',
			hover: 'hover:bg-amber-100',
			text: 'text-amber-700',
			icon: 'text-amber-600',
		},
	};

	const classes = colorClasses[color] || colorClasses.blue;

	return (
		<div className={`border-b ${classes.border} last:border-b-0`}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={`w-full px-6 py-4 flex items-center justify-between ${classes.bg} ${classes.hover} transition-colors`}
			>
				<div className="flex items-center space-x-3">
					{Icon && <Icon className={`w-5 h-5 ${classes.icon}`} />}
					<span className={`font-semibold ${classes.text} text-left`}>{title}</span>
				</div>
				{isOpen ? (
					<LuChevronUp className={`w-5 h-5 ${classes.icon}`} />
				) : (
					<LuChevronDown className={`w-5 h-5 ${classes.icon}`} />
				)}
			</button>
			{isOpen && (
				<div className="px-6 py-5 bg-white animate-slideDown">
					{children}
				</div>
			)}
		</div>
	);
}
