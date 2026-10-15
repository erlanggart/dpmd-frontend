import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
	getPengurusById,
	updatePengurusStatus,
	updatePengurusVerifikasi,
	ajukanUlangPengurusVerifikasi,
	deletePengurus,
	updatePengurus,
} from "../../../services/pengurus";
import { getJabatanList } from "../../../constants/jabatanMapping";
import { getDesa } from "../../../services/api";
import {
	getRw,
	getRt,
	getPosyandu,
	getKarangTaruna,
	getLpm,
	getPkk,
	getSatlinmas,
} from "../../../services/kelembagaan";
import { useAuth } from "../../../context/AuthContext";
import { useEditMode } from "../../../context/EditModeContext";
import {
	FaArrowLeft,
	FaEdit,
	FaUser,
	FaPhone,
	FaMapMarkerAlt,
	FaCalendarAlt,
	FaFileAlt,
	FaExternalLinkAlt,
	FaChevronRight,
	FaHome,
	FaLock,
	FaLockOpen,
	FaUniversity,
	FaTrash,
	FaExchangeAlt,
	FaIdCard,
	FaVenusMars,
	FaRing,
	FaPrayingHands,
	FaTint,
	FaPen,
	FaGraduationCap,
	FaHistory,
	FaEllipsisV,
	FaToggleOn,
	FaToggleOff,
} from "react-icons/fa";
import Swal from "sweetalert2";
import TransferPengurusModal from "./TransferPengurusModal";
import { PengurusTimeline, PengurusActivityLog } from "./PengurusAktivitas";
import PengurusBpjsCard from "./PengurusBpjsCard";
import { getPengurusActivityLogs } from "../../../services/activityLogs";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const pesanError = (error, fallback) => {
	const { message, error: alasan } = error?.response?.data || {};
	if (message && alasan && alasan !== message) return `${message}\n\nAlasan: ${alasan}`;
	return alasan || message || error?.message || fallback;
};

// Helper function to convert pengurusable_type (table name) to route type
const getRouteType = (pengurusableType) => {
	const mapping = {
		rws: "rw",
		rts: "rt",
		posyandus: "posyandu",
		karang_tarunas: "karang-taruna",
		lpms: "lpm",
		pkks: "pkk",
		satlinmas: "satlinmas",
		"lembaga-lainnya": "lembaga-lainnya",
	};
	return mapping[pengurusableType] || pengurusableType;
};

// Helper function to get display name
const getDisplayName = (pengurusableType) => {
	const mapping = {
		rws: "RW",
		rts: "RT",
		rw: "RW",
		rt: "RT",
		posyandus: "Posyandu",
		posyandu: "Posyandu",
		karang_tarunas: "Karang Taruna",
		karang_taruna: "Karang Taruna",
		lpms: "LPM",
		lpm: "LPM",
		pkks: "PKK",
		pkk: "PKK",
		satlinmas: "Satlinmas",
		"lembaga-lainnya": "Lembaga Lainnya",
	};
	return mapping[pengurusableType] || pengurusableType;
};

// Helper function to determine correct routing based on user role
const getPengurusRoutePath = (isSuperAdmin, isAdminBidangPMD, pengurusId, action = "", isKecamatanUser = false) => {
	if (isKecamatanUser) {
		return `/kecamatan/pengurus/${pengurusId}${action ? `/${action}` : ""}`;
	}
	if (isSuperAdmin || isAdminBidangPMD) {
		return `/bidang/pmd/pengurus/${pengurusId}${action ? `/${action}` : ""}`;
	}
	return `/desa/pengurus/${pengurusId}${action ? `/${action}` : ""}`;
};

const formatTanggal = (v) =>
	v ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "";

const SECTION_TONES = {
	purple: { head: "bg-purple-50/70", icon: "bg-violet-500" },
	blue: { head: "bg-sky-50/70", icon: "bg-blue-500" },
	amber: { head: "bg-amber-50/70", icon: "bg-amber-500" },
	slate: { head: "bg-slate-50", icon: "bg-slate-500" },
};

const SectionCard = ({ icon: Icon, title, subtitle, tone, onEdit, editDisabled, editing, onSave, onCancel, saving, children }) => (
	<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
		<div className={`flex items-center justify-between gap-3 px-5 py-4 ${SECTION_TONES[tone].head}`}>
			<div className="flex items-center gap-3">
				<div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${SECTION_TONES[tone].icon}`}>
					<Icon className="text-white w-4 h-4" />
				</div>
				<div>
					<h3 className="text-lg font-bold text-gray-900">{title}</h3>
					{subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
				</div>
			</div>
			{editing ? (
				<TombolSimpanBatal onSave={onSave} onCancel={onCancel} saving={saving} />
			) : (
				onEdit && (
					<button
						onClick={onEdit}
						disabled={editDisabled}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						title={editDisabled ? "Fitur edit ditutup" : "Edit pengurus"}
					>
						<FaPen className="w-3 h-3" />
						Edit
					</button>
				)
			)}
		</div>
		<div className="p-5">{children}</div>
	</div>
);

// Baris label kiri / nilai kanan
const InfoField = ({ label, value, children }) => (
	<div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 min-h-[44px]">
		<span className="text-xs text-gray-500 w-32 flex-shrink-0">{label}</span>
		<span className="text-sm text-gray-900 font-medium break-words min-w-0">{children ?? (value || "-")}</span>
	</div>
);

// Item menu titik tiga di header
const MenuItem = ({ icon: Icon, label, onClick, disabled, hint, danger }) => (
	<button
		type="button"
		role="menuitem"
		onClick={onClick}
		disabled={disabled}
		title={hint || undefined}
		className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
			danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
		}`}
	>
		<Icon className="w-3.5 h-3.5 flex-shrink-0" />
		<span className="flex-1">{label}</span>
		{hint && <FaLock className="w-3 h-3 text-gray-400" />}
	</button>
);

// Label di atas, nilai di bawah
const StackedField = ({ label, value, mono }) => (
	<div>
		<p className="text-xs font-medium text-gray-600 mb-1.5">{label}</p>
		<p className={`text-sm text-gray-900 bg-gray-50 rounded-lg px-3 py-2.5 ${mono ? "font-mono tracking-wider" : "font-medium"}`}>
			{value || "-"}
		</p>
	</div>
);

// ===== Edit langsung per kotak =====
// Pilihan isian disamakan dengan PengurusEditPage.jsx
const OPSI = {
	jenis_kelamin: [["Laki-laki", "Laki-laki"], ["Perempuan", "Perempuan"]],
	status_perkawinan: [["BELUM MENIKAH", "Belum Menikah"], ["MENIKAH", "Menikah"], ["CERAI HIDUP", "Cerai Hidup"], ["CERAI MATI", "Cerai Mati"]],
	pendidikan: ["SD", "SMP", "SMA/SMK", "D1", "D2", "D3", "S1", "S2", "S3"].map((v) => [v, v]),
	agama: [["ISLAM", "Islam"], ["KRISTEN", "Kristen"], ["KATOLIK", "Katolik"], ["HINDU", "Hindu"], ["BUDDHA", "Buddha"], ["KONGHUCU", "Konghucu"]],
	golongan_darah: [["A", "A"], ["B", "B"], ["AB", "AB"], ["O", "O"], ["TIDAK_DIKETAHUI", "Tidak diketahui"]],
};

