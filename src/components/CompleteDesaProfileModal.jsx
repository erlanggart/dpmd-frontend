import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { IdCard, User, Briefcase, Phone, Loader2, LogOut, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';

// Didefinisikan di luar komponen: kalau dideklarasikan di dalam render, React
// menganggapnya tipe komponen baru setiap render lalu me-remount input-nya,
// sehingga fokus hilang tiap satu ketikan.
const Field = ({ icon: Icon, label, value, onChange, placeholder, type = 'text', hint, error, autoFocus }) => (
	<div>
		<label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
		<div className="relative">
			<Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
			<input
				type={type}
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				autoFocus={autoFocus}
				className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 ${
					error
						? 'border-red-400 focus:border-red-500 focus:ring-red-500'
						: 'border-gray-300 focus:border-slate-800 focus:ring-slate-800'
				}`}
				required
			/>
		</div>
		{error ? (
			<p className="mt-1 text-xs text-red-600">{error}</p>
		) : hint ? (
			<p className="mt-1 text-xs text-gray-500">{hint}</p>
		) : null}
	</div>
);

// Nama bawaan sistem, mis. "Admin Desa Mekarsari" — dipakai untuk mendeteksi sesi
// lama yang datanya belum pernah dicek server. Sama dengan pola di backend.
const PLACEHOLDER_NAME = /^admin\s+desa\b/i;

/**
 * Popup WAJIB lengkapi identitas Admin Desa.
 *
 * DPMD perlu tahu siapa orang di balik akun dan nomor yang bisa dihubungi, bukan
 * sekadar nama bawaan sistem "Admin Desa <nama desa>". Tidak bisa ditutup; selama
 * belum diisi, backend juga menolak semua perubahan di /api/desa-admin.
 */
const CompleteDesaProfileModal = () => {
	const { user, updateUser, logout } = useAuth();
	const [form, setForm] = useState({ name: '', jabatan_desa: '', no_hp: '' });
	const [errors, setErrors] = useState({});
	const [submitting, setSubmitting] = useState(false);
	const [generalError, setGeneralError] = useState(null);
	const verifiedRef = useRef(false);

	// Sesi di aplikasi ini tidak pernah kedaluwarsa, jadi Admin Desa yang sudah
	// login sebelum fitur ini ada memegang data user lama yang belum punya
	// `must_complete_profile` — popup tidak akan pernah muncul kalau hanya
	// mengandalkan data login. Karena itu status dikonfirmasi ulang ke server
	// sekali tiap aplikasi dibuka, bukan cuma saat login.
	useEffect(() => {
		if (!user || verifiedRef.current) return;
		if (String(user.role || '').toLowerCase() !== 'admin_desa') return;

		const belumPernahDicek = typeof user.must_complete_profile !== 'boolean';
		const namanyaMasihBawaan = PLACEHOLDER_NAME.test(String(user.name || ''));
		if (!belumPernahDicek && !namanyaMasihBawaan) return;

		verifiedRef.current = true;
		api
			.get('/auth/profile')
			.then((res) => {
				const data = res.data?.data;
				if (!data) return;
				// Response bisa berasal dari cache milik akun sebelumnya di perangkat
				// yang sama; kalau pemiliknya bukan user aktif, jangan dipakai — nama
				// dan flag ganti-sandi akun lain akan menempel di sesi ini.
				if (String(data.id) !== String(user.id)) {
					console.warn('[Profil Desa] Profil bukan milik user aktif, diabaikan');
					return;
				}
				updateUser({
					name: data.name,
					jabatan_desa: data.jabatan_desa,
					no_hp: data.no_hp,
					must_complete_profile: Boolean(data.must_complete_profile),
					must_change_password: Boolean(data.must_change_password),
				});
			})
			// Offline/koneksi putus: diamkan dan jangan retry di sesi ini (ref sengaja
			// dibiarkan true) supaya tidak jadi loop request; dicek lagi saat aplikasi dibuka berikutnya.
			.catch(() => {});
	}, [user, updateUser]);

	// Kalau password masih bawaan, dahulukan popup ganti password (z-index-nya sama,
	// popup ini akan menutupinya) supaya urutannya: amankan akun dulu, baru identitas.
	const open = Boolean(user && user.must_complete_profile && !user.must_change_password);

	// Prefill: nama bawaan sistem sengaja dikosongkan supaya tidak asal disimpan lagi.
	useEffect(() => {
		if (!open) return;
		setForm({
			name: /^admin\s+desa\b/i.test(String(user?.name || '')) ? '' : String(user?.name || ''),
			jabatan_desa: user?.jabatan_desa || '',
			no_hp: user?.no_hp || '',
		});
	}, [open, user?.name, user?.jabatan_desa, user?.no_hp]);

	const setField = (field) => (e) => {
		setForm((prev) => ({ ...prev, [field]: e.target.value }));
		setErrors((prev) => ({ ...prev, [field]: null }));
		setGeneralError(null);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setSubmitting(true);
		setErrors({});
		setGeneralError(null);

		try {
			const res = await api.put('/auth/desa-profile', form);
			if (res.data?.success) {
				const data = res.data.data;
				updateUser({
					name: data.name,
					jabatan_desa: data.jabatan_desa,
					no_hp: data.no_hp,
					must_complete_profile: false,
				});
				toast.success('Identitas tersimpan. Selamat beraktivitas!', { icon: '✅', duration: 4000 });
			} else {
				setGeneralError(res.data?.message || 'Gagal menyimpan identitas.');
			}
		} catch (err) {
			const data = err.response?.data;
			if (data?.errors) setErrors(data.errors);
			setGeneralError(data?.message || 'Gagal menyimpan identitas. Coba lagi.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<AnimatePresence>
			{open && (
				<Motion.div
					className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<Motion.div
						initial={{ opacity: 0, scale: 0.92, y: 30 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.96, y: 20 }}
						transition={{ type: 'spring', damping: 22, stiffness: 280 }}
						className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
					>
						<div className="flex flex-col items-center gap-2 bg-gradient-to-br from-slate-700 to-slate-900 px-6 pb-5 pt-6 text-center text-white">
							<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
								<IdCard className="h-7 w-7" />
							</div>
							<h2 className="text-lg font-bold">Lengkapi Identitas Admin Desa</h2>
							{user?.desa?.nama && (
								<span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
									{user.desa.status_pemerintahan === 'kelurahan' ? 'Kelurahan' : 'Desa'}{' '}
									{user.desa.nama}
									{user.desa.kecamatan?.nama ? ` — Kec. ${user.desa.kecamatan.nama}` : ''}
								</span>
							)}
							<p className="text-sm text-white/90">
								DPMD perlu tahu siapa petugas yang memegang akun ini dan nomor yang bisa
								dihubungi. Lengkapi dulu untuk melanjutkan.
							</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
							<Field
								icon={User}
								label="Nama Lengkap Petugas"
								value={form.name}
								onChange={setField('name')}
								error={errors.name}
								placeholder="Contoh: Rahmat Ramadan"
								hint="Nama asli petugas, bukan nama desa. Nama desa tetap menempel di akun ini."
								autoFocus
							/>
							<Field
								icon={Briefcase}
								label="Jabatan"
								value={form.jabatan_desa}
								onChange={setField('jabatan_desa')}
								error={errors.jabatan_desa}
								placeholder="Contoh: Sekretaris Desa"
							/>
							<Field
								icon={Phone}
								label="Nomor HP Aktif"
								type="tel"
								value={form.no_hp}
								onChange={setField('no_hp')}
								error={errors.no_hp}
								placeholder="Contoh: 081234567890"
								hint="Nomor yang bisa dihubungi DPMD saat ada urusan mendesak."
							/>

							{generalError && (
								<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{generalError}</p>
							)}

							<button
								type="submit"
								disabled={submitting}
								className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{submitting ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : (
									<>
										<CheckCircle2 className="h-5 w-5" /> Simpan & Lanjutkan
									</>
								)}
							</button>

							<button
								type="button"
								onClick={logout}
								className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
							>
								<LogOut className="h-4 w-4" /> Keluar
							</button>
						</form>
					</Motion.div>
				</Motion.div>
			)}
		</AnimatePresence>
	);
};

export default CompleteDesaProfileModal;
