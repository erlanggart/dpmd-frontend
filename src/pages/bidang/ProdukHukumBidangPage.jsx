// src/pages/bidang/ProdukHukumBidangPage.jsx
//
// Produk hukum tingkat KABUPATEN milik satu bidang: Perda, Perbup, SK Bupati,
// SK Kadis, Surat Edaran. Berbeda dari "Produk Hukum Desa" di Bidang Pemdes
// yang mengumpulkan Perdes/Perkades/SK Kades dari 416 desa.
//
// Satu berkas ini melayani kelima bidang; yang membedakan hanya `bidangId`,
// sama seperti DrivePage dan FormulirListPage. Menulis dikunci ke bidang
// sendiri — pemeriksaan sebenarnya ada di backend, yang di sini hanya
// menyembunyikan tombol yang memang akan ditolak.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Scale, Plus, Search, RefreshCw, FileText, CheckCircle2, XCircle,
	AlertCircle, Trash2, Pencil, ExternalLink, Upload, X, Loader2,
	ChevronLeft, ChevronRight, FileWarning,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import API_CONFIG from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { BIDANG } from '../../constants/bidang';

const STATUS_LABEL = { berlaku: 'Berlaku', diubah: 'Diubah', dicabut: 'Dicabut' };
const STATUS_KELAS = {
	berlaku: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
	diubah: 'bg-amber-50 text-amber-700 ring-amber-200',
	dicabut: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const hariIni = () => new Date().toISOString().split('T')[0];

const FORM_KOSONG = {
	jenis: 'Peraturan Bupati',
	judul: '',
	nomor: '',
	tahun: String(new Date().getFullYear()),
	tentang: '',
	tempat_penetapan: 'Cibinong',
	tanggal_penetapan: hariIni(),
	sumber: '',
	status_peraturan: 'berlaku',
	keterangan_status: '',
	url_sumber: '',
};

/** URL berkas: backend mengirim jalur relatif dari akar penyimpanan. */
const urlBerkas = (jalur) => {
	if (!jalur) return null;
	const asal = (API_CONFIG.STORAGE_URL || '').replace(/\/uploads\/?$/, '');
	return `${asal}${jalur}`;
};

/* ------------------------------------------------------------------ modal -- */

const ModalForm = ({ open, awal, jenisOpsi, onTutup, onSimpan }) => {
	const [form, setForm] = useState(FORM_KOSONG);
	const [berkas, setBerkas] = useState(null);
	const [menyimpan, setMenyimpan] = useState(false);

	useEffect(() => {
		if (!open) return;
		setBerkas(null);
		setForm(awal
			? {
				jenis: awal.jenis || 'Peraturan Bupati',
				judul: awal.judul || '',
				nomor: awal.nomor || '',
				tahun: String(awal.tahun || new Date().getFullYear()),
				tentang: awal.tentang || '',
				tempat_penetapan: awal.tempat_penetapan || 'Cibinong',
				tanggal_penetapan: awal.tanggal_penetapan
					? String(awal.tanggal_penetapan).split('T')[0]
					: hariIni(),
				sumber: awal.sumber || '',
				status_peraturan: awal.status_peraturan || 'berlaku',
				keterangan_status: awal.keterangan_status || '',
				url_sumber: awal.url_sumber || '',
			}
			: FORM_KOSONG);
	}, [open, awal]);

	if (!open) return null;

	const ubah = (kunci) => (e) => setForm((f) => ({ ...f, [kunci]: e.target.value }));

	const kirim = async (e) => {
		e.preventDefault();
		if (!form.judul.trim() || !form.nomor.trim()) {
			toast.error('Judul dan nomor wajib diisi');
			return;
		}
		setMenyimpan(true);
		try {
			await onSimpan(form, berkas);
		} finally {
			setMenyimpan(false);
		}
	};

	return (
		// z-[60]+: bilah navigasi bawah PegawaiLayout memakai z-50 dan akan
		// menelan klik pada modal yang berada di bawahnya.
		<div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
			<div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
				<div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
					<h2 className="text-base font-semibold text-slate-900">
						{awal ? 'Ubah Produk Hukum' : 'Tambah Produk Hukum'}
					</h2>
					<button
						type="button"
						onClick={onTutup}
						className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={kirim} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<label className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-slate-600">Jenis</span>
							<select
								value={form.jenis}
								onChange={ubah('jenis')}
								className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
							>
								{jenisOpsi.map((j) => (
									<option key={j.singkatan} value={j.jenis}>
										{j.jenis} ({j.singkatan})
									</option>
								))}
							</select>
						</label>

						<label className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-slate-600">Nomor</span>
							<input
								value={form.nomor}
								onChange={ubah('nomor')}
								placeholder="mis. 54"
								className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
							/>
						</label>
					</div>

					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-slate-600">Judul</span>
						<input
							value={form.judul}
							onChange={ubah('judul')}
							placeholder="mis. Peraturan Bupati Bogor Nomor 54 Tahun 2023"
							className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
						/>
					</label>

					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-slate-600">Tentang</span>
						<textarea
							value={form.tentang}
							onChange={ubah('tentang')}
							rows={2}
							placeholder="Ringkasan isi peraturan"
							className="resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
						/>
					</label>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<label className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-slate-600">Tahun</span>
							<input
								type="number"
								value={form.tahun}
								onChange={ubah('tahun')}
								className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
							/>
						</label>
						<label className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-slate-600">Tanggal penetapan</span>
							<input
								type="date"
								value={form.tanggal_penetapan}
								onChange={ubah('tanggal_penetapan')}
								className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
							/>
						</label>
						<label className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-slate-600">Tempat penetapan</span>
							<input
								value={form.tempat_penetapan}
								onChange={ubah('tempat_penetapan')}
								className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
							/>
						</label>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<label className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-slate-600">Status</span>
							<select
								value={form.status_peraturan}
								onChange={ubah('status_peraturan')}
								className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
							>
								<option value="berlaku">Berlaku</option>
								<option value="diubah">Diubah</option>
								<option value="dicabut">Dicabut</option>
							</select>
						</label>
						<label className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-slate-600">
								Keterangan status <span className="text-slate-400">(opsional)</span>
							</span>
							<input
								value={form.keterangan_status}
								onChange={ubah('keterangan_status')}
								placeholder="mis. diubah oleh Perbup 71/2023"
								className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
							/>
						</label>
					</div>

					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-slate-600">
							Tautan JDIH <span className="text-slate-400">(opsional)</span>
						</span>
						<input
							value={form.url_sumber}
							onChange={ubah('url_sumber')}
							placeholder="https://jdih.bogorkab.go.id/..."
							className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
						/>
					</label>

					<div className="rounded-lg border border-dashed border-slate-300 p-4">
						<label className="flex cursor-pointer items-center gap-3">
							<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
								<Upload className="h-4 w-4" />
							</span>
							<span className="min-w-0 flex-1">
								<span className="block text-sm font-medium text-slate-700">
									{berkas ? berkas.name : 'Pilih berkas PDF'}
								</span>
								<span className="block text-xs text-slate-500">
									{awal?.file
										? 'Kosongkan bila tidak ingin mengganti berkas yang sudah ada'
										: 'PDF, maksimal 10 MB. Boleh dikosongkan dan diunggah nanti.'}
								</span>
							</span>
							<input
								type="file"
								accept="application/pdf"
								className="hidden"
								onChange={(e) => setBerkas(e.target.files?.[0] || null)}
							/>
						</label>
					</div>
				</form>

				<div className="flex gap-3 border-t border-slate-200 px-5 py-4">
					<button
						type="button"
						onClick={onTutup}
						className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
					>
						Batal
					</button>
					<button
						type="button"
						onClick={kirim}
						disabled={menyimpan}
						className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
					>
						{menyimpan && <Loader2 className="h-4 w-4 animate-spin" />}
						{awal ? 'Simpan Perubahan' : 'Simpan'}
					</button>
				</div>
			</div>
		</div>
	);
};

/* ------------------------------------------------------------------ utama -- */

const ProdukHukumBidangPage = ({ bidangId }) => {
	const { user } = useAuth();
	const bidang = useMemo(() => BIDANG.find((b) => b.id === Number(bidangId)), [bidangId]);

	const bolehTulis = useMemo(() => {
		if (!user) return false;
		if (user.role === 'superadmin') return true;
		return Number(user.bidang_id) === Number(bidangId);
	}, [user, bidangId]);

	const [data, setData] = useState([]);
	const [stats, setStats] = useState(null);
	const [jenisOpsi, setJenisOpsi] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [galat, setGalat] = useState(null);

	const [cari, setCari] = useState('');
	const [filter, setFilter] = useState({ singkatan_jenis: '', tahun: '', status_peraturan: '' });
	const [halaman, setHalaman] = useState(1);
	const [totalHalaman, setTotalHalaman] = useState(1);
	const [totalBaris, setTotalBaris] = useState(0);

	const [modalBuka, setModalBuka] = useState(false);
	const [sedangDiubah, setSedangDiubah] = useState(null);

	const ambil = useCallback(async () => {
		setMemuat(true);
		try {
			const params = new URLSearchParams({ bidang_id: String(bidangId), page: String(halaman), limit: '20' });
			if (cari) params.append('search', cari);
			if (filter.singkatan_jenis) params.append('singkatan_jenis', filter.singkatan_jenis);
			if (filter.tahun) params.append('tahun', filter.tahun);
			if (filter.status_peraturan) params.append('status_peraturan', filter.status_peraturan);

			const [daftar, ringkas] = await Promise.all([
				api.get(`/produk-hukum-bidang?${params.toString()}`),
				api.get(`/produk-hukum-bidang/stats?bidang_id=${bidangId}`),
			]);

			setData(daftar.data?.data || []);
			setTotalHalaman(daftar.data?.pagination?.totalPages || 1);
			setTotalBaris(daftar.data?.pagination?.totalItems || 0);
			setStats(ringkas.data?.data || null);
			setGalat(null);
		} catch (e) {
			console.error(e);
			setGalat(e.response?.data?.message || 'Gagal memuat produk hukum bidang');
		} finally {
			setMemuat(false);
		}
	}, [bidangId, halaman, cari, filter]);

	useEffect(() => { ambil(); }, [ambil]);

	useEffect(() => {
		api.get('/produk-hukum-bidang/opsi')
			.then((r) => setJenisOpsi(r.data?.data?.jenis || []))
			.catch(() => setJenisOpsi([]));
	}, []);

	// Pencarian menunggu ketikan berhenti; tanpa jeda ini tiap huruf memicu dua
	// permintaan (daftar + statistik).
	const [cariKetik, setCariKetik] = useState('');
	useEffect(() => {
		const t = setTimeout(() => { setCari(cariKetik); setHalaman(1); }, 400);
		return () => clearTimeout(t);
	}, [cariKetik]);

	const simpan = async (form, berkas) => {
		const fd = new FormData();
		Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
		if (berkas) fd.append('file', berkas);

		// Instance axios memasang Content-Type: application/json sebagai bawaan,
		// dan axios tidak menimpanya sendiri untuk FormData — tanpa header ini
		// multer di backend tidak menemukan batas multipart dan berkasnya hilang.
		const opsi = { headers: { 'Content-Type': 'multipart/form-data' } };

		try {
			if (sedangDiubah) {
				await api.put(`/produk-hukum-bidang/${sedangDiubah.id}`, fd, opsi);
				toast.success('Produk hukum diperbarui');
			} else {
				await api.post('/produk-hukum-bidang', fd, opsi);
				toast.success('Produk hukum ditambahkan');
			}
			setModalBuka(false);
			setSedangDiubah(null);
			ambil();
		} catch (e) {
			toast.error(e.response?.data?.message || 'Gagal menyimpan produk hukum');
		}
	};

	const hapus = async (baris) => {
		if (!window.confirm(`Hapus "${baris.judul}"? Berkasnya ikut terhapus.`)) return;
		try {
			await api.delete(`/produk-hukum-bidang/${baris.id}`);
			toast.success('Produk hukum dihapus');
			ambil();
		} catch (e) {
			toast.error(e.response?.data?.message || 'Gagal menghapus produk hukum');
		}
	};

	const ubin = [
		{ label: 'Total dokumen', nilai: stats?.total ?? 0, icon: FileText },
		{
			label: 'Berlaku',
			nilai: stats?.perStatus?.find((s) => s.name === 'berlaku')?.value ?? 0,
			icon: CheckCircle2,
		},
		{
			label: 'Dicabut / diubah',
			nilai: (stats?.perStatus || [])
				.filter((s) => s.name !== 'berlaku')
				.reduce((t, s) => t + s.value, 0),
			icon: XCircle,
		},
		{ label: 'Belum ada berkas', nilai: stats?.tanpaBerkas ?? 0, icon: FileWarning },
	];

	return (
		<div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
			<div className="mx-auto max-w-7xl">
				<div className="mb-6 rounded-xl bg-slate-900 p-6 text-white">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<Scale className="h-7 w-7" />
							<div>
								<h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
									Produk Hukum Kabupaten
								</h1>
								<p className="mt-0.5 text-sm text-white/80">
									{bidang?.label || 'Bidang DPMD'} · Perda, Perbup, SK, dan Surat Edaran
								</p>
							</div>
						</div>
						{bolehTulis && (
							<button
								type="button"
								onClick={() => { setSedangDiubah(null); setModalBuka(true); }}
								className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
							>
								<Plus className="h-4 w-4" />
								Tambah Produk Hukum
							</button>
						)}
					</div>
				</div>

				<div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
					{ubin.map(({ label, nilai, icon: Icon }) => (
						<div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
							<div className="flex items-start justify-between gap-2">
								<p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
									{label}
								</p>
								<Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
							</div>
							<p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{nilai}</p>
						</div>
					))}
				</div>

				<div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
					<div className="flex flex-wrap items-center gap-3">
						<div className="relative min-w-0 flex-1">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								value={cariKetik}
								onChange={(e) => setCariKetik(e.target.value)}
								placeholder="Cari judul, nomor, atau isi peraturan…"
								className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
							/>
						</div>

						<select
							value={filter.singkatan_jenis}
							onChange={(e) => { setFilter((f) => ({ ...f, singkatan_jenis: e.target.value })); setHalaman(1); }}
							className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
						>
							<option value="">Semua jenis</option>
							{jenisOpsi.map((j) => (
								<option key={j.singkatan} value={j.singkatan}>{j.singkatan}</option>
							))}
						</select>

						<select
							value={filter.status_peraturan}
							onChange={(e) => { setFilter((f) => ({ ...f, status_peraturan: e.target.value })); setHalaman(1); }}
							className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
						>
							<option value="">Semua status</option>
							<option value="berlaku">Berlaku</option>
							<option value="diubah">Diubah</option>
							<option value="dicabut">Dicabut</option>
						</select>

						<input
							type="number"
							value={filter.tahun}
							onChange={(e) => { setFilter((f) => ({ ...f, tahun: e.target.value })); setHalaman(1); }}
							placeholder="Tahun"
							className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
						/>

						<button
							type="button"
							onClick={ambil}
							className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
						>
							<RefreshCw className={`h-4 w-4 ${memuat ? 'animate-spin' : ''}`} />
							Muat ulang
						</button>
					</div>
				</div>

				{galat && (
					<div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
						<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
						<p className="text-sm text-rose-800">{galat}</p>
					</div>
				)}

				<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
					{memuat && data.length === 0 ? (
						<div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
							<Loader2 className="h-4 w-4 animate-spin" />
							Memuat produk hukum…
						</div>
					) : data.length === 0 ? (
						<div className="px-6 py-16 text-center">
							<p className="text-sm text-slate-500">
								Belum ada produk hukum di bidang ini.
							</p>
							{bolehTulis && (
								<button
									type="button"
									onClick={() => { setSedangDiubah(null); setModalBuka(true); }}
									className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
								>
									Tambah yang pertama
								</button>
							)}
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full min-w-[52rem]">
								<thead>
									<tr className="border-b border-slate-200 bg-slate-50 text-left">
										<th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dokumen</th>
										<th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Jenis</th>
										<th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tahun</th>
										<th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
										<th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Berkas</th>
										<th className="px-4 py-3" />
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{data.map((baris) => (
										<tr key={baris.id} className="transition-colors hover:bg-slate-50">
											<td className="px-4 py-3">
												<p className="text-sm font-medium text-slate-900">{baris.judul}</p>
												<p className="mt-0.5 text-xs text-slate-500">
													Nomor {baris.nomor}
													{baris.tentang ? ` · ${baris.tentang}` : ''}
												</p>
											</td>
											<td className="px-4 py-3">
												<span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
													{baris.singkatan_jenis}
												</span>
											</td>
											<td className="px-4 py-3 text-sm tabular-nums text-slate-700">{baris.tahun}</td>
											<td className="px-4 py-3">
												<span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ring-1 ${STATUS_KELAS[baris.status_peraturan] || ''}`}>
													{STATUS_LABEL[baris.status_peraturan] || baris.status_peraturan}
												</span>
											</td>
											<td className="px-4 py-3">
												{baris.file_url ? (
													<a
														href={urlBerkas(baris.file_url)}
														target="_blank"
														rel="noreferrer"
														className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
													>
														<FileText className="h-3.5 w-3.5" />
														Buka PDF
													</a>
												) : baris.url_sumber ? (
													<a
														href={baris.url_sumber}
														target="_blank"
														rel="noreferrer"
														className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
													>
														<ExternalLink className="h-3.5 w-3.5" />
														JDIH
													</a>
												) : (
													<span className="text-xs text-slate-400">—</span>
												)}
											</td>
											<td className="px-4 py-3">
												{bolehTulis && (
													<div className="flex items-center justify-end gap-1">
														<button
															type="button"
															onClick={() => { setSedangDiubah(baris); setModalBuka(true); }}
															aria-label={`Ubah ${baris.judul}`}
															className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
														>
															<Pencil className="h-4 w-4" />
														</button>
														<button
															type="button"
															onClick={() => hapus(baris)}
															aria-label={`Hapus ${baris.judul}`}
															className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
														>
															<Trash2 className="h-4 w-4" />
														</button>
													</div>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{totalHalaman > 1 && (
						<div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
							<p className="text-xs text-slate-500">
								Halaman {halaman} dari {totalHalaman} · {totalBaris} dokumen
							</p>
							<div className="flex gap-2">
								<button
									type="button"
									disabled={halaman <= 1}
									onClick={() => setHalaman((h) => h - 1)}
									className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
								>
									<ChevronLeft className="h-4 w-4" />
								</button>
								<button
									type="button"
									disabled={halaman >= totalHalaman}
									onClick={() => setHalaman((h) => h + 1)}
									className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
								>
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			<ModalForm
				open={modalBuka}
				awal={sedangDiubah}
				jenisOpsi={jenisOpsi}
				onTutup={() => { setModalBuka(false); setSedangDiubah(null); }}
				onSimpan={simpan}
			/>
		</div>
	);
};

export default ProdukHukumBidangPage;
