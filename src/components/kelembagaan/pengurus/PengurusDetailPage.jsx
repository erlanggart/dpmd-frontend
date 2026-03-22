import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
	getPengurusById,
	updatePengurusStatus,
	updatePengurusVerifikasi,
} from "../../../services/pengurus";
import { getProdukHukums, getDesa } from "../../../services/api";
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
} from "react-icons/fa";
import Swal from "sweetalert2";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

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
const getPengurusRoutePath = (user, pengurusId, action = "") => {
	const isSuperAdmin = user?.role === "superadmin";
	const isAdminBidangPMD = ["pemberdayaan_masyarakat", "pmd"].includes(
		user?.role,
	);

	if (isSuperAdmin || isAdminBidangPMD) {
		return `/dashboard/pengurus/${pengurusId}${action ? `/${action}` : ""}`;
	}

	// Default for desa users
	return `/desa/pengurus/${pengurusId}${action ? `/${action}` : ""}`;
};

const PengurusDetailPage = () => {
	const params = useParams();
	const pengurusId = params.id; // Changed from destructuring to direct access
	const navigate = useNavigate();
	const { user, isSuperAdmin, isAdminBidangPMD, canManageKelembagaan } =
		useAuth();
	const { isEditMode } = useEditMode();

	const [pengurus, setPengurus] = useState(null);
	const [kelembagaanInfo, setKelembagaanInfo] = useState(null);
	const [desaInfo, setDesaInfo] = useState(null);
	const [rwInfo, setRwInfo] = useState(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);
	const [produkHukumList, setProdukHukumList] = useState([]);

	// Check permissions using AuthContext helpers
	const canManage = canManageKelembagaan();

	const loadProdukHukumList = async () => {
		try {
			const response = await getProdukHukums(1, "");
			const allData = response?.data?.data || [];
			setProdukHukumList(allData.data || []);
		} catch (error) {
			console.error("Error loading produk hukum:", error);
			setProdukHukumList([]);
		}
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
			// Note: pengurusable_type from database is singular (rw, rt, etc)
			switch (pengurusableType) {
				case "rw":
					response = await getRw(pengurusableId);
					break;
				case "rt":
					response = await getRt(pengurusableId);
					break;
				case "posyandu":
					response = await getPosyandu(pengurusableId);
					break;
				case "karang_taruna":
					response = await getKarangTaruna(pengurusableId);
					break;
				case "lpm":
					response = await getLpm(pengurusableId);
					break;
				case "pkk":
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
			if (pengurusableType === "rt" && kelembagaanData) {
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
		loadProdukHukumList();
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
					await updatePengurusStatus(pengurusId, newStatus, endDate);

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
						text: "Gagal mengubah status pengurus",
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
					await updatePengurusStatus(pengurusId, newStatus);

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
						text: "Gagal mengubah status pengurus",
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
				await updatePengurusStatus(pengurusId, newStatus);

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
					text: "Gagal mengubah status pengurus",
				});
			} finally {
				setUpdating(false);
			}
		}
	};

	// Helper: show tunda verifikasi feedback modal for pengurus
	const showTundaVerifikasiPengurusModal = async () => {
		const { value: formValues } = await Swal.fire({
			title: "Tunda Verifikasi Pengurus",
			html: `
				<div class="text-left space-y-3">
					<p class="text-sm text-gray-600 mb-3">Berikan catatan/alasan penundaan verifikasi agar desa dapat memperbaiki data.</p>
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
			confirmButtonText: "Kirim & Tunda Verifikasi",
			cancelButtonText: "Kembali",
			confirmButtonColor: "#f59e0b",
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
			await updatePengurusVerifikasi(pengurusId, "unverified", pengurus.desa_id, formValues);

			setPengurus((prev) => ({
				...prev,
				status_verifikasi: "unverified",
				catatan_verifikasi: formValues,
			}));

			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: "Verifikasi ditunda dan catatan telah dikirim ke desa",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error) {
			console.error("Error updating verification:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: error.response?.data?.message || "Gagal menunda verifikasi",
			});
		} finally {
			setUpdating(false);
		}
	};

	// Helper: execute pengurus verification
	const executePengurusVerification = async () => {
		setUpdating(true);
		try {
			await updatePengurusVerifikasi(pengurusId, "verified", pengurus.desa_id);

			setPengurus((prev) => ({
				...prev,
				status_verifikasi: "verified",
				catatan_verifikasi: null,
			}));

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
				text: error.response?.data?.message || "Gagal memverifikasi pengurus",
			});
		} finally {
			setUpdating(false);
		}
	};

	const handleVerificationUpdate = async () => {
		if (pengurus.status_verifikasi === "verified") {
			// Already verified → show tunda/batal modal with feedback
			await showTundaVerifikasiPengurusModal();
		} else {
			// Not yet verified → show choice: Tunda or Verifikasi
			let selectedAction = null;

			await Swal.fire({
				title: "Opsi Verifikasi",
				html: `
					<div class="text-left space-y-3">
						<button id="swal-verify-btn" class="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
							<p class="font-medium text-blue-800 text-sm">✅ Verifikasi Pengurus</p>
							<p class="text-xs text-blue-600 mt-1">Data sudah sesuai dan lengkap, setujui verifikasi.</p>
						</button>
						<button id="swal-tunda-btn" class="w-full text-left p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer">
							<p class="font-medium text-amber-800 text-sm">⏳ Tunda Verifikasi</p>
							<p class="text-xs text-amber-600 mt-1">Data belum sesuai, kirim catatan ke desa untuk diperbaiki.</p>
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
				// Check completeness before verifying
				const missing = [];
				if (!pengurus.nik) missing.push("NIK");
				if (!pengurus.produk_hukum_id) missing.push("SK Pengangkatan");
				if (!pengurus.alamat) missing.push("Alamat");
				if (!pengurus.tanggal_mulai_jabatan) missing.push("Tanggal Mulai Jabatan");

				if (missing.length > 0) {
					const confirm = await Swal.fire({
						title: "Data Belum Lengkap",
						html: `<div class="text-left"><p class="mb-2">Data berikut masih kosong:</p><ul class="list-disc pl-5 space-y-1">${missing.map(m => `<li>${m}</li>`).join("")}</ul><p class="mt-3 text-sm text-gray-500">Apakah tetap ingin memverifikasi?</p></div>`,
						icon: "warning",
						showCancelButton: true,
						confirmButtonText: "Ya, Tetap Verifikasi",
						cancelButtonText: "Batal",
						confirmButtonColor: "#3b82f6",
					});
					if (!confirm.isConfirmed) return;
				}

				await executePengurusVerification();
			} else if (selectedAction === "tunda") {
				await showTundaVerifikasiPengurusModal();
			}
		}
	};

	const handleEdit = () => {
		// Navigate to edit page using role-based routing
		navigate(getPengurusRoutePath(user, pengurusId, "edit"));
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

	return (
		<div className="min-h-screen p-8">
			{/* Breadcrumb */}
			<div className="flex bg-white p-2 mb-4 rounded-md shadow-sm justify-between items-center">
				<nav className="flex items-center space-x-2 text-sm">
					{/* Dashboard */}
					<Link
						to={
							isSuperAdmin() || isAdminBidangPMD()
								? "/bidang/pmd/kelembagaan"
								: "/desa/dashboard"
						}
						className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
					>
						<FaHome className="mr-1" />
						Dashboard
					</Link>
					<FaChevronRight className="text-gray-400 text-xs" />

					{/* Kelembagaan */}
					<Link
						to={
							isSuperAdmin() || isAdminBidangPMD()
								? "/bidang/pmd/kelembagaan"
								: "/desa/kelembagaan"
						}
						className="text-gray-500 hover:text-indigo-600 transition-colors"
					>
						Kelembagaan
					</Link>
					<FaChevronRight className="text-gray-400 text-xs" />

					{/* Desa Name (for admin only) */}
					{(isSuperAdmin() || isAdminBidangPMD()) && desaInfo && (
						<>
							<Link
								to={`/bidang/pmd/kelembagaan/admin/${pengurus.desa_id}`}
								className="text-gray-500 hover:text-indigo-600 transition-colors"
							>
								{desaInfo.nama}
							</Link>
							<FaChevronRight className="text-gray-400 text-xs" />
						</>
					)}

					{/* If RT, show RW first */}
					{pengurus.pengurusable_type === "rt" && rwInfo && (
						<>
							{/* RW Link */}
							<Link
								to={
									isSuperAdmin() || isAdminBidangPMD()
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
								to={
									isSuperAdmin() || isAdminBidangPMD()
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
								to={
									isSuperAdmin() || isAdminBidangPMD()
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
					{["satlinmas", "karang_taruna", "lpm", "pkk"].includes(
						pengurus.pengurusable_type,
					) ? (
						<>
							<Link
								to={
									isSuperAdmin() || isAdminBidangPMD()
										? `/bidang/pmd/kelembagaan/${getRouteType(pengurus.pengurusable_type)}/${pengurus.pengurusable_id}`
										: `/desa/kelembagaan/${getRouteType(pengurus.pengurusable_type)}/${pengurus.pengurusable_id}`
								}
								className="text-gray-500 hover:text-indigo-600 transition-colors"
							>
								{getDisplayName(pengurus.pengurusable_type)}
							</Link>
							<FaChevronRight className="text-gray-400 text-xs" />
						</>
					) : (
						pengurus.pengurusable_type !== "rt" && (
							<>
								{/* For other types (RW, Posyandu) - show type link, then item */}
								<Link
									to={
										isSuperAdmin() || isAdminBidangPMD()
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
									to={
										isSuperAdmin() || isAdminBidangPMD()
											? `/bidang/pmd/kelembagaan/${getRouteType(pengurus.pengurusable_type)}/${pengurus.pengurusable_id}`
											: `/desa/kelembagaan/${getRouteType(pengurus.pengurusable_type)}/${pengurus.pengurusable_id}`
									}
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
						onClick={() => navigate(-1)}
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

				<div className="flex gap-3">
				{canManage && (
					<div className="flex items-center space-x-3">
						{/* Hide edit button for desa users when pengurus is verified */}
						{!(!(isSuperAdmin() || isAdminBidangPMD()) && pengurus.status_verifikasi === "verified") && (
							<button
								onClick={handleEdit}
								disabled={!isEditMode}
								className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
									isEditMode
										? "bg-indigo-600 text-white hover:bg-indigo-700"
										: "bg-gray-300 text-gray-500 cursor-not-allowed"
								}`}
								title={!isEditMode ? "Fitur edit ditutup" : "Edit pengurus"}
							>
								<FaEdit className="text-sm" />
								<span>Edit</span>
							</button>
						)}

							<button
								onClick={() =>
									handleStatusUpdate(
										pengurus.status_jabatan === "aktif" ? "selesai" : "aktif",
									)
								}
								disabled={updating || !isEditMode}
								className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
									!isEditMode
										? "bg-gray-300 text-gray-500"
										: pengurus.status_jabatan === "aktif"
											? "bg-red-100 text-red-700 hover:bg-red-200"
											: "bg-green-100 text-green-700 hover:bg-green-200"
								}`}
								title={!isEditMode ? "Fitur perubahan status ditutup" : ""}
							>
								{updating ? (
									<span>Memproses...</span>
								) : pengurus.status_jabatan === "aktif" ? (
									<span>Nonaktifkan</span>
								) : (
									<span>Aktifkan</span>
								)}
							</button>
						</div>
					)}

					{/* Verification Button - Only for superadmin or admin bidang PMD */}
					{(isSuperAdmin() || isAdminBidangPMD()) && (
						<button
							onClick={() => handleVerificationUpdate()}
							disabled={updating}
							className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
								pengurus.status_verifikasi === "verified"
									? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300"
									: "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
							}`}
							title={
								pengurus.status_verifikasi === "verified"
									? "Batalkan verifikasi pengurus"
									: "Verifikasi pengurus"
							}
						>
							{pengurus.status_verifikasi === "verified" ? (
								<>
									<svg
										className="w-4 h-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
									<span>Batalkan Verifikasi</span>
								</>
							) : (
								<>
									<svg
										className="w-4 h-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<span>Verifikasi Pengurus</span>
								</>
							)}
						</button>
					)}
				</div>
			</div>

			{/* Main Content */}
			<div>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Profile Card */}
					<div className="lg:col-span-1 space-y-4">
						<div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 rounded-2xl shadow-lg border-2 border-blue-100 p-6">
							<div className="text-center">
								<div className="relative inline-block">
									{pengurus.avatar ? (
										<img
											src={`${imageBaseUrl}/uploads/${pengurus.avatar}`}
											alt={pengurus.nama_lengkap}
											className="w-40 h-40 rounded-2xl object-cover mx-auto border-4 border-white shadow-2xl ring-4 ring-blue-200"
										/>
									) : (
										<div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto border-4 border-white shadow-2xl ring-4 ring-blue-200">
											<FaUser className="text-gray-400 text-5xl" />
										</div>
									)}

									<div
										className={`absolute bottom-2 right-2 w-8 h-8 rounded-full border-4 border-white shadow-lg ${
											pengurus.status_jabatan === "aktif"
												? "bg-green-500"
												: "bg-red-500"
										}`}
										title={`Status: ${pengurus.status_jabatan}`}
									></div>
								</div>

								<div className="mt-6">
									<h2 className="text-2xl font-bold text-gray-900">
										{pengurus.nama_lengkap}
									</h2>
									<p className="text-lg text-indigo-600 font-semibold mt-2">
										{pengurus.jabatan}
									</p>
									<div className="mt-3">
										<span
											className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold rounded-full shadow-md ${
												pengurus.status_jabatan === "aktif"
													? "bg-green-500 text-white"
													: "bg-red-500 text-white"
											}`}
										>
											<div className={`w-2 h-2 rounded-full ${
												pengurus.status_jabatan === "aktif" ? "bg-white" : "bg-white"
											}`}></div>
											{pengurus.status_jabatan === "aktif"
												? "Aktif"
												: "Selesai"}
										</span>
									</div>
								</div>
							</div>
						</div>
						{/* Contact Information */}
						<div className="bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 rounded-2xl shadow-sm border-2 border-cyan-100 p-6">
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
									<FaPhone className="text-white w-5 h-5" />
								</div>
								<h3 className="text-lg font-bold text-gray-900">Informasi Kontak</h3>
							</div>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-semibold text-gray-800 mb-1.5">
										No. Telepon
									</label>
									<p className="text-sm text-gray-900 bg-white/70 backdrop-blur-sm border-2 border-cyan-100 p-3 rounded-lg font-medium">
										{pengurus.no_telepon || "-"}
									</p>
								</div>

								<div>
									<label className="flex items-center text-sm font-semibold text-gray-800 mb-1.5">
										<FaMapMarkerAlt className="mr-1.5" />
										Alamat
									</label>
									<p className="text-sm text-gray-900 bg-white/70 backdrop-blur-sm border-2 border-cyan-100 p-3 rounded-lg leading-relaxed">
										{pengurus.alamat || "-"}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Details */}
					<div className="lg:col-span-2 space-y-6">
						{/* Personal Information */}
						<div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl shadow-sm border-2 border-green-100 p-6">
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
									<FaUser className="text-white w-5 h-5" />
								</div>
								<h3 className="text-lg font-bold text-gray-900">Informasi Pribadi</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										NIK
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.nik || "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Jenis Kelamin
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.jenis_kelamin
											? pengurus.jenis_kelamin.replace(/_/g, "-")
											: "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tempat Lahir
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.tempat_lahir || "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tanggal Lahir
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.tanggal_lahir
											? new Date(pengurus.tanggal_lahir).toLocaleDateString(
													"id-ID",
												)
											: "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Status Perkawinan
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.status_perkawinan || "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Pendidikan
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.pendidikan || "-"}
									</p>
								</div>
							</div>
						</div>

						{/* Position Information */}
						<div className="bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 rounded-2xl shadow-sm border-2 border-purple-100 p-6">
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
									<FaCalendarAlt className="text-white w-5 h-5" />
								</div>
								<h3 className="text-lg font-bold text-gray-900">Informasi Jabatan</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tanggal Mulai Jabatan
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.tanggal_mulai_jabatan
											? new Date(
													pengurus.tanggal_mulai_jabatan,
												).toLocaleDateString("id-ID")
											: "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tanggal Akhir Jabatan
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.tanggal_akhir_jabatan
											? new Date(
													pengurus.tanggal_akhir_jabatan,
												).toLocaleDateString("id-ID")
											: "-"}
									</p>
								</div>

								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Status Verifikasi
									</label>
									<div className="flex items-center space-x-2">
										<span
											className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
												pengurus.status_verifikasi === "verified"
													? "bg-green-100 text-green-800"
													: "bg-yellow-100 text-yellow-800"
											}`}
										>
											{pengurus.status_verifikasi === "verified"
												? "Terverifikasi"
												: "Belum Verifikasi"}
										</span>
									</div>
								</div>

								{/* Catatan Verifikasi */}
								{pengurus.catatan_verifikasi && pengurus.status_verifikasi !== "verified" && (
									<div className="md:col-span-2">
										<div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
											<p className="text-sm font-semibold text-amber-800 mb-1">📝 Catatan Verifikasi</p>
											<p className="text-sm text-amber-700">{pengurus.catatan_verifikasi}</p>
											{pengurus.verifikator_nama && (
												<p className="text-xs text-amber-600 mt-2">
													— {pengurus.verifikator_nama}
													{pengurus.verified_at && `, ${new Date(pengurus.verified_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
												</p>
											)}
										</div>
									</div>
								)}
							</div>
						</div>

						{/* SK Pengangkatan */}
						<div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl shadow-sm border-2 border-amber-100 p-6">
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
									<FaFileAlt className="text-white w-5 h-5" />
								</div>
								<div>
									<h3 className="text-lg font-bold text-gray-900">SK Pengangkatan</h3>
									<p className="text-sm text-gray-600">Produk hukum dasar jabatan</p>
								</div>
							</div>

							{pengurus.produk_hukum_id &&
							produkHukumList.find(
								(ph) => ph.id === pengurus.produk_hukum_id,
							) ? (
								<div className="p-5 rounded-xl bg-white/70 backdrop-blur-sm border-2 border-green-200 hover:shadow-lg transition-all duration-300">
									<div className="flex items-start space-x-3">
										<div className="mt-1 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
											<svg
												className="w-6 h-6 text-white"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
										</div>
										<div className="flex-1">
											{(() => {
												const ph = produkHukumList.find(
													(ph) => ph.id === pengurus.produk_hukum_id,
												);
												return (
													<div className="space-y-3">
														<div>
															<p className="text-xs font-semibold text-green-700 mb-1">SK Terpilih</p>
															<h4 className="font-bold text-gray-900 text-base mb-1">
																Nomor {ph.nomor} Tahun {ph.tahun}
															</h4>
															<p className="text-gray-700 leading-relaxed text-sm">
																{ph.judul}
															</p>
														</div>

														<div className="flex items-center justify-between pt-3 border-t-2 border-green-100">
															<div className="text-xs">
																<span className="font-semibold text-gray-700">Jenis:</span>{" "}
																<span className="text-green-700 font-medium">{ph.jenis}</span>
															</div>
															<button
																onClick={() =>
																	navigate(
																		`/desa/produk-hukum/${pengurus.produk_hukum_id}`,
																	)
																}
																className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
															>
																<FaExternalLinkAlt className="w-3 h-3" />
																<span>Lihat Detail SK</span>
															</button>
														</div>
													</div>
												);
											})()}
										</div>
									</div>
								</div>
							) : (
								<div className="p-5 rounded-xl bg-white/70 backdrop-blur-sm border-2 border-yellow-200">
									<div className="flex items-start space-x-3">
										<div className="mt-1 w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
											<svg
												className="w-6 h-6 text-white"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
												/>
											</svg>
										</div>
										<div className="flex-1">
											<h4 className="font-bold text-yellow-800 text-sm mb-1.5">
												Belum Terhubung dengan SK Pengangkatan
											</h4>
											<p className="text-yellow-700 text-xs leading-relaxed">
												Pengurus ini belum memiliki SK pengangkatan yang
												terdaftar. Silakan hubungi admin untuk melengkapi
												dokumen legal.
											</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PengurusDetailPage;
