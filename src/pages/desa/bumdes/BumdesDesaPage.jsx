import React, { useState, useEffect } from "react";
import FormulirBumdes, { DaftarTahunan, kelengkapanFormulir } from '../../../components/bumdes/FormulirBumdes';
import UnggahProdukHukumBumdes from '../../../components/bumdes/UnggahProdukHukumBumdes';
import ProdukBumdesManager from '../../../components/bumdes/ProdukBumdesManager';
import {
	nilaiAwalBumdes,
	lengkapiDaftarDariKolomLama,
	DEF_LAPORAN_PERTANGGUNGJAWABAN,
	DOKUMEN_KETAHANAN_PANGAN,
} from '../../../components/bumdes/skemaBumdes';
import { useAuth } from "../../../context/AuthContext";
import Swal from "sweetalert2";
import {
	FiSave,
	FiEdit3,
	FiTrash2,
	FiShoppingBag,
	FiFileText,
	FiRefreshCw,
	FiCheckCircle,
	FiAlertCircle,
	FiUpload,
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
	StudiKelayakanUsaha: "bumdes_ketahanan_pangan",
	RABKetahananPangan: "bumdes_ketahanan_pangan",
	DokumentasiGeotagging: "bumdes_ketahanan_pangan",
};

// "Dokumen Pendirian BUM Desa" (dulu "Dokumen Badan Hukum"). SK Pendirian
// dipilih/diunggah di bagian Dasar Hukum karena terintegrasi Produk Hukum.
const DOKUMEN_PENDIRIAN = [
	{ key: 'ProfilBUMDesa', label: 'Profil BUM Desa' },
	{ key: 'BeritaAcara', label: 'Berita Acara' },
	{ key: 'AnggaranDasar', label: 'Anggaran Dasar (AD)' },
	{ key: 'AnggaranRumahTangga', label: 'Anggaran Rumah Tangga (ART)' },
	{ key: 'ProgramKerja', label: 'Program Kerja' },
];

const TAHUN_LPJ_LAMA = ['2021', '2022', '2023', '2024'];

