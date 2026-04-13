import React, { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEditMode } from "../../context/EditModeContext";
import {
	getRw,
	getRt,
	updateRw,
	updateRt,
	listRt,
	createRt,
	getPosyandu,
	updatePosyandu,
	listKarangTaruna,
	updateKarangTaruna,
	listLpm,
	updateLpm,
	listPkk,
	updatePkk,
	listSatlinmas,
	updateSatlinmas,
	getLembagaLainnya,
	updateLembagaLainnya,
	toggleKelembagaanStatus,
	toggleKelembagaanVerification,
	ajukanUlangVerifikasi,
} from "../../services/kelembagaan";
import { getProdukHukums } from "../../services/api";
import { getPengurusByKelembagaan } from "../../services/pengurus";
import PengurusKelembagaan from "./PengurusKelembagaan";
import ProfilCard from "./ProfilCard";
import AnakLembagaCard from "./AnakLembagaCard";
import AktivitasLog from "./AktivitasLog";
import { FaArrowLeft, FaHome, FaChevronRight } from "react-icons/fa";
import { LuLock, LuLockOpen, LuChevronDown, LuSearch, LuCheck, LuFileText, LuMapPin, LuBuilding, LuHeart } from "react-icons/lu";
import {
	showSuccessAlert,
	showErrorAlert,
	showLoadingAlert,
	showConfirmAlert,
} from "../../utils/sweetAlert";
import Swal from "sweetalert2";

// Helper function to get display name for kelembagaan type
const getDisplayName = (type) => {
	const mapping = {
		rw: "RW",
		rt: "RT",
		posyandu: "Posyandu",
		"karang-taruna": "Karang Taruna",
		lpm: "LPM",
		pkk: "PKK",
		satlinmas: "Satlinmas",
		"lembaga-lainnya": "Lembaga Lainnya",
	};
	return mapping[type] || type.toUpperCase();
};

