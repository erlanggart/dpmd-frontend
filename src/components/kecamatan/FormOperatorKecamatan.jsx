// src/components/kecamatan/FormOperatorKecamatan.jsx
//
// Formulir akun operator kecamatan. Dipakai tiga tempat yang sama-sama
// membuat operator kecamatan:
//   - halaman Akun Operator milik akun utama kecamatan (tambah & ubah),
//   - popup wajib saat kecamatan belum punya operator sama sekali,
//   - tab Akun Kecamatan di halaman bidang (fitur dikunci ke fitur bidang).

import React, { useState } from "react";
import { Check, Eye, EyeOff, Lock, RefreshCw } from "lucide-react";
import { KECAMATAN_BAGIAN_SARAN, KECAMATAN_PERMISSIONS } from "../../constants/kecamatanPermissions";

/** Sandi acak yang mudah dibacakan lewat telepon — tanpa karakter yang mirip (0/O, 1/l). */
const buatSandiOperator = () => {
	const huruf = "abcdefghjkmnpqrstuvwxyz";
	const angka = "23456789";
	let hasil = "";
	for (let i = 0; i < 4; i += 1) hasil += huruf[Math.floor(Math.random() * huruf.length)];
	for (let i = 0; i < 4; i += 1) hasil += angka[Math.floor(Math.random() * angka.length)];
	return hasil;
};

const KELAS_INPUT =
	"w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-shadow placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5";

const Bidang = ({ label, wajib, petunjuk, children }) => (
	<label className="block">
		<span className="mb-1.5 block text-[12.5px] font-semibold text-slate-700">
			{label}
			{wajib && <span className="text-rose-500"> *</span>}
		</span>
		{children}
		{petunjuk && <span className="mt-1 block text-[11.5px] text-slate-500">{petunjuk}</span>}
	</label>
);

/**
 * @param {object}   props.nilaiAwal       isian awal (mode ubah)
 * @param {boolean}  props.modeUbah        sandi jadi opsional, status aktif tampil
 * @param {string[]} props.fiturTerkunci   bila diisi, fitur tidak bisa dipilih (dipaksa server)
 * @param {Function} props.onSimpan        async (payload) => void
 */
