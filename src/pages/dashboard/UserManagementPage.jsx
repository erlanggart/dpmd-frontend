// src/pages/dashboard/UserManagementPage.jsx
// Manajemen pengguna: tabel yang bisa dipindai, dengan rincian dan tindakan di
// panel samping.
//
// Sebelumnya halaman ini berupa grid kartu 12-per-halaman. Tiap kartu memuat
// sampai dua belas baris atribut, satu deret delapan tombol berwarna, DAN menu
// tiga titik berisi tindakan yang sama persis — dua salinan tindakan di satu
// kartu. Mencari satu orang di antara 683 akun berarti membalik puluhan
// halaman. Bentuk tabel dipilih karena pekerjaan utamanya memang memindai dan
// membandingkan, bukan memandangi satu per satu.
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
	LuUsers,
	LuPlus,
	LuSearch,
	LuChevronDown,
	LuBuilding2,
	LuMapPin,
	LuHouse,
	LuBriefcase,
	LuChevronLeft,
	LuChevronRight,
	LuDownload,
	LuFileSpreadsheet,
	LuShield,
	LuShieldCheck,
	LuX,
	LuTriangleAlert,
	LuBadgeCheck,
} from "react-icons/lu";
import * as XLSX from 'xlsx';
import api from "../../api";
import AddUserModal from "../../components/AddUserModal";
import ResetPasswordModal from "../../components/ResetPasswordModal";
import EditRoleModal from "../../components/EditRoleModal";
import EditBidangModal from "../../components/EditBidangModal";
import EditTanggalLahirModal from "../../components/EditTanggalLahirModal";
import EditJabatanModal from "../../components/EditJabatanModal";
import DesaPermissionsModal from "../../components/DesaPermissionsModal";
import EditAvatarModal from "../../components/EditAvatarModal";
import UserDetailDrawer from "../../components/users/UserDetailDrawer";
import { getAvatarUrl } from "../../utils/avatarUtils";
import { getRoleInfo } from "../../constants/userRoles";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

const ROLE_DASHBOARD_MAP = {
	superadmin: "/superadmin/dashboard",
	kepala_dinas: "/dpmd/dashboard",
	sekretaris_dinas: "/dpmd/dashboard",
	kepala_bidang: "/dpmd/dashboard",
	ketua_tim: "/dpmd/dashboard",
	bendahara: "/dpmd/dashboard",
	pegawai: "/dpmd/dashboard",
	desa: "/desa/dashboard",
	kecamatan: "/kecamatan/dashboard",
	dinas_terkait: "/dinas/dashboard",
	verifikator_dinas: "/dinas/dashboard",
	bpjs: "/bpjs/dashboard",
};

const PILIHAN_PER_HALAMAN = [10, 25, 50, 100];
const PER_HALAMAN_AWAL = 10;

/** Satuan kerja pengguna, apa pun bentuknya — supaya kolomnya cukup satu. */
const unitKerja = (user) => {
	if (user.bidang?.nama) return { label: user.bidang.nama, icon: LuBuilding2, sub: user.sub_bidang };
	if (user.desa?.nama)
		return {
			label: user.desa.nama,
			icon: LuHouse,
			sub: user.desa.kecamatan?.nama ? `Kec. ${user.desa.kecamatan.nama}` : null,
		};
	if (user.kecamatan?.nama) return { label: `Kec. ${user.kecamatan.nama}`, icon: LuMapPin, sub: null };
	if (user.dinas?.nama_dinas) return { label: user.dinas.nama_dinas, icon: LuBuilding2, sub: null };
	return null;
};

