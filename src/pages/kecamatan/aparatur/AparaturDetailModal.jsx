// Detail satu aparatur untuk akun kecamatan — hanya membaca.
//
// Tidak ada tombol ubah, hapus, atau verifikasi: menyunting tetap hak desa,
// verifikasi tetap hak Bidang Pemerintahan Desa. Berkas pribadi (KTP, KK, dst.)
// tidak dikirim server ke kecamatan; yang tampil hanya ada/tidaknya.
import React, { useEffect, useState } from 'react';
import {
	X, Loader2, AlertCircle, CheckCircle2, Circle, ShieldCheck, ShieldAlert, ShieldQuestion,
	Eye, MapPin, CalendarDays, GraduationCap, IdCard, FileText, Scale,
} from 'lucide-react';
import api from '../../../api';
import { fotoUrl, inisial, labelKelamin, tanggalPanjang, usiaDari } from './aparaturUtil';

const Baris = ({ label, nilai }) => {
	if (nilai === null || nilai === undefined || String(nilai).trim() === '') return null;
	return (
		<div className="py-2.5">
			<dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
			<dd className="mt-0.5 break-words text-sm text-slate-800">{nilai}</dd>
		</div>
	);
};

const Bagian = ({ icon: Icon, judul, children }) => (
	<section className="rounded-xl border border-slate-200 bg-white p-4">
		<h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
			<Icon className="h-3.5 w-3.5" />
			{judul}
		</h3>
		<dl className="mt-1 divide-y divide-slate-100">{children}</dl>
	</section>
);