const berkasKosong = () => {
	const awal = {};
	TAHUN_LPJ_LAMA.forEach((th) => { awal[`LaporanKeuangan${th}`] = null; });
	DOKUMEN_PENDIRIAN.forEach((d) => { awal[d.key] = null; });
	DOKUMEN_KETAHANAN_PANGAN.forEach((d) => { awal[d.kunci] = null; });
	return awal;
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

/**
 * Berkas produk hukum desa TIDAK tinggal di storage/uploads seperti dokumen
 * BUM Desa, melainkan di storage/produk_hukum — itulah folder yang ditulis
 * modul Produk Hukum maupun unggahan dari formulir ini. Sebelumnya tautan di
 * sini memakai STORAGE_URL (= /uploads) dengan nama folder bertanda hubung,
 * sehingga "Lihat dokumen" selalu berakhir 404 walau dokumennya ada.
 */
const BASIS_BERKAS = import.meta.env.VITE_IMAGE_BASE_URL || 'http://127.0.0.1:3001';
const tautanProdukHukum = (namaBerkas) =>
	`${BASIS_BERKAS}/storage/produk_hukum/${encodeURIComponent(namaBerkas)}`;

const ProdukHukumTerpilih = ({ id, daftar }) => {
	if (!id) return null;
	const dipilih = (daftar || []).find((x) => String(x.id) === String(id));
	if (!dipilih?.file) return null;
	const berkas = String(dipilih.file).split("/").pop();
	return (
		<a
			href={tautanProdukHukum(berkas)}
			target="_blank"
			rel="noreferrer"
			className="mt-1 text-xs text-slate-600 hover:text-slate-900 underline flex items-center gap-1"
		>
			<FiFileText /> Lihat dokumen: {dipilih.judul || berkas}
		</a>
	);
};

/** Data dari server → bentuk formulir (daftar bertahun disusun dari kolom lama). */
const keFormulir = (baris) => lengkapiDaftarDariKolomLama({ ...nilaiAwalBumdes(), ...(baris || {}) });

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
	const [formData, setFormData] = useState(() => nilaiAwalBumdes());

	// Berkas yang dipilih dan menunggu diunggah saat Simpan. Perdes dan SK
	// sudah terintegrasi dengan Produk Hukum Desa, jadi tidak ada di sini.
	const [fileUploads, setFileUploads] = useState(berkasKosong);

	const dataDesaAkun = () => ({
		desa: user?.desa?.nama || "",
		kecamatan: user?.desa?.kecamatan?.nama || "",
		kode_desa: user?.desa?.kode || "",
	});

	// Fetch BUMDES data dan produk hukum options untuk desa ini
	useEffect(() => {
		const initializeData = async () => {
			try {
				setLoading(true);
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
				setFormData(keFormulir(result.data));
			} else {
				setFormData({ ...nilaiAwalBumdes(), ...dataDesaAkun() });
			}
		} catch (error) {
			console.error("Error fetching BUMDES data:", error);
			setFormData({ ...nilaiAwalBumdes(), ...dataDesaAkun() });
		}
	};

	const fetchProdukHukumOptions = async () => {
		try {
			const result = await BumdesDesaService.getProdukHukumForBumdes();

			if (result.success && result.data) {
				setProdukHukumOptions({
					perdes: result.data.perdes || [],
					sk: result.data.sk || result.data.sk_bumdes || []
				});
			} else {
				setProdukHukumOptions({ perdes: [], sk: [] });
			}
		} catch (error) {
			console.error("Error fetching produk hukum options:", error);

			Swal.fire({
				icon: 'warning',
				title: 'Perhatian',
				text: 'Gagal memuat data Produk Hukum. Pastikan Anda sudah mengupload Perdes dan SK di menu Produk Hukum.',
				confirmButtonColor: '#3b82f6',
			});

			setProdukHukumOptions({ perdes: [], sk: [] });
		}
	};

	/**
	 * Dokumen baru dari unggahan di dalam formulir.
	 *
	 * Ditambahkan ke daftar pilihan DAN langsung dipilih. Tanpa langkah kedua,
	 * petugas yang baru saja mengunggah masih harus mencarinya sendiri di
	 * dropdown — dan dokumen yang baru diunggah nyaris pasti dokumen yang ia
	 * maksud.
	 */
	const terimaProdukHukumBaru = (fieldName, produkHukum) => {
		const kunciDaftar = fieldName === 'Perdes' ? 'perdes' : 'sk';
		const kunciForm =
			fieldName === 'Perdes' ? 'produk_hukum_perdes_id' : 'produk_hukum_sk_bumdes_id';

		setProdukHukumOptions((prev) => ({
			...prev,
			[kunciDaftar]: [produkHukum, ...(prev[kunciDaftar] || [])],
		}));
		setFormData((prev) => ({ ...prev, [kunciForm]: produkHukum.id }));
	};

	const handleInputChange = (field, value) => {
		setFormData(prev => ({
			...prev,
			[field]: value
		}));
	};

	const pilihBerkas = (field, file) => {
		if (file && file.size > 5 * 1024 * 1024) {
			Swal.fire('Error', 'Ukuran file maksimal 5MB', 'error');
			return;
		}
		setFileUploads((prev) => ({ ...prev, [field]: file }));
	};

	const unggahBerkasTertunda = async (bumdesId) => {
		const gagal = [];
		const fileFields = Object.keys(fileUploads).filter(key => fileUploads[key]);
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
				gagal.push(fieldName);
			}
		}
		return gagal;
	};

	const handleSave = async () => {
		try {
			setSaving(true);

			const validation = BumdesDesaService.validateBumdesData(formData);
			if (!validation.isValid) {
				Swal.fire("Error", validation.errors.join('\n'), "error");
				setSaving(false);
				return;
			}

			// Data dulu, berkas kemudian — untuk data baru id-nya baru lahir di sini.
			const result = bumdesData
				? await BumdesDesaService.updateBumdes(bumdesData.id, formData)
				: await BumdesDesaService.createBumdes(formData);
			const bumdesId = bumdesData?.id || result.data?.id;
			const gagal = bumdesId ? await unggahBerkasTertunda(bumdesId) : [];

			if (result.success) {
				setBumdesData(result.data);
				setIsEditing(false);
				setFileUploads(berkasKosong());

				Swal.fire({
					title: "Berhasil!",
					text: gagal.length
						? `Data tersimpan, tetapi ${gagal.length} berkas gagal diunggah. Coba unggah ulang.`
						: bumdesData ? "Data BUMDES berhasil diperbarui" : "Data BUMDES berhasil disimpan",
					icon: gagal.length ? "warning" : "success",
					confirmButtonText: "OK"
				});

				await fetchBumdesData();
			}
		} catch (error) {
			console.error("Error saving BUMDES data:", error);

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
				setFormData({ ...nilaiAwalBumdes(), ...dataDesaAkun() });
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

	const fieldClass = (disabled) =>
		`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${
			disabled
				? "cursor-default border-transparent bg-slate-50 text-slate-700"
				: "border-slate-200 bg-white text-slate-900 shadow-sm shadow-slate-900/[0.02] hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/[0.06]"
		}`;

	// Pemilih Perdes/SK memakai bentuk opsi khas modul Produk Hukum
	// (nomor - judul (tahun)), bukan {value,label} biasa.
	const renderSelect = (label, field, options, placeholder = "Pilih opsi", showInfo = false) => (
		<div>
			<label className="mb-1.5 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-700">
				{label}
				{showInfo && (
					<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-500">Terintegrasi Produk Hukum</span>
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
				<div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
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

	/** Kartu berkas dokumen pendirian / LPJ lama — diunggah saat Simpan. */
	const renderPilihBerkas = (field, label) => {
		const baru = fileUploads[field];
		const lama = formData[field];
		const ada = Boolean(baru || lama);
		return (
			<div key={field} className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${ada ? 'border-emerald-200 bg-emerald-50/40' : 'border-dashed border-slate-300 bg-slate-50/50'}`}>
				<div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${ada ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>
					{ada ? <FiCheckCircle className="h-5 w-5" /> : <FiFileText className="h-5 w-5" />}
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-semibold text-slate-800">{label}</p>
					{baru ? (
						<p className="truncate text-xs text-emerald-700">{baru.name} · diunggah saat Simpan</p>
					) : lama ? (
						<DokumenTersimpan field={field} nilai={lama} />
					) : (
						<p className="text-xs text-slate-400">Belum diunggah</p>
					)}
				</div>
				{isEditing && (
					<label className="inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50">
						<FiUpload className="h-3.5 w-3.5" /> {ada ? 'Ganti' : 'Unggah'}
						<input
							type="file"
							accept=".pdf,.doc,.docx"
							className="hidden"
							onChange={(e) => {
								const file = e.target.files?.[0];
								e.target.value = '';
								if (file) pilihBerkas(field, file);
							}}
						/>
					</label>
				)}
			</div>
		);
	};

	if (loading) {
		return (
			<div className="space-y-5">
				<div className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />
				<div className="grid grid-cols-1 gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
					<div className="hidden h-96 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200 xl:block" />
					<div className="space-y-5">
						{[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />)}
					</div>
				</div>
			</div>
		);
	}

	const lpjLama = TAHUN_LPJ_LAMA.filter((th) => formData[`LaporanKeuangan${th}`]);
	const kelengkapan = kelengkapanFormulir(formData, 'desa');
	const omsetTerbaru = [...(Array.isArray(formData.RiwayatOmsetLaba) ? formData.RiwayatOmsetLaba : [])]
		.filter((b) => b.tahun && b.omset !== undefined && b.omset !== '')
		.sort((a, b) => b.tahun - a.tahun)[0];
	const ringkas = (n) => {
		const v = Number(n) || 0;
		if (Math.abs(v) >= 1e9) return `Rp ${(v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
		if (Math.abs(v) >= 1e6) return `Rp ${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
		return `Rp ${v.toLocaleString('id-ID')}`;
	};
	const aktif = !String(formData.status || 'aktif').startsWith('tidak');

	const batalEdit = () => {
		setIsEditing(false);
		setFileUploads(berkasKosong());
		setFormData(bumdesData ? keFormulir(bumdesData) : { ...nilaiAwalBumdes(), ...dataDesaAkun() });
	};

	// Bagian khas halaman desa — ikut bernomor & masuk navigasi formulir.
	const seksiTambahan = [
		{
			id: 'lpj',
			judul: 'Laporan Pertanggungjawaban',
			keterangan: 'Pilih tahun, unggah laporannya, lalu simpan. Bisa ditambah untuk tahun berikutnya (2025, 2026, dst.).',
			persen: (formData.LaporanPertanggungjawaban?.length || lpjLama.length) ? 100 : 0,
			konten: (
				<div className="space-y-6">
					<DaftarTahunan
						def={DEF_LAPORAN_PERTANGGUNGJAWABAN}
						nilai={formData.LaporanPertanggungjawaban}
						onUbah={handleInputChange}
						mati={!isEditing}
					/>
					{/* Berkas tahun lama tetap bisa dilihat dan diganti di kolom aslinya. */}
					{(lpjLama.length > 0 || isEditing) && (
						<div>
							<p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Berkas tahun 2021–2024</p>
							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								{(isEditing ? TAHUN_LPJ_LAMA : lpjLama).map((th) =>
									renderPilihBerkas(`LaporanKeuangan${th}`, `Laporan Pertanggungjawaban ${th}`))}
							</div>
						</div>
					)}
				</div>
			),
		},
		{
			id: 'pendirian',
			judul: 'Dokumen Pendirian BUM Desa',
			keterangan: 'Format PDF, DOC, atau DOCX, maksimal 5 MB per berkas. Berkas diunggah saat Anda menekan Simpan.',
			persen: Math.round((DOKUMEN_PENDIRIAN.filter((d) => formData[d.key] || fileUploads[d.key]).length / DOKUMEN_PENDIRIAN.length) * 100),
			konten: (
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{DOKUMEN_PENDIRIAN.map((doc) => renderPilihBerkas(doc.key, doc.label))}
					<div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
						<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
							<FiFileText className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-semibold text-slate-800">SK Pendirian</p>
							{formData.produk_hukum_sk_bumdes_id ? (
								<ProdukHukumTerpilih id={formData.produk_hukum_sk_bumdes_id} daftar={produkHukumOptions.sk} />
							) : (
								<p className="text-xs text-slate-500">Dipilih / diunggah di bagian 2. Dasar Hukum &amp; Legalitas.</p>
							)}
						</div>
					</div>
				</div>
			),
		},
		{
			id: 'produk',
			judul: 'Produk BUM Desa',
			keterangan: 'Produk tampil di Katalog Produk BUMDes se-Kabupaten Bogor. Perubahan produk langsung tersimpan.',
			konten: <ProdukBumdesManager adaBumdes={Boolean(bumdesData)} />,
		},
	];

	return (
		<div className="space-y-6">
			<DesaPageHeader
				icon={FiShoppingBag}
				eyebrow="Data Desa · BUM Desa"
				title={formData.namabumdesa || "Data BUMDes"}
				description={`${user?.desa?.nama || "Desa"}${user?.desa?.kecamatan?.nama ? `, Kecamatan ${user.desa.kecamatan.nama}` : ""} — identitas, legalitas, permodalan, dan kondisi usaha BUM Desa.`}
				stats={[
					{ label: "Kelengkapan", value: `${kelengkapan.persen}%`, hint: `${kelengkapan.terisi} dari ${kelengkapan.total} isian` },
					{ label: "Status", value: aktif ? "Aktif" : "Tidak Aktif", hint: formData.TahunPendirian ? `Berdiri ${formData.TahunPendirian}` : "Tahun pendirian belum diisi" },
					{ label: "Badan Hukum", value: formData.badanhukum ? formData.badanhukum.replace('Terbit Sertifikat Badan Hukum', 'Bersertifikat') : "—", hint: formData.NIB ? `NIB ${formData.NIB}` : "NIB belum diisi" },
					{ label: "Omset Terakhir", value: omsetTerbaru ? ringkas(omsetTerbaru.omset) : "—", hint: omsetTerbaru ? `Tahun ${omsetTerbaru.tahun}` : "Belum ada data omset" },
				]}
				actions={
					<>
						<span
							className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
								bumdesData
									? "bg-emerald-50 text-emerald-700 ring-emerald-100"
									: "bg-amber-50 text-amber-700 ring-amber-100"
							}`}
						>
							{bumdesData ? <FiCheckCircle className="h-3.5 w-3.5" /> : <FiAlertCircle className="h-3.5 w-3.5" />}
							{bumdesData ? "Data tersimpan" : "Belum ada data"}
						</span>

						{!isEditing && (
							<>
								<button
									onClick={() => setIsEditing(true)}
									className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md"
								>
									<FiEdit3 className="h-4 w-4" />
									{bumdesData ? "Edit Data" : "Input Data"}
								</button>

								{bumdesData && (
									<button
										onClick={handleDelete}
										className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
										title="Hapus data BUMDes"
									>
										<FiTrash2 className="h-4 w-4" />
									</button>
								)}
							</>
						)}
					</>
				}
			/>

			{!isEditing && !bumdesData && (
				<div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
					<FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
					<div className="text-sm text-amber-900">
						<p className="font-semibold">Data BUM Desa belum diisi</p>
						<p className="mt-0.5 text-amber-800">Tekan <strong>Input Data</strong> untuk mulai mengisi. Setiap isian dilengkapi keterangan agar mudah dipahami.</p>
					</div>
				</div>
			)}

			{/* Kolom-kolomnya tidak ditulis di sini: seluruh daftar kolom BUM Desa
			    ada di components/bumdes/skemaBumdes.js dan dipakai bersama dengan
			    formulir Bidang SPKED. Yang tinggal di berkas ini hanya yang khas
			    desa: pemilih Perdes/SK dari modul Produk Hukum (slot di bawah),
			    unggahan dokumen, dan produk katalog. */}
			<FormulirBumdes
				data={formData}
				onUbah={handleInputChange}
				bisaSunting={isEditing}
				mode="desa"
				navigasi
				berkasBaru={fileUploads}
				onPilihBerkas={pilihBerkas}
				seksiTambahan={seksiTambahan}
				slotDasarHukum={
					<div className="space-y-5">
						<div className="flex items-start gap-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
							<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
								<FiFileText className="h-4 w-4" />
							</div>
							<div>
								<p className="text-sm font-semibold">Dokumen Hukum Terintegrasi</p>
								<p className="mt-0.5 text-xs leading-5 text-slate-300">
									Pilih Perdes dan SK BUM Desa dari menu Produk Hukum. Bila belum ada, unggah langsung di sini —
									dokumennya sekalian tercatat sebagai produk hukum desa, jadi tidak perlu diunggah dua kali.
								</p>
							</div>
						</div>

						{(!produkHukumOptions.perdes || produkHukumOptions.perdes.length === 0) &&
						 (!produkHukumOptions.sk || produkHukumOptions.sk.length === 0) && (
							<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
								<strong>Belum ada Perdes atau SK BUM Desa</strong> yang terdaftar untuk desa ini. Unggah lewat tombol di bawah
								masing-masing pilihan — tidak perlu akses menu Produk Hukum.
							</div>
						)}

						<div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
							<div className="space-y-2">
								{renderSelect(
									"Perdes Pendirian BUM Desa",
									"produk_hukum_perdes_id",
									produkHukumOptions.perdes || [],
									produkHukumOptions.perdes?.length > 0 ? "Pilih Perdes yang sudah diunggah" : "Belum ada Perdes",
									true
								)}
								<ProdukHukumTerpilih id={formData.produk_hukum_perdes_id} daftar={produkHukumOptions.perdes} />
								<UnggahProdukHukumBumdes
									fieldName="Perdes"
									label="Perdes Pendirian"
									nomorAwal={formData.NomorPerdes}
									bisaSunting={isEditing}
									onSelesai={(ph) => terimaProdukHukumBaru('Perdes', ph)}
								/>
							</div>
							<div className="space-y-2">
								{renderSelect(
									"SK Pendirian BUM Desa",
									"produk_hukum_sk_bumdes_id",
									produkHukumOptions.sk || [],
									produkHukumOptions.sk?.length > 0 ? "Pilih SK yang sudah diunggah" : "Belum ada SK",
									true
								)}
								<ProdukHukumTerpilih id={formData.produk_hukum_sk_bumdes_id} daftar={produkHukumOptions.sk} />
								<UnggahProdukHukumBumdes
									fieldName="SK_BUM_Desa"
									label="SK BUM Desa"
									bisaSunting={isEditing}
									onSelesai={(ph) => terimaProdukHukumBaru('SK_BUM_Desa', ph)}
								/>
							</div>
						</div>
						<div className="border-t border-slate-100" />
					</div>
				}
			/>

			{/* Bilah simpan melayang selama mode edit */}
			{isEditing && (
				<div className="sticky bottom-4 z-30 xl:pl-[274px]">
					<div className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-white shadow-2xl shadow-slate-900/30 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
						<div className="flex items-center gap-3">
							<span className="relative flex h-2.5 w-2.5">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
								<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
							</span>
							<div>
								<p className="text-sm font-semibold">Mode edit aktif</p>
								<p className="text-xs text-slate-400">
									Kelengkapan {kelengkapan.persen}% · perubahan belum tersimpan
									{Object.values(fileUploads).filter(Boolean).length > 0 && ` · ${Object.values(fileUploads).filter(Boolean).length} berkas menunggu`}
								</p>
							</div>
						</div>
						<div className="flex gap-2">
							<button
								onClick={batalEdit}
								className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white sm:flex-none"
							>
								Batal
							</button>
							<button
								onClick={handleSave}
								disabled={saving}
								className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:bg-slate-100 disabled:opacity-60 sm:flex-none"
							>
								{saving ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiSave className="h-4 w-4" />}
								{saving ? "Menyimpan..." : "Simpan Perubahan"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default BumdesDesaPage;
