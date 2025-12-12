import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
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
	toggleKelembagaanStatus,
	toggleKelembagaanVerification,
} from "../../../services/kelembagaan";
import { getProdukHukums } from "../../../services/api";
import { getPengurusByKelembagaan } from "../../../services/pengurus";
import PengurusKelembagaan from "../../../components/kelembagaan/PengurusKelembagaan";
import SearchableProdukHukumSelect from "../../../components/shared/SearchableProdukHukumSelect";
import ProfilCard from "../../../components/kelembagaan/ProfilCard";
import AnakLembagaCard from "../../../components/kelembagaan/AnakLembagaCard";
import { FaArrowLeft } from "react-icons/fa";
import {
	showSuccessAlert,
	showErrorAlert,
	showLoadingAlert,
} from "../../../utils/sweetAlert";
import { LuSettings2, LuClock, LuUser, LuCalendar } from "react-icons/lu";
import { getDetailActivityLogs } from "../../../services/activityLogs";

// Simple Modal for editing alamat and name/nomor
const EditModal = ({
	title,
	isOpen,
	onClose,
	children,
	onSubmit,
	submitLabel = "Simpan",
}) => {
	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-lg font-semibold">{title}</h3>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700"
					>
						✕
					</button>
				</div>
				<div className="space-y-3">{children}</div>
				<div className="mt-4 flex justify-end gap-2">
					<button className="px-3 py-2 bg-gray-100 rounded" onClick={onClose}>
						Batal
					</button>
					<button
						className="px-3 py-2 bg-indigo-600 text-white rounded"
						onClick={onSubmit}
					>
						{submitLabel}
					</button>
				</div>
			</div>
		</div>
	);
};