// Simple Modal for editing kelembagaan - matching KelembagaanList pattern
const EditModal = ({
	title,
	isOpen,
	onClose,
	children,
	onSubmit,
	submitLabel = "Simpan",
	submitting = false,
	gradient = "from-indigo-500 to-purple-600",
}) => {
	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget && !submitting) {
			onClose();
		}
	};

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e) => {
			if (e.key === "Escape" && !submitting) {
				onClose();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, submitting]);

	if (!isOpen) return null;
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
			role="dialog"
			aria-modal="true"
			onClick={handleBackdropClick}
		>
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 transform transition-all max-h-[90vh] overflow-y-auto">
				<div className={`flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r ${gradient} rounded-t-2xl`}>
					<div className="flex items-center space-x-3">
						<div className="p-2 bg-white/20 rounded-lg">
							<LuFileText className="w-5 h-5 text-white" />
						</div>
						<h3 className="text-lg font-semibold text-white">{title}</h3>
					</div>
					<button
						type="button"
						className="text-white/80 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
						onClick={onClose}
						disabled={submitting}
					>
						✕
					</button>
				</div>
				<div className="p-6 space-y-4">{children}</div>
				<div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
					<button
						type="button"
						className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
						onClick={onClose}
						disabled={submitting}
					>
						Batal
					</button>
					<button
						type="button"
						className={`px-6 py-2 bg-gradient-to-r ${gradient} text-white rounded-lg hover:shadow-md disabled:opacity-50 transition-all flex items-center space-x-2`}
						onClick={onSubmit}
						disabled={submitting}
					>
						{submitting ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								<span>Menyimpan...</span>
							</>
						) : (
							<>
								<LuCheck className="w-4 h-4" />
								<span>{submitLabel}</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

export default function KelembagaanDetailPage({
	isAdminView: propIsAdminView,
}) {
	const { user, isKelembagaanAdmin } = useAuth();
	const { isEditMode } = useEditMode();
	const { type, id, desaId: routeDesaId } = useParams();
	const navigate = useNavigate();
	const aktivitasLogRef = useRef(null);

	// Auto-detect admin mode
	const isAdmin = propIsAdminView ?? isKelembagaanAdmin();
	const targetDesaId = routeDesaId || user?.desa_id;

	const [detail, setDetail] = useState(null);
	const [loading, setLoading] = useState(true);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editForm, setEditForm] = useState({
		nama: "",
		nomor: "",
		alamat: "",
		produk_hukum_id: "",
	});
	const [produkHukumList, setProdukHukumList] = useState([]);
	const [anak, setAnak] = useState([]);
	const [pengurusCount, setPengurusCount] = useState(0);
	const [phSearchTerm, setPhSearchTerm] = useState("");
	const [showPhDropdown, setShowPhDropdown] = useState(false);
	const [editSubmitting, setEditSubmitting] = useState(false);

	const loadDetail = useCallback(async () => {
		setLoading(true);
		try {
			let data = null;
			if (type === "rw") {
				const res = await getRw(id);
				data = res?.data?.data;

				// RT data already included in RW response, no need for separate fetch
				if (data?.rts) {
					setAnak(data.rts);
				}
			} else if (type === "rt") {
				const res = await getRt(id);
				data = res?.data?.data;
			} else if (type === "posyandu") {
				// try get single if available, else list and find
				if (typeof getPosyandu === "function") {
					try {
						const res = await getPosyandu(id);
						data = res?.data?.data;
					} catch (error) {
						// Silent catch for fallback
						console.warn(
							"Failed to get single posyandu, falling back to list:",
							error,
						);
					}
				}
				if (!data) {
					const svc = await import("../../services/kelembagaan");
					const res = await svc.listPosyandu();
					data = (res?.data?.data || []).find(
						(p) => String(p.id) === String(id),
					);
				}
			} else if (["karang-taruna", "lpm", "pkk", "satlinmas"].includes(type)) {
				// fetch list and pick by id
				await import("../../services/kelembagaan");
				let res;
				if (type === "karang-taruna") res = await listKarangTaruna();
				if (type === "lpm") res = await listLpm();
				if (type === "pkk") res = await listPkk();
				if (type === "satlinmas") res = await listSatlinmas();
				data =
					(res?.data?.data || []).find((x) => String(x.id) === String(id)) ||
					(res?.data?.data || [])[0] ||
					null;
			} else if (type === "lembaga-lainnya") {
				const res = await getLembagaLainnya(id);
				data = res?.data?.data;
			}
			setDetail(data);
		} catch (err) {
			console.error("Gagal memuat detail kelembagaan:", err);
			setDetail(null);
		} finally {
			setLoading(false);
		}
	}, [type, id]);

	// Fetch produk hukum list for the dropdown (filtered by Perdes/Perkades berlaku)
	const fetchProdukHukumList = useCallback(async () => {
		if (!detail?.desa_id) return;
		
		try {
			const res = await getProdukHukums({
				all: 'true',
				desa_id: detail.desa_id,
				jenis: 'Peraturan Desa,Peraturan Kepala Desa',
				status_peraturan: 'berlaku',
			});
			const allData = res?.data?.data || [];
			setProdukHukumList(Array.isArray(allData) ? allData : []);
		} catch (err) {
			console.error("Gagal memuat daftar produk hukum:", err);
			setProdukHukumList([]);
		}
	}, [detail?.desa_id]);

	// Fetch pengurus count
	const fetchPengurusCount = useCallback(async () => {
		if (!detail?.id || !type) {
			return;
		}

		try {
			// Use targetDesaId from component state
			const adminDesaId = isAdmin ? targetDesaId : null;

			const res = await getPengurusByKelembagaan(type, detail.id, adminDesaId);

			const pengurusList = res?.data?.data || [];

			setPengurusCount(pengurusList.length);
		} catch (err) {
			console.error("Error fetching pengurus count:", err);
			setPengurusCount(0);
		}
	}, [detail, type, isAdmin, targetDesaId]);

	useEffect(() => {
		loadDetail();
	}, [loadDetail]);

	// Load produk hukum list when detail is available
	useEffect(() => {
		if (detail?.desa_id) {
			fetchProdukHukumList();
		}
	}, [detail?.desa_id, fetchProdukHukumList]);

	// Load pengurus count when detail is available
	useEffect(() => {
		if (detail?.id && type) {
			fetchPengurusCount();
		}
	}, [fetchPengurusCount, detail?.id, type]);

	const handleOpenEdit = () => {
		setEditForm({
			nama: detail?.nama || detail?.nama_lembaga || "",
			nomor: detail?.nomor || "",
			alamat: detail?.alamat || "",
			produk_hukum_id: detail?.produk_hukum_id || "",
		});
		setPhSearchTerm("");
		setShowPhDropdown(false);
		setIsEditOpen(true);
	};

	const handleSaveEdit = async () => {
		setEditSubmitting(true);
		try {
			// Show loading alert
			showLoadingAlert("Menyimpan Data...", "Mohon tunggu sebentar");

			const payload = { ...detail };
			// Update only allowed fields for now
			if (type === "rw" || type === "rt") payload.nomor = editForm.nomor;
			if (type !== "rw" && type !== "rt")
				payload.nama = editForm.nama || payload.nama;
			payload.alamat = editForm.alamat;
			payload.produk_hukum_id = editForm.produk_hukum_id || null;

			if (type === "rw") await updateRw(detail.id, payload);
			else if (type === "rt") await updateRt(detail.id, payload);
			else if (type === "posyandu") await updatePosyandu(detail.id, payload);
			else if (type === "karang-taruna")
				await updateKarangTaruna(detail.id, payload);
			else if (type === "lpm") await updateLpm(detail.id, payload);
			else if (type === "pkk") await updatePkk(detail.id, payload);
			else if (type === "satlinmas") await updateSatlinmas(detail.id, payload);
			else if (type === "lembaga-lainnya") await updateLembagaLainnya(detail.id, payload);

			// Update local state with new data
			setDetail((prevDetail) => ({
				...prevDetail,
				nomor: editForm.nomor || prevDetail.nomor,
				nama: editForm.nama || prevDetail.nama,
				nama_lembaga: editForm.nama || prevDetail.nama_lembaga,
				alamat: editForm.alamat,
				produk_hukum_id: editForm.produk_hukum_id || null,
			}));

			setIsEditOpen(false);

			// Show success alert
			showSuccessAlert("Berhasil!", "Data kelembagaan berhasil disimpan");
		} catch (err) {
			const errorMessage = err.response?.data?.message || err.message;

			// Show error alert
			showErrorAlert("Gagal!", `Gagal menyimpan perubahan: ${errorMessage}`);
		} finally {
			setEditSubmitting(false);
		}
	};

	const handleToggleStatus = async (kelembagaanId, currentStatus) => {
		const newStatus = currentStatus === "aktif" ? "nonaktif" : "aktif";

		if (newStatus === "nonaktif") {
			// Deactivating: require Produk Hukum Penonaktifan selection
			const optionsHtml = produkHukumList
				.map((ph) => `<option value="${ph.id}">Nomor ${ph.nomor} Tahun ${ph.tahun} - ${ph.judul}</option>`)
				.join("");

			const { value: selectedProdukHukumId } = await Swal.fire({
				title: "Nonaktifkan Kelembagaan",
				html: `
					<div class="text-left space-y-3">
						<p class="text-sm text-gray-600">Pilih Produk Hukum yang menjadi dasar penonaktifan kelembagaan ini.</p>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">SK Penonaktifan Lembaga <span class="text-red-500">*</span></label>
							<select id="swal-produk-hukum" class="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500">
								<option value="">-- Pilih Produk Hukum --</option>
								${optionsHtml}
							</select>
						</div>
					</div>`,
				showCancelButton: true,
				confirmButtonText: "Nonaktifkan",
				cancelButtonText: "Batal",
				confirmButtonColor: "#ef4444",
				focusConfirm: false,
				preConfirm: () => {
					const val = document.getElementById("swal-produk-hukum").value;
					if (!val) {
						Swal.showValidationMessage("Pilih Produk Hukum terlebih dahulu");
						return false;
					}
					return val;
				},
			});

			if (!selectedProdukHukumId) return;

			try {
				showLoadingAlert("Menonaktifkan Kelembagaan...", "Mohon tunggu sebentar");
				await toggleKelembagaanStatus(type, kelembagaanId, newStatus, selectedProdukHukumId);

				setDetail((prevDetail) => ({
					...prevDetail,
					status_kelembagaan: newStatus,
					produk_hukum_penonaktifan_id: selectedProdukHukumId,
				}));

				showSuccessAlert("Berhasil!", "Kelembagaan berhasil dinonaktifkan");
				setTimeout(() => {
					if (aktivitasLogRef.current) aktivitasLogRef.current.refresh();
				}, 500);
			} catch (err) {
				const errorMessage = err.response?.data?.message || err.message;
				showErrorAlert("Gagal!", `Gagal menonaktifkan kelembagaan: ${errorMessage}`);
			}
		} else {
			// Activating: simple confirmation
			const result = await showConfirmAlert(
				"Konfirmasi Pengaktifan",
				"Apakah Anda yakin ingin mengaktifkan kembali kelembagaan ini?",
				"warning",
			);

			if (!result.isConfirmed) return;

			try {
				showLoadingAlert("Mengaktifkan Kelembagaan...", "Mohon tunggu sebentar");
				await toggleKelembagaanStatus(type, kelembagaanId, newStatus);

				setDetail((prevDetail) => ({
					...prevDetail,
					status_kelembagaan: newStatus,
					produk_hukum_penonaktifan_id: null,
				}));

				showSuccessAlert("Berhasil!", "Kelembagaan berhasil diaktifkan kembali");
				setTimeout(() => {
					if (aktivitasLogRef.current) aktivitasLogRef.current.refresh();
				}, 500);
			} catch (err) {
				const errorMessage = err.response?.data?.message || err.message;
				showErrorAlert("Gagal!", `Gagal mengaktifkan kelembagaan: ${errorMessage}`);
			}
		}
	};

	// Helper: show tunda verifikasi feedback modal
	const showTundaVerifikasiModal = async (kelembagaanId) => {
		const { value: formValues } = await Swal.fire({
			title: "Tolak Verifikasi",
			html: `
				<div class="text-left space-y-3">
					<p class="text-sm text-gray-600 mb-3">Berikan catatan/alasan penolakan verifikasi agar desa dapat memperbaiki data.</p>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Pilih alasan:</label>
						<div class="space-y-2" id="swal-checklist">
							<label class="flex items-center gap-2 text-sm">
								<input type="checkbox" value="SK Pembentukan tidak sesuai" class="swal-check rounded"> SK Pembentukan tidak sesuai
							</label>
							<label class="flex items-center gap-2 text-sm">
								<input type="checkbox" value="Data pengurus belum lengkap" class="swal-check rounded"> Data pengurus belum lengkap
							</label>
							<label class="flex items-center gap-2 text-sm">
								<input type="checkbox" value="Alamat belum diisi" class="swal-check rounded"> Alamat belum diisi
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

		try {
			showLoadingAlert("Menolak Verifikasi...", "Mohon tunggu sebentar");
			await toggleKelembagaanVerification(type, kelembagaanId, "ditolak", formValues);

			setDetail((prevDetail) => ({
				...prevDetail,
				status_verifikasi: "ditolak",
				catatan_verifikasi: formValues,
			}));

			showSuccessAlert("Berhasil!", "Verifikasi ditolak dan catatan telah dikirim ke desa");
			setTimeout(() => {
				if (aktivitasLogRef.current) aktivitasLogRef.current.refresh();
			}, 500);
		} catch (err) {
			const errorMessage = err.response?.data?.message || err.message;
			showErrorAlert("Gagal!", `Gagal menunda verifikasi: ${errorMessage}`);
		}
	};

	// Helper: execute verification
	const executeVerification = async (kelembagaanId) => {
		try {
			showLoadingAlert("Memverifikasi...", "Mohon tunggu sebentar");
			await toggleKelembagaanVerification(type, kelembagaanId, "verified");

			setDetail((prevDetail) => ({
				...prevDetail,
				status_verifikasi: "verified",
				catatan_verifikasi: null,
			}));

			showSuccessAlert("Berhasil!", "Kelembagaan berhasil diverifikasi");
			setTimeout(() => {
				if (aktivitasLogRef.current) aktivitasLogRef.current.refresh();
			}, 500);
		} catch (err) {
			const errorMessage = err.response?.data?.message || err.message;
			showErrorAlert("Gagal!", `Gagal memverifikasi: ${errorMessage}`);
		}
	};

	const handleToggleVerification = async (kelembagaanId, currentStatus) => {
		if (currentStatus === "verified") {
			// Already verified → show tunda/batal modal with feedback
			await showTundaVerifikasiModal(kelembagaanId);
		} else {
			// Not yet verified → show choice: Tunda or Verifikasi
			let selectedAction = null;

			await Swal.fire({
				title: "Opsi Verifikasi",
				html: `
					<div class="text-left space-y-3">
						<button id="swal-verify-btn" class="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
							<p class="font-medium text-blue-800 text-sm">✅ Verifikasi Lembaga</p>
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
				// Check completeness before verifying
				const missing = [];
				if (!detail?.produk_hukum_id) missing.push("SK Pembentukan");
				if (!pengurusCount || pengurusCount === 0) missing.push("Data Pengurus");
				if (!detail?.alamat) missing.push("Alamat");

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

				await executeVerification(kelembagaanId);
			} else if (selectedAction === "tunda") {
				await showTundaVerifikasiModal(kelembagaanId);
			}
		}
	};

	const handleAjukanUlang = async (kelembagaanId) => {
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
			showLoadingAlert("Mengajukan ulang verifikasi...");
			await ajukanUlangVerifikasi(type, kelembagaanId);
			showSuccessAlert("Berhasil!", "Verifikasi telah diajukan ulang. Silakan tunggu peninjauan dari admin.");
			loadDetail();
		} catch (error) {
			console.error("Error ajukan ulang:", error);
			showErrorAlert("Gagal", error?.response?.data?.message || "Gagal mengajukan ulang verifikasi");
		}
	};

	const handleUpdatePenduduk = async () => {
		const { value: formValues } = await Swal.fire({
			title: "Data Penduduk RT",
			html: `
				<div class="text-left space-y-4">
					<p class="text-sm text-gray-600">Perbarui data jumlah penduduk RT ini.</p>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Jiwa</label>
						<input type="number" id="swal-jumlah-jiwa" min="0" class="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500" placeholder="Jumlah penduduk (jiwa)" value="${detail?.jumlah_jiwa ?? ''}">
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Jumlah KK</label>
						<input type="number" id="swal-jumlah-kk" min="0" class="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500" placeholder="Jumlah Kepala Keluarga" value="${detail?.jumlah_kk ?? ''}">
					</div>
				</div>`,
			showCancelButton: true,
			confirmButtonText: "Simpan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0ea5e9",
			focusConfirm: false,
			preConfirm: () => {
				const jiwa = document.getElementById("swal-jumlah-jiwa").value;
				const kk = document.getElementById("swal-jumlah-kk").value;
				return {
					jumlah_jiwa: jiwa !== "" ? parseInt(jiwa) : null,
					jumlah_kk: kk !== "" ? parseInt(kk) : null,
				};
			},
		});

		if (!formValues) return;

		try {
			showLoadingAlert("Menyimpan Data Penduduk...", "Mohon tunggu sebentar");

			const payload = { ...detail, ...formValues };
			await updateRt(detail.id, payload);

			setDetail((prev) => ({ ...prev, ...formValues }));

			showSuccessAlert("Berhasil!", "Data penduduk berhasil diperbarui");
		} catch (err) {
			const errorMessage = err.response?.data?.message || err.message;
			showErrorAlert("Gagal!", `Gagal menyimpan data penduduk: ${errorMessage}`);
		}
	};

	const handleAddRT = async (rtData) => {
		try {
			const { nomor, alamat, produk_hukum_id } = rtData;

			// Show loading alert
			showLoadingAlert("Menambah RT...", "Mohon tunggu sebentar");

			const payload = {
				nomor,
				rw_id: detail.id,
				desa_id: user.desa_id || detail.desa_id,
				alamat: alamat || detail.alamat || "",
				produk_hukum_id: produk_hukum_id || null,
			};

			await createRt(payload);

			// Reload anak data to show new RT
			const rts = await listRt();
			const list = (rts?.data?.data || []).filter(
				(r) => String(r.rw_id) === String(detail.id),
			);
			setAnak(list);

			// Show success alert
			showSuccessAlert("Berhasil!", `RT ${nomor} berhasil ditambahkan`);
		} catch (error) {
			const errorMessage = error.response?.data?.message || error.message;

			// Show error alert
			showErrorAlert("Gagal!", `Gagal menambah RT: ${errorMessage}`);

			throw error;
		}
	};

	if (loading) return <p className="p-6 text-center">Memuat...</p>;
	if (!detail)
		return (
			<p className="p-6 text-center text-red-500">Data tidak ditemukan.</p>
		);

	return (
		<div className="p-6">
			{/* Breadcrumb */}
			<div className="sticky top-0 z-10 p-4 bg-white mb-6 rounded-md shadow-md ">
				<div className="flex items-center justify-between gap-4">
					{/* Breadcrumb */}
					<nav className="flex items-center space-x-2 text-sm flex-1 overflow-x-auto">
						<Link
							to={isAdmin ? "/bidang/pmd/kelembagaan" : "/desa/dashboard"}
							className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
						>
							<FaHome className="mr-1" />
							Dashboard Kelembagaan
						</Link>
						<FaChevronRight className="text-gray-400 text-xs" />
						
						{/* Desa name link (both admin and desa) */}
						{detail?.desa_id && (
							<>
								<Link
									to={isAdmin ? `/bidang/pmd/kelembagaan/admin/${detail.desa_id}` : "/desa/kelembagaan"}
									className="text-gray-500 hover:text-indigo-600 transition-colors"
								>
									{detail?.desas?.nama || detail?.desa?.nama || "Desa"}
								</Link>
								<FaChevronRight className="text-gray-400 text-xs" />
							</>
						)}

						{type === "rt" && (detail?.rw || detail?.rws) ? (
							<>
								<Link
									to={
										isAdmin
											? `/bidang/pmd/kelembagaan/admin/${detail.desa_id}/rw`
											: `/desa/kelembagaan/rw`
									}
									className="text-gray-500 hover:text-indigo-600 transition-colors"
								>
									RW
								</Link>
								<FaChevronRight className="text-gray-400 text-xs" />
								<Link
									to={
										isAdmin
											? `/bidang/pmd/kelembagaan/rw/${detail.rw_id}`
											: `/desa/kelembagaan/rw/${detail.rw_id}`
									}
									className="text-gray-500 hover:text-indigo-600 transition-colors"
								>
									RW {detail.rw?.nomor || detail.rws?.nomor || ""}
								</Link>
								<FaChevronRight className="text-gray-400 text-xs" />
								<span className="text-gray-900 font-medium">
									RT {detail?.nomor || "Detail"}
								</span>
							</>
						) : ["satlinmas", "karang-taruna", "lpm", "pkk"].includes(type) ? (
							<>
								<span className="text-gray-900 font-medium">
									{getDisplayName(type)}
								</span>
							</>
						) : (
							<>
								<Link
									to={
										isAdmin
											? `/bidang/pmd/kelembagaan/admin/${detail.desa_id}/${type}`
											: `/desa/kelembagaan/${type}`
									}
									className="text-gray-500 hover:text-indigo-600 transition-colors"
								>
									{getDisplayName(type)}
								</Link>
								<FaChevronRight className="text-gray-400 text-xs" />
								<span className="text-gray-900 font-medium">
									{detail?.nama || detail?.nomor || "Detail"}
								</span>
							</>
						)}
					</nav>

					{/* Status Badge */}
					<span
						className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
							isEditMode
								? "bg-green-100 text-green-700 border border-green-300"
								: "bg-red-100 text-red-700 border border-red-300"
						}`}
					>
						{isEditMode ? (
							<>
								<LuLockOpen className="w-3 h-3" />
								<span>Aplikasi Dibuka</span>
							</>
						) : (
							<>
								<LuLock className="w-3 h-3" />
								<span>Aplikasi Ditutup</span>
							</>
						)}
					</span>
				</div>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="col-span-1 lg:col-span-2 space-y-4">
					<ProfilCard
						profil={detail}
						type={type}
						onEdit={handleOpenEdit}
						rtCount={type === "rw" ? anak.length : 0}
						rtList={type === "rw" ? anak : []}
						pengurusCount={pengurusCount}
						onToggleStatus={handleToggleStatus}
						onToggleVerification={handleToggleVerification}
						onAjukanUlang={handleAjukanUlang}
						produkHukumList={produkHukumList}
						onUpdatePenduduk={type === "rt" ? handleUpdatePenduduk : undefined}
					/>

					<PengurusKelembagaan
						kelembagaanType={type}
						kelembagaanId={detail.id}
						kelembagaanName={detail?.nama || (detail?.nomor ? `${type?.toUpperCase()} ${detail.nomor}` : type?.toUpperCase())}
						desaId={detail.desa_id}
						onPengurusCountChange={setPengurusCount}
					/>
				</div>
				<div className="space-y-4">
					{type === "rw" && (
						<AnakLembagaCard
							list={anak}
							label="Daftar RT"
							onClickItem={(rt) =>
								navigate(
									isAdmin
										? `/bidang/pmd/kelembagaan/rt/${rt.id}`
										: `/desa/kelembagaan/rt/${rt.id}`,
								)
							}
							onAddRT={handleAddRT}
							rwId={detail.id}
						/>
					)}
					<AktivitasLog
						ref={aktivitasLogRef}
						lembagaType={type}
						lembagaId={id}
					/>
				</div>
			</div>{" "}
			<EditModal
				title={`Edit ${getDisplayName(type)}${detail?.nomor ? ` ${detail.nomor}` : detail?.nama ? ` — ${detail.nama}` : ""}`}
				isOpen={isEditOpen}
				onClose={() => {
					if (!editSubmitting) {
						setIsEditOpen(false);
						setPhSearchTerm("");
						setShowPhDropdown(false);
					}
				}}
				onSubmit={handleSaveEdit}
				submitting={editSubmitting}
				gradient={
					type === "rw" || type === "rt" ? "from-blue-500 to-indigo-600"
					: type === "posyandu" ? "from-purple-500 to-purple-700"
					: type === "pkk" ? "from-pink-500 to-rose-500"
					: type === "lembaga-lainnya" ? "from-slate-500 to-slate-700"
					: "from-indigo-500 to-purple-600"
				}
			>
				<div className="space-y-4">
					{/* SK Pembentukan Lembaga — Searchable Dropdown */}
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700">
							SK Pembentukan Lembaga
						</label>
						<p className="text-xs text-gray-500 mb-2">
							Pilih Perdes/Perkades yang masih berlaku sebagai dasar hukum pembentukan lembaga
						</p>
						<div className="relative">
							<button
								type="button"
								className={`w-full text-left border rounded-lg px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${editForm.produk_hukum_id ? "border-blue-300 bg-blue-50" : "border-gray-300 bg-white"} ${editSubmitting ? "opacity-50 cursor-not-allowed" : "hover:border-blue-400"}`}
								onClick={() => !editSubmitting && setShowPhDropdown((v) => !v)}
								disabled={editSubmitting}
							>
								{editForm.produk_hukum_id ? (
									<div className="flex-1 min-w-0">
										<p className="font-medium text-blue-700 truncate">
											{produkHukumList.find((p) => p.id === editForm.produk_hukum_id)?.judul || "—"}
										</p>
										<p className="text-xs text-blue-500 mt-0.5">
											{(produkHukumList.find((p) => p.id === editForm.produk_hukum_id)?.jenis || "").replace(/_/g, " ")} — No. {produkHukumList.find((p) => p.id === editForm.produk_hukum_id)?.nomor}
										</p>
									</div>
								) : (
									<span className="text-gray-400">Pilih produk hukum...</span>
								)}
								<LuChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${showPhDropdown ? "rotate-180" : ""}`} />
							</button>
							{showPhDropdown && (
								<div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
									<div className="p-2 border-b border-gray-100">
										<div className="relative">
											<LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
											<input
												className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
												placeholder="Cari judul atau nomor..."
												value={phSearchTerm}
												onChange={(e) => setPhSearchTerm(e.target.value)}
												autoFocus
											/>
										</div>
									</div>
									<div className="max-h-48 overflow-y-auto">
										{produkHukumList.filter((ph) =>
											!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
										).length === 0 ? (
											<div className="p-3 text-center text-sm text-gray-500">
												{phSearchTerm ? "Tidak ditemukan" : "Belum ada Perdes/Perkades berlaku"}
											</div>
										) : (
											produkHukumList
												.filter((ph) =>
													!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
												)
												.map((ph) => (
													<button
														key={ph.id}
														type="button"
														className={`w-full text-left px-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-blue-50 transition-colors ${editForm.produk_hukum_id === ph.id ? "bg-blue-50" : ""}`}
														onClick={() => {
															setEditForm((f) => ({ ...f, produk_hukum_id: ph.id }));
															setShowPhDropdown(false);
															setPhSearchTerm("");
														}}
													>
														<div className="flex items-center justify-between">
															<div className="flex-1 min-w-0">
																<p className={`text-sm font-medium truncate ${editForm.produk_hukum_id === ph.id ? "text-blue-700" : "text-gray-900"}`}>{ph.judul}</p>
																<p className="text-xs text-gray-500">{(ph.jenis || "").replace(/_/g, " ")} — No. {ph.nomor}</p>
															</div>
															{editForm.produk_hukum_id === ph.id && <LuCheck className="w-4 h-4 text-blue-600 ml-2 flex-shrink-0" />}
														</div>
													</button>
												))
										)}
									</div>
									{/* Hapus pilihan */}
									{editForm.produk_hukum_id && (
										<div className="border-t border-gray-100 p-2">
											<button
												type="button"
												className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
												onClick={() => {
													setEditForm((f) => ({ ...f, produk_hukum_id: "" }));
													setShowPhDropdown(false);
													setPhSearchTerm("");
												}}
											>
												Hapus pilihan
											</button>
										</div>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Nomor (RW/RT) or Nama (other types) */}
					{type === "rw" || type === "rt" ? (
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700">
								Nomor {getDisplayName(type)} <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<LuBuilding className="w-5 h-5 text-gray-400" />
								</div>
								<input
									className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
									inputMode="numeric"
									maxLength={3}
									value={editForm.nomor}
									onChange={(e) => {
										const val = e.target.value.replace(/\D/g, "").slice(0, 3);
										setEditForm((f) => ({ ...f, nomor: val }));
									}}
									placeholder="Contoh: 001"
									disabled={editSubmitting}
								/>
							</div>
							<p className="text-xs text-gray-500 mt-1">Hanya 3 digit angka (contoh: 001, 012, 100)</p>
						</div>
					) : (
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700">
								Nama Lembaga <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									{type === "posyandu" ? (
										<LuHeart className="w-5 h-5 text-gray-400" />
									) : (
										<LuBuilding className="w-5 h-5 text-gray-400" />
									)}
								</div>
								<input
									className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 uppercase"
									value={editForm.nama}
									onChange={(e) =>
										setEditForm((f) => ({ ...f, nama: e.target.value.toUpperCase() }))
									}
									placeholder="Nama lembaga"
									disabled={editSubmitting}
								/>
							</div>
						</div>
					)}

					{/* Alamat */}
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700">
							Alamat Kelembagaan
						</label>
						<div className="relative">
							<div className="absolute top-2.5 left-0 pl-3 pointer-events-none">
								<LuMapPin className="w-5 h-5 text-gray-400" />
							</div>
							<textarea
								className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 resize-none uppercase"
								rows={2}
								value={editForm.alamat}
								onChange={(e) =>
									setEditForm((f) => ({ ...f, alamat: e.target.value.toUpperCase() }))
								}
								placeholder="Masukkan alamat sekretariat / lokasi lembaga"
								disabled={editSubmitting}
							/>
						</div>
					</div>
				</div>
			</EditModal>
		</div>
	);
}