// Field yang dikirim saat menyimpan tiap kotak; field lain tidak disentuh backend
const FIELD_KOTAK = {
	profil: ["nama_lengkap", "nik", "jenis_kelamin", "tempat_lahir", "tanggal_lahir", "status_perkawinan", "nomor_buku_nikah", "pendidikan", "agama", "golongan_darah", "no_telepon", "alamat"],
	jabatan: ["jabatan", "tanggal_mulai_jabatan", "tanggal_akhir_jabatan"],
	rekening: ["nama_bank", "nomor_rekening", "nama_rekening"],
};

// Nomor buku nikah hanya relevan untuk Ketua RT/RW yang menikah (aturan PengurusEditPage)
const tampilBukuNikah = (d) =>
	d.status_perkawinan === "MENIKAH" && ["KETUA RT", "KETUA RW"].includes((d.jabatan || "").toUpperCase());

const nilaiAwal = (p, field) => {
	const v = p[field];
	if (field === "jenis_kelamin") {
		const jk = String(v || "").replace(/_/g, "-").toUpperCase();
		return jk === "LAKI-LAKI" ? "Laki-laki" : jk === "PEREMPUAN" ? "Perempuan" : "";
	}
	if (["tanggal_lahir", "tanggal_mulai_jabatan", "tanggal_akhir_jabatan"].includes(field)) {
		return v ? String(v).slice(0, 10) : "";
	}
	if (["status_perkawinan", "agama"].includes(field)) return v ? String(v).toUpperCase() : "";
	return v || "";
};

const kelasInput =
	"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

const FieldEdit = ({ label, wajib, className = "", children }) => (
	<label className={`block ${className}`}>
		<span className="block text-xs font-medium text-gray-600 mb-1">
			{label}
			{wajib && <span className="text-red-500"> *</span>}
		</span>
		{children}
	</label>
);

const InputEdit = ({ name, draft, setDraft, ...rest }) => (
	<input
		value={draft[name]}
		onChange={(e) => setDraft((d) => ({ ...d, [name]: e.target.value }))}
		className={kelasInput}
		{...rest}
	/>
);

// Nilai lama yang tidak ada di pilihan tetap ditampilkan, supaya tidak terhapus diam-diam saat disimpan
const SelectEdit = ({ name, draft, setDraft, opsi, kosong = "Pilih", catatanLuar = "" }) => {
	const nilai = draft[name];
	const daftar = nilai && !opsi.some(([v]) => v === nilai) ? [[nilai, `${nilai}${catatanLuar}`], ...opsi] : opsi;
	return (
		<select value={nilai} onChange={(e) => setDraft((d) => ({ ...d, [name]: e.target.value }))} className={kelasInput}>
			<option value="">{kosong}</option>
			{daftar.map(([v, l]) => (
				<option key={v} value={v}>
					{l}
				</option>
			))}
		</select>
	);
};

const TombolSimpanBatal = ({ onSave, onCancel, saving }) => (
	<div className="flex items-center gap-2">
		<button
			type="button"
			onClick={onCancel}
			disabled={saving}
			className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
		>
			Batal
		</button>
		<button
			type="button"
			onClick={onSave}
			disabled={saving}
			className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
		>
			{saving ? "Menyimpan..." : "Simpan"}
		</button>
	</div>
);