const BarisPengguna = ({ user, terpilih, onPilih }) => {
	const avatarUrl = getAvatarUrl(user.avatar);
	const peran = getRoleInfo(user.role);
	const unit = unitKerja(user);
	const UnitIcon = unit?.icon;

	return (
		<tr
			onClick={() => onPilih(user)}
			className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 ${
				terpilih ? 'bg-slate-50' : 'hover:bg-slate-50'
			}`}
		>
			<td className="px-4 py-3">
				<div className="flex items-center gap-3">
					<div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-slate-100">
						{avatarUrl ? (
							<img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
						) : (
							<div className="flex h-full w-full items-center justify-center bg-slate-900 text-sm font-bold text-white">
								{user.name?.charAt(0)?.toUpperCase() || 'U'}
							</div>
						)}
					</div>
					<div className="min-w-0">
						<p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
							{user.name}
							{user.profile_incomplete && (
								<LuTriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" title="Identitas belum dilengkapi" />
							)}
						</p>
						<p className="truncate text-xs text-slate-500">{user.email}</p>
					</div>
				</div>
			</td>
			<td className="px-4 py-3">
				<span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
					<span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: peran.dot }} />
					{peran.label}
				</span>
			</td>
			<td className="hidden px-4 py-3 lg:table-cell">
				{unit ? (
					<div className="flex items-center gap-2 text-sm text-slate-600">
						<UnitIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
						<span className="truncate">
							{unit.label}
							{unit.sub && <span className="text-slate-400"> · {unit.sub}</span>}
						</span>
					</div>
				) : (
					<span className="text-sm text-slate-300">—</span>
				)}
			</td>
			<td className="hidden px-4 py-3 xl:table-cell">
				{user.jabatan || user.jabatan_desa ? (
					<span className="truncate text-sm text-slate-600">{user.jabatan || user.jabatan_desa}</span>
				) : (
					<span className="text-sm text-slate-300">—</span>
				)}
			</td>
			<td className="px-4 py-3 text-right">
				<span
					className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
						user.is_active ? 'text-emerald-700' : 'text-slate-400'
					}`}
				>
					<span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
					{user.is_active ? 'Aktif' : 'Nonaktif'}
				</span>
			</td>
		</tr>
	);
};

/**
 * Bentuk kartu untuk layar sempit. Tabel di bawah 768px memaksa gulir mendatar
 * — dua kolomnya pun sudah disembunyikan — jadi di HP baris yang sama disajikan
 * bertumpuk, satu ketukan penuh untuk membuka panel rincian.
 */
