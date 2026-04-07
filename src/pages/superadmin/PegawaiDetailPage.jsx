import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
	LuBriefcase,
	LuBuilding2,
	LuCalendar,
	LuCheck,
	LuChevronLeft,
	LuCircleUser,
	LuGraduationCap,
	LuMail,
	LuMapPin,
	LuPhone,
	LuShield,
	LuUsers,
} from "react-icons/lu";
import api from "../../api";
import { getAvatarUrl } from "../../utils/avatarUtils";

const ROLE_LABELS = {
	superadmin: "Superadmin",
	kepala_dinas: "Kepala Dinas",
	sekretaris_dinas: "Sekretaris Dinas",
	kepala_bidang: "Kepala Bidang",
	ketua_tim: "Ketua Tim",
	pegawai: "Pegawai",
	desa: "Desa",
	kecamatan: "Kecamatan",
	dinas_terkait: "Dinas Terkait",
	verifikator_dinas: "Verifikator Dinas",
};

const normalizeValue = (value) => {
	if (value === null || value === undefined) return null;
	if (typeof value === "string" && value.trim() === "") return null;
	return String(value);
};

const formatDate = (value) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
};

const formatDateTime = (value) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const formatGender = (value) => {
	if (value === "L") return "Laki-laki";
	if (value === "P") return "Perempuan";
	return null;
};

const formatEnumLabel = (value) => {
	const normalized = normalizeValue(value);
	return normalized ? normalized.replace(/_/g, " ") : null;
};

const formatRole = (value) => {
	const normalized = normalizeValue(value);
	if (!normalized) return null;
	return ROLE_LABELS[normalized] || normalized.replace(/_/g, " ");
};

const getDisplayState = (value) => {
	const normalized = normalizeValue(value);
	if (!normalized) {
		return { value: "Kosong", isEmpty: true };
	}

	return { value: normalized, isEmpty: false };
};

const mergePegawaiData = (incoming, fallback) => {
	const fallbackUsers = Array.isArray(fallback?.users) ? fallback.users : [];
	const incomingUsers = Array.isArray(incoming?.users) ? incoming.users : [];

	const mergedUsers = incomingUsers.length
		? incomingUsers.map((user) => {
			const fallbackUser = fallbackUsers.find((item) => item.id === user.id);
			return {
				...fallbackUser,
				...user,
				avatar: user.avatar || fallbackUser?.avatar || null,
			};
		})
		: fallbackUsers;

	return {
		...fallback,
		...incoming,
		users: mergedUsers,
	};
};

