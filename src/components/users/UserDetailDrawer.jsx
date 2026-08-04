// src/components/users/UserDetailDrawer.jsx
// Panel rincian satu pengguna: seluruh atribut dan SELURUH tindakan.
//
// Sebelumnya tiap kartu pengguna memuat dua salinan tindakan yang sama — menu
// tiga titik dan deret tombol di kaki kartu — masing-masing berwarna sendiri.
// Di sini tindakan hanya ada di satu tempat, dikelompokkan menurut akibatnya:
// ubah data, akses, lalu tindakan yang tak bisa dibatalkan.
import React from 'react';
import {
	LuX,
	LuMail,
	LuHash,
	LuBriefcase,
	LuPhone,
	LuBuilding2,
	LuHouse,
	LuMapPin,
	LuCake,
	LuLock,
	LuEye,
	LuEyeOff,
	LuShield,
	LuCamera,
	LuPenLine,
	LuShieldCheck,
	LuSmartphone,
	LuLogIn,
	LuKey,
	LuTrash2,
	LuTriangleAlert,
} from 'react-icons/lu';
import { getAvatarUrl } from '../../utils/avatarUtils';
import { ROLE_DOT } from '../../constants/userRoles';

const STATUS_DEVICE = ['PPPK_Paruh_Waktu', 'Tenaga_Alih_Daya', 'Tenaga_Keamanan', 'Tenaga_Kebersihan'];

const Baris = ({ icon: Icon, label, children }) => (
	<div className="flex gap-3 py-2.5">
		<Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
		<div className="min-w-0 flex-1">
			<p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
			<div className="mt-0.5 break-words text-sm text-slate-800">{children}</div>
		</div>
	</div>
);