const KartuPengguna = ({ user, terpilih, onPilih }) => {
	const avatarUrl = getAvatarUrl(user.avatar);
	const peran = getRoleInfo(user.role);
	const unit = unitKerja(user);
	const UnitIcon = unit?.icon;

	return (
		<button
			type="button"
			onClick={() => onPilih(user)}
			className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
				terpilih ? 'bg-slate-50' : 'active:bg-slate-50'
			}`}
		>
			<div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100">
				{avatarUrl ? (
					<img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
				) : (
					<div className="flex h-full w-full items-center justify-center bg-slate-900 text-sm font-bold text-white">
						{user.name?.charAt(0)?.toUpperCase() || 'U'}
					</div>
				)}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-900">
						<span className="truncate">{user.name}</span>
						{user.profile_incomplete && (
							<LuTriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" title="Identitas belum dilengkapi" />
						)}
					</p>
					<span
						className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
						title={user.is_active ? 'Aktif' : 'Nonaktif'}
					/>
				</div>
				<p className="truncate text-xs text-slate-500">{user.email}</p>

				<div className="mt-2 flex flex-wrap items-center gap-1.5">
					<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
						<span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: peran.dot }} />
						{peran.label}
					</span>
					{unit && (
						<span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-slate-500">
							<UnitIcon className="h-3 w-3 shrink-0 text-slate-400" />
							<span className="truncate">{unit.label}</span>
						</span>
					)}
				</div>
			</div>

			<LuChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300" />
		</button>
	);
};

const UserManagementPage = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showResetModal, setShowResetModal] = useState(false);
	const [showRoleModal, setShowRoleModal] = useState(false);
	const [showBidangModal, setShowBidangModal] = useState(false);
	const [showTanggalLahirModal, setShowTanggalLahirModal] = useState(false);
	const [showJabatanModal, setShowJabatanModal] = useState(false);
	const [showDesaPermModal, setShowDesaPermModal] = useState(false);
	const [showAvatarModal, setShowAvatarModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [isResettingPassword, setIsResettingPassword] = useState(false);

	// Pengguna yang sedang dibuka rinciannya di panel samping.
	const [detailUser, setDetailUser] = useState(null);

	// Filters
	const [searchTerm, setSearchTerm] = useState("");
	const [filterBidang, setFilterBidang] = useState("all");
	const [filterDinas, setFilterDinas] = useState("all");
	const [activeTab, setActiveTab] = useState("superadmin");
	const [bidangList, setBidangList] = useState([]);
	const [dinasList, setDinasList] = useState([]);

	// Pagination
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(PER_HALAMAN_AWAL);

	const [visiblePasswords, setVisiblePasswords] = useState({});
	const [showExportMenu, setShowExportMenu] = useState(false);

	const { user: currentUser } = useAuth();
	const canManage =
		currentUser?.role === "superadmin" ||
		currentUser?.role === "sekretaris_dinas" ||
		Number(currentUser?.bidang_id) === 2;

	// Tab configuration.
	// Verifikator Dinas sempat tidak punya tab sama sekali — 92 akun karena itu
	// tidak pernah tampil dan tidak bisa dikelola dari halaman ini.
	const tabs = useMemo(() => [
		{ id: "superadmin", label: "Super Admin", role: "superadmin", icon: LuShield },
		{
			id: "pegawai",
			label: "Pegawai DPMD",
			roles: ["kepala_dinas", "sekretaris_dinas", "kepala_bidang", "ketua_tim", "bendahara", "pegawai"],
			icon: LuBriefcase,
		},
		// Admin Desa (pengelola akun) + operator desa yang dibuatnya
		{ id: "desa", label: "Akun Desa", roles: ["admin_desa", "desa"], icon: LuHouse },
		{ id: "kecamatan", label: "Admin Kecamatan", role: "kecamatan", icon: LuMapPin },
		{ id: "dinas_terkait", label: "Dinas Terkait", role: "dinas_terkait", icon: LuBuilding2 },
		{ id: "verifikator_dinas", label: "Verifikator Dinas", role: "verifikator_dinas", icon: LuBadgeCheck },
		{ id: "bpjs", label: "BPJS", role: "bpjs", icon: LuShieldCheck },
	], []);

	// Fetch users
	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const response = await api.get("/users", {
				params: {
					limit: 1000,
				},
			});
			setUsers(response.data.data || []);
		} catch (err) {
			setError("Gagal mengambil data user.");
			console.error("Error fetching users:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchBidangList = useCallback(async () => {
		try {
			const response = await api.get("/bidang");
			setBidangList(response.data.data || []);
		} catch (err) {
			console.error("Error fetching bidang:", err);
		}
	}, []);

	const fetchDinasList = useCallback(async () => {
		try {
			const response = await api.get("/master/dinas");
			setDinasList(response.data.data || []);
		} catch (err) {
			console.error("Error fetching dinas:", err);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
		fetchBidangList();
		fetchDinasList();
	}, [fetchUsers, fetchBidangList, fetchDinasList]);

	const handleUserAdded = () => {
		setShowAddModal(false);
		fetchUsers();
		Swal.fire({
			title: "Berhasil!",
			text: "User berhasil ditambahkan",
			icon: "success",
			timer: 2000,
			showConfirmButton: false,
		});
	};

	const handleResetPassword = (user) => {
		setSelectedUser(user);
		setShowResetModal(true);
	};

	const handleConfirmResetPassword = async () => {
		if (!selectedUser) return;

		setIsResettingPassword(true);
		try {
			await api.put(`/users/${selectedUser.id}/reset-password`, {
				password: "password",
			});

			setShowResetModal(false);
			setSelectedUser(null);

			Swal.fire({
				title: "Berhasil!",
				text: `Password untuk ${selectedUser.name} berhasil direset!`,
				icon: "success",
				confirmButtonText: "OK",
				confirmButtonColor: "#10b981",
			});
		} catch (error) {
			console.error("Error resetting password:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal mereset password.",
				icon: "error",
				confirmButtonText: "OK",
				confirmButtonColor: "#ef4444",
			});
		} finally {
			setIsResettingPassword(false);
		}
	};

	const handleEditRole = (user) => {
		setSelectedUser(user);
		setShowRoleModal(true);
	};

	const handleRoleUpdated = () => {
		setShowRoleModal(false);
		setSelectedUser(null);
		fetchUsers();
	};

	const handleEditBidang = (user) => {
		setSelectedUser(user);
		setShowBidangModal(true);
	};

	const handleEditTanggalLahir = (user) => {
		setSelectedUser(user);
		setShowTanggalLahirModal(true);
	};

	const handleEditJabatan = (user) => {
		setSelectedUser(user);
		setShowJabatanModal(true);
	};

	// Hak akses fitur akun operasional desa (role `desa`)
	const handleEditDesaPermissions = (user) => {
		setSelectedUser(user);
		setShowDesaPermModal(true);
	};

	const handleEditAvatar = (user) => {
		setSelectedUser(user);
		setShowAvatarModal(true);
	};

	const handleBidangUpdated = () => {
		setShowBidangModal(false);
		setSelectedUser(null);
		fetchUsers();
	};

	const handleTanggalLahirUpdated = () => {
		setShowTanggalLahirModal(false);
		setSelectedUser(null);
		fetchUsers();
	};

	const handleAvatarUpdated = () => {
		setShowAvatarModal(false);
		setSelectedUser(null);
		fetchUsers();
	};

	const handleJabatanUpdated = () => {
		setShowJabatanModal(false);
		setSelectedUser(null);
		fetchUsers();
	};

	const handleSetDevice = async (user) => {
		const result = await Swal.fire({
			title: 'Kelola Device Absensi',
			html:
				`<p class="text-sm text-gray-600 mb-3">Pegawai: <strong>${user.name}</strong></p>` +
				(user.device_id
					? `<p class="text-xs text-gray-500 mb-2">Device terdaftar: <code class="bg-gray-100 px-2 py-1 rounded">${user.device_id.substring(0, 20)}...</code></p>`
					: '<p class="text-xs text-amber-600 mb-2">Belum ada device terdaftar</p>') +
				'<p class="text-xs text-gray-500">Masukkan Device ID dari HP pegawai. Device ID dapat dilihat di halaman Absensi pegawai.</p>',
			input: 'text',
			inputValue: user.device_id || '',
			inputPlaceholder: 'Paste Device ID dari pegawai...',
			showCancelButton: true,
			confirmButtonText: user.device_id ? 'Update Device' : 'Daftarkan Device',
			cancelButtonText: 'Batal',
			confirmButtonColor: '#06b6d4',
			showDenyButton: !!user.device_id,
			denyButtonText: 'Hapus Device',
			denyButtonColor: '#ef4444',
			inputValidator: (value) => {
				if (!value) return 'Device ID tidak boleh kosong';
			},
		});

		if (result.dismiss) return; // cancelled

		const deviceId = result.isDenied ? null : result.value;

		try {
			await api.put(`/absensi/admin/set-device/${user.id}`, {
				device_id: deviceId
			});
			Swal.fire({ icon: 'success', title: 'Berhasil', text: deviceId ? 'Device berhasil didaftarkan' : 'Device berhasil dihapus', timer: 2000, showConfirmButton: false });
			fetchUsers();
		} catch (err) {
			Swal.fire({ icon: 'error', title: 'Gagal', text: err.response?.data?.message || 'Gagal update device' });
		}
	};

	const handleImpersonate = async (targetUser) => {
		if (currentUser?.role !== "superadmin") {
			Swal.fire("Akses ditolak", "Hanya superadmin yang dapat masuk sebagai user lain.", "error");
			return;
		}

		if (String(currentUser?.id) === String(targetUser.id)) {
			Swal.fire("Info", "Anda sudah berada di akun superadmin ini.", "info");
			return;
		}

		const result = await Swal.fire({
			title: "Masuk sebagai user?",
			html: `<p class="text-sm text-gray-600">Anda akan masuk sebagai <strong>${targetUser.name}</strong>.</p><p class="text-xs text-gray-500 mt-2">Sesi superadmin disimpan sementara dan dapat dikembalikan lewat tombol di bagian atas halaman.</p>`,
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Ya, Masuk",
			cancelButtonText: "Batal",
			confirmButtonColor: "#059669",
		});

		if (!result.isConfirmed) return;

		try {
			Swal.fire({
				title: "Memindahkan sesi...",
				text: "Mohon tunggu sebentar.",
				allowOutsideClick: false,
				didOpen: () => Swal.showLoading(),
			});

			const currentSession = localStorage.getItem("authSession");
			const currentToken = localStorage.getItem("expressToken");
			const currentUserData = localStorage.getItem("user");
			const alreadyImpersonating = localStorage.getItem("isImpersonating") === "true";

			const response = await api.post(`/users/${targetUser.id}/impersonate`);
			const { token, user } = response.data.data;

			if (!token || !user) {
				throw new Error("Token impersonasi tidak valid");
			}

			const impersonatedSessionUser = {
				...user,
				role: String(user.role || "").trim(),
			};
			const sessionData = {
				user: impersonatedSessionUser,
				token,
				lastActivity: Date.now(),
			};

			if (!alreadyImpersonating) {
				localStorage.setItem("superadminReturnSession", currentSession || "");
				localStorage.setItem("superadminReturnToken", currentToken || "");
				localStorage.setItem("superadminReturnUser", currentUserData || "");
			}

			localStorage.setItem("authSession", JSON.stringify(sessionData));
			localStorage.setItem("user", JSON.stringify(impersonatedSessionUser));
			localStorage.setItem("expressToken", token);
			localStorage.setItem("isImpersonating", "true");
			localStorage.setItem("impersonatedUser", JSON.stringify({
				id: impersonatedSessionUser.id,
				name: impersonatedSessionUser.name,
				email: impersonatedSessionUser.email,
				role: impersonatedSessionUser.role,
			}));

			window.dispatchEvent(new CustomEvent("sessionUpdated", { detail: sessionData }));
			Swal.close();

			const dashboardPath = ROLE_DASHBOARD_MAP[impersonatedSessionUser.role] || "/dashboard";
			window.location.replace(dashboardPath);
		} catch (err) {
			console.error("Error impersonating user:", err);
			Swal.fire({
				title: "Gagal!",
				text: err.response?.data?.message || err.message || "Gagal masuk sebagai user.",
				icon: "error",
				confirmButtonText: "OK",
				confirmButtonColor: "#ef4444",
			});
		}
	};

	const togglePasswordVisibility = (userId) => {
		setVisiblePasswords(prev => ({
			...prev,
			[userId]: !prev[userId]
		}));
	};

	const handleDeleteUser = async (user) => {
		const result = await Swal.fire({
			title: "Hapus User?",
			text: `Apakah Anda yakin ingin menghapus user ${user.name}?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#3085d6",
			confirmButtonText: "Ya, Hapus!",
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/users/${user.id}`);
				setDetailUser(null);
				Swal.fire("Terhapus!", "User berhasil dihapus.", "success");
				fetchUsers();
			} catch (err) {
				Swal.fire(
					"Error!",
					err.response?.data?.message || "Gagal menghapus user.",
					"error"
				);
			}
		}
	};

	// Filter users
	const filteredUsers = useMemo(() => {
		return users.filter((user) => {
			const activeTabConfig = tabs.find(t => t.id === activeTab);
			let matchTab = false;

			if (activeTabConfig.role) {
				matchTab = user.role === activeTabConfig.role;
			} else if (activeTabConfig.roles) {
				matchTab = activeTabConfig.roles.includes(user.role);
			}

			const searchLower = searchTerm.toLowerCase();
			const matchSearch =
				user.name?.toLowerCase().includes(searchLower) ||
				user.email?.toLowerCase().includes(searchLower) ||
				user.desa?.nama?.toLowerCase().includes(searchLower) ||
				user.kecamatan?.nama?.toLowerCase().includes(searchLower) ||
				user.bidang?.nama?.toLowerCase().includes(searchLower);

			const matchBidang =
				activeTab !== "pegawai" ||
				filterBidang === "all" ||
				user.bidang_id === parseInt(filterBidang);

			const matchDinas =
				activeTab !== "dinas_terkait" ||
				filterDinas === "all" ||
				user.dinas_id === parseInt(filterDinas);

			return matchTab && matchSearch && matchBidang && matchDinas;
		});
	}, [users, searchTerm, activeTab, filterBidang, filterDinas, tabs]);

	const totalPages = Math.max(Math.ceil(filteredUsers.length / itemsPerPage), 1);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, activeTab, filterBidang, filterDinas, itemsPerPage]);

	// Export users to Excel
	const handleExportUsers = (exportType = 'current') => {
		let dataToExport = [];
		let sheetName = '';
		let fileName = '';

		const activeTabConfig = tabs.find(t => t.id === activeTab);
		const today = new Date().toISOString().split('T')[0];

		if (exportType === 'current') {
			dataToExport = filteredUsers;
			sheetName = activeTabConfig?.label || 'Users';
			fileName = `User_${sheetName.replace(/\s+/g, '_')}_${today}.xlsx`;
		} else if (exportType === 'all') {
			const wb = XLSX.utils.book_new();

			tabs.forEach(tab => {
				const tabUsers = users.filter(user => {
					if (tab.role) return user.role === tab.role;
					if (tab.roles) return tab.roles.includes(user.role);
					return false;
				});

				if (tabUsers.length === 0) return;

				const isSuperadminUser = currentUser?.role === 'superadmin';
				const rows = tabUsers.map((user, idx) => ({
					'No': idx + 1,
					'Nama': user.name || '',
					'Email': user.email || '',
					...(isSuperadminUser ? { 'Password': user.role === 'superadmin' ? '-' : (user.plain_password || '-') } : {}),
					'Role': getRoleInfo(user.role).label,
					...(tab.id === 'pegawai' ? { 'Bidang': user.bidang?.nama || '-' } : {}),
					...(tab.id === 'desa' ? {
						'Desa': user.desa?.nama || '-',
						'Kecamatan': user.desa?.kecamatan?.nama || user.kecamatan?.nama || '-',
					} : {}),
					...(tab.id === 'kecamatan' ? { 'Kecamatan': user.kecamatan?.nama || '-' } : {}),
					...(tab.id === 'dinas_terkait' ? { 'Dinas': user.dinas?.nama_dinas || '-' } : {}),
					'Tanggal Dibuat': user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '-',
				}));

				const ws = XLSX.utils.json_to_sheet(rows);

				const colWidths = Object.keys(rows[0] || {}).map(key => ({
					wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2
				}));
				ws['!cols'] = colWidths;

				XLSX.utils.book_append_sheet(wb, ws, tab.label.substring(0, 31));
			});

			XLSX.writeFile(wb, `Semua_User_DPMD_${today}.xlsx`);
			Swal.fire({
				title: 'Berhasil!',
				text: 'Data semua user berhasil diekspor ke Excel',
				icon: 'success',
				timer: 2000,
				showConfirmButton: false,
			});
			return;
		}

		// Single sheet export
		const isSuperadminUser = currentUser?.role === 'superadmin';
		const rows = dataToExport.map((user, idx) => {
			const row = {
				'No': idx + 1,
				'Nama': user.name || '',
				'Email': user.email || '',
				...(isSuperadminUser ? { 'Password': user.role === 'superadmin' ? '-' : (user.plain_password || '-') } : {}),
				'Role': getRoleInfo(user.role).label,
			};

			if (activeTab === 'pegawai') {
				row['Bidang'] = user.bidang?.nama || '-';
			} else if (activeTab === 'desa') {
				row['Desa'] = user.desa?.nama || '-';
				row['Kecamatan'] = user.desa?.kecamatan?.nama || user.kecamatan?.nama || '-';
			} else if (activeTab === 'kecamatan') {
				row['Kecamatan'] = user.kecamatan?.nama || '-';
			} else if (activeTab === 'dinas_terkait') {
				row['Dinas'] = user.dinas?.nama_dinas || '-';
			}

			row['Tanggal Dibuat'] = user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '-';
			return row;
		});

		const ws = XLSX.utils.json_to_sheet(rows);

		if (rows.length > 0) {
			const colWidths = Object.keys(rows[0]).map(key => ({
				wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2
			}));
			ws['!cols'] = colWidths;
		}

		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
		XLSX.writeFile(wb, fileName);

		Swal.fire({
			title: 'Berhasil!',
			text: `Data ${sheetName} berhasil diekspor ke Excel (${dataToExport.length} user)`,
			icon: 'success',
			timer: 2000,
			showConfirmButton: false,
		});
	};

	// Hitungan diambil dari daftar yang sudah dimuat (batas 1000 baris), bukan
	// panggilan statistik terpisah — satu permintaan jaringan lebih sedikit.
	const jumlahPerRole = useMemo(() => {
		const hitung = {};
		users.forEach((user) => {
			hitung[user.role] = (hitung[user.role] || 0) + 1;
		});
		return hitung;
	}, [users]);

	const jumlahTab = (tab) =>
		tab.role
			? jumlahPerRole[tab.role] || 0
			: tab.roles?.reduce((total, role) => total + (jumlahPerRole[role] || 0), 0) || 0;

	const adaFilter = Boolean(searchTerm) || filterBidang !== 'all' || filterDinas !== 'all';
	const nonaktif = users.filter((user) => !user.is_active).length;
	const belumLengkap = users.filter((user) => user.profile_incomplete).length;

	if (loading)
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<p className="text-sm font-medium text-slate-500">Memuat data pengguna…</p>
			</div>
		);

	if (error)
		return (
			<div className="min-h-screen bg-slate-50 p-6">
				<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>
			</div>
		);

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
				{/* ---------- Kepala ---------- */}
				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
					<div className="flex items-start gap-3 sm:gap-4">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white sm:h-12 sm:w-12">
							<LuUsers className="h-5 w-5 sm:h-6 sm:w-6" />
						</div>
						<div className="min-w-0">
							<h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Manajemen Pengguna</h1>
							<p className="mt-1 text-sm text-slate-500">
								<span className="font-semibold text-slate-700">{users.length}</span> akun terdaftar
								{nonaktif > 0 && <> · {nonaktif} nonaktif</>}
								{belumLengkap > 0 && <> · {belumLengkap} identitas belum lengkap</>}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<div className="relative flex-1 sm:flex-none">
							<button
								onClick={() => setShowExportMenu((buka) => !buka)}
								className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto sm:justify-start"
							>
								<LuDownload className="h-4 w-4" />
								Ekspor
								<LuChevronDown
									className={`h-3.5 w-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`}
								/>
							</button>

							{showExportMenu && (
								<>
									<div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
									{/* Lebarnya dibatasi lebar layar supaya tidak menjorok keluar di HP. */}
									<div className="absolute right-0 z-40 mt-2 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
										<button
											onClick={() => {
												handleExportUsers('current');
												setShowExportMenu(false);
											}}
											className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
										>
											<LuFileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
											<span>
												<span className="block text-sm font-medium text-slate-800">Tab aktif</span>
												<span className="block text-xs text-slate-500">
													{tabs.find((t) => t.id === activeTab)?.label} · {filteredUsers.length} akun
												</span>
											</span>
										</button>
										<button
											onClick={() => {
												handleExportUsers('all');
												setShowExportMenu(false);
											}}
											className="flex w-full items-start gap-3 border-t border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50"
										>
											<LuUsers className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
											<span>
												<span className="block text-sm font-medium text-slate-800">Semua kategori</span>
												<span className="block text-xs text-slate-500">{users.length} akun · multi-sheet</span>
											</span>
										</button>
									</div>
								</>
							)}
						</div>

						{canManage && (
							<button
								onClick={() => setShowAddModal(true)}
								className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:flex-none"
							>
								<LuPlus className="h-4 w-4" />
								Tambah User
							</button>
						)}
					</div>
				</div>

				{/* ---------- Tab peran ---------- */}
				<div className="scrollbar-hide flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
					{tabs.map((tab) => {
						const Icon = tab.icon;
						const aktif = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => {
									setActiveTab(tab.id);
									setSearchTerm('');
									setFilterBidang('all');
									setFilterDinas('all');
								}}
								aria-current={aktif ? 'page' : undefined}
								className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
									aktif
										? 'bg-slate-900 text-white shadow-sm'
										: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
								}`}
							>
								<Icon className="h-4 w-4" />
								{tab.label}
								<span
									className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
										aktif ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
									}`}
								>
									{jumlahTab(tab)}
								</span>
							</button>
						);
					})}
				</div>

				{/* ---------- Alat ---------- */}
				<div className="flex flex-wrap items-center gap-2">
					<div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-sm">
						<LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							type="text"
							placeholder="Cari nama, email, atau wilayah…"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-700 transition-colors focus:border-slate-900 focus:outline-none"
						/>
						{searchTerm && (
							<button
								onClick={() => setSearchTerm('')}
								aria-label="Hapus pencarian"
								className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
							>
								<LuX className="h-3.5 w-3.5" />
							</button>
						)}
					</div>

					{activeTab === 'pegawai' && (
						<select
							value={filterBidang}
							onChange={(e) => setFilterBidang(e.target.value)}
							className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:border-slate-900 focus:outline-none sm:flex-none"
						>
							<option value="all">Semua Bidang</option>
							{bidangList.map((bidang) => (
								<option key={bidang.id} value={bidang.id}>
									{bidang.nama}
								</option>
							))}
						</select>
					)}

					{activeTab === 'dinas_terkait' && (
						<select
							value={filterDinas}
							onChange={(e) => setFilterDinas(e.target.value)}
							className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:border-slate-900 focus:outline-none sm:flex-none"
						>
							<option value="all">Semua Dinas</option>
							{dinasList.map((dinas) => (
								<option key={dinas.id} value={dinas.id}>
									{dinas.nama_dinas}
								</option>
							))}
						</select>
					)}

					<span className="ml-auto text-xs tabular-nums text-slate-500">
						{filteredUsers.length} akun{adaFilter && ' (disaring)'}
					</span>
				</div>

				{/* ---------- Tabel ---------- */}
				<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					{filteredUsers.length === 0 ? (
						<div className="py-20 text-center">
							<LuUsers className="mx-auto h-8 w-8 text-slate-300" />
							<p className="mt-3 text-sm font-medium text-slate-600">
								{adaFilter ? 'Tidak ada akun yang cocok' : 'Belum ada akun di kategori ini'}
							</p>
							<p className="mt-1 text-xs text-slate-400">
								{adaFilter ? 'Coba ubah kata kunci atau filternya.' : 'Tambahkan lewat tombol “Tambah User”.'}
							</p>
						</div>
					) : (
						<>
							{/* HP: daftar kartu. md ke atas: tabel. */}
							<div className="divide-y divide-slate-100 md:hidden">
								{paginatedUsers.map((user) => (
									<KartuPengguna
										key={user.id}
										user={user}
										terpilih={detailUser?.id === user.id}
										onPilih={setDetailUser}
									/>
								))}
							</div>

							<div className="hidden overflow-x-auto md:block">
								<table className="w-full min-w-[640px]">
									<thead>
										<tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-400">
											<th className="px-4 py-3 font-semibold">Pengguna</th>
											<th className="px-4 py-3 font-semibold">Peran</th>
											<th className="hidden px-4 py-3 font-semibold lg:table-cell">Unit Kerja</th>
											<th className="hidden px-4 py-3 font-semibold xl:table-cell">Jabatan</th>
											<th className="px-4 py-3 text-right font-semibold">Status</th>
										</tr>
									</thead>
									<tbody>
										{paginatedUsers.map((user) => (
											<BarisPengguna
												key={user.id}
												user={user}
												terpilih={detailUser?.id === user.id}
												onPilih={setDetailUser}
											/>
										))}
									</tbody>
								</table>
							</div>

							{/* ---------- Halaman ---------- */}
							<div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 sm:gap-3">
								<div className="flex flex-1 items-center gap-2 text-xs text-slate-500 sm:flex-none">
									<span className="tabular-nums">
										{startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredUsers.length)} dari{' '}
										{filteredUsers.length}
									</span>
									<select
										value={itemsPerPage}
										onChange={(e) => setItemsPerPage(Number(e.target.value))}
										className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 focus:border-slate-900 focus:outline-none"
									>
										{PILIHAN_PER_HALAMAN.map((jumlah) => (
											<option key={jumlah} value={jumlah}>
												{jumlah} / halaman
											</option>
										))}
									</select>
								</div>

								<div className="flex items-center gap-1">
									<button
										onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
										disabled={currentPage === 1}
										aria-label="Halaman sebelumnya"
										className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent sm:p-2"
									>
										<LuChevronLeft className="h-4 w-4" />
									</button>
									<span className="px-2 text-xs tabular-nums text-slate-500">
										<span className="hidden sm:inline">Halaman </span>
										{currentPage} / {totalPages}
									</span>
									<button
										onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
										disabled={currentPage === totalPages}
										aria-label="Halaman berikutnya"
										className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent sm:p-2"
									>
										<LuChevronRight className="h-4 w-4" />
									</button>
								</div>
							</div>
						</>
					)}
				</div>
			</div>

			{/* ---------- Panel rincian ---------- */}
			{detailUser && (
				<UserDetailDrawer
					user={detailUser}
					onClose={() => setDetailUser(null)}
					canManage={canManage}
					isSuperadmin={currentUser?.role === 'superadmin'}
					canImpersonate={currentUser?.role === 'superadmin' && String(currentUser?.id) !== String(detailUser.id)}
					passwordTerlihat={Boolean(visiblePasswords[detailUser.id])}
					onTogglePassword={() => togglePasswordVisibility(detailUser.id)}
					roleInfo={getRoleInfo(detailUser.role)}
					aksi={{
						role: handleEditRole,
						bidang: handleEditBidang,
						avatar: handleEditAvatar,
						tanggalLahir: handleEditTanggalLahir,
						jabatan: handleEditJabatan,
						desaPermissions: handleEditDesaPermissions,
						device: handleSetDevice,
						impersonate: handleImpersonate,
						resetPassword: handleResetPassword,
						hapus: handleDeleteUser,
					}}
				/>
			)}

			{/* ---------- Modal ---------- */}
			{showAddModal && (
				<AddUserModal
					isOpen={showAddModal}
					onClose={() => setShowAddModal(false)}
					onUserAdded={handleUserAdded}
				/>
			)}

			{showResetModal && selectedUser && (
				<ResetPasswordModal
					isOpen={showResetModal}
					onClose={() => {
						setShowResetModal(false);
						setSelectedUser(null);
					}}
					onConfirm={handleConfirmResetPassword}
					userName={selectedUser.name}
					isLoading={isResettingPassword}
				/>
			)}

			{showRoleModal && selectedUser && (
				<EditRoleModal
					isOpen={showRoleModal}
					onClose={() => {
						setShowRoleModal(false);
						setSelectedUser(null);
					}}
					onRoleUpdated={handleRoleUpdated}
					userData={selectedUser}
				/>
			)}

			{showBidangModal && selectedUser && (
				<EditBidangModal
					isOpen={showBidangModal}
					onClose={() => {
						setShowBidangModal(false);
						setSelectedUser(null);
					}}
					onBidangUpdated={handleBidangUpdated}
					userData={selectedUser}
				/>
			)}

			{showTanggalLahirModal && selectedUser && (
				<EditTanggalLahirModal
					isOpen={showTanggalLahirModal}
					onClose={() => {
						setShowTanggalLahirModal(false);
						setSelectedUser(null);
					}}
					onUpdated={handleTanggalLahirUpdated}
					userData={selectedUser}
				/>
			)}

			{showJabatanModal && selectedUser && (
				<EditJabatanModal
					isOpen={showJabatanModal}
					onClose={() => {
						setShowJabatanModal(false);
						setSelectedUser(null);
					}}
					onUpdated={handleJabatanUpdated}
					userData={selectedUser}
				/>
			)}

			{showDesaPermModal && selectedUser && (
				<DesaPermissionsModal
					isOpen={showDesaPermModal}
					onClose={() => {
						setShowDesaPermModal(false);
						setSelectedUser(null);
					}}
					onUpdated={fetchUsers}
					userData={selectedUser}
				/>
			)}

			{showAvatarModal && selectedUser && (
				<EditAvatarModal
					isOpen={showAvatarModal}
					onClose={() => {
						setShowAvatarModal(false);
						setSelectedUser(null);
					}}
					onUpdated={handleAvatarUpdated}
					userData={selectedUser}
				/>
			)}
		</div>
	);
};

export default UserManagementPage;