const AktivitasLog = ({ lembagaType, lembagaId }) => {
	const [logs, setLogs] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchLogs = async () => {
			if (!lembagaType || !lembagaId) return;
			
			setLoading(true);
			try {
				const response = await getDetailActivityLogs(lembagaType, lembagaId, 50);
				setLogs(response?.data?.logs || []);
			} catch (error) {
				console.error('Error fetching activity logs:', error);
				setLogs([]);
			} finally {
				setLoading(false);
			}
		};

		fetchLogs();
	}, [lembagaType, lembagaId]);

	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	};

	const getActivityIcon = (activityType) => {
		switch (activityType) {
			case 'create':
				return '🎉';
			case 'update':
				return '✏️';
			case 'toggle_status':
				return '🔄';
			case 'verify':
				return '✅';
			case 'add_pengurus':
				return '👤';
			case 'update_pengurus':
				return '✏️';
			case 'toggle_pengurus_status':
				return '🔄';
			case 'verify_pengurus':
				return '✅';
			default:
				return '📝';
		}
	};

	const getEntityBadge = (entityType) => {
		return entityType === 'lembaga' 
			? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Lembaga</span>
			: <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Pengurus</span>;
	};

	return (
		<div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
			{/* Header dengan gradient accent */}
			<div className="h-1.5 bg-gradient-to-r from-purple-400 to-pink-500 rounded-t-2xl"></div>

			<div className="p-6">
				{/* Header Section */}
				<div className="flex items-center space-x-3 mb-6">
					<div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl flex items-center justify-center text-white shadow-lg">
						<LuSettings2 className="w-6 h-6" />
					</div>
					<div>
						<h3 className="text-xl font-bold text-gray-800">Log Aktivitas</h3>
						<p className="text-sm text-gray-500">
							Riwayat perubahan dan aktivitas
						</p>
					</div>
				</div>

				{/* Content */}
				{loading ? (
					<div className="text-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
						<p className="text-sm text-gray-500 mt-4">Memuat riwayat...</p>
					</div>
				) : logs.length === 0 ? (
					<div className="text-center py-12">
						<div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
							<LuSettings2 className="w-8 h-8 text-gray-400" />
						</div>
						<h4 className="text-lg font-medium text-gray-600 mb-2">
							Belum ada aktivitas
						</h4>
						<p className="text-sm text-gray-500">
							Riwayat aktivitas akan tampil di sini setelah ada perubahan data
						</p>
					</div>
				) : (
					<div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
						{logs.map((log) => (
							<div
								key={log.id}
								className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100"
							>
								<div className="flex items-start space-x-3">
									<div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center text-xl">
										{getActivityIcon(log.activity_type)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between mb-2">
											<div className="flex-1">
												<p className="text-sm font-medium text-gray-800 leading-relaxed">
													{log.action_description}
												</p>
												<div className="flex items-center space-x-2 mt-1">
													{getEntityBadge(log.entity_type)}
													{log.entity_name && (
														<span className="text-xs text-gray-500">
															· {log.entity_name}
														</span>
													)}
												</div>
											</div>
										</div>
										<div className="flex items-center space-x-4 text-xs text-gray-500">
											<div className="flex items-center space-x-1">
												<LuUser className="w-3 h-3" />
												<span>{log.user_name}</span>
											</div>
											<div className="flex items-center space-x-1">
												<LuCalendar className="w-3 h-3" />
												<span>{formatDate(log.created_at)}</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default function KelembagaanDetailPage() {
	const { user } = useAuth();

	const { type, id, desaId } = useParams();
	const navigate = useNavigate();

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

	const loadDetail = useCallback(async () => {
		setLoading(true);
		try {
			let data = null;
			if (type === "rw") {
				const res = await getRw(id);
				data = res?.data?.data;
				// also load anak RT under this RW
				const rts = await listRt();
				const list = (rts?.data?.data || []).filter(
					(r) => String(r.rw_id) === String(id)
				);
				setAnak(list);
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
							error
						);
					}
				}
				if (!data) {
					const svc = await import("../../../services/kelembagaan");
					const res = await svc.listPosyandu();
					data = (res?.data?.data || []).find(
						(p) => String(p.id) === String(id)
					);
				}
			} else if (["karang-taruna", "lpm", "pkk", "satlinmas"].includes(type)) {
				// fetch list and pick by id
				await import("../../../services/kelembagaan");
				let res;
				if (type === "karang-taruna") res = await listKarangTaruna();
				if (type === "lpm") res = await listLpm();
				if (type === "pkk") res = await listPkk();
				if (type === "satlinmas") res = await listSatlinmas();
				data =
					(res?.data?.data || []).find((x) => String(x.id) === String(id)) ||
					(res?.data?.data || [])[0] ||
					null;
			}
			setDetail(data);
		} catch (err) {
			console.error("Gagal memuat detail kelembagaan:", err);
			setDetail(null);
		} finally {
			setLoading(false);
		}
	}, [type, id]);

	// Fetch produk hukum list for the dropdown
	const fetchProdukHukumList = useCallback(async () => {
		try {
			const res = await getProdukHukums(1, ""); // Get all produk hukum
			const allData = res?.data?.data || [];
			setProdukHukumList(allData.data || []);
		} catch (err) {
			console.error("Gagal memuat daftar produk hukum:", err);
			setProdukHukumList([]);
		}
	}, []);

	// Fetch pengurus count
	const fetchPengurusCount = useCallback(async () => {
		if (!detail?.id || !type) return;

		try {
			// Pass desaId for admin access - prioritize URL params for admin users
			const isAdmin = ["superadmin", "pemberdayaan_masyarakat", "pmd"].includes(
				user?.role
			);
			const effectiveDesaId =
				isAdmin && desaId ? desaId : detail?.desa_id || user?.desa_id;
			const adminDesaId = isAdmin ? effectiveDesaId : null;

			const res = await getPengurusByKelembagaan(type, detail.id, adminDesaId);
			const pengurusList = res?.data?.data || [];
			setPengurusCount(pengurusList.length);
		} catch (err) {
			console.error("Gagal memuat jumlah pengurus:", err);
			setPengurusCount(0);
		}
	}, [detail?.id, type, detail?.desa_id, user?.desa_id, user?.role]);

	useEffect(() => {
		loadDetail();
		fetchProdukHukumList();
	}, [loadDetail, fetchProdukHukumList]);

	// Load pengurus count when detail is available
	useEffect(() => {
		if (detail?.id && type) {
			fetchPengurusCount();
		}
	}, [fetchPengurusCount, detail?.id, type]);

	const pageTitle = useMemo(() => {
		if (!detail) return "Detail Kelembagaan";
		const name =
			type === "rw"
				? detail.nomor
				: type === "rt"
				? detail.nomor
				: detail.nama || detail.nama_lembaga || "";
		const noPrefix = ["satlinmas", "karang-taruna", "lpm", "pkk"];
		if (noPrefix.includes(type)) return name;
		return `${type.toUpperCase().replace("_", " ")} ${name}`;
	}, [type, detail]);

	const handleOpenEdit = () => {
		setEditForm({
			nama: detail?.nama || detail?.nama_lembaga || "",
			nomor: detail?.nomor || "",
			alamat: detail?.alamat || "",
			produk_hukum_id: detail?.produk_hukum_id || "",
		});
		setIsEditOpen(true);
	};

	const handleSaveEdit = async () => {
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
			console.error("Gagal menyimpan perubahan:", err);

			const errorMessage = err.response?.data?.message || err.message;

			// Show error alert
			showErrorAlert("Gagal!", `Gagal menyimpan perubahan: ${errorMessage}`);
		}
	};

	const handleToggleStatus = async (kelembagaanId, currentStatus) => {
		try {
			const newStatus = currentStatus === "aktif" ? "nonaktif" : "aktif";

			// Show loading alert
			showLoadingAlert("Mengubah Status...", "Mohon tunggu sebentar");

			// Menggunakan function toggle khusus
			await toggleKelembagaanStatus(type, kelembagaanId, newStatus);

			// Update local state instead of reloading
			setDetail((prevDetail) => ({
				...prevDetail,
				status_kelembagaan: newStatus,
			}));

			// Show success alert
			showSuccessAlert(
				"Berhasil!",
				`Status kelembagaan berhasil diubah menjadi ${
					newStatus === "aktif" ? "Aktif" : "Tidak Aktif"
				}`
			);
		} catch (err) {
			console.error("Gagal mengubah status kelembagaan:", err);

			const errorMessage =
				err.response?.data?.message || err.response?.data?.errors
					? Object.values(err.response.data.errors).flat().join(", ")
					: err.message;

			// Show error alert
			showErrorAlert(
				"Gagal!",
				`Gagal mengubah status kelembagaan: ${errorMessage}`
			);
		}
	};

	const handleToggleVerification = async (kelembagaanId, currentStatus) => {
		try {
			const newStatus =
				currentStatus === "verified" ? "unverified" : "verified";

			// Show loading alert
			showLoadingAlert("Mengubah Verifikasi...", "Mohon tunggu sebentar");

			// Menggunakan function toggle khusus
			await toggleKelembagaanVerification(type, kelembagaanId, newStatus);

			// Update local state instead of reloading
			setDetail((prevDetail) => ({
				...prevDetail,
				status_verifikasi: newStatus,
			}));

			// Show success alert
			showSuccessAlert(
				"Berhasil!",
				`Status verifikasi berhasil diubah menjadi ${
					newStatus === "verified" ? "Terverifikasi" : "Belum Diverifikasi"
				}`
			);
		} catch (err) {
			console.error("Gagal mengubah status verifikasi:", err);

			const errorMessage =
				err.response?.data?.message || err.response?.data?.errors
					? Object.values(err.response.data.errors).flat().join(", ")
					: err.message;

			// Show error alert
			showErrorAlert(
				"Gagal!",
				`Gagal mengubah status verifikasi: ${errorMessage}`
			);
		}
	};

	const handleAddRT = async (nomorRT) => {
		try {
			// Show loading alert
			showLoadingAlert("Menambah RT...", "Mohon tunggu sebentar");

			const payload = {
				nomor: nomorRT,
				rw_id: detail.id,
				desa_id: user.desa_id || detail.desa_id,
				alamat: detail.alamat || "", // Use RW address as default
			};

			await createRt(payload);

			// Reload anak data to show new RT
			const rts = await listRt();
			const list = (rts?.data?.data || []).filter(
				(r) => String(r.rw_id) === String(detail.id)
			);
			setAnak(list);

			// Show success alert
			showSuccessAlert("Berhasil!", `RT ${nomorRT} berhasil ditambahkan`);
		} catch (error) {
			console.error("Error creating RT:", error);

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
		<div className="min-h-full p-4">
			<div className="flex items-center mb-4">
				<button
					onClick={() => {
						// Navigasi berdasarkan role user
						const isSuperadminOrBidang = [
							"superadmin",
							"pemberdayaan_masyarakat",
							"pmd",
						].includes(user?.role);

						// Jika RT dan user adalah admin/bidang
						if (type === "rt" && detail.rw_id && isSuperadminOrBidang) {
							const targetDesaId = desaId || detail?.desa_id || user?.desa_id;
							if (targetDesaId) {
								navigate(
									`/dashboard/kelembagaan/admin/${targetDesaId}/rw/${detail.rw_id}`
								);
							} else {
								// Fallback ke dashboard kelembagaan utama
								navigate(`/dashboard/kelembagaan`);
							}
							return;
						}

						// Jika RT dan user desa, kembali ke RW parent-nya
						if (type === "rt" && detail.rw_id) {
							navigate(`/desa/kelembagaan/rw/${detail.rw_id}`);
							return;
						}

						if (isSuperadminOrBidang) {
							// Admin/bidang ke halaman admin dengan desa_id
							const targetDesaId = detail?.desa_id || user?.desa_id;
							if (targetDesaId) {
								navigate(`/dashboard/kelembagaan/admin/${targetDesaId}`);
							} else {
								// Fallback ke dashboard kelembagaan utama
								navigate(`/dashboard/kelembagaan`);
							}
						} else {
							// User desa ke halaman kelembagaan desa
							navigate(`/desa/kelembagaan`);
						}
					}}
					className="bg-white p-2 mr-3 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full"
					title={
						type === "rt" && detail.rw_id
							? ["superadmin", "pemberdayaan_masyarakat", "pmd"].includes(
									user?.role
							  )
								? "Kembali ke Admin RW"
								: "Kembali ke RW"
							: ["superadmin", "pemberdayaan_masyarakat", "pmd"].includes(
									user?.role
							  )
							? "Kembali ke Admin Kelembagaan"
							: "Kembali ke Kelembagaan Desa"
					}
				>
					<FaArrowLeft />
				</button>
				<div>
					<h1 className="text-3xl font-bold text-gray-800">{pageTitle}</h1>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="col-span-1 lg:col-span-2 space-y-4">
					<ProfilCard
						profil={detail}
						type={type}
						onEdit={handleOpenEdit}
						rtCount={type === "rw" ? anak.length : 0}
						pengurusCount={pengurusCount}
						onToggleStatus={handleToggleStatus}
						onToggleVerification={handleToggleVerification}
						produkHukumList={produkHukumList}
					/>

					<PengurusKelembagaan
						kelembagaanType={type}
						kelembagaanId={detail.id}
						desaId={detail.desa_id}
						onPengurusCountChange={setPengurusCount}
					/>
				</div>
				<div className="space-y-4">
					{type === "rw" && (
						<AnakLembagaCard
							list={anak}
							label="Daftar RT"
							onClickItem={(rt) => navigate(`/desa/kelembagaan/rt/${rt.id}`)}
							onAddRT={handleAddRT}
							rwId={detail.id}
						/>
					)}
					<AktivitasLog lembagaType={type} lembagaId={id} />
				</div>
			</div>

			<EditModal
				title="Edit Kelembagaan"
				isOpen={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				onSubmit={handleSaveEdit}
			>
				{type !== "rw" && type !== "rt" ? (
					<div>
						<label className="block text-sm font-medium">Nama</label>
						<input
							className="mt-1 w-full border rounded px-3 py-2"
							value={editForm.nama}
							onChange={(e) =>
								setEditForm((f) => ({ ...f, nama: e.target.value }))
							}
							placeholder="Nama lembaga"
						/>
					</div>
				) : (
					<div>
						<label className="block text-sm font-medium">Nomor</label>
						<input
							className="mt-1 w-full border rounded px-3 py-2"
							value={editForm.nomor}
							onChange={(e) =>
								setEditForm((f) => ({ ...f, nomor: e.target.value }))
							}
							placeholder="Nomor"
						/>
					</div>
				)}
				<div>
					<label className="block text-sm font-medium">Alamat</label>
					<input
						className="mt-1 w-full border rounded px-3 py-2"
						value={editForm.alamat}
						onChange={(e) =>
							setEditForm((f) => ({ ...f, alamat: e.target.value }))
						}
						placeholder="Alamat"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium mb-2">
						SK Pembentukan Lembaga
					</label>
					<SearchableProdukHukumSelect
						value={editForm.produk_hukum_id}
						onChange={(id) =>
							setEditForm((f) => ({ ...f, produk_hukum_id: id }))
						}
						produkHukumList={produkHukumList}
					/>
					<p className="text-xs text-gray-500 mt-1">
						Pilih produk hukum sebagai dasar pembentukan lembaga ini
					</p>
				</div>
			</EditModal>
		</div>
	);
}