const Tindakan = ({ icon: Icon, label, onClick, nada = 'netral' }) => {
	const gaya =
		nada === 'bahaya'
			? 'border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
			: nada === 'utama'
			? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
			: 'border-slate-200 text-slate-700 hover:bg-slate-50';
	return (
		<button
			onClick={onClick}
			className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${gaya}`}
		>
			<Icon className="h-4 w-4 shrink-0" />
			<span className="truncate">{label}</span>
		</button>
	);
};

const UserDetailDrawer = ({
	user,
	onClose,
	canManage,
	isSuperadmin,
	canImpersonate,
	passwordTerlihat,
	onTogglePassword,
	roleInfo,
	aksi,
}) => {
	if (!user) return null;

	const avatarUrl = getAvatarUrl(user.avatar);
	const warnaPeran = ROLE_DOT[user.role] || '#898781';
	const tanggalLahir = [
		user.tempat_lahir,
		user.tanggal_lahir
			? new Date(user.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
			: null,
	]
		.filter(Boolean)
		.join(', ');

	return (
		<>
			<div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
			<aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
				{/* Kepala */}
				<div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-5">
					<div className="flex min-w-0 items-center gap-3">
						<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
							{avatarUrl ? (
								<img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
							) : (
								<div className="flex h-full w-full items-center justify-center bg-slate-900 text-lg font-bold text-white">
									{user.name?.charAt(0)?.toUpperCase() || 'U'}
								</div>
							)}
						</div>
						<div className="min-w-0">
							<h2 className="truncate text-base font-bold text-slate-900">{user.name}</h2>
							<span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
								<span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: warnaPeran }} />
								{roleInfo.label}
							</span>
						</div>
					</div>
					<button
						onClick={onClose}
						aria-label="Tutup"
						className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
					>
						<LuX className="h-4 w-4" />
					</button>
				</div>

				{/* Isi */}
				<div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
					{user.profile_incomplete && (
						<div className="mb-3 flex items-start gap-2.5 rounded-xl bg-amber-50 p-3">
							<LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
							<p className="text-xs leading-relaxed text-amber-800">
								Identitas belum dilengkapi — DPMD belum punya jabatan dan nomor kontak petugas ini.
							</p>
						</div>
					)}

					<div className="divide-y divide-slate-100">
						<Baris icon={LuMail} label="Email">
							{user.email}
						</Baris>
						{user.nip && (
							<Baris icon={LuHash} label="NIP">
								<span className="font-mono">{user.nip}</span>
							</Baris>
						)}
						{(user.jabatan || user.jabatan_desa) && (
							<Baris icon={LuBriefcase} label="Jabatan">
								{user.jabatan || user.jabatan_desa}
							</Baris>
						)}
						{user.status_kepegawaian && (
							<Baris icon={LuBriefcase} label="Status Kepegawaian">
								{user.status_kepegawaian.replace(/_/g, ' ')}
							</Baris>
						)}
						{user.no_hp && (
							<Baris icon={LuPhone} label="Nomor HP">
								<a
									href={`https://wa.me/62${user.no_hp.replace(/^0/, '')}`}
									target="_blank"
									rel="noreferrer"
									className="font-mono text-emerald-700 hover:underline"
								>
									{user.no_hp}
								</a>
							</Baris>
						)}
						{user.bidang && (
							<Baris icon={LuBuilding2} label="Bidang">
								{user.bidang.nama}
								{user.sub_bidang ? ` · ${user.sub_bidang}` : ''}
							</Baris>
						)}
						{user.desa && (
							<Baris icon={LuHouse} label="Desa">
								{user.desa.nama}
								{user.desa.kecamatan?.nama ? ` · Kec. ${user.desa.kecamatan.nama}` : ''}
							</Baris>
						)}
						{user.kecamatan && !user.desa && (
							<Baris icon={LuMapPin} label="Kecamatan">
								{user.kecamatan.nama}
							</Baris>
						)}
						{user.dinas && (
							<Baris icon={LuBuilding2} label="Dinas">
								{user.dinas.nama_dinas}
							</Baris>
						)}
						{tanggalLahir && (
							<Baris icon={LuCake} label="Tempat & Tanggal Lahir">
								{tanggalLahir}
							</Baris>
						)}
						{/* Kata sandi hanya untuk superadmin, dan tidak pernah untuk sesama superadmin. */}
						{isSuperadmin && user.role !== 'superadmin' && (
							<Baris icon={LuLock} label="Kata Sandi">
								{user.plain_password ? (
									<span className="flex items-center gap-2">
										<span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs">
											{passwordTerlihat ? user.plain_password : '••••••••'}
										</span>
										<button
											onClick={onTogglePassword}
											className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
											aria-label={passwordTerlihat ? 'Sembunyikan' : 'Tampilkan'}
										>
											{passwordTerlihat ? <LuEyeOff className="h-3.5 w-3.5" /> : <LuEye className="h-3.5 w-3.5" />}
										</button>
									</span>
								) : (
									<span className="text-slate-400">Tidak tersedia</span>
								)}
							</Baris>
						)}
					</div>
				</div>

				{/* Tindakan */}
				{canManage && (
					<div className="shrink-0 border-t border-slate-100 bg-slate-50/70 p-4">
						<p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Ubah Data</p>
						<div className="grid grid-cols-2 gap-2">
							<Tindakan icon={LuShield} label="Peran" onClick={() => aksi.role(user)} />
							<Tindakan icon={LuBuilding2} label="Bidang" onClick={() => aksi.bidang(user)} />
							<Tindakan icon={LuCamera} label="Foto" onClick={() => aksi.avatar(user)} />
							<Tindakan icon={LuCake} label="Tgl Lahir" onClick={() => aksi.tanggalLahir(user)} />
							<Tindakan icon={LuPenLine} label="Jabatan" onClick={() => aksi.jabatan(user)} />
							{user.role === 'desa' && (
								<Tindakan icon={LuShieldCheck} label="Hak Akses" onClick={() => aksi.desaPermissions(user)} />
							)}
							{STATUS_DEVICE.includes(user.status_kepegawaian) && (
								<Tindakan icon={LuSmartphone} label="Device Absensi" onClick={() => aksi.device(user)} />
							)}
						</div>

						<p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Akses & Keamanan</p>
						<div className="grid grid-cols-2 gap-2">
							{canImpersonate && (
								<Tindakan icon={LuLogIn} label="Masuk Sebagai" nada="utama" onClick={() => aksi.impersonate(user)} />
							)}
							<Tindakan icon={LuKey} label="Reset Sandi" onClick={() => aksi.resetPassword(user)} />
							<Tindakan icon={LuTrash2} label="Hapus Akun" nada="bahaya" onClick={() => aksi.hapus(user)} />
						</div>
					</div>
				)}
			</aside>
		</>
	);
};

export default UserDetailDrawer;
