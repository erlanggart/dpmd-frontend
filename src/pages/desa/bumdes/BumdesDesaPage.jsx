import React, { useState, useEffect } from "react";
import FormulirBumdes from '../../../components/bumdes/FormulirBumdes';
import { useAuth } from "../../../context/AuthContext";
import Swal from "sweetalert2";
import {
	FiSave,
	FiEdit3,
	FiTrash2,
	FiPlus,
	FiEye,
	FiShoppingBag,
	FiUsers,
	FiDollarSign,
	FiMapPin,
	FiCalendar,
	FiFileText,
	FiRefreshCw,
	FiCheckCircle,
	FiAlertCircle,
} from "react-icons/fi";
import api from "../../../api";
import BumdesDesaService from "../../../services/bumdesDesaService";
import DesaPageHeader from "../../../components/desa/DesaPageHeader";
import API_CONFIG from "../../../config/api";

// Dokumen BUMDes disimpan sebagai path relatif atau nama berkas saja. Desa harus
// bisa membukanya, bukan cuma membaca namanya: berkas ini bisa saja diunggah
// pegawai SPKED, bukan oleh desa sendiri.
const FOLDER_DOKUMEN = {
	LaporanKeuangan2021: "bumdes_laporan_keuangan",
	LaporanKeuangan2022: "bumdes_laporan_keuangan",
	LaporanKeuangan2023: "bumdes_laporan_keuangan",
	LaporanKeuangan2024: "bumdes_laporan_keuangan",
	ProfilBUMDesa: "bumdes_dokumen_badanhukum",
	BeritaAcara: "bumdes_dokumen_badanhukum",
	AnggaranDasar: "bumdes_dokumen_badanhukum",
	AnggaranRumahTangga: "bumdes_dokumen_badanhukum",
	ProgramKerja: "bumdes_dokumen_badanhukum",
	Perdes: "bumdes_dokumen_badanhukum",
	SK_BUM_Desa: "bumdes_dokumen_badanhukum",
};

const tautanDokumen = (field, nilai) => {
	if (!nilai) return null;
	const berkas = String(nilai).split("/").pop();
	const folder = FOLDER_DOKUMEN[field];
	if (!berkas || !folder) return null;
	return `${API_CONFIG.STORAGE_URL}/${folder}/${berkas}`;
};

const DokumenTersimpan = ({ field, nilai }) => {
	const tautan = tautanDokumen(field, nilai);
	if (!tautan) return null;
	return (
		<a
			href={tautan}
			target="_blank"
			rel="noreferrer"
			className="text-xs text-slate-600 hover:text-slate-900 underline flex items-center gap-1"
		>
			<FiFileText /> {String(nilai).split("/").pop()}
		</a>
	);
};

const ProdukHukumTerpilih = ({ id, daftar }) => {
	if (!id) return null;
	const dipilih = (daftar || []).find((x) => String(x.id) === String(id));
	if (!dipilih?.file) return null;
	const berkas = String(dipilih.file).split("/").pop();
	return (
		<a
			href={`${API_CONFIG.STORAGE_URL}/produk-hukum/${berkas}`}
			target="_blank"
			rel="noreferrer"
			className="mt-1 text-xs text-slate-600 hover:text-slate-900 underline flex items-center gap-1"
		>
			<FiFileText /> Lihat dokumen: {dipilih.judul || berkas}
		</a>
	);
};

