import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEditMode } from "../../../context/EditModeContext";
import {
	getKelembagaanSummary,
	createKarangTaruna,
	createLpm,
	createSatlinmas,
	createPkk,
	createLembagaLainnya,
	listLembagaLainnya,
} from "../../../services/kelembagaan";
import { getProdukHukums } from "../../../services/api";
import AktivitasLog from "../../../components/kelembagaan/AktivitasLog";
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
	LuLock,
	LuLockOpen,
	LuTriangleAlert,
	LuMapPin,
	LuFileCheck,
	LuUserCheck,
	LuClipboardList,
	LuShieldCheck,
	LuSearch,
	LuLandmark,
} from "react-icons/lu";
import DesaPageHeader from "../../../components/desa/DesaPageHeader";

const FORMATION_TYPES_REQUIRING_PRODUK_HUKUM = new Set([
	"satlinmas",
	"karang-taruna",
	"lpm",
	"pkk",
	"lembaga-lainnya",
]);

const requiresProdukHukum = (type) => FORMATION_TYPES_REQUIRING_PRODUK_HUKUM.has(type);

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, description, icon: Icon, gradient, loading, children, confirmDisabled = false, confirmLabel }) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
			<div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-slideUp">
				{/* Header */}
				<div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
					<div className="flex items-center gap-3">
						{Icon && (
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
								<Icon className="h-5 w-5" />
							</div>
						)}
						<h3 className="text-lg font-semibold text-slate-900">{title}</h3>
					</div>
					<button
						onClick={onClose}
						disabled={loading}
						className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
					>
						<LuX className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6">
					{children}
					<div className="space-y-4 mb-6">
						<div className="flex items-start space-x-3">
							<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
								<LuInfo className="h-4 w-4" />
							</div>
							<div className="flex-1 prose prose-sm max-w-none">
								<div className="text-slate-700 leading-relaxed space-y-3">
									{description.split('\n\n').map((paragraph, idx) => {
										// Check if paragraph contains numbered list (1., 2., etc)
										if (/^\d+\./.test(paragraph.trim())) {
											const items = paragraph.split('\n').filter(item => item.trim());
											return (
												<ol key={idx} className="list-decimal list-inside space-y-2 bg-slate-50 p-4 rounded-lg">
													{items.map((item, itemIdx) => (
														<li key={itemIdx} className="text-slate-700">
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
												<ol key={idx} className="list-[lower-alpha] list-inside space-y-2 bg-slate-50 p-4 rounded-lg">
													{items.map((item, itemIdx) => (
														<li key={itemIdx} className="text-slate-700 ml-4">
															{item.replace(/^[a-z]\.\s*/, '')}
														</li>
													))}
												</ol>
											);
										}
										// Regular paragraph
										else if (paragraph.trim()) {
											return (
												<p key={idx} className="text-slate-700">
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
							className="flex-1 rounded-lg border border-slate-200 px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Batal
						</button>
						<button
							onClick={onConfirm}
							disabled={loading || confirmDisabled}
							className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-slate-900 px-4 py-3 font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
						>
							{loading ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
									<span>Memproses...</span>
								</>
							) : (
								<>
									<LuCheck className="w-5 h-5" />
									<span>{confirmLabel || (children ? 'Oke, Buat' : 'Oke, Bentuk')}</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default function KelembagaanDesaPage() {
	const { isEditMode } = useEditMode();
	const [summary, setSummary] = useState({
		rt: 0,
		rw: 0,
		posyandu: 0,
		karang_taruna: 0,
		lpm: 0,
		pkk: 0,
		satlinmas: 0,
		lembaga_lainnya: 0,
		karang_taruna_formed: false,
		lpm_formed: false,
		satlinmas_formed: false,
		pkk_formed: false,
		total: 0,
		desa_nama: null,
		status_pemerintahan: 'desa',
		verifikasi: null,
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
	const [namaLembagaLainnya, setNamaLembagaLainnya] = useState('');
	const [alamatSekretariat, setAlamatSekretariat] = useState('');
	const [lembagaLainnyaItems, setLembagaLainnyaItems] = useState([]);
	const [produkHukumOptions, setProdukHukumOptions] = useState([]);
	const [selectedProdukHukumId, setSelectedProdukHukumId] = useState('');
	const [produkHukumSearchTerm, setProdukHukumSearchTerm] = useState('');
	const [showProdukHukumDropdown, setShowProdukHukumDropdown] = useState(false);
	const [loadingProdukHukum, setLoadingProdukHukum] = useState(false);
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
	const produkHukumRequirementText = {
		'satlinmas': 'Pilih Perdes atau Perkades yang masih berlaku sebagai dasar hukum pembentukan Satlinmas.',
		'karang-taruna': 'Pilih Perdes atau Perkades yang masih berlaku sebagai dasar hukum pembentukan Karang Taruna.',
		'lpm': 'Pilih Perdes atau Perkades yang masih berlaku sebagai dasar hukum pembentukan LPM.',
		'pkk': 'Pilih Perdes atau Perkades yang masih berlaku sebagai dasar hukum pembentukan PKK.',
		'lembaga-lainnya': 'Pilih Perdes atau Perkades yang masih berlaku sebagai dasar hukum pembentukan Lembaga Lainnya.',
	};

	const resetCreateModalFields = () => {
		setNamaLembagaLainnya('');
		setAlamatSekretariat('');
		setSelectedProdukHukumId('');
		setProdukHukumSearchTerm('');
		setShowProdukHukumDropdown(false);
	};

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				// Use lightweight summary endpoint - contains all data we need including formation status
				const [summaryRes, lembagaRes] = await Promise.all([
					getKelembagaanSummary(),
					listLembagaLainnya().catch(() => ({ data: { data: [] } })),
				]);

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
					lembaga_lainnya: data.lembaga_lainnya || 0,
					karang_taruna_formed: data.has_karang_taruna || false,
					lpm_formed: data.has_lpm || false,
					satlinmas_formed: data.has_satlinmas || false,
					pkk_formed: data.has_pkk || false,
					total: data.total || 0,
					desa_nama: data.desa_nama || null,
					status_pemerintahan: data.status_pemerintahan || 'desa',
					verifikasi: data.verifikasi || null,
				});

				// Set lembaga lainnya items
				const lembagaItems = lembagaRes?.data?.data || [];
				setLembagaLainnyaItems(Array.isArray(lembagaItems) ? lembagaItems : []);
			} catch (e) {
				console.error(e);
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => (mounted = false);
	}, []);

	useEffect(() => {
		if (!modalConfig.isOpen || !requiresProdukHukum(modalConfig.type)) {
			return undefined;
		}

		let mounted = true;

		const fetchProdukHukum = async () => {
			setLoadingProdukHukum(true);
			try {
				const res = await getProdukHukums({
					all: true,
					jenis: 'Peraturan Desa,Peraturan Kepala Desa',
					status_peraturan: 'berlaku',
				});

				if (mounted) {
					setProdukHukumOptions(Array.isArray(res?.data?.data) ? res.data.data : []);
				}
			} catch (error) {
				console.error('Error loading produk hukum pembentukan:', error);
				if (mounted) {
					setProdukHukumOptions([]);
				}
			} finally {
				if (mounted) {
					setLoadingProdukHukum(false);
				}
			}
		};

		fetchProdukHukum();

		return () => {
			mounted = false;
		};
	}, [modalConfig.isOpen, modalConfig.type]);

	// Use formation status directly from summary
	const ktFormed = summary.karang_taruna_formed;
	const lpmFormed = summary.lpm_formed;
	const satlinmasFormed = summary.satlinmas_formed;
	const pkkFormed = summary.pkk_formed;
	const modalRequiresProdukHukum = requiresProdukHukum(modalConfig.type);
	const selectedProdukHukum = produkHukumOptions.find((item) => item.id === selectedProdukHukumId) || null;
	const filteredProdukHukumOptions = produkHukumOptions.filter((item) => {
		const keyword = produkHukumSearchTerm.trim().toLowerCase();
		if (!keyword) return true;
		return (item.judul || '').toLowerCase().includes(keyword) || (item.nomor || '').toLowerCase().includes(keyword);
	});

	const showSuccessAlert = (kelembagaanName) => {
		// Simple success notification - bisa diganti dengan SweetAlert2 jika sudah terinstall
		const alertDiv = document.createElement("div");
		alertDiv.className =
			"fixed top-4 right-4 bg-slate-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-pulse";
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

	const showErrorAlert = (message) => {
		const alertDiv = document.createElement('div');
		alertDiv.className =
			'fixed top-4 right-4 bg-rose-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
		alertDiv.innerHTML = `
			<div class="flex items-center space-x-2">
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
				</svg>
				<span><strong>Gagal!</strong> ${message}</span>
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
				gradient: 'from-slate-500 to-slate-500',
			},
			'karang-taruna': {
				title: 'Bentuk Karang Taruna',
				icon: LuUsers,
				gradient: 'from-slate-500 to-slate-500',
			},
			'lpm': {
				title: 'Bentuk LPM',
				icon: LuBuilding2,
				gradient: 'from-slate-500 to-slate-500',
			},
			'pkk': {
				title: 'Bentuk PKK',
				icon: LuSprout,
				gradient: 'from-slate-500 to-slate-500',
			},
			'lembaga-lainnya': {
				title: 'Tambah Lembaga Lainnya',
				icon: LuBuilding,
				gradient: 'from-slate-500 to-slate-700',
			},
		};

		const config = configs[type];
		if (config) {
			resetCreateModalFields();
			setModalConfig({
				isOpen: true,
				type: type,
				title: config.title,
				description: lembagaDescriptions[type] || '',
				icon: config.icon,
				gradient: config.gradient,
			});
		}
	};

	// Fungsi untuk menutup modal
	const handleCloseModal = () => {
		if (!creatingLembaga) {
			resetCreateModalFields();
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
		if (requiresProdukHukum(type) && !selectedProdukHukumId) {
			showErrorAlert('Pilih Perdes atau Perkades yang berlaku terlebih dahulu.');
			return;
		}
		if (type === 'lembaga-lainnya' && !namaLembagaLainnya.trim()) {
			showErrorAlert('Nama Lembaga wajib diisi.');
			return;
		}

		setCreatingLembaga(true);
		try {
			let kelembagaanName = "";
			let fullName = "";
			
			// Use else if to ensure only one is set
			if (type === "karang-taruna") {
				kelembagaanName = "Karang Taruna";
				fullName = `Karang Taruna ${wilayahLabel} ${desaName}`;
				await createKarangTaruna({
					nama: fullName,
					alamat: alamatSekretariat.trim(),
					produk_hukum_id: selectedProdukHukumId,
				});
			} else if (type === "lpm") {
				kelembagaanName = "LPM";
				fullName = `LPM ${wilayahLabel} ${desaName}`;
				await createLpm({
					nama: fullName,
					alamat: alamatSekretariat.trim(),
					produk_hukum_id: selectedProdukHukumId,
				});
			} else if (type === "satlinmas") {
				kelembagaanName = "Satlinmas";
				fullName = `Satlinmas ${wilayahLabel} ${desaName}`;
				await createSatlinmas({
					nama: fullName,
					alamat: alamatSekretariat.trim(),
					produk_hukum_id: selectedProdukHukumId,
				});
			} else if (type === "pkk") {
				kelembagaanName = "PKK";
				fullName = `PKK ${wilayahLabel} ${desaName}`;
				await createPkk({
					nama: fullName,
					alamat: alamatSekretariat.trim(),
					produk_hukum_id: selectedProdukHukumId,
				});
			} else if (type === "lembaga-lainnya") {
				kelembagaanName = namaLembagaLainnya.trim();
				await createLembagaLainnya({
					nama: namaLembagaLainnya.trim(),
					alamat: alamatSekretariat.trim(),
					produk_hukum_id: selectedProdukHukumId,
				});
			}

			// Close modal
			handleCloseModal();

			// Show success notification
			showSuccessAlert(kelembagaanName);

			// Refresh summary data and lembaga lainnya items after creating
			const [summaryRes, lembagaRes] = await Promise.all([
				getKelembagaanSummary(),
				listLembagaLainnya().catch(() => ({ data: { data: [] } })),
			]);
			const data = summaryRes.data.data || {};
			
			setSummary({
				rt: data.rt || 0,
				rw: data.rw || 0,
				posyandu: data.posyandu || 0,
				karang_taruna: data.karang_taruna || 0,
				lpm: data.lpm || 0,
				pkk: data.pkk || 0,
				satlinmas: data.satlinmas || 0,
				lembaga_lainnya: data.lembaga_lainnya || 0,
				karang_taruna_formed: data.has_karang_taruna || false,
				lpm_formed: data.has_lpm || false,
				satlinmas_formed: data.has_satlinmas || false,
				pkk_formed: data.has_pkk || false,
				total: data.total || 0,
				desa_nama: data.desa_nama || null,
				status_pemerintahan: data.status_pemerintahan || 'desa',
				verifikasi: data.verifikasi || null,
			});
			
			const lembagaItems = lembagaRes?.data?.data || [];
			setLembagaLainnyaItems(Array.isArray(lembagaItems) ? lembagaItems : []);
		} catch (err) {
			console.error(err);
			
			// Close modal on error
			handleCloseModal();
			showErrorAlert(err?.response?.data?.message || 'Tidak dapat membentuk kelembagaan');
		} finally {
			setCreatingLembaga(false);
		}
	};

	if (loading) {
		return (
			<div className="p-4">
				<div className="animate-pulse text-slate-500">Memuat...</div>
			</div>
		);
	}

	// Helper: verification badge for multi-instance types (RT/RW, Posyandu)
	const renderMultiVerifBadge = (verifData) => {
		if (!verifData) return null;
		const unverified = verifData.unverified || 0;
		const ditolak = verifData.ditolak || 0;
		if (unverified === 0 && ditolak === 0) {
			return (
				<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
					<LuCheck className="w-3 h-3" /> Terverifikasi
				</span>
			);
		}
		return (
			<div className="flex items-center gap-1.5 flex-wrap">
				{unverified > 0 && (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
						<LuTriangleAlert className="w-3 h-3" /> {unverified} Belum
					</span>
				)}
				{ditolak > 0 && (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
						<LuX className="w-3 h-3" /> {ditolak} Ditolak
					</span>
				)}
			</div>
		);
	};

	// Helper: verification badge for singleton types (KT, LPM, PKK, Satlinmas)
	const renderSingletonVerifBadge = (verifData, formed) => {
		if (!verifData || !formed) return null;
		if (verifData.status_verifikasi === 'verified') {
			return (
				<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
					<LuCheck className="w-3 h-3" /> Terverifikasi
				</span>
			);
		}
		if (verifData.status_verifikasi === 'ditolak') {
			return (
				<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
					<LuX className="w-3 h-3" /> Verifikasi Ditolak
				</span>
			);
		}
		return (
			<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
				<LuTriangleAlert className="w-3 h-3" /> Belum Terverifikasi
			</span>
		);
	};

	return (
		<div className="space-y-5">
			<DesaPageHeader
				icon={LuLandmark}
				eyebrow="Data Desa"
				title={`Kelembagaan ${wilayahLabel} ${desaName}`}
				description={`Kelola seluruh data kelembagaan ${wilayahLabel.toLowerCase()} — RW, RT, Posyandu, dan lembaga lainnya.`}
				actions={
					<span
						className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
							isEditMode
								? "bg-emerald-50 text-emerald-700 ring-emerald-100"
								: "bg-rose-50 text-rose-700 ring-rose-100"
						}`}
					>
						{isEditMode ? (
							<>
								<LuLockOpen className="h-3.5 w-3.5" />
								<span>Aplikasi dibuka</span>
							</>
						) : (
							<>
								<LuLock className="h-3.5 w-3.5" />
								<span>Aplikasi ditutup</span>
							</>
						)}
					</span>
				}
			>
				<p className="text-sm text-slate-500">
					{isEditMode
						? "Pengguna dapat menambah dan mengedit data kelembagaan."
						: "Fitur penambahan dan pengeditan data sementara ditutup."}
				</p>
			</DesaPageHeader>

			{/* 2 Column Layout */}
			<div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
				{/* Left Column (2/3) */}
				<div className="lg:col-span-2 space-y-5">

			{/* ═══ Ringkasan Verifikasi ═══ */}
			{summary.verifikasi && (() => {
				const v = summary.verifikasi;
				// Build verification items
				const items = [];

				// Multi-type: RW
				if (v.rw) items.push({ label: "RW", verified: v.rw.verified || 0, ditolak: v.rw.ditolak || 0, total: v.rw.total || 0, icon: LuBuilding, color: "blue" });
				// Multi-type: RT
				if (v.rt) items.push({ label: "RT", verified: v.rt.verified || 0, ditolak: v.rt.ditolak || 0, total: v.rt.total || 0, icon: LuBuilding, color: "blue" });
				// Multi-type: Posyandu
				if (v.posyandu) items.push({ label: "Posyandu", verified: v.posyandu.verified || 0, ditolak: v.posyandu.ditolak || 0, total: v.posyandu.total || 0, icon: LuHeart, color: "purple" });
				// Singleton: Karang Taruna
				if (v.karang_taruna && ktFormed) items.push({ label: "Karang Taruna", verified: v.karang_taruna.status_verifikasi === "verified" ? 1 : 0, ditolak: v.karang_taruna.status_verifikasi === "ditolak" ? 1 : 0, total: 1, icon: LuUsers, color: "orange" });
				// Singleton: LPM
				if (v.lpm && lpmFormed) items.push({ label: "LPM", verified: v.lpm.status_verifikasi === "verified" ? 1 : 0, ditolak: v.lpm.status_verifikasi === "ditolak" ? 1 : 0, total: 1, icon: LuBuilding2, color: "yellow" });
				// Singleton: PKK
				if (v.pkk && pkkFormed) items.push({ label: "PKK", verified: v.pkk.status_verifikasi === "verified" ? 1 : 0, ditolak: v.pkk.status_verifikasi === "ditolak" ? 1 : 0, total: 1, icon: LuSprout, color: "pink" });
				// Singleton: Satlinmas
				if (v.satlinmas && satlinmasFormed) items.push({ label: "Satlinmas", verified: v.satlinmas.status_verifikasi === "verified" ? 1 : 0, ditolak: v.satlinmas.status_verifikasi === "ditolak" ? 1 : 0, total: 1, icon: LuShield, color: "emerald" });
				// Multi-type: Lembaga Lainnya
				if (v.lembaga_lainnya) items.push({ label: "Lembaga Lainnya", verified: v.lembaga_lainnya.verified || 0, ditolak: v.lembaga_lainnya.ditolak || 0, total: v.lembaga_lainnya.total || 0, icon: LuBuilding, color: "slate" });

				const totalVerified = items.reduce((sum, i) => sum + i.verified, 0);
				const totalAll = items.reduce((sum, i) => sum + i.total, 0);

				if (totalAll === 0) return null;

				return (
					<div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
						<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-slate-100 rounded-lg">
									<LuShieldCheck className="w-5 h-5 text-slate-700" />
								</div>
								<div>
									<h3 className="font-bold text-slate-900">Data Terverifikasi Kabupaten</h3>
									<p className="text-xs text-slate-500">Data lembaga yang sudah masuk dan diverifikasi oleh kabupaten</p>
								</div>
							</div>
							<div className="text-right">
								<div className="text-2xl font-bold text-slate-700">{totalVerified}<span className="text-base font-normal text-slate-400">/{totalAll}</span></div>
								<p className="text-xs text-slate-500">Lembaga Terverifikasi</p>
							</div>
						</div>
						<div className="px-5 py-3">
							{/* Progress bar */}
							<div className="w-full bg-slate-100 rounded-full h-2 mb-4">
								<div
									className={`h-2 rounded-full transition-all duration-500 ${totalVerified === totalAll ? "bg-slate-500" : "bg-slate-500"}`}
									style={{ width: `${totalAll > 0 ? (totalVerified / totalAll) * 100 : 0}%` }}
								/>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								{items.map((item) => {
									const Icon = item.icon;
									const isComplete = item.verified === item.total;
									const hasDitolak = item.ditolak > 0;
									return (
										<div key={item.label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${isComplete ? "bg-slate-50 border-slate-200" : hasDitolak ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
											<Icon className={`w-4 h-4 flex-shrink-0 ${isComplete ? "text-slate-600" : hasDitolak ? "text-rose-500" : "text-slate-400"}`} />
											<div className="min-w-0">
												<p className="text-xs text-slate-500 truncate">{item.label}</p>
												<p className={`text-sm font-bold ${isComplete ? "text-slate-700" : hasDitolak ? "text-rose-700" : "text-slate-700"}`}>
													{item.verified}/{item.total}
													{hasDitolak && <span className="text-xs font-normal text-rose-500 ml-1">({item.ditolak} ditolak)</span>}
												</p>
											</div>
											{isComplete && <LuCheck className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 ml-auto" />}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				);
			})()}

			{/* Persyaratan Verifikasi Info Box */}
			{summary.verifikasi && (
				<div className="rounded-xl border border-amber-100 bg-amber-50/60 p-5">
					<div className="flex items-start gap-3 mb-4">
						<div className="p-2 bg-amber-100 rounded-lg">
							<LuClipboardList className="w-5 h-5 text-amber-700" />
						</div>
						<div>
							<h3 className="font-bold text-amber-900 text-base">Persyaratan Verifikasi Kelembagaan</h3>
							<p className="text-sm text-amber-700 mt-1">
								Agar kelembagaan dapat diverifikasi oleh Admin, pastikan data berikut sudah dilengkapi pada setiap lembaga:
							</p>
						</div>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-amber-100">
							<LuFileCheck className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm font-semibold text-slate-800">Kaitkan SK / Produk Hukum</p>
								<p className="text-xs text-slate-500">Lampirkan Surat Keputusan pembentukan atau produk hukum terkait</p>
							</div>
						</div>
						<div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-amber-100">
							<LuMapPin className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm font-semibold text-slate-800">Isi Alamat Sekretariat</p>
								<p className="text-xs text-slate-500">Berikan alamat lengkap sekretariat lembaga</p>
							</div>
						</div>
						<div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-amber-100">
							<LuUserCheck className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm font-semibold text-slate-800">Tambah Minimal 1 Pengurus</p>
								<p className="text-xs text-slate-500">Setiap lembaga wajib memiliki setidaknya satu pengurus yang terdaftar</p>
							</div>
						</div>
						<div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-amber-100">
							<LuUsers className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm font-semibold text-slate-800">Data Penduduk (RT)</p>
								<p className="text-xs text-slate-500">Untuk RT, masukkan jumlah jiwa dan jumlah KK di wilayah RT tersebut</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* ═══ SECTION 1: Lembaga Kemasyarakatan Desa ═══ */}
			<div>
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-slate-100 rounded-lg">
						<LuBuilding2 className="w-5 h-5 text-slate-700" />
					</div>
					<div>
						<h2 className="text-lg font-bold text-slate-800">Lembaga Kemasyarakatan Desa</h2>
						<p className="text-sm text-slate-500">RT/RW, Posyandu, Karang Taruna, LPM, dan PKK</p>
					</div>
				</div>

				<div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
					{/* RT & RW */}
					<div
						className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
						onClick={() => navigate("/desa/kelembagaan/rw")}
					>
						<div className="flex items-center gap-4">
							<div className="p-2.5 bg-slate-50 rounded-xl">
								<LuBuilding className="w-5 h-5 text-slate-600" />
							</div>
							<div>
								<h4 className="font-semibold text-slate-900">RT & RW</h4>
								<p className="text-sm text-slate-500">{summary.rw} RW • {summary.rt} RT</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							{(() => {
								const v = summary.verifikasi;
								if (!v?.rw && !v?.rt) return null;
								const combined = {
									unverified: (v.rw?.unverified || 0) + (v.rt?.unverified || 0),
									ditolak: (v.rw?.ditolak || 0) + (v.rt?.ditolak || 0),
								};
								return renderMultiVerifBadge(combined);
							})()}
							<LuArrowRight className="w-4 h-4 text-slate-400" />
						</div>
					</div>

					{/* Posyandu */}
					<div
						className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
						onClick={() => navigate("/desa/kelembagaan/posyandu")}
					>
						<div className="flex items-center gap-4">
							<div className="p-2.5 bg-slate-50 rounded-xl">
								<LuHeart className="w-5 h-5 text-slate-600" />
							</div>
							<div>
								<h4 className="font-semibold text-slate-900">Posyandu</h4>
								<p className="text-sm text-slate-500">{summary.posyandu} Posyandu</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							{renderMultiVerifBadge(summary.verifikasi?.posyandu)}
							<LuArrowRight className="w-4 h-4 text-slate-400" />
						</div>
					</div>

					{/* Karang Taruna */}
					<div
						className={`flex items-center justify-between px-5 py-4 transition-colors ${ktFormed ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
						onClick={ktFormed ? () => navigate("/desa/kelembagaan/karang-taruna/detail") : undefined}
					>
						<div className="flex items-center gap-4">
							<div className="p-2.5 bg-amber-50 rounded-xl">
								<LuUsers className="w-5 h-5 text-amber-600" />
							</div>
							<div>
								<h4 className="font-semibold text-slate-900">Karang Taruna</h4>
								<p className={`text-sm ${ktFormed ? 'text-slate-500' : 'text-amber-600'}`}>
									{ktFormed ? 'Sudah terbentuk' : 'Belum terbentuk'}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							{ktFormed ? (
								<>
									{renderSingletonVerifBadge(summary.verifikasi?.karang_taruna, ktFormed)}
									<LuArrowRight className="w-4 h-4 text-slate-400" />
								</>
							) : (
								isEditMode && (
									<button
										onClick={(e) => { e.stopPropagation(); handleOpenModal("karang-taruna"); }}
										className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1"
									>
										<LuPlus className="w-3 h-3" /> Bentuk
									</button>
								)
							)}
						</div>
					</div>

					{/* LPM */}
					<div
						className={`flex items-center justify-between px-5 py-4 transition-colors ${lpmFormed ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
						onClick={lpmFormed ? () => navigate("/desa/kelembagaan/lpm/detail") : undefined}
					>
						<div className="flex items-center gap-4">
							<div className="p-2.5 bg-yellow-50 rounded-xl">
								<LuBuilding2 className="w-5 h-5 text-yellow-600" />
							</div>
							<div>
								<h4 className="font-semibold text-slate-900">LPM</h4>
								<p className={`text-sm ${lpmFormed ? 'text-slate-500' : 'text-amber-600'}`}>
									{lpmFormed ? 'Sudah terbentuk' : 'Belum terbentuk'}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							{lpmFormed ? (
								<>
									{renderSingletonVerifBadge(summary.verifikasi?.lpm, lpmFormed)}
									<LuArrowRight className="w-4 h-4 text-slate-400" />
								</>
							) : (
								isEditMode && (
									<button
										onClick={(e) => { e.stopPropagation(); handleOpenModal("lpm"); }}
										className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-1"
									>
										<LuPlus className="w-3 h-3" /> Bentuk
									</button>
								)
							)}
						</div>
					</div>

					{/* PKK */}
					<div
						className={`flex items-center justify-between px-5 py-4 transition-colors ${pkkFormed ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
						onClick={pkkFormed ? () => navigate("/desa/kelembagaan/pkk/detail") : undefined}
					>
						<div className="flex items-center gap-4">
							<div className="p-2.5 bg-slate-50 rounded-xl">
								<LuSprout className="w-5 h-5 text-slate-600" />
							</div>
							<div>
								<h4 className="font-semibold text-slate-900">PKK</h4>
								<p className={`text-sm ${pkkFormed ? 'text-slate-500' : 'text-amber-600'}`}>
									{pkkFormed ? 'Sudah terbentuk' : 'Belum terbentuk'}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							{pkkFormed ? (
								<>
									{renderSingletonVerifBadge(summary.verifikasi?.pkk, pkkFormed)}
									<LuArrowRight className="w-4 h-4 text-slate-400" />
								</>
							) : (
								isEditMode && (
									<button
										onClick={(e) => { e.stopPropagation(); handleOpenModal("pkk"); }}
										className="px-3 py-1.5 bg-slate-500 text-white text-xs font-medium rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-1"
									>
										<LuPlus className="w-3 h-3" /> Bentuk
									</button>
								)
							)}
						</div>
					</div>
				</div>
			</div>

			{/* ═══ SECTION 2: Kelembagaan Lainnya ═══ */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-slate-100 rounded-lg">
							<LuShield className="w-5 h-5 text-slate-700" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-slate-800">Kelembagaan Lainnya</h2>
							<p className="text-sm text-slate-500">Satlinmas dan kelembagaan tambahan sesuai kebutuhan desa</p>
						</div>
					</div>
					{isEditMode && (
						<button
							className="flex items-center space-x-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
							onClick={() => handleOpenModal("lembaga-lainnya")}
						>
							<LuPlus className="w-4 h-4" />
							<span>Tambah Lembaga</span>
						</button>
					)}
				</div>

				<div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
					{/* Satlinmas */}
					<div
						className={`flex items-center justify-between px-5 py-4 transition-colors ${satlinmasFormed ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
						onClick={satlinmasFormed ? () => navigate("/desa/kelembagaan/satlinmas/detail") : undefined}
					>
						<div className="flex items-center gap-4">
							<div className="p-2.5 bg-slate-50 rounded-xl">
								<LuShield className="w-5 h-5 text-slate-600" />
							</div>
							<div>
								<h4 className="font-semibold text-slate-900">Satlinmas</h4>
								<p className={`text-sm ${satlinmasFormed ? 'text-slate-500' : 'text-amber-600'}`}>
									{satlinmasFormed ? 'Sudah terbentuk' : 'Belum terbentuk'}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							{satlinmasFormed ? (
								<>
									{renderSingletonVerifBadge(summary.verifikasi?.satlinmas, satlinmasFormed)}
									<LuArrowRight className="w-4 h-4 text-slate-400" />
								</>
							) : (
								isEditMode && (
									<button
										onClick={(e) => { e.stopPropagation(); handleOpenModal("satlinmas"); }}
										className="px-3 py-1.5 bg-slate-500 text-white text-xs font-medium rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-1"
									>
										<LuPlus className="w-3 h-3" /> Bentuk
									</button>
								)
							)}
						</div>
					</div>

					{/* Individual Lembaga Lainnya Items */}
					{lembagaLainnyaItems.map((item) => (
						<div
							key={item.id}
							className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
							onClick={() => navigate(`/desa/kelembagaan/lembaga-lainnya/${item.id}`)}
						>
							<div className="flex items-center gap-4">
								<div className="p-2.5 bg-slate-50 rounded-xl">
									<LuBuilding className="w-5 h-5 text-slate-600" />
								</div>
								<div>
									<h4 className="font-semibold text-slate-900">{item.nama}</h4>
									<p className="text-sm text-slate-500">Kelembagaan tambahan</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<LuArrowRight className="w-4 h-4 text-slate-400" />
							</div>
						</div>
					))}

					{/* Empty state when no items in list */}
					{!satlinmasFormed && lembagaLainnyaItems.length === 0 && (
						<div className="px-5 py-8 text-center text-slate-400 text-sm">
							Belum ada kelembagaan lainnya
						</div>
					)}
				</div>
			</div>

			{/* Info Section - Tentang Lembaga Kemasyarakatan Desa */}
			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
				<div className="p-6">
					<div className="flex items-start space-x-4 mb-4">
						<div className="p-3 bg-slate-500 rounded-xl flex-shrink-0">
							<LuInfo className="w-6 h-6 text-white" />
						</div>
						<div>
							<h3 className="text-xl font-bold text-slate-900 mb-2">
								Tentang Lembaga Kemasyarakatan Desa
							</h3>
							<p className="text-slate-700 leading-relaxed mb-4">
								Lembaga Kemasyarakatan Desa (LKD) adalah organisasi yang dibentuk oleh Pemerintah Desa bersama masyarakat untuk membantu tugas-tugas pemerintahan dan pembangunan desa. 
								LKD bekerja secara partisipatif dalam meningkatkan kesejahteraan masyarakat desa.
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						{/* Tugas Utama */}
						<div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
							<h4 className="font-semibold text-slate-900 mb-3 flex items-center">
								<LuCheck className="w-5 h-5 mr-2 text-slate-600" />
								Tugas Utama LKD
							</h4>
							<ul className="space-y-2 text-sm text-slate-700">
								<li className="flex items-start">
									<span className="text-slate-500 mr-2">•</span>
									<span>Memberdayakan masyarakat desa dalam berbagai bidang</span>
								</li>
								<li className="flex items-start">
									<span className="text-slate-500 mr-2">•</span>
									<span>Ikut serta dalam perencanaan dan pelaksanaan pembangunan</span>
								</li>
								<li className="flex items-start">
									<span className="text-slate-500 mr-2">•</span>
									<span>Meningkatkan pelayanan kepada masyarakat desa</span>
								</li>
								<li className="flex items-start">
									<span className="text-slate-500 mr-2">•</span>
									<span>Menampung dan menyalurkan aspirasi masyarakat</span>
								</li>
							</ul>
						</div>

						{/* Jenis LKD */}
						<div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
							<h4 className="font-semibold text-slate-900 mb-3 flex items-center">
								<LuUsers className="w-5 h-5 mr-2 text-slate-600" />
								Jenis Lembaga Wajib
							</h4>
							<ul className="space-y-2 text-sm text-slate-700">
								<li className="flex items-start">
									<span className="text-slate-500 mr-2">•</span>
									<span><strong>RT & RW</strong> - Membantu pelayanan pemerintahan dan data kependudukan</span>
								</li>
								<li className="flex items-start">
									<span className="text-slate-500 mr-2">•</span>
									<span><strong>PKK</strong> - Pemberdayaan kesejahteraan keluarga</span>
								</li>
								<li className="flex items-start">
									<span className="text-slate-500 mr-2">•</span>
									<span><strong>Karang Taruna</strong> - Pengembangan generasi muda dan kesejahteraan sosial</span>
								</li>
								<li className="flex items-start">
									<span className="text-slate-500 mr-2">•</span>
									<span><strong>Posyandu</strong> - Peningkatan pelayanan kesehatan masyarakat</span>
								</li>
								<li className="flex items-start">
									<span className="text-slate-500 mr-2">•</span>
									<span><strong>LPM</strong> - Perencanaan pembangunan dan swadaya gotong-royong</span>
								</li>
							</ul>
						</div>
					</div>

					{/* Persyaratan Pembentukan */}
					<div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
						<h4 className="font-semibold text-amber-900 mb-3 flex items-center">
							<LuBuilding2 className="w-5 h-5 mr-2" />
							Persyaratan Pembentukan
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-700">
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-slate-600 flex-shrink-0 mt-0.5" />
								<span>Berasaskan Pancasila dan UUD 1945</span>
							</div>
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-slate-600 flex-shrink-0 mt-0.5" />
								<span>Bermanfaat bagi masyarakat desa</span>
							</div>
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-slate-600 flex-shrink-0 mt-0.5" />
								<span>Memiliki kepengurusan tetap</span>
							</div>
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-slate-600 flex-shrink-0 mt-0.5" />
								<span>Memiliki sekretariat tetap</span>
							</div>
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-slate-600 flex-shrink-0 mt-0.5" />
								<span>Tidak berafiliasi partai politik</span>
							</div>
							<div className="flex items-start">
								<LuCheck className="w-4 h-4 mr-2 text-slate-600 flex-shrink-0 mt-0.5" />
								<span>Ditetapkan dengan Peraturan Desa</span>
							</div>
						</div>
					</div>

					{/* Info Pengurus */}
					<div className="mt-4 flex items-start space-x-2 bg-slate-100 rounded-lg p-3">
						<LuInfo className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-slate-800">
							<p className="font-medium mb-1">Ketentuan Pengurus:</p>
							<p>Pengurus LKD menjabat selama <strong>5 tahun</strong> dan dapat dipilih kembali maksimal <strong>2 kali masa jabatan</strong>. Pengurus tidak boleh merangkap jabatan di LKD lain atau menjadi anggota partai politik.</p>
						</div>
					</div>
				</div>
			</div>

			

			{/* Ketentuan Hukum Accordion Section */}
			<div className="mt-12">
				<div className="rounded-t-xl bg-slate-900 p-6">
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
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">a.</span>
										<span className="text-slate-700">berasaskan Pancasila dan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">b.</span>
										<span className="text-slate-700">berkedudukan di Desa setempat;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">c.</span>
										<span className="text-slate-700">keberadaannya bermanfaat dan dibutuhkan masyarakat Desa;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">d.</span>
										<span className="text-slate-700">memiliki kepengurusan yang tetap;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">e.</span>
										<span className="text-slate-700">memiliki sekretariat yang bersifat tetap; dan</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">f.</span>
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
												<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">a.</span>
												<span className="text-slate-700">melakukan pemberdayaan masyarakat Desa;</span>
											</div>
											<div className="flex items-start">
												<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">b.</span>
												<span className="text-slate-700">ikut serta dalam perencanaan dan pelaksanaan pembangunan; dan</span>
											</div>
											<div className="flex items-start">
												<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">c.</span>
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
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">a.</span>
										<span className="text-slate-700">menampung dan menyalurkan aspirasi masyarakat;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">b.</span>
										<span className="text-slate-700">menanamkan dan memupuk rasa persatuan dan kesatuan masyarakat;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">c.</span>
										<span className="text-slate-700">meningkatkan kualitas dan mempercepat pelayanan Pemerintah Desa kepada masyarakat Desa;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">d.</span>
										<span className="text-slate-700">menyusun rencana, melaksanakan, mengendalikan, melestarikan, dan mengembangkan hasil pembangunan secara partisipatif;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">e.</span>
										<span className="text-slate-700">menumbuhkan, mengembangkan, dan menggerakkan prakarsa, partisipasi, swadaya, serta gotong royong masyarakat;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">f.</span>
										<span className="text-slate-700">meningkatkan kesejahteraan keluarga; dan</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">g.</span>
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
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">a.</span>
										<span className="text-slate-700">Rukun Tetangga;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">b.</span>
										<span className="text-slate-700">Rukun Warga;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">c.</span>
										<span className="text-slate-700">Pemberdayaan Kesejahteraan Keluarga;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">d.</span>
										<span className="text-slate-700">Karang Taruna;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">e.</span>
										<span className="text-slate-700">Pos Pelayanan Terpadu; dan</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">f.</span>
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
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">a.</span>
										<span className="text-slate-700">membantu Kepala Desa dalam bidang pelayanan pemerintahan;</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">b.</span>
										<span className="text-slate-700">membantu Kepala Desa dalam menyediakan data kependudukan dan perizinan; dan</span>
									</div>
									<div className="flex items-start">
										<span className="font-semibold text-slate-600 mr-2 flex-shrink-0">c.</span>
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
								<p className="font-medium text-slate-800">(5) Pengurus LKD <span className="font-bold text-rose-600">dilarang merangkap jabatan</span> pada LKD lainnya dan <span className="font-bold text-rose-600">dilarang menjadi anggota</span> salah satu partai politik.</p>
							</div>
						</div>
					</AccordionSection>
				</div>
			</div>

			{/* ═══ Dokumen Peraturan ═══ */}
			<div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
				<div className="bg-slate-900 p-5">
					<div className="flex items-center space-x-3">
						<div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
							<LuFileText className="w-5 h-5 text-white" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-white">Dokumen Peraturan</h2>
							<p className="text-slate-300 text-xs mt-0.5">Regulasi Lembaga Kemasyarakatan</p>
						</div>
					</div>
				</div>
				<div className="p-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
						<a href="/peraturan/Permendagri No. 18 Tahun 2018.pdf" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3 border-l-4 border-slate-500 bg-slate-50 hover:bg-slate-100 rounded-r transition-all">
							<div className="flex items-center space-x-3 flex-1 min-w-0">
								<LuFileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
								<div className="min-w-0">
									<p className="font-semibold text-sm text-slate-900 truncate">Permendagri No. 18/2018</p>
									<p className="text-xs text-slate-500">Lembaga Kemasyarakatan Desa</p>
								</div>
							</div>
							<LuDownload className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-2" />
						</a>
						<a href="/peraturan/Permendagri-26-Thn-2020-ttg-Linmas.pdf" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3 border-l-4 border-amber-500 bg-amber-50 hover:bg-amber-100 rounded-r transition-all">
							<div className="flex items-center space-x-3 flex-1 min-w-0">
								<LuFileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
								<div className="min-w-0">
									<p className="font-semibold text-sm text-slate-900 truncate">Permendagri No. 26/2020</p>
									<p className="text-xs text-slate-500">Tibum Tranmas & Linmas</p>
								</div>
							</div>
							<LuDownload className="w-4 h-4 text-slate-400 group-hover:text-amber-600 flex-shrink-0 ml-2" />
						</a>
						<a href="/peraturan/PERMENDAGRI_36_TAHUN_2020 (1).pdf" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3 border-l-4 border-slate-500 bg-slate-50 hover:bg-slate-100 rounded-r transition-all">
							<div className="flex items-center space-x-3 flex-1 min-w-0">
								<LuFileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
								<div className="min-w-0">
									<p className="font-semibold text-sm text-slate-900 truncate">Permendagri No. 36/2020</p>
									<p className="text-xs text-slate-500">Gerakan PKK</p>
								</div>
							</div>
							<LuDownload className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-2" />
						</a>
						<a href="/peraturan/Permendagri Nomor 11 Tahun 2023.pdf" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3 border-l-4 border-slate-500 bg-slate-50 hover:bg-slate-100 rounded-r transition-all">
							<div className="flex items-center space-x-3 flex-1 min-w-0">
								<LuFileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
								<div className="min-w-0">
									<p className="font-semibold text-sm text-slate-900 truncate">Permendagri No. 11/2023</p>
									<p className="text-xs text-slate-500">Sarana Prasarana Linmas</p>
								</div>
							</div>
							<LuDownload className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-2" />
						</a>
						<a href="/peraturan/Permendagri No 13 Tahun 2024.pdf" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3 border-l-4 border-slate-500 bg-slate-50 hover:bg-slate-100 rounded-r transition-all">
							<div className="flex items-center space-x-3 flex-1 min-w-0">
								<LuFileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
								<div className="min-w-0">
									<p className="font-semibold text-sm text-slate-900 truncate">Permendagri No. 13/2024</p>
									<p className="text-xs text-slate-500">Pos Pelayanan Terpadu (Posyandu)</p>
								</div>
							</div>
							<LuDownload className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-2" />
						</a>
						<a href="/peraturan/perda no 9 tahun 2011.pdf" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3 border-l-4 border-slate-500 bg-slate-50 hover:bg-slate-100 rounded-r transition-all">
							<div className="flex items-center space-x-3 flex-1 min-w-0">
								<LuFileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
								<div className="min-w-0">
									<p className="font-semibold text-sm text-slate-900 truncate">Perda No. 9/2011</p>
									<p className="text-xs text-slate-500">Lembaga Kemasyarakatan Kab. Bogor</p>
								</div>
							</div>
							<LuDownload className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-2" />
						</a>
						<a href="/peraturan/Perbup 31 Tahun 2012 - Tata Cara Pembentukan LPM Desa, Kel, RW dan RT.pdf" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3 border-l-4 border-slate-500 bg-slate-50 hover:bg-slate-100 rounded-r transition-all md:col-span-2">
							<div className="flex items-center space-x-3 flex-1 min-w-0">
								<LuFileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
								<div className="min-w-0">
									<p className="font-semibold text-sm text-slate-900 truncate">Perbup No. 31/2012</p>
									<p className="text-xs text-slate-500">Tata Cara Pembentukan LPM & RT/RW</p>
								</div>
							</div>
							<LuDownload className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-2" />
						</a>
					</div>
				</div>
			</div>

				</div>
				{/* End of Left Column */}

				{/* Right Column - Activity Log (1/3) */}
				<div className="lg:col-span-1">
					<div className="sticky top-4">
						<AktivitasLog mode="all" />
					</div>
				</div>
				{/* End of Right Column */}
			</div>
			{/* End of Grid Layout */}

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
				confirmDisabled={Boolean((modalRequiresProdukHukum && !selectedProdukHukumId) || (modalConfig.type === 'lembaga-lainnya' && !namaLembagaLainnya.trim()))}
				confirmLabel={modalConfig.type === 'lembaga-lainnya' ? 'Oke, Buat' : 'Oke, Bentuk'}
			>
				{modalRequiresProdukHukum && (
					<div className="mb-6 space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Produk Hukum Pembentukan <span className="text-rose-500">*</span>
							</label>
							<p className="text-xs text-slate-500 mb-2">
								{produkHukumRequirementText[modalConfig.type] || 'Pilih Perdes atau Perkades yang masih berlaku sebagai dasar hukum pembentukan lembaga.'}
							</p>
							<div className="relative">
								<button
									type="button"
									className={`w-full text-left border rounded-xl px-4 py-3 text-sm flex items-center justify-between transition-colors ${selectedProdukHukumId ? 'border-slate-300 bg-slate-50' : 'border-slate-300 bg-white'} ${creatingLembaga ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400'}`}
									onClick={() => !creatingLembaga && setShowProdukHukumDropdown((open) => !open)}
									disabled={creatingLembaga}
								>
									{selectedProdukHukum ? (
										<div className="flex-1 min-w-0">
											<p className="font-medium text-slate-700 truncate">{selectedProdukHukum.judul || '—'}</p>
											<p className="text-xs text-slate-500 mt-0.5">{(selectedProdukHukum.jenis || '').replace(/_/g, ' ')} — No. {selectedProdukHukum.nomor}</p>
										</div>
									) : (
										<span className="text-slate-400">Pilih produk hukum...</span>
									)}
									<LuChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${showProdukHukumDropdown ? 'rotate-180' : ''}`} />
								</button>
								{showProdukHukumDropdown && (
									<div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
										<div className="p-2 border-b border-slate-100">
											<div className="relative">
												<LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
												<input
													type="text"
													value={produkHukumSearchTerm}
													onChange={(e) => setProdukHukumSearchTerm(e.target.value)}
													placeholder="Cari judul atau nomor..."
													className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
													autoFocus
												/>
											</div>
										</div>
										<div className="max-h-56 overflow-y-auto">
											{loadingProdukHukum ? (
												<div className="p-3 text-center text-sm text-slate-500">
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500 mx-auto mb-1"></div>
													Memuat...
												</div>
											) : filteredProdukHukumOptions.length === 0 ? (
												<div className="p-3 text-center text-sm text-slate-500">
													{produkHukumSearchTerm ? 'Tidak ditemukan' : 'Belum ada Perdes/Perkades berlaku'}
												</div>
											) : (
												filteredProdukHukumOptions.map((item) => (
													<button
														key={item.id}
														type="button"
														className={`w-full text-left px-3 py-2 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors ${selectedProdukHukumId === item.id ? 'bg-slate-50' : ''}`}
														onClick={() => {
															setSelectedProdukHukumId(item.id);
															setShowProdukHukumDropdown(false);
															setProdukHukumSearchTerm('');
														}}
													>
														<div className="flex items-center justify-between gap-3">
															<div className="flex-1 min-w-0">
																<p className={`text-sm font-medium truncate ${selectedProdukHukumId === item.id ? 'text-slate-700' : 'text-slate-900'}`}>{item.judul}</p>
																<p className="text-xs text-slate-500">{(item.jenis || '').replace(/_/g, ' ')} — No. {item.nomor}</p>
															</div>
															{selectedProdukHukumId === item.id && <LuCheck className="w-4 h-4 text-slate-600 flex-shrink-0" />}
														</div>
													</button>
												))
											)}
										</div>
									</div>
								)}
							</div>
							{!selectedProdukHukumId && (
								<p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
									<LuLock className="w-3.5 h-3.5" />
									Pilih produk hukum terlebih dahulu untuk melanjutkan pembentukan lembaga.
								</p>
							)}
						</div>

						{modalConfig.type === 'lembaga-lainnya' && (
							<div className={!selectedProdukHukumId ? 'opacity-50 pointer-events-none' : ''}>
								<label className="block text-sm font-medium text-slate-700 mb-2">
									Nama Lembaga <span className="text-rose-500">*</span>
								</label>
								<input
									type="text"
									value={namaLembagaLainnya}
									onChange={(e) => setNamaLembagaLainnya(e.target.value)}
									placeholder="Contoh: Forum Komunikasi Desa, Kelompok Tani, dll"
									className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-800 disabled:bg-slate-50"
									disabled={creatingLembaga || !selectedProdukHukumId}
								/>
							</div>
						)}

						<div className={!selectedProdukHukumId ? 'opacity-50 pointer-events-none' : ''}>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Alamat Sekretariat / Kelembagaan
							</label>
							<div className="relative">
								<div className="absolute top-3 left-3 pointer-events-none">
									<LuMapPin className="w-5 h-5 text-slate-400" />
								</div>
								<textarea
									value={alamatSekretariat}
									onChange={(e) => setAlamatSekretariat(e.target.value)}
									placeholder="Masukkan alamat sekretariat atau alamat kelembagaan"
									className="w-full min-h-[96px] pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-800 disabled:bg-slate-50 resize-y"
									disabled={creatingLembaga || !selectedProdukHukumId}
								/>
							</div>
							<p className="text-xs text-slate-500 mt-1.5">
								Isi alamat sekretariat atau lokasi kelembagaan untuk memudahkan verifikasi.
							</p>
						</div>
					</div>
				)}
			</ConfirmationModal>
		</div>
	);
}

// Accordion Section Component
function AccordionSection({ title, children, icon: Icon, color = "blue" }) {
	const [isOpen, setIsOpen] = useState(false);

	const colorClasses = {
		blue: {
			border: 'border-slate-200',
			bg: 'bg-slate-50',
			hover: 'hover:bg-slate-100',
			text: 'text-slate-700',
			icon: 'text-slate-600',
		},
		indigo: {
			border: 'border-slate-200',
			bg: 'bg-slate-50',
			hover: 'hover:bg-slate-100',
			text: 'text-slate-700',
			icon: 'text-slate-600',
		},
		purple: {
			border: 'border-slate-200',
			bg: 'bg-slate-50',
			hover: 'hover:bg-slate-100',
			text: 'text-slate-700',
			icon: 'text-slate-600',
		},
		emerald: {
			border: 'border-slate-200',
			bg: 'bg-slate-50',
			hover: 'hover:bg-slate-100',
			text: 'text-slate-700',
			icon: 'text-slate-600',
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