const VERIFIKASI = {
	terverifikasi: { label: 'Terverifikasi DPMD', icon: ShieldCheck, kelas: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
	ditolak: { label: 'Ditolak DPMD', icon: ShieldAlert, kelas: 'bg-rose-50 text-rose-700 ring-rose-200' },
	belum: { label: 'Belum diverifikasi', icon: ShieldQuestion, kelas: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

const AparaturDetailModal = ({ id, onClose }) => {
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);

	useEffect(() => {
		let batal = false;
		setData(null);
		setGalat(null);
		api
			.get(`/kecamatan/aparatur-desa/${id}`)
			.then((res) => !batal && setData(res.data?.data || null))
			.catch((err) => !batal && setGalat(err.response?.data?.message || 'Gagal memuat detail aparatur'));
		return () => {
			batal = true;
		};
	}, [id]);

	useEffect(() => {
		const onKey = (e) => e.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);

	const v = VERIFIKASI[data?.status_verifikasi] || VERIFIKASI.belum;
	const usia = usiaDari(data?.tanggal_lahir);
	const foto = fotoUrl(data?.file_pas_foto);

	return (
		<div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
			<div
				className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-slate-50 shadow-2xl sm:rounded-2xl"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
			>
				{/* Kepala */}
				<div className="relative flex-shrink-0 bg-slate-950 px-5 pb-5 pt-5 sm:px-6">
					<div
						className="pointer-events-none absolute inset-0"
						style={{ background: 'radial-gradient(70% 120% at 100% 0%, rgba(185,28,28,0.22) 0%, transparent 62%)' }}
						aria-hidden="true"
					/>
					<button
						onClick={onClose}
						className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
						aria-label="Tutup"
					>
						<X className="h-5 w-5" />
					</button>

					{!data ? (
						<div className="relative flex items-center gap-4">
							<div className="h-16 w-16 animate-pulse rounded-2xl bg-white/10" />
							<div className="space-y-2">
								<div className="h-4 w-48 animate-pulse rounded bg-white/10" />
								<div className="h-3 w-32 animate-pulse rounded bg-white/10" />
							</div>
						</div>
					) : (
						<div className="relative flex items-center gap-4 pr-10">
							{foto ? (
								<img src={foto} alt="" className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover ring-2 ring-white/15" />
							) : (
								<span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-white ring-1 ring-white/15">
									{inisial(data.nama_lengkap)}
								</span>
							)}
							<div className="min-w-0">
								<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-400">
									{data.jenis === 'bpd' ? 'Badan Permusyawaratan Desa' : 'Perangkat Desa'}
								</p>
								<h2 className="mt-0.5 truncate text-lg font-semibold text-white">{data.nama_lengkap}</h2>
								<p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-400">
									<span>{data.jabatan}</span>
									{data.desa && (
										<span className="inline-flex items-center gap-1">
											<MapPin className="h-3.5 w-3.5" /> {data.desa.nama}
										</span>
									)}
								</p>
							</div>
						</div>
					)}

					{data && (
						<div className="relative mt-4 flex flex-wrap gap-2">
							<span
								className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
									data.status === 'Aktif'
										? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20'
										: 'bg-white/5 text-slate-300 ring-white/10'
								}`}
							>
								<span className={`h-1.5 w-1.5 rounded-full ${data.status === 'Aktif' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
								{data.status === 'Aktif' ? 'Aktif' : 'Tidak aktif'}
							</span>
							<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${v.kelas}`}>
								<v.icon className="h-3.5 w-3.5" /> {v.label}
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10">
								<Eye className="h-3.5 w-3.5" /> Lihat saja
							</span>
						</div>
					)}
				</div>

				{/* Isi */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5">
					{galat ? (
						<div className="flex flex-col items-center py-12 text-center">
							<AlertCircle className="h-6 w-6 text-rose-500" />
							<p className="mt-2 text-sm text-slate-600">{galat}</p>
						</div>
					) : !data ? (
						<div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
							<Loader2 className="h-4 w-4 animate-spin" /> Memuat detail…
						</div>
					) : (
						<div className="grid gap-4 md:grid-cols-2">
							<Bagian icon={IdCard} judul="Identitas">
								<Baris label="Jenis kelamin" nilai={labelKelamin(data.jenis_kelamin)} />
								<Baris
									label="Tempat, tanggal lahir"
									nilai={[data.tempat_lahir, tanggalPanjang(data.tanggal_lahir)].filter(Boolean).join(', ')}
								/>
								<Baris label="Usia" nilai={usia !== null ? `${usia} tahun` : null} />
								<Baris label="Agama" nilai={data.agama} />
							</Bagian>

							<Bagian icon={GraduationCap} judul="Kepegawaian">
								<Baris label="NIPD" nilai={data.nipd} />
								<Baris label="NIAP" nilai={data.niap} />
								<Baris label="Pendidikan terakhir" nilai={data.pendidikan_terakhir} />
								<Baris label="Pangkat / golongan" nilai={data.pangkat_golongan} />
							</Bagian>

							<Bagian icon={CalendarDays} judul="Pengangkatan & Pemberhentian">
								<Baris label="Tanggal pengangkatan" nilai={tanggalPanjang(data.tanggal_pengangkatan)} />
								<Baris label="Nomor SK pengangkatan" nilai={data.nomor_sk_pengangkatan} />
								<Baris label="Tanggal pemberhentian" nilai={tanggalPanjang(data.tanggal_pemberhentian)} />
								<Baris label="Nomor SK pemberhentian" nilai={data.nomor_sk_pemberhentian} />
								<Baris label="Keterangan" nilai={data.keterangan} />
							</Bagian>

							<Bagian icon={Scale} judul="Dasar hukum & verifikasi">
								<Baris
									label="SK di Produk Hukum Desa"
									nilai={
										data.produk_hukum
											? [data.produk_hukum.judul, data.produk_hukum.nomor && `No. ${data.produk_hukum.nomor}`, data.produk_hukum.tahun]
													.filter(Boolean)
													.join(' · ')
											: 'Belum terhubung'
									}
								/>
								<Baris label="Status verifikasi" nilai={v.label} />
								<Baris label="Waktu keputusan" nilai={tanggalPanjang(data.dpmd_verified_at)} />
								<Baris label="Catatan verifikasi" nilai={data.catatan_verifikasi} />
							</Bagian>

							<section className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
								<div className="flex items-center justify-between">
									<h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
										<FileText className="h-3.5 w-3.5" /> Kelengkapan berkas
									</h3>
									<span className="text-xs tabular-nums text-slate-500">
										{data.berkas.filter((b) => b.ada).length}/{data.berkas.length} ada
									</span>
								</div>
								<ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
									{[
										...data.berkas,
										{ label: 'Kepesertaan BPJS Kesehatan', ada: data.punya_bpjs_kesehatan },
										{ label: 'Kepesertaan BPJS Ketenagakerjaan', ada: data.punya_bpjs_ketenagakerjaan },
									].map((b) => (
										<li key={b.label} className="flex items-center gap-2 text-sm">
											{b.ada ? (
												<CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
											) : (
												<Circle className="h-4 w-4 flex-shrink-0 text-slate-300" />
											)}
											<span className={b.ada ? 'text-slate-800' : 'text-slate-400'}>{b.label}</span>
										</li>
									))}
								</ul>
								<p className="mt-3 text-[11px] leading-relaxed text-slate-400">
									Isi dokumen identitas tidak ditampilkan untuk akun kecamatan. Perbaikan data dilakukan oleh desa.
								</p>
							</section>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AparaturDetailModal;