const BumdesDesaPage = () => {
	const { user } = useAuth();
	const [bumdesData, setBumdesData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [produkHukumOptions, setProdukHukumOptions] = useState({
		perdes: [],
		sk: []
	});
	const [formData, setFormData] = useState({
		// 1. Identitas
		namabumdesa: "", desa: "", kecamatan: "", kode_desa: "",
		TahunPendirian: "", AlamatBumdesa: "", TelfonBumdes: "", Alamatemail: "",
		status: "aktif", keterangan_tidak_aktif: "",

		// 2. Dasar hukum & legalitas
		NomorPerdes: "", produk_hukum_perdes_id: "", produk_hukum_sk_bumdes_id: "",
		NIB: "", LKPP: "", NPWP: "", badanhukum: "",

		// 3. Kepengurusan
		NamaPenasihat: "", JenisKelaminPenasihat: "", HPPenasihat: "",
		NamaPengawas: "", JenisKelaminPengawas: "", HPPengawas: "",
		NamaDirektur: "", JenisKelaminDirektur: "", HPDirektur: "",
		NamaSekretaris: "", JenisKelaminSekretaris: "", HPSekretaris: "",
		NamaBendahara: "", JenisKelaminBendahara: "", HPBendahara: "",
		NamaStafLainnya: "", JenisKelaminStafLainnya: "", HPStafLainnya: "",

		// 4. Tenaga kerja & bidang usaha
		TotalTenagaKerja: "",
		JenisUsaha: "", JenisUsahaUtama: "", JenisUsahaLainnya: "", JenisUsaha2021: "",

		// 5. Ketahanan pangan
		JenisUsahaKetahananPangan: "", KeteranganUsahaKetahananPangan: "",
		VolumeKetahananPangan: "", AnggaranModalKetahananPangan: "",

		// 6. Permodalan & aset
		PenyertaanModal2019: "", PenyertaanModal2020: "", PenyertaanModal2021: "",
		PenyertaanModal2022: "", PenyertaanModal2023: "", PenyertaanModal2024: "",
		PenganggaranPenyertaanModal2025: "", PenyertaanModalTPKK: "",
		TotalRealisasiPenyertaanModal20192025: "", JumlahModalAwal: "",
		SumberLain: "", JenisAset: "", NilaiAset: "",

		// 7. Omset & laba
		Omset2023: "", Laba2023: "",
		Omset2024Sem1: "", Laba2024Sem1: "",
		Omset2024: "", Laba2024: "",
		Omset2025: "", Laba2025: "",

		// 8. Kontribusi PADes
		KontribusiTerhadapPADes2021: "", KontribusiTerhadapPADes2022: "",
		KontribusiTerhadapPADes2023: "", KontribusiTerhadapPADes2024: "",
		KontribusiTerhadapPADes2025: "",

		// 9. Kemitraan
		KerjasamaPihakKetiga: "", "TahunMulai_TahunBerakhir": "",
		KontribusiKemitraanPADes2024: "", KontribusiKemitraanPADes2025: "",

		// 10. Peran dalam program pemerintah
		Ketapang2024: "", Ketapang2025: "", DesaWisata: "", DesaWisataStatus: "",
		PeranMBG: "", MekanismeKerjaSamaMBG: "", JumlahSPPG: "", TahunKerjaSamaMBG: "",

		// 11. Bantuan
		BantuanKementrian: "", BantuanLaptopShopee: "", BantuanLainnya: "",

		// 12. Tambahan
		ECommerce: "", LinkSK: "", LinkLapKeuangan2021: "",
		LinkSKKepengurusan2021: "", CatatanTambahan: "",
	});

	// State untuk file uploads - Perdes dan SK sudah terintegrasi dengan Produk Hukum Desa
	const [fileUploads, setFileUploads] = useState({
		LaporanKeuangan2021: null,
		LaporanKeuangan2022: null,
		LaporanKeuangan2023: null,
		LaporanKeuangan2024: null,
		ProfilBUMDesa: null,
		BeritaAcara: null,
		AnggaranDasar: null,
		AnggaranRumahTangga: null,
		ProgramKerja: null,
	});

	// Fetch BUMDES data dan produk hukum options untuk desa ini
	useEffect(() => {
		const initializeData = async () => {
			try {
				setLoading(true);
				console.log('Initializing BUMDes page, user:', user?.desa?.nama);
				
				// Fetch both data in parallel
				await Promise.all([
					fetchBumdesData(),
					fetchProdukHukumOptions()
				]);
			} catch (error) {
				console.error('Error initializing BUMDes page:', error);
			} finally {
				setLoading(false);
			}
		};

		initializeData();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const fetchBumdesData = async () => {
		try {
			const result = await BumdesDesaService.getBumdesData();
			
			if (result.success && result.data) {
				setBumdesData(result.data);
				setFormData(result.data);
			} else {
				// Jika belum ada data, set default data dengan info desa
				setFormData(prev => ({
					...prev,
					desa: user?.desa?.nama || "",
					kecamatan: user?.desa?.kecamatan?.nama || "",
					kode_desa: user?.desa?.kode || "",
				}));
			}
		} catch (error) {
			console.error("Error fetching BUMDES data:", error);
			
			// Set default data dengan info desa jika error
			setFormData(prev => ({
				...prev,
				desa: user?.desa?.nama || "",
				kecamatan: user?.desa?.kecamatan?.nama || "",
				kode_desa: user?.desa?.kode || "",
			}));
		}
	};

	const fetchProdukHukumOptions = async () => {
		try {
			console.log('Fetching produk hukum options for BUMDES...');
			const result = await BumdesDesaService.getProdukHukumForBumdes();
			
			console.log('Produk Hukum API Response:', result);
			
			if (result.success && result.data) {
				console.log('Setting produk hukum options:', {
					perdes: result.data.perdes?.length || 0,
					sk: result.data.sk?.length || 0,
					sk_bumdes: result.data.sk_bumdes?.length || 0
				});
				
				setProdukHukumOptions({
					perdes: result.data.perdes || [],
					sk: result.data.sk || result.data.sk_bumdes || []
				});
			} else {
				console.warn('No produk hukum data received');
				setProdukHukumOptions({ perdes: [], sk: [] });
			}
		} catch (error) {
			console.error("Error fetching produk hukum options:", error);
			
			// Show user-friendly notification
			Swal.fire({
				icon: 'warning',
				title: 'Perhatian',
				text: 'Gagal memuat data Produk Hukum. Pastikan Anda sudah mengupload Perdes dan SK di menu Produk Hukum.',
				confirmButtonColor: '#3b82f6',
			});
			
			setProdukHukumOptions({ perdes: [], sk: [] });
		}
	};

	const handleInputChange = (field, value) => {
		setFormData(prev => ({
			...prev,
			[field]: value
		}));
	};

	const handleSave = async () => {
		try {
			setSaving(true);

			// Validasi menggunakan service
			const validation = BumdesDesaService.validateBumdesData(formData);
			if (!validation.isValid) {
				Swal.fire("Error", validation.errors.join('\n'), "error");
				setSaving(false);
				return;
			}

			let result;
			
			if (bumdesData) {
				// === UPDATE EXISTING DATA ===
				// STEP 1: Update data tanpa file
				result = await BumdesDesaService.updateBumdes(bumdesData.id, formData);
				
				// STEP 2: Upload files satu per satu jika ada
				const fileFields = Object.keys(fileUploads).filter(key => fileUploads[key] !== null);
				
				if (fileFields.length > 0) {
					for (const fieldName of fileFields) {
						try {
							const fileData = new FormData();
							fileData.append('file', fileUploads[fieldName]);
							fileData.append('bumdes_id', bumdesData.id);
							fileData.append('field_name', fieldName);

							await api.post('/desa/bumdes/upload-file', fileData, {
								headers: { 'Content-Type': 'multipart/form-data' }
							});
						} catch (fileError) {
							console.error(`Failed to upload ${fieldName}:`, fileError);
							// Continue dengan file lain meskipun ada yang gagal
						}
					}
				}
			} else {
				// === CREATE NEW DATA ===
				// STEP 1: Submit data TANPA file dulu
				result = await BumdesDesaService.createBumdes(formData);
				const bumdesId = result.data?.id;

				// STEP 2: Upload files satu per satu jika ada
				const fileFields = Object.keys(fileUploads).filter(key => fileUploads[key] !== null);
				
				if (fileFields.length > 0 && bumdesId) {
					for (const fieldName of fileFields) {
						try {
							const fileData = new FormData();
							fileData.append('file', fileUploads[fieldName]);
							fileData.append('bumdes_id', bumdesId);
							fileData.append('field_name', fieldName);

							await api.post('/desa/bumdes/upload-file', fileData, {
								headers: { 'Content-Type': 'multipart/form-data' }
							});
						} catch (fileError) {
							console.error(`Failed to upload ${fieldName}:`, fileError);
							// Continue dengan file lain meskipun ada yang gagal
						}
					}
				}
			}

			if (result.success) {
				setBumdesData(result.data);
				setIsEditing(false);
				
				// Reset file uploads state
				setFileUploads({
					LaporanKeuangan2021: null,
					LaporanKeuangan2022: null,
					LaporanKeuangan2023: null,
					LaporanKeuangan2024: null,
					ProfilBUMDesa: null,
					BeritaAcara: null,
					AnggaranDasar: null,
					AnggaranRumahTangga: null,
					ProgramKerja: null,
				});
				
				Swal.fire({
					title: "Berhasil!",
					text: bumdesData ? "Data BUMDES berhasil diperbarui" : "Data BUMDES berhasil disimpan",
					icon: "success",
					confirmButtonText: "OK"
				});

				// Refresh data
				await fetchBumdesData();
			}
		} catch (error) {
			console.error("Error saving BUMDES data:", error);
			
			// Tampilkan error validasi jika ada
			let errorMessage = "Gagal menyimpan data BUMDES";
			if (error.response?.data?.errors) {
				const errors = error.response.data.errors;
				const errorList = Object.entries(errors)
					.map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
					.join('\n');
				errorMessage = `Validasi gagal:\n\n${errorList}`;
			} else if (error.response?.data?.message) {
				errorMessage = error.response.data.message;
			} else if (error.message) {
				errorMessage = error.message;
			}
			
			Swal.fire("Error", errorMessage, "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!bumdesData) return;

		const result = await Swal.fire({
			title: "Hapus Data BUMDES?",
			text: "Data yang dihapus tidak dapat dikembalikan!",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#3085d6",
			confirmButtonText: "Ya, Hapus!",
			cancelButtonText: "Batal"
		});

		if (result.isConfirmed) {
			try {
				setSaving(true);
				await BumdesDesaService.deleteBumdes(bumdesData.id);
				
				setBumdesData(null);
				setFormData({
					...formData,
					namabumdesa: "",
					upload_status: "not_uploaded"
				});
				setIsEditing(false);

				Swal.fire("Terhapus!", "Data BUMDES berhasil dihapus", "success");
			} catch (error) {
				console.error("Error deleting BUMDES data:", error);
				Swal.fire("Error", "Gagal menghapus data BUMDES", "error");
			} finally {
				setSaving(false);
			}
		}
	};

	const renderFormSection = (title, icon, children) => (
		<div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
			<div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
				<div className="rounded-lg bg-slate-100 p-2 text-slate-700">
					{icon}
				</div>
				<h3 className="text-base font-semibold text-slate-900">{title}</h3>
			</div>
			{children}
		</div>
	);

	const fieldClass = (disabled) =>
		`w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 ${
			disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : "bg-white"
		}`;

	// renderInput / renderTextarea / renderBaca sudah tidak ada di sini:
	// kolom-kolomnya digambar FormulirBumdes dari skema bersama. Yang tersisa
	// hanya renderSelect, karena pemilih Perdes/SK memakai bentuk opsi khas
	// modul Produk Hukum (nomor - judul (tahun)), bukan {value,label} biasa.
	const renderSelect = (label, field, options, placeholder = "Pilih opsi", showInfo = false) => (
		<div>
			<label className="mb-1.5 block text-sm font-medium text-slate-700">
				{label}
				{showInfo && (
					<span className="ml-2 text-xs text-slate-400">(Terintegrasi dengan Produk Hukum)</span>
				)}
			</label>
			<select
				value={formData[field] || ""}
				onChange={(e) => handleInputChange(field, e.target.value)}
				disabled={!isEditing}
				className={fieldClass(!isEditing)}
			>
				<option value="">{placeholder}</option>
				{Array.isArray(options) && options.length > 0 ? (
					options.map((option) => (
						<option key={option.id || option.value} value={option.id || option.value}>
							{option.nomor ? `${option.nomor} - ${option.judul} (${option.tahun})` : (option.label || option)}
						</option>
					))
				) : (
					<option key="no-data" disabled>Tidak ada data tersedia</option>
				)}
			</select>
			{formData[field] && options.length > 0 && (
				<div className="mt-2 p-3 bg-slate-50 rounded-lg">
					{(() => {
						const selected = options.find(opt => opt.id === formData[field]);
						return selected ? (
							<div className="text-sm text-slate-800">
								<div className="font-medium">{selected.judul}</div>
								<div className="text-slate-600 mt-1">
									{selected.singkatan_jenis || selected.jenis} {selected.nomor} Tahun {selected.tahun}
								</div>
								{selected.tanggal_penetapan && (
									<div className="text-slate-600">
										Ditetapkan: {new Date(selected.tanggal_penetapan).toLocaleDateString('id-ID')}
									</div>
								)}
							</div>
						) : null;
					})()}
				</div>
			)}
		</div>
	);

	if (loading) {
		return (
			<div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900"></div>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			<DesaPageHeader
				icon={FiShoppingBag}
				eyebrow="Data Desa"
				title="Data BUMDes"
				description={`${user?.desa?.nama || "Desa"}${user?.desa?.kecamatan?.nama ? `, Kecamatan ${user.desa.kecamatan.nama}` : ""} — identitas, legalitas, permodalan, dan kondisi usaha BUMDes.`}
				actions={
					<>
						<span
							className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
								bumdesData
									? "bg-emerald-50 text-emerald-700 ring-emerald-100"
									: "bg-amber-50 text-amber-700 ring-amber-100"
							}`}
						>
							{bumdesData ? (
								<FiCheckCircle className="h-3.5 w-3.5" />
							) : (
								<FiAlertCircle className="h-3.5 w-3.5" />
							)}
							{bumdesData ? "Data tersimpan" : "Belum ada data"}
						</span>

						{!isEditing ? (
							<>
								<button
									onClick={() => setIsEditing(true)}
									className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
								>
									<FiEdit3 className="h-4 w-4" />
									{bumdesData ? "Edit Data" : "Input Data"}
								</button>

								{bumdesData && (
									<button
										onClick={handleDelete}
										className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:border-rose-200 hover:bg-rose-50"
									>
										<FiTrash2 className="h-4 w-4" />
										Hapus
									</button>
								)}
							</>
						) : (
							<>
								<button
									onClick={handleSave}
									disabled={saving}
									className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
								>
									{saving ? (
										<FiRefreshCw className="h-4 w-4 animate-spin" />
									) : (
										<FiSave className="h-4 w-4" />
									)}
									{saving ? "Menyimpan..." : "Simpan"}
								</button>

								<button
									onClick={() => {
										setIsEditing(false);
										setFormData(bumdesData || {});
									}}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
								>
									Batal
								</button>
							</>
						)}
					</>
				}
			/>

			{/* Kolom-kolomnya tidak lagi ditulis di sini.
			    Seluruh daftar kolom BUM Desa ada di components/bumdes/skemaBumdes.js
			    dan dipakai bersama dengan formulir Bidang SPKED. Dulu keduanya
			    ditulis terpisah dan menyimpang sampai tiga puluh kolom — SPKED
			    tidak punya Omset/Laba 2025, blok MBG, maupun ketahanan pangan.
			    Kolom yang tidak ada di formulir bukan cuma tak bisa diisi, ia juga
			    tak terlihat, jadi tidak ada yang sadar hilang.

			    Yang tinggal di berkas ini hanya yang memang khas desa: pemilih
			    Perdes/SK dari modul Produk Hukum (slot di bawah) dan unggahan
			    dokumen di bagian 15. */}
			<FormulirBumdes
				data={formData}
				onUbah={handleInputChange}
				bisaSunting={isEditing}
				mode="desa"
				slotDasarHukum={
					<div className="space-y-4">
						<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
							<div className="mb-2 flex items-center gap-2">
								<FiFileText className="text-slate-600" />
								<span className="text-sm font-medium text-slate-800">
									Dokumen Hukum Terintegrasi
								</span>
							</div>
							<p className="text-sm text-slate-700">
								Pilih dokumen PERDES dan SK BUMDES yang sudah diunggah lewat menu
								Produk Hukum. Bila belum ada, unggah dulu di menu tersebut.
							</p>
						</div>

						{(!produkHukumOptions.perdes || produkHukumOptions.perdes.length === 0) &&
						 (!produkHukumOptions.sk || produkHukumOptions.sk.length === 0) && (
							<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
								<h4 className="mb-1 text-sm font-medium text-yellow-800">
									Belum Ada Produk Hukum
								</h4>
								<p className="text-xs text-yellow-700">
									Anda belum mengunggah Peraturan Desa (PERDES) atau SK BUMDES.
									Silakan unggah lebih dulu lewat menu <strong>Produk Hukum</strong>.
								</p>
							</div>
						)}

						{renderSelect(
							"Peraturan Desa (PERDES) BUMDES",
							"produk_hukum_perdes_id",
							produkHukumOptions.perdes || [],
							produkHukumOptions.perdes?.length > 0
								? "Pilih PERDES BUMDES yang sudah diupload"
								: "Belum ada PERDES - Upload di menu Produk Hukum",
							true
						)}
						<ProdukHukumTerpilih
							id={formData.produk_hukum_perdes_id}
							daftar={produkHukumOptions.perdes}
						/>

						{renderSelect(
							"Surat Keputusan (SK) BUMDES",
							"produk_hukum_sk_bumdes_id",
							produkHukumOptions.sk || [],
							produkHukumOptions.sk?.length > 0
								? "Pilih SK BUMDES yang sudah diupload"
								: "Belum ada SK - Upload di menu Produk Hukum",
							true
						)}
						<ProdukHukumTerpilih
							id={formData.produk_hukum_sk_bumdes_id}
							daftar={produkHukumOptions.sk}
						/>
					</div>
				}
			/>

			{/* 15. Upload Dokumen */}
			{renderFormSection("15. Upload Dokumen", <FiFileText className="text-slate-600" />, (
				<div className="space-y-6">
					{/* Laporan Keuangan Files */}
					<div className="border-b pb-4">
						<h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
							<FiFileText className="text-slate-600" />
							Laporan Keuangan
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{['2021', '2022', '2023', '2024'].map(year => (
								<div key={year} className="space-y-2">
									<label className="block text-sm font-medium text-slate-700">
										Laporan Keuangan {year}
									</label>
									<input
										type="file"
										accept=".pdf,.doc,.docx"
										onChange={(e) => {
											const file = e.target.files[0];
											if (file) {
												if (file.size > 5 * 1024 * 1024) {
													Swal.fire('Error', 'Ukuran file maksimal 5MB', 'error');
													e.target.value = '';
													return;
												}
												setFileUploads(prev => ({
													...prev,
													[`LaporanKeuangan${year}`]: file
												}));
											}
										}}
										className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
									/>
									{fileUploads[`LaporanKeuangan${year}`] && (
										<p className="text-xs text-slate-600 flex items-center gap-1">
											<FiFileText /> {fileUploads[`LaporanKeuangan${year}`].name}
										</p>
									)}
									{formData[`LaporanKeuangan${year}`] && !fileUploads[`LaporanKeuangan${year}`] && (
										<DokumenTersimpan
											field={`LaporanKeuangan${year}`}
											nilai={formData[`LaporanKeuangan${year}`]}
										/>
									)}
								</div>
							))}
						</div>
					</div>

				{/* Dokumen Badan Hukum */}
				<div>
					<h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
						<FiFileText className="text-slate-600" />
						Dokumen Badan Hukum BUMDes
					</h4>
					<p className="text-sm text-slate-600 mb-3">
						<strong>Catatan:</strong> Perdes dan SK BUMDes sudah terintegrasi dengan fitur Produk Hukum Desa. 
						Silakan upload file-file dokumen BUMDes lainnya di bawah ini.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[
							{ key: 'ProfilBUMDesa', label: 'Profil BUMDes' },
							{ key: 'BeritaAcara', label: 'Berita Acara' },
							{ key: 'AnggaranDasar', label: 'Anggaran Dasar' },
							{ key: 'AnggaranRumahTangga', label: 'Anggaran Rumah Tangga' },
							{ key: 'ProgramKerja', label: 'Program Kerja' }
						].map(doc => (
								<div key={doc.key} className="space-y-2">
									<label className="block text-sm font-medium text-slate-700">
										{doc.label}
									</label>
									<input
										type="file"
										accept=".pdf,.doc,.docx"
										onChange={(e) => {
											const file = e.target.files[0];
											if (file) {
												if (file.size > 5 * 1024 * 1024) {
													Swal.fire('Error', 'Ukuran file maksimal 5MB', 'error');
													e.target.value = '';
													return;
												}
												setFileUploads(prev => ({
													...prev,
													[doc.key]: file
												}));
											}
										}}
										className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
									/>
									{fileUploads[doc.key] && (
										<p className="text-xs text-slate-600 flex items-center gap-1">
											<FiFileText /> {fileUploads[doc.key].name}
										</p>
									)}
									{formData[doc.key] && !fileUploads[doc.key] && (
										<DokumenTersimpan field={doc.key} nilai={formData[doc.key]} />
									)}
								</div>
							))}
						</div>
					</div>

					{/* File Upload Info */}
					<div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
						<p className="flex items-center gap-2 text-sm text-amber-800">
							<FiAlertCircle className="flex-shrink-0" />
							Format file yang didukung: PDF, DOC, DOCX. Ukuran maksimal: 5MB per file
						</p>
					</div>
				</div>
			))}

			{/* Footer Info */}
			<div className="rounded-xl border border-slate-200 bg-white p-5">
				<div className="flex items-start gap-3">
					<FiAlertCircle className="mt-0.5 flex-shrink-0 text-slate-400" />
					<div className="text-sm text-slate-600">
						<p className="mb-1.5 font-semibold text-slate-900">Catatan Penting</p>
						<ul className="list-inside list-disc space-y-1 leading-6">
							<li>Data yang diinput akan otomatis tersinkronisasi dengan sistem monitoring BUMDES Kabupaten</li>
							<li>Pastikan semua data yang diisi akurat dan sesuai dengan kondisi terkini</li>
							<li>Field yang bertanda (*) adalah wajib diisi</li>
							<li>Data keuangan sebaiknya diperbarui secara berkala</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
};

export default BumdesDesaPage;