const FormOperatorKecamatan = ({
	nilaiAwal = null,
	modeUbah = false,
	fiturTerkunci = null,
	onSimpan,
	onBatal,
	labelSimpan,
	menyimpan = false,
}) => {
	const [form, setForm] = useState(() => ({
		name: nilaiAwal?.name || "",
		email: nilaiAwal?.email || "",
		password: modeUbah ? "" : buatSandiOperator(),
		jabatan: nilaiAwal?.jabatan || "",
		no_hp: nilaiAwal?.no_hp || "",
		is_active: nilaiAwal ? nilaiAwal.is_active !== false : true,
		permissions: nilaiAwal?.permissions || KECAMATAN_PERMISSIONS.map((p) => p.key),
	}));
	const [tampilSandi, setTampilSandi] = useState(!modeUbah);

	const ubah = (kunci, nilai) => setForm((f) => ({ ...f, [kunci]: nilai }));
	const alihFitur = (key) =>
		setForm((f) => ({
			...f,
			permissions: f.permissions.includes(key) ? f.permissions.filter((k) => k !== key) : [...f.permissions, key],
		}));

	const kirim = (e) => {
		e.preventDefault();
		const payload = {
			name: form.name.trim(),
			email: form.email.trim(),
			jabatan: form.jabatan.trim(),
			no_hp: form.no_hp.trim(),
		};
		if (form.password) payload.password = form.password;
		if (!fiturTerkunci) payload.permissions = form.permissions;
		if (modeUbah) payload.is_active = form.is_active;
		onSimpan(payload);
	};

	const labelFitur = (key) => KECAMATAN_PERMISSIONS.find((p) => p.key === key)?.label || key;

	return (
		<form onSubmit={kirim} className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-2">
				<Bidang label="Nama petugas" wajib>
					<input
						value={form.name}
						onChange={(e) => ubah("name", e.target.value)}
						placeholder="Contoh: Rahmat Ramadan"
						className={KELAS_INPUT}
						required
					/>
				</Bidang>
				<Bidang label="Bagian / seksi">
					<input
						value={form.jabatan}
						onChange={(e) => ubah("jabatan", e.target.value)}
						placeholder="Contoh: Seksi PMD"
						list="saran-bagian-kecamatan"
						className={KELAS_INPUT}
					/>
					<datalist id="saran-bagian-kecamatan">
						{KECAMATAN_BAGIAN_SARAN.map((s) => (
							<option key={s} value={s} />
						))}
					</datalist>
				</Bidang>
				<Bidang label="Email (untuk login)" wajib>
					<input
						type="email"
						value={form.email}
						onChange={(e) => ubah("email", e.target.value)}
						placeholder="nama@contoh.com"
						className={KELAS_INPUT}
						required
					/>
				</Bidang>
				<Bidang label="Nomor HP">
					<input
						value={form.no_hp}
						onChange={(e) => ubah("no_hp", e.target.value)}
						placeholder="081234567890"
						inputMode="tel"
						className={KELAS_INPUT}
					/>
				</Bidang>
			</div>

			<Bidang
				label={modeUbah ? "Sandi baru" : "Sandi"}
				wajib={!modeUbah}
				petunjuk={
					modeUbah
						? "Kosongkan bila sandi tidak diganti."
						: "Sandi dibuat acak supaya mudah dibacakan. Catat dan serahkan ke petugasnya."
				}
			>
				<div className="flex gap-2">
					<div className="relative flex-1">
						<input
							type={tampilSandi ? "text" : "password"}
							value={form.password}
							onChange={(e) => ubah("password", e.target.value)}
							minLength={6}
							required={!modeUbah}
							className={`${KELAS_INPUT} pr-10 font-mono`}
						/>
						<button
							type="button"
							onClick={() => setTampilSandi((v) => !v)}
							aria-label={tampilSandi ? "Sembunyikan sandi" : "Tampilkan sandi"}
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
						>
							{tampilSandi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
						</button>
					</div>
					<button
						type="button"
						onClick={() => {
							ubah("password", buatSandiOperator());
							setTampilSandi(true);
						}}
						className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
					>
						<RefreshCw className="h-3.5 w-3.5" />
						Acak
					</button>
				</div>
			</Bidang>

			<div>
				<span className="mb-1.5 block text-[12.5px] font-semibold text-slate-700">
					Fitur yang boleh dibuka{!fiturTerkunci && <span className="text-rose-500"> *</span>}
				</span>
				{fiturTerkunci ? (
					<div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
						<Lock className="h-3.5 w-3.5 text-slate-400" />
						{fiturTerkunci.map((key) => (
							<span key={key} className="rounded-md bg-white px-2 py-0.5 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200">
								{labelFitur(key)}
							</span>
						))}
						<span className="text-[11.5px] text-slate-500">— sesuai fitur bidang Anda</span>
					</div>
				) : (
					<div className="grid gap-2 sm:grid-cols-2">
						{KECAMATAN_PERMISSIONS.map((p) => {
							const aktif = form.permissions.includes(p.key);
							return (
								<button
									type="button"
									key={p.key}
									onClick={() => alihFitur(p.key)}
									aria-pressed={aktif}
									className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
										aktif ? "border-slate-900 bg-slate-900/[0.03]" : "border-slate-200 bg-white hover:border-slate-300"
									}`}
								>
									<span
										className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
											aktif ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"
										}`}
									>
										{aktif && <Check className="h-3 w-3" strokeWidth={3} />}
									</span>
									<span className="min-w-0">
										<span className="block text-[13px] font-semibold text-slate-800">{p.label}</span>
										<span className="block text-[11.5px] leading-snug text-slate-500">{p.description}</span>
									</span>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{modeUbah && (
				<label className="flex items-center gap-2.5 text-[13px] text-slate-700">
					<input
						type="checkbox"
						checked={form.is_active}
						onChange={(e) => ubah("is_active", e.target.checked)}
						className="h-4 w-4 rounded border-slate-300"
					/>
					Akun aktif (bisa login)
				</label>
			)}

			<div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
				{onBatal && (
					<button
						type="button"
						onClick={onBatal}
						className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
					>
						Batal
					</button>
				)}
				<button
					type="submit"
					disabled={menyimpan || (!fiturTerkunci && form.permissions.length === 0)}
					className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
				>
					{menyimpan ? "Menyimpan…" : labelSimpan || (modeUbah ? "Simpan perubahan" : "Buat akun operator")}
				</button>
			</div>
		</form>
	);
};

export default FormOperatorKecamatan;