const SectionCard = ({ title, subtitle, children }) => (
	<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
		<div className="mb-5">
			<h2 className="text-lg font-bold text-slate-900">{title}</h2>
			{subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
		</div>
		{children}
	</div>
);

const DetailField = ({ icon, label, value }) => {
	const IconComponent = icon;
	const display = getDisplayState(value);

	return (
		<div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
			<div className="flex items-start gap-3">
				<div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
					<IconComponent className="h-5 w-5" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
					<p className={`mt-2 break-words text-sm ${display.isEmpty ? "italic text-slate-400" : "font-semibold text-slate-800"}`}>
						{display.value}
					</p>
				</div>
			</div>
		</div>
	);
};

const LinkedUserCard = ({ user }) => {
	const avatarUrl = getAvatarUrl(user?.avatar);
	const fields = [
		{ label: "ID User", value: user?.id },
		{ label: "Nama Akun", value: user?.name },
		{ label: "Email", value: user?.email },
		{ label: "Role", value: formatRole(user?.role) },
		{ label: "Bidang ID", value: user?.bidang_id },
		{ label: "Pegawai ID", value: user?.pegawai_id },
		{ label: "Dinas ID", value: user?.dinas_id },
		{ label: "Kecamatan ID", value: user?.kecamatan_id },
		{ label: "Desa ID", value: user?.desa_id },
	];

	return (
		<div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
				<div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-sm">
					{avatarUrl ? (
						<img
							src={avatarUrl}
							alt={user?.name || "Akun terhubung"}
							className="h-full w-full object-cover"
							onError={(event) => {
								event.currentTarget.onerror = null;
								event.currentTarget.src = "/user-default.svg";
							}}
						/>
					) : null}
					{!avatarUrl ? <LuCircleUser className="h-10 w-10 text-slate-300" /> : null}
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-base font-bold text-slate-900">{getDisplayState(user?.name).value}</p>
					<p className="mt-1 text-sm text-slate-500">Akun pengguna yang terhubung dengan data pegawai ini.</p>
					<div className="mt-4 grid gap-3 sm:grid-cols-2">
						{fields.map((field) => {
							const display = getDisplayState(field.value);
							return (
								<div key={field.label} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{field.label}</p>
									<p className={`mt-2 break-words text-sm ${display.isEmpty ? "italic text-slate-400" : "font-semibold text-slate-800"}`}>
										{display.value}
									</p>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};

const PegawaiDetailPage = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { id } = useParams();
	const initialPegawai = location.state?.pegawai || null;
	const [pegawai, setPegawai] = useState(initialPegawai);
	const [loading, setLoading] = useState(!initialPegawai);
	const [error, setError] = useState("");

	useEffect(() => {
		let isMounted = true;

		const fetchDetail = async () => {
			if (!initialPegawai) {
				setLoading(true);
			}

			setError("");

			try {
				const response = await api.get(`/pegawai/${id}`);
				const nextPegawai = response.data?.data;

				if (!nextPegawai) {
					throw new Error("Data pegawai tidak ditemukan.");
				}

				if (isMounted) {
					setPegawai((current) => mergePegawaiData(nextPegawai, current || initialPegawai));
				}
			} catch (err) {
				if (isMounted) {
					setError(err.response?.data?.message || err.message || "Gagal memuat detail pegawai.");
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		fetchDetail();

		return () => {
			isMounted = false;
		};
	}, [id, initialPegawai]);

	if (loading && !pegawai) {
		return (
			<div className="flex min-h-[70vh] items-center justify-center">
				<div className="text-center">
					<div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
					<p className="mt-4 text-sm text-slate-500">Memuat detail pegawai...</p>
				</div>
			</div>
		);
	}

	if (!pegawai) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-16 text-center">
				<div className="rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
						<LuUsers className="h-8 w-8" />
					</div>
					<h1 className="mt-4 text-xl font-bold text-slate-900">Detail pegawai tidak tersedia</h1>
					<p className="mt-2 text-sm text-slate-500">{error || "Data pegawai tidak ditemukan."}</p>
					<button
						onClick={() => navigate("/superadmin/kepegawaian")}
						className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
					>
						<LuChevronLeft className="h-4 w-4" />
						Kembali ke Kepegawaian
					</button>
				</div>
			</div>
		);
	}

	const linkedUsers = Array.isArray(pegawai.users) ? pegawai.users : [];
	const primaryUser = linkedUsers[0] || null;
	const avatarUrl = getAvatarUrl(primaryUser?.avatar);
	const statusLabel = formatEnumLabel(pegawai.status_kepegawaian);
	const roleLabel = formatRole(primaryUser?.role);

	const identitasFields = [
		{ icon: LuShield, label: "ID Pegawai", value: pegawai.id_pegawai },
		{ icon: LuShield, label: "NIP", value: pegawai.nip },
		{ icon: LuCircleUser, label: "Nama Pegawai", value: pegawai.nama_pegawai },
		{ icon: LuCircleUser, label: "Jenis Kelamin", value: formatGender(pegawai.jenis_kelamin) },
		{ icon: LuMapPin, label: "Tempat Lahir", value: pegawai.tempat_lahir },
		{ icon: LuCalendar, label: "Tanggal Lahir", value: formatDate(pegawai.tanggal_lahir) },
	];

	const kepegawaianFields = [
		{ icon: LuBuilding2, label: "ID Bidang", value: pegawai.id_bidang },
		{ icon: LuBuilding2, label: "Bidang", value: pegawai.bidangs?.nama },
		{ icon: LuBriefcase, label: "Jabatan", value: pegawai.jabatan },
		{ icon: LuBuilding2, label: "Unit Kerja", value: pegawai.unit_kerja },
		{ icon: LuShield, label: "Golongan", value: pegawai.golongan },
		{ icon: LuShield, label: "Pangkat", value: pegawai.pangkat },
		{ icon: LuShield, label: "Eselon", value: pegawai.eselon },
		{ icon: LuGraduationCap, label: "Pendidikan Terakhir", value: pegawai.pendidikan_terakhir },
		{ icon: LuBriefcase, label: "Status Kepegawaian", value: statusLabel },
		{ icon: LuCalendar, label: "TMT Jabatan", value: formatDate(pegawai.tmt_jabatan) },
	];

	const kontakFields = [
		{ icon: LuPhone, label: "No. HP", value: pegawai.no_hp },
		{ icon: LuMapPin, label: "Alamat", value: pegawai.alamat },
		{ icon: LuCalendar, label: "Dibuat Pada", value: formatDateTime(pegawai.created_at) },
		{ icon: LuCalendar, label: "Diperbarui Pada", value: formatDateTime(pegawai.updated_at) },
	];

	const statusBadge = getDisplayState(statusLabel);
	const roleBadge = getDisplayState(roleLabel);
	const bidangBadge = getDisplayState(pegawai.bidangs?.nama);

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-6 lg:p-8">
			<div className="mx-auto max-w-7xl space-y-6">
				<div className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 text-white shadow-2xl">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div className="flex items-start gap-3">
							<button
								onClick={() => navigate("/superadmin/kepegawaian")}
								className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 transition hover:bg-white/20"
							>
								<LuChevronLeft className="h-5 w-5" />
							</button>
							<div>
								<p className="text-sm font-medium text-white/70">Kepegawaian</p>
								<h1 className="mt-1 text-2xl font-bold md:text-3xl">Detail Pegawai</h1>
								<p className="mt-2 max-w-2xl text-sm text-white/75 md:text-base">
									Halaman detail menampilkan seluruh data pegawai dengan keterangan kosong untuk field yang belum terisi.
								</p>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusBadge.isEmpty ? "bg-white/10 text-white/75" : "bg-emerald-400/15 text-emerald-100"}`}>
								<LuCheck className="h-4 w-4" />
								{statusBadge.value}
							</span>
							<span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${roleBadge.isEmpty ? "bg-white/10 text-white/75" : "bg-blue-400/15 text-blue-100"}`}>
								<LuUsers className="h-4 w-4" />
								{roleBadge.value}
							</span>
						</div>
					</div>
					{error ? (
						<div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
							Menampilkan data terakhir yang tersedia. Sinkronisasi data terbaru gagal: {error}
						</div>
					) : null}
				</div>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
					<div className="xl:col-span-4">
						<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl xl:sticky xl:top-6">
							<div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 px-6 pb-24 pt-6" />
							<div className="px-6 pb-6">
								<div className="-mt-20 mx-auto max-w-[280px]">
									<div className="aspect-[4/5] overflow-hidden rounded-[2rem] border-[6px] border-white bg-slate-100 shadow-2xl">
										{avatarUrl ? (
											<img
												src={avatarUrl}
												alt={pegawai.nama_pegawai || "Foto pegawai"}
												className="h-full w-full object-cover"
												onError={(event) => {
													event.currentTarget.onerror = null;
													event.currentTarget.src = "/user-default.svg";
												}}
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center">
												<LuCircleUser className="h-28 w-28 text-slate-300" />
											</div>
										)}
									</div>
								</div>

								<div className="mt-5 text-center">
									<p className="text-2xl font-bold text-slate-900">{getDisplayState(pegawai.nama_pegawai).value}</p>
									<p className={`mt-2 text-sm ${getDisplayState(pegawai.jabatan).isEmpty ? "italic text-slate-400" : "font-medium text-slate-600"}`}>
										{getDisplayState(pegawai.jabatan).value}
									</p>
									<p className={`mt-1 text-sm ${bidangBadge.isEmpty ? "italic text-slate-400" : "text-slate-500"}`}>
										{bidangBadge.value}
									</p>
								</div>

								<div className="mt-6 grid gap-3">
									<div className="rounded-2xl bg-slate-50 px-4 py-3">
										<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">NIP</p>
										<p className={`mt-2 text-sm ${getDisplayState(pegawai.nip).isEmpty ? "italic text-slate-400" : "font-semibold text-slate-800"}`}>
											{getDisplayState(pegawai.nip).value}
										</p>
									</div>
									<div className="rounded-2xl bg-slate-50 px-4 py-3">
										<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Jumlah Akun Terhubung</p>
										<p className="mt-2 text-sm font-semibold text-slate-800">{linkedUsers.length || 0}</p>
									</div>
									<div className="rounded-2xl bg-slate-50 px-4 py-3">
										<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Terakhir Diperbarui</p>
										<p className={`mt-2 text-sm ${getDisplayState(formatDateTime(pegawai.updated_at)).isEmpty ? "italic text-slate-400" : "font-semibold text-slate-800"}`}>
											{getDisplayState(formatDateTime(pegawai.updated_at)).value}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-6 xl:col-span-8">
						<SectionCard title="Identitas Pegawai" subtitle="Seluruh data dasar pegawai yang tersimpan di sistem.">
							<div className="grid gap-4 md:grid-cols-2">
								{identitasFields.map((field) => (
									<DetailField key={field.label} icon={field.icon} label={field.label} value={field.value} />
								))}
							</div>
						</SectionCard>

						<SectionCard title="Informasi Kepegawaian" subtitle="Data jabatan, bidang, dan status kepegawaian.">
							<div className="grid gap-4 md:grid-cols-2">
								{kepegawaianFields.map((field) => (
									<DetailField key={field.label} icon={field.icon} label={field.label} value={field.value} />
								))}
							</div>
						</SectionCard>

						<SectionCard title="Kontak dan Metadata" subtitle="Kontak pegawai dan informasi pencatatan data.">
							<div className="grid gap-4 md:grid-cols-2">
								{kontakFields.map((field) => (
									<DetailField key={field.label} icon={field.icon} label={field.label} value={field.value} />
								))}
							</div>
						</SectionCard>

						<SectionCard title="Akun Terhubung" subtitle="Informasi akun pengguna yang terhubung ke data pegawai ini.">
							{linkedUsers.length > 0 ? (
								<div className="space-y-4">
									{linkedUsers.map((user) => (
										<LinkedUserCard key={user.id} user={user} />
									))}
								</div>
							) : (
								<div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm italic text-slate-400">
									Kosong
								</div>
							)}
						</SectionCard>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PegawaiDetailPage;