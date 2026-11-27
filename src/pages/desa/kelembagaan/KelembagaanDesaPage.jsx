import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEditMode } from "../../../context/EditModeContext";
import {
	getKelembagaanSummary,
	getKelembagaanMasalah,
	createKarangTaruna,
	createLpm,
	createSatlinmas,
	createPkk,
	createLembagaLainnya,
	listLembagaLainnya,
} from "../../../services/kelembagaan";
import { getProdukHukums } from "../../../services/api";
import AktivitasLog from "../../../components/kelembagaan/AktivitasLog";
import { PetaLembaga, VerifikasiDitolak, TombolPeringatan } from "../../../components/kelembagaan/MasalahKelembagaan";
import {
	LuUsers,
	LuBuilding,
	LuHeart,
	LuShield,
	LuSprout,
	LuBuilding2,
	LuPlus,
	LuCheck,
	LuInfo,
	LuX,
	LuChevronDown,
	LuChevronUp,
	LuChevronRight,
	LuDownload,
	LuBookOpen,
	LuLock,
	LuLockOpen,
	LuMapPin,
	LuSearch,
	LuLandmark,
	LuFileText,
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
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, description, icon: Icon, loading, children, confirmDisabled = false, confirmLabel, collapsibleDescription = false }) => {
	const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

	useEffect(() => setIsDescriptionOpen(false), [isOpen, description]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
			<div className="w-full max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-slideUp">
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
								{collapsibleDescription && (
									<button type="button" onClick={() => setIsDescriptionOpen((open) => !open)} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-left font-medium text-slate-700 hover:bg-slate-100">
										<span>Ketentuan pembentukan</span>
										{isDescriptionOpen ? <LuChevronUp className="h-4 w-4" /> : <LuChevronDown className="h-4 w-4" />}
									</button>
								)}
								<div className={`text-slate-700 leading-relaxed space-y-3 ${collapsibleDescription && !isDescriptionOpen ? 'hidden' : ''}`}>
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
		karang_taruna_status: null,
		lpm_status: null,
		satlinmas_status: null,
		pkk_status: null,
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
	const [masalah, setMasalah] = useState(null);
	const [masalahLoading, setMasalahLoading] = useState(true);
	const [masalahError, setMasalahError] = useState(false);
	const navigate = useNavigate();
	const peraturanRef = useRef(null);

	// Peta & daftar masalah dimuat terpisah dari ringkasan: perhitungan BPJS-nya
	// lebih lambat, dan halaman tetap bisa dipakai bila endpoint ini gagal.
	const loadMasalah = useCallback(async () => {
		try {
			const res = await getKelembagaanMasalah();
			setMasalah(res.data.data);
			setMasalahError(false);
		} catch (err) {
			console.error('Gagal memuat masalah kelembagaan:', err);
			setMasalahError(true);
		} finally {
			setMasalahLoading(false);
		}
	}, []);

	useEffect(() => {
		loadMasalah();
	}, [loadMasalah]);
	
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
					karang_taruna_status: data.karang_taruna_status || null,
					lpm_status: data.lpm_status || null,
					satlinmas_status: data.satlinmas_status || null,
					pkk_status: data.pkk_status || null,
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
				karang_taruna_status: data.karang_taruna_status || null,
				lpm_status: data.lpm_status || null,
				satlinmas_status: data.satlinmas_status || null,
				pkk_status: data.pkk_status || null,
				total: data.total || 0,
				desa_nama: data.desa_nama || null,
				status_pemerintahan: data.status_pemerintahan || 'desa',
				verifikasi: data.verifikasi || null,
			});
			
			const lembagaItems = lembagaRes?.data?.data || [];
			setLembagaLainnyaItems(Array.isArray(lembagaItems) ? lembagaItems : []);
			loadMasalah();
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

	const v = summary.verifikasi || {};

	// Berapa lembaga aktif yang belum memenuhi tiap syarat verifikasi (dari ringkasan).
	const detailMulti = [v.rw, v.rt, v.posyandu, v.lembaga_lainnya].filter(Boolean);
	const detailTunggal = [v.karang_taruna, v.lpm, v.pkk, v.satlinmas].filter(Boolean);
	const kurang = (kolomMulti, kurangTunggal) =>
		detailMulti.reduce((s, d) => s + (d[kolomMulti] || 0), 0) + detailTunggal.filter(kurangTunggal).length;
	const syarat = [
		{ judul: "SK pembentukan terhubung", ket: "Produk hukum dikaitkan ke tiap lembaga", satuan: "lembaga", kurang: kurang("missing_sk", (d) => !d.has_sk) },
		{ judul: "Alamat sekretariat terisi", ket: "Alamat lengkap sekretariat lembaga", satuan: "lembaga", kurang: kurang("missing_alamat", (d) => !d.has_alamat) },
		{ judul: "Minimal satu pengurus", ket: "Pengurus terdaftar di setiap lembaga", satuan: "lembaga", kurang: kurang("missing_pengurus", (d) => !d.pengurus_count) },
		{ judul: "Data penduduk RT", ket: "Jumlah jiwa dan KK di setiap RT", satuan: "RT", kurang: v.rt?.missing_data_penduduk || 0 },
	];
	const syaratLengkap = syarat.filter((s) => s.kurang === 0).length;

	// Status satu baris register: hal pertama yang perlu diketahui operator.
	const statusMulti = (...parts) => {
		const d = parts.filter(Boolean);
		if (d.length === 0) return null;
		const ditolak = d.reduce((s, x) => s + (x.ditolak || 0), 0);
		const menunggu = d.reduce((s, x) => s + (x.unverified || 0), 0);
		if (ditolak > 0) return { tone: "bad", text: `${ditolak} ditolak` };
		if (menunggu > 0) return { tone: "wait", text: `${menunggu} menunggu verifikasi` };
		return { tone: "ok", text: "Semua terverifikasi" };
	};
	const rasioMulti = (...parts) => {
		const d = parts.filter(Boolean);
		if (d.length === 0) return null;
		return { verified: d.reduce((s, x) => s + (x.verified || 0), 0), total: d.reduce((s, x) => s + (x.total || 0), 0) };
	};
	// Lembaga nonaktif tidak ikut dihitung di ringkasan, jadi diberi label sendiri
	// supaya tidak terlihat seolah datanya hilang.
	const statusTunggal = (detail, statusKelembagaan) => {
		if (statusKelembagaan === "nonaktif") return { tone: "off", text: "Nonaktif" };
		if (!detail) return null;
		if (detail.status_verifikasi === "verified") return { tone: "ok", text: "Terverifikasi" };
		if (detail.status_verifikasi === "ditolak") return { tone: "bad", text: "Ditolak" };
		if (!detail.has_sk) return { tone: "wait", text: "SK belum terhubung" };
		if (!detail.has_alamat) return { tone: "wait", text: "Alamat sekretariat kosong" };
		if (!detail.pengurus_count) return { tone: "wait", text: "Belum ada pengurus" };
		return { tone: "wait", text: "Menunggu verifikasi" };
	};
	const statusLainnya = (item) => {
		if (item.status_kelembagaan === "nonaktif") return { tone: "off", text: "Nonaktif, tidak dihitung" };
		if (item.status_verifikasi === "verified") return { tone: "ok", text: "Terverifikasi" };
		if (item.status_verifikasi === "ditolak") return { tone: "bad", text: "Ditolak" };
		return { tone: "wait", text: "Menunggu verifikasi" };
	};

	const renderTunggal = ({ type, nama, icon, formed, detail, statusKelembagaan }) =>
		formed ? (
			<RegisterRow
				key={type}
				icon={icon}
				nama={nama}
				jumlah={detail ? `${detail.pengurus_count} pengurus` : "–"}
				rasio={detail ? { verified: detail.status_verifikasi === "verified" ? 1 : 0, total: 1 } : null}
				status={statusTunggal(detail, statusKelembagaan)}
				onOpen={() => navigate(`/desa/kelembagaan/${type}/detail`)}
			/>
		) : (
			<RegisterRow
				key={type}
				icon={icon}
				nama={nama}
				muted
				jumlah="Belum dibentuk"
				action={
					isEditMode ? (
						<button
							type="button"
							onClick={() => handleOpenModal(type)}
							className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50"
						>
							<LuPlus className="h-4 w-4" />
							Bentuk {nama}
						</button>
					) : (
						<span className="text-[13px] text-slate-500">Pengisian data ditutup</span>
					)
				}
			/>
		);

	return (
		<div className="space-y-6">
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

			<PetaLembaga masalah={masalah} loading={masalahLoading} error={masalahError} />
			<TombolPeringatan masalah={masalah} loading={masalahLoading} error={masalahError} />
			<VerifikasiDitolak masalah={masalah} loading={masalahLoading} error={masalahError} />

			<div className="flex flex-wrap items-start gap-8">
				<div className="flex min-w-0 flex-[999_1_640px] flex-col gap-8">
					{/* ═══ Lembaga Kemasyarakatan Desa ═══ */}
					<section className="flex flex-col gap-3">
						<h2 className="text-base font-semibold text-slate-900">Lembaga Kemasyarakatan Desa</h2>
						<div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
							<div className="min-w-[680px]">
								<RegisterHeader />
								<RegisterRow
									icon={LuBuilding}
									nama="RT & RW"
									jumlah={`${summary.rw} RW, ${summary.rt} RT`}
									rasio={rasioMulti(v.rw, v.rt)}
									status={statusMulti(v.rw, v.rt)}
									onOpen={() => navigate("/desa/kelembagaan/rw")}
								/>
								<RegisterRow
									icon={LuHeart}
									nama="Posyandu"
									jumlah={summary.posyandu}
									rasio={rasioMulti(v.posyandu)}
									status={statusMulti(v.posyandu)}
									onOpen={() => navigate("/desa/kelembagaan/posyandu")}
								/>
								{renderTunggal({ type: "karang-taruna", nama: "Karang Taruna", icon: LuUsers, formed: ktFormed, detail: v.karang_taruna, statusKelembagaan: summary.karang_taruna_status })}
								{renderTunggal({ type: "lpm", nama: "LPM", icon: LuBuilding2, formed: lpmFormed, detail: v.lpm, statusKelembagaan: summary.lpm_status })}
								{renderTunggal({ type: "pkk", nama: "PKK", icon: LuSprout, formed: pkkFormed, detail: v.pkk, statusKelembagaan: summary.pkk_status })}
							</div>
						</div>
					</section>

					{/* ═══ Kelembagaan Lainnya ═══ */}
					<section className="flex flex-col gap-3">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<div>
								<h2 className="text-base font-semibold text-slate-900">Kelembagaan lainnya</h2>
								<p className="mt-1 text-[13px] text-slate-500">Satlinmas dan lembaga tambahan sesuai kebutuhan desa</p>
							</div>
							{isEditMode && (
								<button
									type="button"
									onClick={() => handleOpenModal("lembaga-lainnya")}
									className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
								>
									<LuPlus className="h-4 w-4" />
									Tambah lembaga lainnya
								</button>
							)}
						</div>
						<div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
							<div className="min-w-[680px]">
								<RegisterHeader />
								{renderTunggal({ type: "satlinmas", nama: "Satlinmas", icon: LuShield, formed: satlinmasFormed, detail: v.satlinmas, statusKelembagaan: summary.satlinmas_status })}
								{lembagaLainnyaItems.map((item) => {
									const nonaktif = item.status_kelembagaan === "nonaktif";
									return (
										<RegisterRow
											key={item.id}
											icon={LuBuilding}
											nama={item.nama}
											muted={nonaktif}
											jumlah="Lembaga tambahan"
											rasio={nonaktif ? null : { verified: item.status_verifikasi === "verified" ? 1 : 0, total: 1 }}
											status={statusLainnya(item)}
											onOpen={() => navigate(`/desa/kelembagaan/lembaga-lainnya/${item.id}`)}
										/>
									);
								})}
							</div>
						</div>
					</section>

					{/* ═══ Panduan: ringkasan di depan, teks pasal dilipat ═══ */}
					<section className="flex flex-col gap-3">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<div>
								<h2 className="text-base font-semibold text-slate-900">Panduan</h2>
								<p className="mt-1 text-[13px] text-slate-500">Ringkasan Permendagri 18/2018 tentang Lembaga Kemasyarakatan Desa</p>
							</div>
							<button
								type="button"
								onClick={() => peraturanRef.current?.showModal()}
								className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50"
							>
								<LuFileText className="h-4 w-4 text-slate-500" />
								Lihat peraturan terkait kelembagaan
							</button>
						</div>
						<DokumenPeraturanModal dialogRef={peraturanRef} />
						<div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
							<p className="px-5 py-4 text-sm leading-relaxed text-slate-700">
								Lembaga Kemasyarakatan Desa (LKD) dibentuk Pemerintah Desa bersama masyarakat untuk membantu pelayanan pemerintahan,
								pembangunan, dan pemberdayaan masyarakat desa secara partisipatif.
							</p>
							<div className="grid border-t border-slate-100 md:grid-cols-2">
								<div className="px-5 py-4 md:border-r md:border-slate-100">
									<h3 className="text-[13px] font-medium text-slate-500">Lembaga wajib</h3>
									<dl className="mt-3 space-y-2.5 text-sm">
										{LEMBAGA_WAJIB.map(([nama, tugas]) => (
											<div key={nama} className="grid grid-cols-[104px_1fr] gap-3">
												<dt className="font-medium text-slate-900">{nama}</dt>
												<dd className="text-slate-600">{tugas}</dd>
											</div>
										))}
									</dl>
								</div>
								<div className="border-t border-slate-100 px-5 py-4 md:border-t-0">
									<h3 className="text-[13px] font-medium text-slate-500">Syarat pembentukan</h3>
									<ul className="mt-3 space-y-2 text-sm text-slate-700">
										{SYARAT_PEMBENTUKAN.map((s) => (
											<li key={s} className="flex items-start gap-2.5">
												<LuCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
												<span>{s}</span>
											</li>
										))}
									</ul>
								</div>
							</div>
							<div className="grid divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
								{KETENTUAN_PENGURUS.map(([nilai, ket]) => (
									<div key={ket} className="px-5 py-4">
										<p className="text-lg font-semibold text-slate-900">{nilai}</p>
										<p className="mt-0.5 text-[13px] text-slate-500">{ket}</p>
									</div>
								))}
							</div>
							<details className="group border-t border-slate-200">
								<summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
									<span className="flex items-center gap-2">
										<LuBookOpen className="h-4 w-4 text-slate-500" />
										Baca teks pasal
									</span>
									<LuChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
								</summary>
								<div className="divide-y divide-slate-100 border-t border-slate-100">
									{PASAL_LKD.map((bab) => (
										<details key={bab.judul} className="group/bab">
											<summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm text-slate-800 transition-colors hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
												<span>
													{bab.judul}
													<span className="ml-2 text-[13px] text-slate-400">Pasal {bab.pasal.map((p) => p.no).join(", ")}</span>
												</span>
												<LuChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform group-open/bab:rotate-90" />
											</summary>
											<div className="space-y-5 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-700">
												{bab.pasal.map((p) => (
													<div key={p.no}>
														<p className="mb-2 font-semibold text-slate-900">Pasal {p.no}</p>
														<ol className="space-y-2">
															{p.ayat.map((a, i) => (
																<li key={i} className="flex gap-2">
																	{p.ayat.length > 1 && <span className="flex-shrink-0 tabular-nums text-slate-500">({i + 1})</span>}
																	<div className="min-w-0">
																		<p>{a.t}</p>
																		{a.butir && (
																			<ol className="mt-1.5 list-[lower-alpha] space-y-1 pl-5 marker:text-slate-500">
																				{a.butir.map((b) => (
																					<li key={b}>{b}</li>
																				))}
																			</ol>
																		)}
																	</div>
																</li>
															))}
														</ol>
													</div>
												))}
											</div>
										</details>
									))}
								</div>
							</details>
						</div>
					</section>
				</div>

				<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-8">
					{/* ═══ Syarat verifikasi, dihitung dari data lembaga aktif ═══ */}
					<section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
						<div className="px-5 pb-4 pt-5">
							<div className="flex items-start justify-between gap-3">
								<div>
									<h2 className="text-base font-semibold text-slate-900">Syarat verifikasi</h2>
									<p className="mt-1 text-[13px] text-slate-500">Dihitung dari semua lembaga aktif</p>
								</div>
								<p className="whitespace-nowrap text-sm tabular-nums text-slate-500">
									<span className="text-2xl font-semibold text-slate-900">{syaratLengkap}</span> / {syarat.length}
								</p>
							</div>
							<div className="mt-4 flex h-1.5 gap-1">
								{syarat.map((s) => (
									<span key={s.judul} className={`flex-1 rounded-full ${s.kurang === 0 ? "bg-emerald-600" : "bg-slate-200"}`} />
								))}
							</div>
							<p className={`mt-3 text-[13px] ${syaratLengkap === syarat.length ? "text-emerald-700" : "text-slate-600"}`}>
								{syaratLengkap === syarat.length
									? "Semua syarat terpenuhi. Lembaga siap diverifikasi."
									: `${syarat.length - syaratLengkap} syarat belum terpenuhi. Lengkapi agar lembaga bisa diverifikasi.`}
							</p>
						</div>
						{/* Yang belum lengkap tampil di atas: itu yang perlu dikerjakan operator. */}
						<ul className="divide-y divide-slate-100 border-t border-slate-100">
							{[...syarat].sort((a, b) => (a.kurang === 0) - (b.kurang === 0)).map((s) => {
								const ok = s.kurang === 0;
								return (
									<li key={s.judul} className="px-5 py-4">
										{/* Judul + status satu baris, keterangan di bawah selebar kartu: tidak terjepit kolom sempit. */}
										<div className="flex items-baseline justify-between gap-3">
											<p className={`text-[15px] font-semibold leading-snug ${ok ? "text-slate-500" : "text-slate-900"}`}>{s.judul}</p>
											{ok ? (
												<span className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
													<LuCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
													Lengkap
												</span>
											) : (
												<span className="flex-shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-brand-700">
													{s.kurang} {s.satuan} kurang
												</span>
											)}
										</div>
										<p className="mt-1 text-xs leading-relaxed text-slate-500">{s.ket}</p>
									</li>
								);
							})}
						</ul>
					</section>

					<AktivitasLog mode="all" />
				</aside>
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
				collapsibleDescription={['karang-taruna', 'pkk', 'lpm', 'satlinmas'].includes(modalConfig.type)}
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

const LEMBAGA_WAJIB = [
	["RT & RW", "Pelayanan pemerintahan dan data kependudukan"],
	["PKK", "Pemberdayaan kesejahteraan keluarga"],
	["Karang Taruna", "Kesejahteraan sosial dan generasi muda"],
	["Posyandu", "Pelayanan kesehatan masyarakat"],
	["LPM", "Perencanaan pembangunan dan gotong royong"],
];

const SYARAT_PEMBENTUKAN = [
	"Berasaskan Pancasila dan UUD 1945",
	"Berkedudukan di desa setempat",
	"Bermanfaat dan dibutuhkan masyarakat",
	"Memiliki kepengurusan tetap",
	"Memiliki sekretariat tetap",
	"Tidak berafiliasi partai politik",
];

const KETENTUAN_PENGURUS = [
	["5 tahun", "Masa jabatan pengurus"],
	["Maks. 2 periode", "Berturut-turut atau tidak"],
	["Tidak rangkap", "Jabatan LKD lain atau partai politik"],
];

// Teks Permendagri 18/2018. Ayat bernomor hanya bila pasal punya lebih dari satu ayat.
const PASAL_LKD = [
	{
		judul: "Pembentukan dan penetapan",
		pasal: [
			{
				no: 3,
				ayat: [
					{ t: "LKD dibentuk atas prakarsa Pemerintah Desa dan masyarakat." },
					{
						t: "Pembentukan LKD sebagaimana dimaksud pada ayat (1) dengan memenuhi persyaratan:",
						butir: [
							"berasaskan Pancasila dan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945;",
							"berkedudukan di Desa setempat;",
							"keberadaannya bermanfaat dan dibutuhkan masyarakat Desa;",
							"memiliki kepengurusan yang tetap;",
							"memiliki sekretariat yang bersifat tetap; dan",
							"tidak berafiliasi kepada partai politik.",
						],
					},
					{ t: "Ketentuan lebih lanjut mengenai Pembentukan LKD sebagaimana dimaksud pada ayat (1) diatur dengan Peraturan Desa." },
				],
			},
		],
	},
	{
		judul: "Tugas dan fungsi",
		pasal: [
			{
				no: 4,
				ayat: [
					{
						t: "LKD bertugas:",
						butir: [
							"melakukan pemberdayaan masyarakat Desa;",
							"ikut serta dalam perencanaan dan pelaksanaan pembangunan; dan",
							"meningkatkan pelayanan masyarakat Desa.",
						],
					},
					{ t: "Dalam melaksanakan tugas sebagaimana dimaksud pada ayat (1) huruf b, LKD mengusulkan program dan kegiatan kepada Pemerintah Desa." },
				],
			},
			{
				no: 5,
				ayat: [
					{
						t: "Dalam melaksanakan tugas sebagaimana dimaksud dalam Pasal 4, LKD memiliki fungsi:",
						butir: [
							"menampung dan menyalurkan aspirasi masyarakat;",
							"menanamkan dan memupuk rasa persatuan dan kesatuan masyarakat;",
							"meningkatkan kualitas dan mempercepat pelayanan Pemerintah Desa kepada masyarakat Desa;",
							"menyusun rencana, melaksanakan, mengendalikan, melestarikan, dan mengembangkan hasil pembangunan secara partisipatif;",
							"menumbuhkan, mengembangkan, dan menggerakkan prakarsa, partisipasi, swadaya, serta gotong royong masyarakat;",
							"meningkatkan kesejahteraan keluarga; dan",
							"meningkatkan kualitas sumber daya manusia.",
						],
					},
				],
			},
		],
	},
	{
		judul: "Jenis lembaga",
		pasal: [
			{
				no: 6,
				ayat: [
					{
						t: "Jenis LKD paling sedikit meliputi:",
						butir: [
							"Rukun Tetangga;",
							"Rukun Warga;",
							"Pemberdayaan Kesejahteraan Keluarga;",
							"Karang Taruna;",
							"Pos Pelayanan Terpadu; dan",
							"Lembaga Pemberdayaan Masyarakat.",
						],
					},
					{ t: "Pemerintah Desa dan masyarakat Desa dapat membentuk LKD selain sebagaimana dimaksud pada ayat (1) sesuai dengan perkembangan dan kebutuhan." },
					{ t: "Ketentuan lebih lanjut mengenai jenis LKD sebagaimana dimaksud pada ayat (1) ditetapkan dalam Peraturan Desa." },
				],
			},
		],
	},
	{
		judul: "Tugas setiap jenis lembaga",
		pasal: [
			{
				no: 7,
				ayat: [
					{
						t: "Rukun Tetangga dan Rukun Warga sebagaimana dimaksud dalam Pasal 6 ayat (1) huruf a dan huruf b bertugas:",
						butir: [
							"membantu Kepala Desa dalam bidang pelayanan pemerintahan;",
							"membantu Kepala Desa dalam menyediakan data kependudukan dan perizinan; dan",
							"melaksanakan tugas lain yang diberikan oleh Kepala Desa.",
						],
					},
					{ t: "Pemberdayaan Kesejahteraan Keluarga sebagaimana dimaksud dalam Pasal 6 ayat (1) huruf c, bertugas membantu Kepala Desa dalam melaksanakan pemberdayaan kesejahteraan keluarga." },
					{ t: "Karang Taruna sebagaimana dimaksud dalam Pasal 6 ayat (1) huruf d, bertugas membantu Kepala Desa dalam menanggulangi masalah kesejahteraan sosial dan pengembangan generasi muda." },
					{ t: "Pos Pelayanan Terpadu sebagaimana dimaksud dalam Pasal 6 ayat (1) huruf e bertugas membantu Kepala Desa dalam peningkatan pelayanan kesehatan masyarakat Desa." },
					{ t: "Lembaga Pemberdayaan Masyarakat sebagaimana dimaksud dalam Pasal 6 ayat (1) huruf f, bertugas membantu Kepala Desa dalam menyerap aspirasi masyarakat terkait perencanaan pembangunan desa dan menggerakkan masyarakat dalam pelaksanaan pembangunan desa dengan swadaya gotong-royong." },
				],
			},
		],
	},
	{
		judul: "Kepengurusan",
		pasal: [
			{
				no: 8,
				ayat: [
					{ t: "Pengurus LKD terdiri atas:", butir: ["ketua;", "sekretaris;", "bendahara; dan", "bidang sesuai dengan kebutuhan."] },
					{ t: "Ketentuan lebih lanjut mengenai pengurus LKD sebagaimana dimaksud pada ayat (1) ditetapkan dengan Keputusan Kepala Desa." },
					{ t: "Pengurus LKD sebagaimana dimaksud pada ayat (1) memegang jabatan selama 5 (lima) tahun terhitung sejak tanggal ditetapkan." },
					{ t: "Pengurus LKD sebagaimana dimaksud pada ayat (1) dapat menjabat paling banyak 2 (dua) kali masa jabatan secara berturut-turut atau tidak secara berturut-turut." },
					{ t: "Pengurus LKD dilarang merangkap jabatan pada LKD lainnya dan dilarang menjadi anggota salah satu partai politik." },
				],
			},
		],
	},
];

const DOKUMEN_PERATURAN = [
	{
		tingkat: "Pusat",
		dokumen: [
			{ jenis: "Permendagri", no: 18, tahun: 2018, judul: "Lembaga Kemasyarakatan Desa", href: "/peraturan/Permendagri No. 18 Tahun 2018.pdf" },
			{ jenis: "Permendagri", no: 26, tahun: 2020, judul: "Tibum, Tranmas, dan Linmas", href: "/peraturan/Permendagri-26-Thn-2020-ttg-Linmas.pdf" },
			{ jenis: "Permendagri", no: 36, tahun: 2020, judul: "Gerakan PKK", href: "/peraturan/PERMENDAGRI_36_TAHUN_2020 (1).pdf" },
			{ jenis: "Permendagri", no: 11, tahun: 2023, judul: "Sarana prasarana Linmas", href: "/peraturan/Permendagri Nomor 11 Tahun 2023.pdf" },
			{ jenis: "Permendagri", no: 13, tahun: 2024, judul: "Posyandu", href: "/peraturan/Permendagri No 13 Tahun 2024.pdf" },
		],
	},
	{
		tingkat: "Kabupaten Bogor",
		dokumen: [
			{ jenis: "Perda", no: 9, tahun: 2011, judul: "Lembaga Kemasyarakatan", href: "/peraturan/perda no 9 tahun 2011.pdf" },
			{ jenis: "Perbup", no: 31, tahun: 2012, judul: "Pembentukan LPM, RT, dan RW", href: "/peraturan/Perbup 31 Tahun 2012 - Tata Cara Pembentukan LPM Desa, Kel, RW dan RT.pdf" },
		],
	},
];

/** Daftar peraturan dalam <dialog> native: Esc, fokus, dan backdrop diurus browser. */
function DokumenPeraturanModal({ dialogRef }) {
	const tutup = () => dialogRef.current?.close();
	return (
		<dialog
			ref={dialogRef}
			aria-labelledby="judul-peraturan"
			// Klik di backdrop (di luar panel) menutup modal.
			onClick={(e) => e.target === e.currentTarget && tutup()}
			className="m-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
		>
			<div className="flex max-h-[calc(100dvh-4rem)] flex-col">
				<div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
					<div>
						<h2 id="judul-peraturan" className="text-base font-semibold text-slate-900">Peraturan terkait kelembagaan</h2>
						<p className="mt-1 text-[13px] text-slate-500">Dasar hukum lembaga kemasyarakatan. Dokumen dibuka di tab baru (PDF).</p>
					</div>
					<button
						type="button"
						onClick={tutup}
						aria-label="Tutup"
						className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
					>
						<LuX className="h-5 w-5" />
					</button>
				</div>
				<div className="overflow-y-auto">
					{DOKUMEN_PERATURAN.map((grup) => (
						<div key={grup.tingkat}>
							<p className="sticky top-0 border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-medium text-slate-500">{grup.tingkat}</p>
							<ul className="divide-y divide-slate-100">
								{grup.dokumen.map((d) => (
									<li key={d.href}>
										<a
											href={d.href}
											target="_blank"
											rel="noopener noreferrer"
											className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
										>
											<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-slate-900 group-hover:ring-1 group-hover:ring-slate-200">
												<LuFileText className="h-4 w-4" />
											</span>
											<span className="min-w-0 flex-1">
												<span className="block text-sm font-medium text-slate-900">{d.judul}</span>
												<span className="block text-xs tabular-nums text-slate-500">
													{d.jenis} No. {d.no} Tahun {d.tahun}
												</span>
											</span>
											<LuDownload aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-slate-900" />
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</dialog>
	);
}

// Kotak status: bentuk yang sama dengan Peta Lembaga, jadi register dan peta terbaca satu bahasa.
const STATUS_TONE = {
	ok: { text: "text-emerald-700", box: "bg-emerald-600" },
	wait: { text: "text-slate-700", box: "ring-1 ring-inset ring-slate-400" },
	bad: { text: "text-brand-700", box: "bg-brand-500" },
	off: { text: "text-slate-500", box: "bg-slate-300" },
};

const REGISTER_GRID =
	"grid grid-cols-[minmax(180px,2fr)_minmax(100px,1fr)_minmax(100px,0.8fr)_minmax(180px,1.5fr)_16px] items-center gap-4 px-5";

function RegisterHeader() {
	return (
		<div className={`${REGISTER_GRID} min-h-10 text-[13px] text-slate-500`}>
			<span>Lembaga</span>
			<span>Jumlah</span>
			<span>Terverifikasi</span>
			<span>Status</span>
			<span />
		</div>
	);
}

/** Satu baris register lembaga. Bisa dibuka (onOpen) atau membawa tombol aksi sendiri. */
function RegisterRow({ icon: Icon, nama, jumlah, rasio, status, onOpen, action, muted = false }) {
	const tone = status ? STATUS_TONE[status.tone] : null;
	const isi = (
		<>
			<span className={`flex min-w-0 items-center gap-3 font-medium ${muted ? "text-slate-500" : "text-slate-900"}`}>
				<Icon className="h-[18px] w-[18px] flex-shrink-0 text-slate-500" />
				<span className="truncate">{nama}</span>
			</span>
			<span className={`text-sm tabular-nums ${muted ? "text-slate-500" : "text-slate-700"}`}>{jumlah}</span>
			<span className="text-sm tabular-nums text-slate-900">
				{rasio ? (
					<>
						{rasio.verified} <span className="text-slate-500">/ {rasio.total}</span>
					</>
				) : (
					<span className="text-slate-400">–</span>
				)}
			</span>
			<span className="min-w-0">
				{action ||
					(tone && (
						<span className={`inline-flex items-center gap-2 text-[13px] ${tone.text}`}>
							<span className={`inline-block h-2.5 w-2.5 flex-shrink-0 rounded-[2px] ${tone.box}`} />
							<span className="truncate">{status.text}</span>
						</span>
					))}
			</span>
			{onOpen ? <LuChevronRight className="h-4 w-4 text-slate-400" /> : <span />}
		</>
	);
	const cls = `${REGISTER_GRID} min-h-[60px] w-full border-t border-slate-100 text-left`;
	if (onOpen) {
		return (
			<button type="button" onClick={onOpen} className={`${cls} transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none`}>
				{isi}
			</button>
		);
	}
	return <div className={cls}>{isi}</div>;
}