const ProfileItem = ({ icon: Icon, label, value, iconClass = "bg-blue-50 text-blue-500" }) => (
	<div className="flex items-start gap-3 min-w-0">
		<div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClass}`}>
			<Icon className="w-3.5 h-3.5" />
		</div>
		<div className="min-w-0">
			<p className="text-xs text-gray-500">{label}</p>
			<p className="text-sm text-gray-900 font-medium break-words">{value || "-"}</p>
		</div>
	</div>
);

const PengurusDetailPage = () => {
	const params = useParams();
	const pengurusId = params.id;
	const navigate = useNavigate();
	const { user, isSuperAdmin, isAdminBidangPMD, canManageKelembagaan, isKecamatan, canVerifyKelembagaan, canEditKelembagaan } =
		useAuth();

	const { isEditMode } = useEditMode();

	const [pengurus, setPengurus] = useState(null);
	const [kelembagaanInfo, setKelembagaanInfo] = useState(null);
	const [desaInfo, setDesaInfo] = useState(null);
	const [rwInfo, setRwInfo] = useState(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);
	const [showTransfer, setShowTransfer] = useState(false);
	const [activityLogs, setActivityLogs] = useState(null); // null = sedang dimuat
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);
	const [kotakEdit, setKotakEdit] = useState(null); // "profil" | "jabatan" | "rekening" | null
	const [draft, setDraft] = useState({});
	const [menyimpan, setMenyimpan] = useState(false);

	// Tutup menu titik tiga saat klik di luar atau tekan Escape
	useEffect(() => {
		if (!menuOpen) return;
		const onDown = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
		};
		const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [menuOpen]);
	const closeAnd = (fn) => () => {
		setMenuOpen(false);
		fn();
	};

	const isKecamatanUser = isKecamatan?.() ?? false;

	// Check permissions using AuthContext helpers
	const canManage = canManageKelembagaan();
	const isBidangKelembagaanViewer = () =>
		isSuperAdmin() || isAdminBidangPMD() || user?.role === "bendahara";

	// Kecamatan, admin PMD, dan superadmin boleh verifikasi
	const canVerify = canVerifyKelembagaan?.() ?? (isSuperAdmin() || isAdminBidangPMD());

	// Staf bidang PMD (termasuk bendahara bidang 5) menyunting tanpa terhalang
	// status terverifikasi, dan memakai rute halaman bidang
	const canEditAsStaf = canEditKelembagaan?.() ?? (isSuperAdmin() || isAdminBidangPMD());

	// Breadcrumb path helper: kecamatan selalu kembali ke halaman utama kelembagaan kecamatan
	const bcPath = (adminPath, desaPath) => {
		if (isKecamatanUser) return "/kecamatan/kelembagaan";
		if (isBidangKelembagaanViewer()) return adminPath;
		return desaPath;
	};

	// Breadcrumb path untuk link detail kelembagaan (termasuk desaId untuk kecamatan)
	const bcDetailPath = (adminPath, desaPath) => {
		if (isKecamatanUser) {
			const desaId = pengurus?.desa_id;
			const type = getRouteType(pengurus?.pengurusable_type);
			const id = pengurus?.pengurusable_id;
			return desaId && type && id ? `/kecamatan/kelembagaan/${desaId}/${type}/${id}` : "/kecamatan/kelembagaan";
		}
		if (isBidangKelembagaanViewer()) return adminPath;
		return desaPath;
	};

	const loadDesaInfo = async (desaId) => {
		try {
			const response = await getDesa(desaId);
			const desaData = response?.data?.data;
			setDesaInfo(desaData || null);
		} catch (error) {
			console.error("Error loading desa info:", error);
			setDesaInfo(null);
		}
	};

	const loadRwForRt = async (rtData) => {
		try {
			if (rtData?.rw_id) {
				const response = await getRw(rtData.rw_id);
				const rwData = response?.data?.data;
				setRwInfo(rwData || null);
			}
		} catch (error) {
			console.error("Error loading RW info for RT:", error);
			setRwInfo(null);
		}
	};

	const loadKelembagaanInfo = async (pengurusableType, pengurusableId) => {
		try {
			let response;
			// Map table name to appropriate getter function
			// Note: pengurusable_type from database can be table names (rws, rts) or singular (rw, rt)
			switch (pengurusableType) {
				case "rw":
				case "rws":
					response = await getRw(pengurusableId);
					break;
				case "rt":
				case "rts":
					response = await getRt(pengurusableId);
					break;
				case "posyandu":
				case "posyandus":
					response = await getPosyandu(pengurusableId);
					break;
				case "karang_taruna":
				case "karang_tarunas":
					response = await getKarangTaruna(pengurusableId);
					break;
				case "lpm":
				case "lpms":
					response = await getLpm(pengurusableId);
					break;
				case "pkk":
				case "pkks":
					response = await getPkk(pengurusableId);
					break;
				case "satlinmas":
					response = await getSatlinmas(pengurusableId);
					break;
				default:
					console.warn("Unknown kelembagaan type:", pengurusableType);
					return;
			}

			const kelembagaanData = response?.data?.data;
			setKelembagaanInfo(kelembagaanData || null);

			// If it's RT, load the parent RW
			if ((pengurusableType === "rt" || pengurusableType === "rts") && kelembagaanData) {
				await loadRwForRt(kelembagaanData);
			}
		} catch (error) {
			console.error("Error loading kelembagaan info:", error);
			setKelembagaanInfo(null);
		}
	};

	const loadPengurusDetail = async () => {
		if (!pengurusId) {
			return;
		}

		setLoading(true);
		// Log aktivitas: gagal dimuat tidak boleh menggagalkan halaman
		getPengurusActivityLogs(pengurusId)
			.then((res) => setActivityLogs(res?.data || []))
			.catch(() => setActivityLogs([]));
		try {
			const response = await getPengurusById(pengurusId);

			const pengurusData = response?.data?.data;

			setPengurus(pengurusData || null);

			// Load desa info
			if (pengurusData?.desa_id) {
				await loadDesaInfo(pengurusData.desa_id);
			}

			// Load kelembagaan info if pengurus data is available
			if (pengurusData?.pengurusable_type && pengurusData?.pengurusable_id) {
				await loadKelembagaanInfo(
					pengurusData.pengurusable_type,
					pengurusData.pengurusable_id,
				);
			}
		} catch (error) {
			console.error("❌ Error loading pengurus detail:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: "Gagal memuat detail pengurus",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadPengurusDetail();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pengurusId]); // Only depend on pengurusId to avoid infinite loop

	const handleStatusUpdate = async (newStatus) => {
		if (newStatus === "selesai") {
			// Check if tanggal_akhir_jabatan already exists
			if (!pengurus.tanggal_akhir_jabatan) {
				// Need to fill in end date first
				const { value: endDate } = await Swal.fire({
					title: "Nonaktifkan Pengurus",
					html: `
						<div class="text-left space-y-3">
							<p class="text-sm text-gray-600">Tanggal akhir jabatan belum diisi. Silakan isi terlebih dahulu untuk menonaktifkan pengurus.</p>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir Jabatan</label>
								<input type="date" id="swal-end-date" class="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value="${new Date().toISOString().split('T')[0]}">
							</div>
						</div>`,
					showCancelButton: true,
					confirmButtonText: "Nonaktifkan",
					cancelButtonText: "Batal",
					confirmButtonColor: "#dc2626",
					focusConfirm: false,
					preConfirm: () => {
						const date = document.getElementById('swal-end-date').value;
						if (!date) {
							Swal.showValidationMessage('Tanggal akhir jabatan wajib diisi');
							return false;
						}
						return date;
					},
				});

				if (!endDate) return;

				setUpdating(true);
				try {
					await updatePengurusStatus(pengurusId, newStatus, endDate, pengurus.desa_id);

					await Swal.fire({
						icon: "success",
						title: "Berhasil",
						text: "Pengurus berhasil dinonaktifkan",
						timer: 2000,
						showConfirmButton: false,
					});

					loadPengurusDetail();
				} catch (error) {
					console.error("Error updating status:", error);
					Swal.fire({
						icon: "error",
						title: "Gagal",
						text: pesanError(error, "Gagal mengubah status pengurus"),
					});
				} finally {
					setUpdating(false);
				}
			} else {
				// tanggal_akhir_jabatan already exists, proceed directly
				const result = await Swal.fire({
					title: "Nonaktifkan Pengurus?",
					text: "Apakah Anda yakin ingin menonaktifkan pengurus ini?",
					icon: "warning",
					showCancelButton: true,
					confirmButtonText: "Ya, lanjutkan",
					cancelButtonText: "Batal",
					confirmButtonColor: "#dc2626",
				});

				if (!result.isConfirmed) return;

				setUpdating(true);
				try {
					await updatePengurusStatus(pengurusId, newStatus, null, pengurus.desa_id);

					await Swal.fire({
						icon: "success",
						title: "Berhasil",
						text: "Pengurus berhasil dinonaktifkan",
						timer: 2000,
						showConfirmButton: false,
					});

					loadPengurusDetail();
				} catch (error) {
					console.error("Error updating status:", error);
					Swal.fire({
						icon: "error",
						title: "Gagal",
						text: pesanError(error, "Gagal mengubah status pengurus"),
					});
				} finally {
					setUpdating(false);
				}
			}
		} else {
			// Activating pengurus
			const result = await Swal.fire({
				title: "Aktifkan Pengurus?",
				text: "Apakah Anda yakin ingin mengaktifkan pengurus ini?",
				icon: "warning",
				showCancelButton: true,
				confirmButtonText: "Ya, lanjutkan",
				cancelButtonText: "Batal",
				confirmButtonColor: "#059669",
			});

			if (!result.isConfirmed) return;

			setUpdating(true);
			try {
				await updatePengurusStatus(pengurusId, newStatus, null, pengurus.desa_id);

				await Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: "Pengurus berhasil diaktifkan",
					timer: 2000,
					showConfirmButton: false,
				});

				loadPengurusDetail();
			} catch (error) {
				console.error("Error updating status:", error);
				Swal.fire({
					icon: "error",
					title: "Gagal",
					text: pesanError(error, "Gagal mengubah status pengurus"),
				});
			} finally {
				setUpdating(false);
			}
		}
	};

	// Helper: show tunda verifikasi feedback modal for pengurus
	const showTundaVerifikasiPengurusModal = async () => {
		const { value: formValues } = await Swal.fire({
			title: "Tolak Verifikasi Pengurus",
			html: `
				<div class="text-left space-y-3">
					<p class="text-sm text-gray-600 mb-3">Berikan catatan/alasan penolakan verifikasi agar desa dapat memperbaiki data.</p>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Pilih alasan:</label>
						<div class="space-y-2" id="swal-checklist">
							<label class="flex items-center gap-2 text-sm">
								<input type="checkbox" value="SK Pengangkatan tidak sesuai" class="swal-check rounded"> SK Pengangkatan tidak sesuai
							</label>
							<label class="flex items-center gap-2 text-sm">
								<input type="checkbox" value="Data pribadi belum lengkap" class="swal-check rounded"> Data pribadi belum lengkap
							</label>
							<label class="flex items-center gap-2 text-sm">
								<input type="checkbox" value="NIK tidak valid" class="swal-check rounded"> NIK tidak valid
							</label>
							<label class="flex items-center gap-2 text-sm">
								<input type="checkbox" value="Data tidak valid" class="swal-check rounded"> Data tidak valid
							</label>
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Keterangan tambahan (opsional):</label>
						<textarea id="swal-catatan" class="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows="3" placeholder="Tuliskan keterangan tambahan..."></textarea>
					</div>
				</div>`,
			showCancelButton: true,
			confirmButtonText: "Kirim & Tolak Verifikasi",
			cancelButtonText: "Kembali",
			confirmButtonColor: "#ef4444",
			focusConfirm: false,
			preConfirm: () => {
				const checks = Array.from(document.querySelectorAll('.swal-check:checked')).map(c => c.value);
				const catatan = document.getElementById('swal-catatan').value.trim();
				const allNotes = [...checks];
				if (catatan) allNotes.push(catatan);
				if (allNotes.length === 0) {
					Swal.showValidationMessage('Pilih minimal satu alasan atau isi keterangan');
					return false;
				}
				return allNotes.join('; ');
			},
		});

		if (!formValues) return;

		setUpdating(true);
		try {
			const res = await updatePengurusVerifikasi(pengurusId, "ditolak", pengurus.desa_id, formValues);
			applyVerifikasiResult(res, { status_verifikasi: "ditolak", catatan_verifikasi: formValues });

			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: "Verifikasi ditolak dan catatan telah dikirim ke desa",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error) {
			console.error("Error updating verification:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: pesanError(error, "Gagal menunda verifikasi"),
			});
		} finally {
			setUpdating(false);
		}
	};

	// Pakai baris terbaru dari server (verified_at, verifikator_nama ikut) + muat ulang log
	const applyVerifikasiResult = (res, fallback) => {
		const updated = res?.data?.data;
		setPengurus((prev) => ({
			...prev,
			...fallback,
			...(updated && {
				status_verifikasi: updated.status_verifikasi,
				catatan_verifikasi: updated.catatan_verifikasi,
				verifikator_nama: updated.verifikator_nama,
				verified_at: updated.verified_at,
			}),
		}));
		getPengurusActivityLogs(pengurusId)
			.then((r) => setActivityLogs(r?.data || []))
			.catch(() => {});
	};

	// Helper: execute pengurus verification
	const executePengurusVerification = async () => {
		setUpdating(true);
		try {
			const res = await updatePengurusVerifikasi(pengurusId, "verified", pengurus.desa_id);
			applyVerifikasiResult(res, { status_verifikasi: "verified", catatan_verifikasi: null });

			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: "Pengurus berhasil diverifikasi",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error) {
			console.error("Error updating verification:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: pesanError(error, "Gagal memverifikasi pengurus"),
			});
		} finally {
			setUpdating(false);
		}
	};

	const handleVerificationUpdate = async () => {
		if (pengurus.status_verifikasi === "verified") {
			// Sudah verified → tampilkan modal tolak/batalkan
			await showTundaVerifikasiPengurusModal();
			return;
		}

		// Belum verified → CEK KELENGKAPAN DATA TERLEBIH DAHULU
		const missing = [];
		if (!pengurus.nik) missing.push("NIK");
		if (!pengurus.produk_hukum_id) missing.push("SK Pengangkatan");
		// Telepon, alamat, tanggal mulai jabatan: opsional untuk verifikasi

		if (missing.length > 0) {
			// Data tidak lengkap → hanya tampilkan info, tidak bisa verifikasi
			await Swal.fire({
				title: "Data Belum Lengkap",
				html: `
					<div class="text-left">
						<p class="text-sm text-gray-600 mb-3">Lengkapi data berikut sebelum melakukan verifikasi:</p>
						<ul class="space-y-1.5 mb-4">
							${missing.map(m => `
								<li class="flex items-center gap-2 text-sm text-gray-700">
									<span class="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
									${m}
								</li>`).join("")}
						</ul>
						<p class="text-xs text-gray-400">Hubungi pihak desa untuk melengkapi data terlebih dahulu.</p>
					</div>`,
				icon: "warning",
				showConfirmButton: false,
				showCancelButton: true,
				cancelButtonText: "Tutup",
				cancelButtonColor: "#6b7280",
			});
			return;
		}

		// Data lengkap → tampilkan pilihan Verifikasi / Tolak
		let selectedAction = null;

		await Swal.fire({
			title: "Opsi Verifikasi",
			html: `
				<div class="text-left space-y-3">
					<button id="swal-verify-btn" class="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
						<p class="font-medium text-blue-800 text-sm">✅ Verifikasi Pengurus</p>
						<p class="text-xs text-blue-600 mt-1">Data sudah sesuai dan lengkap, setujui verifikasi.</p>
					</button>
					<button id="swal-tunda-btn" class="w-full text-left p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
						<p class="font-medium text-red-800 text-sm">❌ Tolak Verifikasi</p>
						<p class="text-xs text-red-600 mt-1">Data belum sesuai, kirim catatan ke desa untuk diperbaiki.</p>
					</button>
				</div>`,
			showConfirmButton: false,
			showCancelButton: true,
			cancelButtonText: "Batal",
			didOpen: () => {
				document.getElementById("swal-verify-btn").addEventListener("click", () => {
					selectedAction = "verify";
					Swal.close();
				});
				document.getElementById("swal-tunda-btn").addEventListener("click", () => {
					selectedAction = "tunda";
					Swal.close();
				});
			},
		});

		if (selectedAction === "verify") {
			await executePengurusVerification();
		} else if (selectedAction === "tunda") {
			await showTundaVerifikasiPengurusModal();
		}
	};

	const handleAjukanUlangPengurus = async () => {
		const confirm = await Swal.fire({
			title: "Ajukan Ulang Verifikasi?",
			html: `<div class="text-left"><p class="text-sm text-gray-600">Pastikan Anda sudah memperbaiki data sesuai catatan penolakan sebelumnya.</p><p class="text-sm text-gray-600 mt-2">Status akan berubah menjadi <strong>"Menunggu Verifikasi"</strong> dan akan ditinjau ulang oleh admin.</p></div>`,
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Ya, Ajukan Ulang",
			cancelButtonText: "Batal",
			confirmButtonColor: "#3b82f6",
		});

		if (!confirm.isConfirmed) return;

		try {
			setUpdating(true);
			await ajukanUlangPengurusVerifikasi(pengurusId, pengurus.desa_id);
			Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: "Verifikasi telah diajukan ulang. Silakan tunggu peninjauan dari admin.",
				timer: 2500,
				showConfirmButton: false,
			});
			loadPengurusDetail();
		} catch (error) {
			console.error("Error ajukan ulang:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: pesanError(error, "Gagal mengajukan ulang verifikasi"),
			});
		} finally {
			setUpdating(false);
		}
	};
	const handleEdit = () => {
		// Navigate to edit page using role-based routing
		navigate(getPengurusRoutePath(isSuperAdmin(), canEditAsStaf, pengurusId, "edit", isKecamatanUser));
	};

	// Edit langsung di kotaknya; halaman edit penuh tetap ada di menu titik tiga (foto & SK)
	const mulaiEdit = (kotak) => {
		const awal = {};
		// jabatan ikut dimuat di kotak profil karena menentukan tampilnya nomor buku nikah
		[...FIELD_KOTAK[kotak], "jabatan"].forEach((f) => (awal[f] = nilaiAwal(pengurus, f)));
		setDraft(awal);
		setKotakEdit(kotak);
	};
	const batalEdit = () => {
		setKotakEdit(null);
		setDraft({});
	};

	const simpanKotak = async () => {
		const gagal = (text) => Swal.fire({ icon: "warning", title: "Periksa Isian", text });
		if (kotakEdit === "profil") {
			if (!draft.nama_lengkap.trim()) return gagal("Nama lengkap wajib diisi");
			if (draft.nik && !/^\d{16}$/.test(draft.nik)) return gagal("NIK harus 16 digit angka");
		}
		if (kotakEdit === "jabatan" && !draft.jabatan.trim()) return gagal("Jabatan wajib diisi");
		if (
			kotakEdit === "jabatan" &&
			draft.tanggal_mulai_jabatan &&
			draft.tanggal_akhir_jabatan &&
			draft.tanggal_akhir_jabatan < draft.tanggal_mulai_jabatan
		) {
			return gagal("Tanggal akhir jabatan tidak boleh sebelum tanggal mulai");
		}

		const fd = new FormData();
		FIELD_KOTAK[kotakEdit].forEach((f) => {
			// Buku nikah yang disembunyikan tidak dikirim, supaya nilai lamanya tidak terhapus
			if (f === "nomor_buku_nikah" && !tampilBukuNikah(draft)) return;
			fd.append(f, draft[f] === "TIDAK_DIKETAHUI" ? "" : draft[f] ?? "");
		});

		setMenyimpan(true);
		try {
			const res = await updatePengurus(pengurusId, fd, { multipart: true });
			const updated = res?.data?.data;
			if (updated) setPengurus((prev) => ({ ...prev, ...updated }));
			batalEdit();
			getPengurusActivityLogs(pengurusId)
				.then((r) => setActivityLogs(r?.data || []))
				.catch(() => {});
			Swal.fire({
				icon: "success",
				title: "Tersimpan",
				timer: 1500,
				showConfirmButton: false,
				toast: true,
				position: "top-end",
			});
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal Menyimpan",
				text: error?.response?.data?.message || "Gagal memperbarui data pengurus",
			});
		} finally {
			setMenyimpan(false);
		}
	};

	// Satu kotak saja yang bisa diedit sekaligus
	const propsEdit = (kotak) => ({
		onEdit: canEditPengurus ? () => mulaiEdit(kotak) : null,
		editDisabled: !isEditMode || (kotakEdit !== null && kotakEdit !== kotak),
		editing: kotakEdit === kotak,
		onSave: simpanKotak,
		onCancel: batalEdit,
		saving: menyimpan,
	});

	const handleDeletePengurus = async () => {
		if (!isSuperAdmin()) return;

		const result = await Swal.fire({
			title: "Hapus Pengurus?",
			text: `${pengurus.nama_lengkap} akan dihapus permanen.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Ya, hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		setUpdating(true);
		try {
			await deletePengurus(pengurusId, pengurus.desa_id);

			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: "Pengurus berhasil dihapus",
				timer: 2000,
				showConfirmButton: false,
			});

			const parentPath = `/bidang/pmd/kelembagaan/${getRouteType(pengurus.pengurusable_type)}/${pengurus.pengurusable_id}`;
			navigate(parentPath, { replace: true });
		} catch (error) {
			console.error("Error deleting pengurus:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: pesanError(error, "Gagal menghapus pengurus"),
			});
		} finally {
			setUpdating(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Memuat detail pengurus...</p>
				</div>
			</div>
		);
	}

	if (!pengurus) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-gray-600 mb-4">Data pengurus tidak ditemukan</p>
					<button
						onClick={() => navigate(-1)}
						className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
					>
						Kembali
					</button>
				</div>
			</div>
		);
	}

	// Sama dengan aturan tombol Edit di header: desa tidak bisa edit pengurus yang sudah verified
	const canManageActions = canManage && !isKecamatanUser; // Pindahkan, Aktif/Nonaktifkan
	const canEditPengurus =
		canManageActions &&
		!(!canEditAsStaf && pengurus.status_verifikasi === "verified");

	return (
		<div className="min-h-screen p-8">
			{/* Breadcrumb */}
			<div className="flex bg-white p-2 mb-4 rounded-md shadow-sm justify-between items-center">
				<nav className="flex items-center space-x-2 text-sm">
					{/* Dashboard */}
					<Link
						to={bcPath("/bidang/pmd/kelembagaan", "/desa/dashboard")}
						className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
					>
						<FaHome className="mr-1" />
						{isKecamatanUser ? "Verifikasi Kelembagaan" : "Dashboard Kelembagaan"}
					</Link>
					<FaChevronRight className="text-gray-400 text-xs" />

					{/* Desa Name */}
					{desaInfo && (
						<>
							<Link
								to={bcPath(`/bidang/pmd/kelembagaan/admin/${pengurus.desa_id}`, "/desa/kelembagaan")}
								className="text-gray-500 hover:text-indigo-600 transition-colors"
							>
								{desaInfo.nama}
							</Link>
							<FaChevronRight className="text-gray-400 text-xs" />
						</>
					)}

					{/* If RT, show RW first */}
					{(pengurus.pengurusable_type === "rt" || pengurus.pengurusable_type === "rts") && rwInfo && (
						<>
							{/* RW Link */}
							<Link
								to={isKecamatanUser
									? `/kecamatan/kelembagaan/${pengurus.desa_id}/rw`
									: isBidangKelembagaanViewer()
									? `/bidang/pmd/kelembagaan/admin/${pengurus.desa_id}/rw`
									: `/desa/kelembagaan/rw`
								}
								className="text-gray-500 hover:text-indigo-600 transition-colors"
							>
								RW
							</Link>
							<FaChevronRight className="text-gray-400 text-xs" />

							{/* RW Number */}
							<Link
								to={isKecamatanUser
									? `/kecamatan/kelembagaan/${pengurus.desa_id}/rw/${rwInfo.id}`
									: isBidangKelembagaanViewer()
									? `/bidang/pmd/kelembagaan/rw/${rwInfo.id}`
									: `/desa/kelembagaan/rw/${rwInfo.id}`
								}
								className="text-gray-500 hover:text-indigo-600 transition-colors"
							>
								RW {rwInfo.nomor}
							</Link>
							<FaChevronRight className="text-gray-400 text-xs" />

							{/* RT Number */}
							<Link
								to={isKecamatanUser
									? `/kecamatan/kelembagaan/${pengurus.desa_id}/rt/${pengurus.pengurusable_id}`
									: isBidangKelembagaanViewer()
									? `/bidang/pmd/kelembagaan/rt/${pengurus.pengurusable_id}`
									: `/desa/kelembagaan/rt/${pengurus.pengurusable_id}`
								}
								className="text-gray-500 hover:text-indigo-600 transition-colors"
							>
								RT {kelembagaanInfo?.nomor || "Detail"}
							</Link>
							<FaChevronRight className="text-gray-400 text-xs" />
						</>
					)}

					{/* For single-instance types (satlinmas, karang-taruna, lpm, pkk) - direct link */}
					{["satlinmas", "karang_taruna", "karang_tarunas", "lpm", "lpms", "pkk", "pkks"].includes(
						pengurus.pengurusable_type,
					) ? (
						<>
							<Link
								to={bcDetailPath(
									`/bidang/pmd/kelembagaan/${getRouteType(pengurus.pengurusable_type)}/${pengurus.pengurusable_id}`,
									`/desa/kelembagaan/${getRouteType(pengurus.pengurusable_type)}/${pengurus.pengurusable_id}`
								)}
								className="text-gray-500 hover:text-indigo-600 transition-colors"
							>
								{getDisplayName(pengurus.pengurusable_type)}
							</Link>
							<FaChevronRight className="text-gray-400 text-xs" />
						</>
					) : (
						pengurus.pengurusable_type !== "rt" && pengurus.pengurusable_type !== "rts" && (
							<>
								{/* For other types (RW, Posyandu) - show type link, then item */}
								<Link
									to={isKecamatanUser
										? `/kecamatan/kelembagaan/${pengurus.desa_id}/${getRouteType(pengurus.pengurusable_type)}`
										: isBidangKelembagaanViewer()
										? `/bidang/pmd/kelembagaan/admin/${pengurus.desa_id}/${getRouteType(pengurus.pengurusable_type)}`
										: `/desa/kelembagaan/${getRouteType(pengurus.pengurusable_type)}`
									}
									className="text-gray-500 hover:text-indigo-600 transition-colors"
								>
									{getDisplayName(pengurus.pengurusable_type)}
								</Link>
								<FaChevronRight className="text-gray-400 text-xs" />

								{/* Kelembagaan Number/Name */}
								<Link
									to={bcDetailPath(
										`/bidang/pmd/kelembagaan/${getRouteType(pengurus.pengurusable_type)}/${pengurus.pengurusable_id}`,
										`/desa/kelembagaan/${getRouteType(pengurus.pengurusable_type)}/${pengurus.pengurusable_id}`
									)}
									className="text-gray-500 hover:text-indigo-600 transition-colors"
								>
									{kelembagaanInfo?.nomor || kelembagaanInfo?.nama || "Detail"}
								</Link>
								<FaChevronRight className="text-gray-400 text-xs" />
							</>
						)
					)}

					{/* Pengurus Name */}
					<span className="text-gray-900 font-medium">
						{pengurus.nama_lengkap}
					</span>
				</nav>
				<span
					className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
						isEditMode
							? "bg-green-100 text-green-700 border border-green-300"
							: "bg-red-100 text-red-700 border border-red-300"
					}`}
				>
					{isEditMode ? (
						<>
							<FaLockOpen className="w-3 h-3" />
							<span>Aplikasi Dibuka</span>
						</>
					) : (
						<>
							<FaLock className="w-3 h-3" />
							<span>Aplikasi Ditutup</span>
						</>
					)}
				</span>
			</div>

			{/* Header with Actions */}
			<div className="bg-white flex items-center justify-between p-4 mb-4 rounded-md shadow-sm">
				<div className="flex items-center space-x-4">
					<button
						onClick={() => isKecamatanUser ? navigate("/kecamatan/kelembagaan") : navigate(-1)}
						className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
						title="Kembali"
					>
						<FaArrowLeft className="text-gray-600" />
					</button>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							Detail Pengurus
						</h1>
						<p className="text-sm text-gray-500">
							Informasi lengkap pengurus kelembagaan
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					{/* Verification Button - kecamatan, admin PMD, dan superadmin */}
					{canVerify && (
						<button
							onClick={() => handleVerificationUpdate()}
							className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
								pengurus.status_verifikasi === "verified"
									? isKecamatanUser
										? "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
										: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300"
									: "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
							}`}
							title={
								pengurus.status_verifikasi === "verified"
									? isKecamatanUser ? "Sudah terverifikasi" : "Batalkan verifikasi pengurus"
									: pengurus.status_verifikasi === "ditolak"
									? "Verifikasi ulang pengurus"
									: "Verifikasi pengurus"
							}
							// Kecamatan tidak bisa unverify — hanya bisa verify/tolak
							disabled={updating || (isKecamatanUser && pengurus.status_verifikasi === "verified")}
						>
							{pengurus.status_verifikasi === "verified" ? (
								<>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
									<span>{isKecamatanUser ? "Terverifikasi" : "Batalkan Verifikasi"}</span>
								</>
							) : (
								<>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span>{pengurus.status_verifikasi === "ditolak" ? "Verifikasi Ulang" : "Verifikasi Pengurus"}</span>
								</>
							)}
						</button>
					)}

					{/* Aksi lain dalam menu titik tiga */}
					{(canManageActions || isSuperAdmin()) && (
						<div className="relative" ref={menuRef}>
							<button
								type="button"
								onClick={() => setMenuOpen((v) => !v)}
								aria-haspopup="menu"
								aria-expanded={menuOpen}
								className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
								title="Aksi lainnya"
							>
								<FaEllipsisV className="w-4 h-4" />
							</button>

							{menuOpen && (
								<div role="menu" className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-30">
									{canEditPengurus && (
										<MenuItem
											icon={FaEdit}
											label="Edit Lengkap (foto & SK)"
											onClick={closeAnd(handleEdit)}
											disabled={!isEditMode}
											hint={!isEditMode ? "Fitur edit ditutup" : null}
										/>
									)}
									{canManageActions && (
										<>
											<MenuItem
												icon={FaExchangeAlt}
												label="Pindahkan"
												onClick={closeAnd(() => setShowTransfer(true))}
												disabled={updating || !isEditMode}
												hint={!isEditMode ? "Fitur pindah pengurus ditutup" : null}
											/>
											<MenuItem
												icon={pengurus.status_jabatan === "aktif" ? FaToggleOff : FaToggleOn}
												label={pengurus.status_jabatan === "aktif" ? "Nonaktifkan" : "Aktifkan"}
												onClick={closeAnd(() => handleStatusUpdate(pengurus.status_jabatan === "aktif" ? "selesai" : "aktif"))}
												disabled={updating || !isEditMode}
												hint={!isEditMode ? "Fitur perubahan status ditutup" : null}
											/>
										</>
									)}
									{isSuperAdmin() && (
										<>
											<div className="my-1 border-t border-gray-100" />
											<MenuItem icon={FaTrash} label="Hapus" onClick={closeAnd(handleDeletePengurus)} disabled={updating} danger />
										</>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			<TransferPengurusModal
				isOpen={showTransfer}
				onClose={() => setShowTransfer(false)}
				pengurus={pengurus}
				desaInfo={desaInfo}
				canCrossDesa={isSuperAdmin()}
				onTransferred={() => {
					setShowTransfer(false);
					loadPengurusDetail();
				}}
			/>

			{/* Main Content */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Kartu Profil + Log Aktivitas */}
				<div className="lg:col-span-1 space-y-5">
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
						{/* Header bergelombang */}
						<div className="relative bg-gradient-to-br from-blue-100 via-indigo-50 to-sky-100 pt-6 pb-16">
							{kotakEdit === "profil" ? (
								<div className="absolute top-3 right-3 z-10">
									<TombolSimpanBatal onSave={simpanKotak} onCancel={batalEdit} saving={menyimpan} />
								</div>
							) : (
								canEditPengurus && (
									<button
										onClick={() => mulaiEdit("profil")}
										disabled={!isEditMode || kotakEdit !== null}
										className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white/90 border border-indigo-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										title={!isEditMode ? "Fitur edit ditutup" : "Edit data pribadi"}
									>
										<FaPen className="w-3 h-3" />
										Edit
									</button>
								)
							)}
							<svg className="absolute bottom-0 left-0 w-full h-12 text-white" viewBox="0 0 400 48" preserveAspectRatio="none" fill="currentColor">
								<path d="M0 28 C 80 0, 160 48, 240 24 S 360 8, 400 20 V48 H0 Z" />
							</svg>
							<div className="relative flex justify-center">
								<div className="relative">
									{pengurus.avatar ? (
										<img
											src={`${imageBaseUrl}/${pengurus.avatar}`}
											alt={pengurus.nama_lengkap}
											className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
										/>
									) : (
										<div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
											<FaUser className="text-gray-400 text-5xl" />
										</div>
									)}
									<span
										className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-white ${
											pengurus.status_jabatan === "aktif" ? "bg-green-500" : "bg-red-500"
										}`}
										title={`Status: ${pengurus.status_jabatan}`}
									/>
								</div>
							</div>
						</div>

						<div className="px-6 pb-6 -mt-10 relative">
							<div className="text-center">
								<h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
									{pengurus.nama_lengkap}
								</h2>
								<p className="text-indigo-600 font-medium uppercase text-sm mt-1">
									{pengurus.jabatan}
								</p>
								<span
									className={`inline-flex items-center gap-1.5 mt-3 px-4 py-1 text-sm font-semibold rounded-full text-white ${
										pengurus.status_jabatan === "aktif" ? "bg-green-500" : "bg-red-500"
									}`}
								>
									<span className="w-1.5 h-1.5 rounded-full bg-white" />
									{pengurus.status_jabatan === "aktif" ? "Aktif" : "Selesai"}
								</span>
							</div>

							{kotakEdit === "profil" ? (
								<div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 gap-3">
									<FieldEdit label="Nama Lengkap" wajib className="col-span-2">
										<InputEdit name="nama_lengkap" draft={draft} setDraft={setDraft} />
									</FieldEdit>
									<FieldEdit label="NIK" className="col-span-2">
										<InputEdit name="nik" draft={draft} setDraft={setDraft} maxLength={16} inputMode="numeric" placeholder="16 digit angka" />
									</FieldEdit>
									<FieldEdit label="Jenis Kelamin">
										<SelectEdit name="jenis_kelamin" draft={draft} setDraft={setDraft} opsi={OPSI.jenis_kelamin} />
									</FieldEdit>
									<FieldEdit label="Golongan Darah">
										<SelectEdit name="golongan_darah" draft={draft} setDraft={setDraft} opsi={OPSI.golongan_darah} />
									</FieldEdit>
									<FieldEdit label="Tempat Lahir">
										<InputEdit name="tempat_lahir" draft={draft} setDraft={setDraft} />
									</FieldEdit>
									<FieldEdit label="Tanggal Lahir">
										<InputEdit name="tanggal_lahir" type="date" draft={draft} setDraft={setDraft} />
									</FieldEdit>
									<FieldEdit label="Status Perkawinan">
										<SelectEdit name="status_perkawinan" draft={draft} setDraft={setDraft} opsi={OPSI.status_perkawinan} />
									</FieldEdit>
									<FieldEdit label="Agama">
										<SelectEdit name="agama" draft={draft} setDraft={setDraft} opsi={OPSI.agama} />
									</FieldEdit>
									{tampilBukuNikah(draft) && (
										<FieldEdit label="Nomor Buku Nikah (opsional)" className="col-span-2">
											<InputEdit name="nomor_buku_nikah" draft={draft} setDraft={setDraft} />
										</FieldEdit>
									)}
									<FieldEdit label="Pendidikan" className="col-span-2">
										<SelectEdit name="pendidikan" draft={draft} setDraft={setDraft} opsi={OPSI.pendidikan} />
									</FieldEdit>
									<FieldEdit label="No. Telepon" className="col-span-2">
										<InputEdit name="no_telepon" type="tel" draft={draft} setDraft={setDraft} placeholder="08xxxxxxxxxx" />
									</FieldEdit>
									<FieldEdit label="Alamat" className="col-span-2">
										<textarea
											value={draft.alamat}
											onChange={(e) => setDraft((d) => ({ ...d, alamat: e.target.value }))}
											rows={2}
											className={kelasInput}
										/>
									</FieldEdit>
									<p className="col-span-2 text-xs text-gray-400">
										Foto profil diubah lewat menu ⋮ → Edit.
									</p>
								</div>
							) : (
							<>
							<div className="mt-6 pt-5 border-t border-gray-100 space-y-4">
								<div className="grid grid-cols-2 gap-3">
									<ProfileItem icon={FaIdCard} label="NIK" value={pengurus.nik} />
									<ProfileItem
										icon={FaVenusMars}
										label="Jenis Kelamin"
										value={pengurus.jenis_kelamin?.replace(/_/g, "-")}
										iconClass="bg-purple-50 text-purple-500"
									/>
								</div>
								<ProfileItem
									icon={FaCalendarAlt}
									label="Tempat, Tanggal Lahir"
									value={[pengurus.tempat_lahir, formatTanggal(pengurus.tanggal_lahir)].filter(Boolean).join(", ")}
								/>
								<ProfileItem icon={FaRing} label="Status Perkawinan" value={pengurus.status_perkawinan} />
								<ProfileItem icon={FaGraduationCap} label="Pendidikan" value={pengurus.pendidikan} />
								<div className="grid grid-cols-2 gap-3">
									<ProfileItem icon={FaPrayingHands} label="Agama" value={pengurus.agama} />
									<ProfileItem icon={FaTint} label="Golongan Darah" value={pengurus.golongan_darah} />
								</div>
								{pengurus.nomor_buku_nikah && (
									<ProfileItem icon={FaFileAlt} label="Nomor Buku Nikah" value={pengurus.nomor_buku_nikah} />
								)}
							</div>

							{/* Kontak & Domisili */}
							<div className="mt-6 bg-blue-50 rounded-xl p-4">
								<div className="flex items-center gap-2 mb-3">
									<div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
										<FaPhone className="text-white w-3.5 h-3.5" />
									</div>
									<h3 className="text-sm font-bold text-gray-900">Kontak &amp; Domisili</h3>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<ProfileItem icon={FaPhone} label="No. Telepon" value={pengurus.no_telepon} iconClass="bg-white text-blue-500" />
									<ProfileItem icon={FaMapMarkerAlt} label="Alamat" value={pengurus.alamat} iconClass="bg-white text-blue-500" />
								</div>
							</div>
							</>
							)}
						</div>
					</div>

					<PengurusBpjsCard pengurusId={pengurusId} nik={pengurus.nik} />

					<SectionCard
						icon={FaHistory}
						title="Log Aktivitas"
						subtitle="Riwayat perubahan data pengurus"
						tone="slate"
					>
						<PengurusActivityLog logs={activityLogs} />
					</SectionCard>
				</div>

				{/* Detail */}
				<div className="lg:col-span-2 space-y-5">
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
						<PengurusTimeline pengurus={pengurus} logs={activityLogs} />
					</div>

					<SectionCard
						icon={FaFileAlt}
						title="SK Pengangkatan"
						subtitle="Produk hukum dasar jabatan"
						tone="amber"
					>
						{pengurus.produk_hukum ? (
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
								<div>
									<p className="text-xs font-semibold text-green-700 mb-1">SK Terpilih · {pengurus.produk_hukum.jenis}</p>
									<h4 className="font-bold text-gray-900">
										Nomor {pengurus.produk_hukum.nomor} Tahun {pengurus.produk_hukum.tahun}
									</h4>
									<p className="text-sm text-gray-700 mt-0.5">{pengurus.produk_hukum.judul}</p>
								</div>
								<button
									onClick={() =>
										navigate(
											canEditAsStaf
												? `/bidang/pmd/produk-hukum/${pengurus.produk_hukum_id}`
												: `/desa/produk-hukum/${pengurus.produk_hukum_id}`,
										)
									}
									className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
								>
									<FaExternalLinkAlt className="w-3 h-3" />
									<span>Lihat Detail SK</span>
								</button>
							</div>
						) : (
							<div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
								<h4 className="font-bold text-yellow-800 text-sm mb-1">
									Belum Terhubung dengan SK Pengangkatan
								</h4>
								<p className="text-yellow-700 text-xs leading-relaxed">
									Pengurus ini belum memiliki SK pengangkatan yang terdaftar. Silakan hubungi admin untuk
									melengkapi dokumen legal.
								</p>
							</div>
						)}
					</SectionCard>

					<SectionCard
						icon={FaCalendarAlt}
						title="Informasi Jabatan"
						tone="purple"
						{...propsEdit("jabatan")}
					>
						{kotakEdit === "jabatan" ? (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FieldEdit label="Jabatan" wajib className="md:col-span-2">
									<SelectEdit
										name="jabatan"
										draft={draft}
										setDraft={setDraft}
										opsi={getJabatanList(getRouteType(pengurus.pengurusable_type)).map((j) => [j, j])}
										kosong="Pilih jabatan"
										catatanLuar=" (di luar pemetaan)"
									/>
								</FieldEdit>
								<FieldEdit label="Tanggal Mulai Jabatan">
									<InputEdit name="tanggal_mulai_jabatan" type="date" draft={draft} setDraft={setDraft} />
								</FieldEdit>
								<FieldEdit label="Tanggal Akhir Jabatan">
									<InputEdit name="tanggal_akhir_jabatan" type="date" draft={draft} setDraft={setDraft} />
								</FieldEdit>
							</div>
						) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<InfoField label="Jabatan" value={pengurus.jabatan} />
							<InfoField label="Status Verifikasi">
								<span
									className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${
										pengurus.status_verifikasi === "verified"
											? "bg-green-100 text-green-800"
											: pengurus.status_verifikasi === "ditolak"
												? "bg-red-100 text-red-800"
												: "bg-yellow-100 text-yellow-800"
									}`}
								>
									{pengurus.status_verifikasi === "verified"
										? "Terverifikasi"
										: pengurus.status_verifikasi === "ditolak"
											? "Verifikasi Ditolak"
											: "Belum Verifikasi"}
								</span>
							</InfoField>
							<InfoField label="Tanggal Mulai Jabatan" value={formatTanggal(pengurus.tanggal_mulai_jabatan)} />
							<InfoField label="Tanggal Akhir Jabatan" value={formatTanggal(pengurus.tanggal_akhir_jabatan)} />
						</div>
						)}

						{/* Catatan Verifikasi */}
						{pengurus.catatan_verifikasi && pengurus.status_verifikasi !== "verified" && (
							<div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
								<p className="text-sm font-semibold text-amber-800 mb-1">📝 Catatan Verifikasi</p>
								<p className="text-sm text-amber-700">{pengurus.catatan_verifikasi}</p>
								{pengurus.verifikator_nama && (
									<p className="text-xs text-amber-600 mt-2">
										— {pengurus.verifikator_nama}
										{pengurus.verified_at && `, ${formatTanggal(pengurus.verified_at)}`}
									</p>
								)}
							</div>
						)}

						{/* Ajukan Ulang Verifikasi - For desa when ditolak */}
						{pengurus.status_verifikasi === "ditolak" && user?.role === "desa" && (
							<div className="mt-4">
								<button
									onClick={handleAjukanUlangPengurus}
									disabled={updating}
									className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									{updating ? "Memproses..." : "Ajukan Ulang Verifikasi"}
								</button>
								<p className="text-xs text-gray-500 mt-1">Klik setelah memperbaiki data sesuai catatan di atas</p>
							</div>
						)}
					</SectionCard>

					<SectionCard
						icon={FaUniversity}
						title="Informasi Rekening"
						subtitle="Data rekening untuk keperluan insentif"
						tone="blue"
						{...propsEdit("rekening")}
					>
						{kotakEdit === "rekening" ? (
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<FieldEdit label="Nama Bank">
									<InputEdit name="nama_bank" draft={draft} setDraft={setDraft} />
								</FieldEdit>
								<FieldEdit label="Nomor Rekening">
									<InputEdit name="nomor_rekening" draft={draft} setDraft={setDraft} inputMode="numeric" />
								</FieldEdit>
								<FieldEdit label="Nama Pemilik Rekening">
									<InputEdit name="nama_rekening" draft={draft} setDraft={setDraft} />
								</FieldEdit>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<StackedField label="Nama Bank" value={pengurus.nama_bank} />
								<StackedField label="Nomor Rekening" value={pengurus.nomor_rekening} mono />
								<StackedField label="Nama Pemilik Rekening" value={pengurus.nama_rekening} />
							</div>
						)}
					</SectionCard>
				</div>
			</div>
		</div>
	);
};

export default PengurusDetailPage;
