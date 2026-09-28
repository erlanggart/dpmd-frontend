// Aparatur desa di wilayah akun kecamatan — lihat saja.
//
// Satu daftar dari server (sudah dibatasi ke kecamatan ini), satu irisan
// filter; seluruh angka, grafik, rekap per desa, dan direktori dihitung dari
// irisan yang sama supaya tidak pernah ada dua angka berbeda untuk hal yang sama.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Users, Search, RotateCcw, AlertCircle, UserCheck, Venus, Cake, ShieldCheck,
	GraduationCap, Hourglass, FolderCheck, Map as MapIcon, Contact, ChevronLeft, ChevronRight,
	ChevronDown, ChevronUp, CheckCircle2, Minus, TriangleAlert,
} from 'lucide-react';
import api from '../../../api';
import PageHeader from '../../../components/statistik/PageHeader';
import { Kartu, Judul, Batang, PitaBertumpuk, Kosong } from '../../kepala-dinas/components/bumdesViz';
import { RAMP, RAMP_AKSEN, WARNA_TUNGGAL, nf, persenDari } from '../../kepala-dinas/components/bumdesFormat';
import { jenjangKey } from '../../../utils/jenjangPendidikan';
import AparaturDetailModal from './AparaturDetailModal';
import {
	BATAS_USIA_PERANGKAT, KELOMPOK_USIA, fotoUrl, inisial, isKepalaDesa, isSekdes, usiaDari,
} from './aparaturUtil';

const FILTER_AWAL = { cari: '', desa: 'semua', jenis: 'semua', status: 'Aktif' };
const PER_HALAMAN = 25;

// Dua kategori tanpa urutan → dua rona berbeda, bukan satu tangga.
const WARNA_LAKI = RAMP[3];
const WARNA_PEREMPUAN = RAMP_AKSEN[2];
// Jenjang (order 1 = SD … 8 = S3) → tangga oranye terang ke gelap. Diploma I-II
// dan III berbagi satu langkah; tangga hanya punya enam langkah.
const TANGGA_JENJANG = {
	1: RAMP_AKSEN[0], 2: RAMP_AKSEN[1], 3: RAMP_AKSEN[2], 4: RAMP_AKSEN[3],
	5: RAMP_AKSEN[3], 6: RAMP_AKSEN[4], 7: RAMP_AKSEN[5], 8: RAMP_AKSEN[5],
};
const WARNA_VERIFIKASI ={ terverifikasi: '#059669', belum: '#cbd5e1', ditolak: '#e11d48' };

/* ------------------------------------------------------------ potongan -- */

const Ubin = ({ icon: Icon, label, nilai, keterangan, warna, peringatan }) => (
	<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
		<div className="flex items-center justify-between">
			<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
			<span
				className="flex h-8 w-8 items-center justify-center rounded-lg"
				style={{ backgroundColor: `${warna}1a`, color: warna }}
			>
				<Icon className="h-4 w-4" />
			</span>
		</div>
		<p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{nilai}</p>
		<p className={`mt-0.5 text-xs ${peringatan ? 'font-medium text-amber-700' : 'text-slate-500'}`}>{keterangan}</p>
	</div>
);

const Legenda = ({ butir }) => (
	<ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
		{butir.map((b) => (
			<li key={b.label} className="flex items-center gap-1.5 text-xs text-slate-600">
				<span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: b.warna }} />
				{b.label}
				<span className="font-semibold tabular-nums text-slate-900">{nf.format(b.nilai)}</span>
				<span className="tabular-nums text-slate-400">{b.persen}%</span>
			</li>
		))}
	</ul>
);

const Avatar = ({ a, ukuran = 'h-9 w-9' }) => {
	const [gagal, setGagal] = useState(false);
	const url = fotoUrl(a.file_pas_foto);
	if (url && !gagal) {
		return <img src={url} alt="" onError={() => setGagal(true)} className={`${ukuran} flex-shrink-0 rounded-full object-cover ring-1 ring-slate-200`} />;
	}
	return (
		<span className={`${ukuran} flex flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200`}>
			{inisial(a.nama_lengkap)}
		</span>
	);
};

const LencanaVerifikasi = ({ status }) => {
	if (status === 'terverifikasi')
		return <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">Terverifikasi</span>;
	if (status === 'ditolak')
		return <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">Ditolak</span>;
	return <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">Belum</span>;
};

const Centang = ({ ada }) =>
	ada ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" /> : <Minus className="mx-auto h-4 w-4 text-rose-400" />;

/* ------------------------------------------------------------- halaman -- */

const KecamatanAparaturPage = () => {
	const [daftar, setDaftar] = useState(null);
	const [wilayah, setWilayah] = useState(null);
	const [galat, setGalat] = useState(null);
	const [memuat, setMemuat] = useState(true);
	const [filter, setFilter] = useState(FILTER_AWAL);
	const [halaman, setHalaman] = useState(1);
	const [dipilih, setDipilih] = useState(null);
	const [rekapTerbuka, setRekapTerbuka] = useState(true);

	const ambil = useCallback(async () => {
		setMemuat(true);
		try {
			const res = await api.get('/kecamatan/aparatur-desa');
			setDaftar(res.data?.data || []);
			setWilayah(res.data?.wilayah || null);
			setGalat(null);
		} catch (err) {
			setGalat(err.response?.data?.message || 'Gagal memuat data aparatur desa');
		} finally {
			setMemuat(false);
		}
	}, []);

	useEffect(() => {
		ambil();
	}, [ambil]);

	useEffect(() => setHalaman(1), [filter]);

	const petaDesa = useMemo(() => new Map((wilayah?.desa || []).map((d) => [d.id, d])), [wilayah]);
	const semua = useMemo(
		() =>
			(daftar || []).map((a) => ({
				...a,
				usia: usiaDari(a.tanggal_lahir),
				nama_desa: petaDesa.get(a.desa_id)?.nama || '—',
			})),
		[daftar, petaDesa]
	);

	// Irisan tanpa filter desa — dipakai rekap per desa, supaya tabel rekap
	// tetap memperlihatkan semua desa ketika satu desa sedang dipilih.
	const tanpaDesa = useMemo(() => {
		const q = filter.cari.trim().toLowerCase();
		return semua.filter((a) => {
			if (filter.jenis !== 'semua' && a.jenis !== filter.jenis) return false;
			if (filter.status !== 'semua' && a.status !== filter.status) return false;
			if (q && ![a.nama_lengkap, a.jabatan, a.nipd, a.nama_desa].some((v) => String(v || '').toLowerCase().includes(q)))
				return false;
			return true;
		});
	}, [semua, filter.cari, filter.jenis, filter.status]);

	const hasil = useMemo(
		() => (filter.desa === 'semua' ? tanpaDesa : tanpaDesa.filter((a) => a.desa_id === filter.desa)),
		[tanpaDesa, filter.desa]
	);

	/* --------------------------------------------------------- statistik -- */
	const s = useMemo(() => {
		const total = hasil.length;
		const aktif = hasil.filter((a) => a.status === 'Aktif').length;
		const laki = hasil.filter((a) => a.jenis_kelamin !== 'Perempuan').length;
		const perempuan = total - laki;
		const berusia = hasil.filter((a) => a.usia !== null);
		const rerataUsia = berusia.length ? Math.round(berusia.reduce((t, a) => t + a.usia, 0) / berusia.length) : null;

		const verifikasi = {
			terverifikasi: hasil.filter((a) => a.status_verifikasi === 'terverifikasi').length,
			ditolak: hasil.filter((a) => a.status_verifikasi === 'ditolak').length,
		};
		verifikasi.belum = total - verifikasi.terverifikasi - verifikasi.ditolak;

		const usia = KELOMPOK_USIA.map((k) => ({
			...k,
			n: berusia.filter((a) => a.usia >= k.min && a.usia <= k.maks).length,
		}));

		// Perangkat desa (bukan kades, bukan BPD) yang masih aktif di usia 60+.
		const lewatBatas = hasil.filter(
			(a) => a.jenis === 'perangkat' && !isKepalaDesa(a) && a.status === 'Aktif' && a.usia !== null && a.usia >= BATAS_USIA_PERANGKAT
		).length;

		const petaJenjang = new Map();
		for (const a of hasil) {
			const j = a.pendidikan_terakhir ? jenjangKey(a.pendidikan_terakhir) : { label: 'Tidak diisi', order: 0 };
			const baris = petaJenjang.get(j.label) || { label: j.label, order: j.order, n: 0 };
			baris.n += 1;
			petaJenjang.set(j.label, baris);
		}
		// Tinggi → rendah; ejaan yang tidak dikenali dan "tidak diisi" di bawah.
		const pendidikan = [...petaJenjang.values()].sort(
			(a, b) => (a.order === 99) - (b.order === 99) || (a.order === 0) - (b.order === 0) || b.order - a.order
		);
		const sarjana = hasil.filter((a) => a.pendidikan_terakhir && jenjangKey(a.pendidikan_terakhir).order >= 5).length;

		const administrasi = [
			{ label: 'Berkas lengkap (7/7)', n: hasil.filter((a) => a.berkas_ada >= a.berkas_total).length },
			{ label: 'SK terhubung ke Produk Hukum', n: hasil.filter((a) => a.punya_sk).length },
			{ label: 'Peserta BPJS Kesehatan', n: hasil.filter((a) => a.punya_bpjs_kesehatan).length },
			{ label: 'Peserta BPJS Ketenagakerjaan', n: hasil.filter((a) => a.punya_bpjs_ketenagakerjaan).length },
			{ label: 'Memiliki NIPD', n: hasil.filter((a) => a.nipd && String(a.nipd).trim()).length },
		];

		return {
			total, aktif, laki, perempuan, rerataUsia, verifikasi, usia, lewatBatas, pendidikan, sarjana, administrasi,
			perangkat: hasil.filter((a) => a.jenis === 'perangkat').length,
			bpd: hasil.filter((a) => a.jenis === 'bpd').length,
		};
	}, [hasil]);

	/* ------------------------------------------------------ rekap desa -- */
	const rekapDesa = useMemo(() => {
		const hanyaDesa = (wilayah?.desa || []).filter((d) => d.status !== 'kelurahan');
		return hanyaDesa.map((d) => {
			const isi = tanpaDesa.filter((a) => a.desa_id === d.id);
			// Jabatan inti dihitung dari aparatur AKTIF saja, apa pun filter status.
			const aktif = semua.filter((a) => a.desa_id === d.id && a.status === 'Aktif');
			return {
				...d,
				total: isi.length,
				perangkat: isi.filter((a) => a.jenis === 'perangkat').length,
				bpd: isi.filter((a) => a.jenis === 'bpd').length,
				perempuan: isi.filter((a) => a.jenis_kelamin === 'Perempuan').length,
				terverifikasi: isi.filter((a) => a.status_verifikasi === 'terverifikasi').length,
				kades: aktif.some((a) => a.jenis === 'perangkat' && isKepalaDesa(a)),
				sekdes: aktif.some((a) => a.jenis === 'perangkat' && isSekdes(a)),
			};
		});
	}, [wilayah, tanpaDesa, semua]);

	const desaTanpaKades = rekapDesa.filter((d) => !d.kades).length;
	const desaTerisi = rekapDesa.filter((d) => semua.some((a) => a.desa_id === d.id)).length;

	/* --------------------------------------------------------- direktori -- */
	const urut = useMemo(
		() =>
			[...hasil].sort(
				(a, b) =>
					a.nama_desa.localeCompare(b.nama_desa, 'id') ||
					(a.jenis === 'bpd') - (b.jenis === 'bpd') ||
					a.urutan - b.urutan ||
					a.nomor - b.nomor ||
					a.nama_lengkap.localeCompare(b.nama_lengkap, 'id')
			),
		[hasil]
	);
	const jumlahHalaman = Math.max(1, Math.ceil(urut.length / PER_HALAMAN));
	const tampil = urut.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

	const ubah = (kunci) => (nilai) => setFilter((f) => ({ ...f, [kunci]: nilai }));
	const adaFilter = JSON.stringify(filter) !== JSON.stringify(FILTER_AWAL);

	/* ----------------------------------------------------------- render -- */
	if (memuat && daftar === null) {
		return (
			<div className="flex items-center justify-center py-24">
				<div className="text-center">
					<div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
					<p className="mt-3 text-sm text-slate-500">Memuat data aparatur…</p>
				</div>
			</div>
		);
	}

	if (galat && daftar === null) {
		return (
			<div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
				<div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 ring-1 ring-rose-100">
					<AlertCircle className="h-5 w-5 text-rose-600" />
				</div>
				<h2 className="mt-4 text-base font-semibold text-slate-900">Data gagal dimuat</h2>
				<p className="mt-1.5 text-sm text-slate-500">{galat}</p>
				<button onClick={ambil} className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
					Coba Lagi
				</button>
			</div>
		);
	}

	const semuaAktif = semua.filter((a) => a.status === 'Aktif');
	const maksUsia = Math.max(1, ...s.usia.map((u) => u.n));
	const maksPendidikan = Math.max(1, ...s.pendidikan.map((p) => p.n));

	return (
		<div className="space-y-5">
			{/* Angka kepala halaman: se-kecamatan, aparatur aktif, tidak ikut filter. */}
			<PageHeader
				icon={Users}
				kicker="Akun Kecamatan"
				title="Aparatur Desa"
				subtitle={`Kecamatan ${wilayah?.kecamatan || '…'} · ${nf.format(rekapDesa.length)} desa — mode lihat saja`}
				stats={[
					{ label: 'Aparatur Aktif', value: nf.format(semuaAktif.length) },
					{ label: 'Perangkat Desa', value: nf.format(semuaAktif.filter((a) => a.jenis === 'perangkat').length) },
					{ label: 'Anggota BPD', value: nf.format(semuaAktif.filter((a) => a.jenis === 'bpd').length) },
					{ label: 'Desa Terisi', value: `${nf.format(desaTerisi)} / ${nf.format(rekapDesa.length)}` },
				]}
			/>

			{/* Filter */}
			<div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
					<div className="relative min-w-0 flex-1">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							type="search"
							value={filter.cari}
							onChange={(e) => ubah('cari')(e.target.value)}
							placeholder="Cari nama, jabatan, NIPD, atau desa…"
							className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
						/>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{/* Jenis: segmen, karena hanya tiga pilihan dan sering diganti */}
						<div className="inline-flex rounded-lg bg-slate-100 p-1">
							{[
								['semua', 'Semua'],
								['perangkat', 'Perangkat'],
								['bpd', 'BPD'],
							].map(([nilai, label]) => (
								<button
									key={nilai}
									onClick={() => ubah('jenis')(nilai)}
									className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
										filter.jenis === nilai ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
									}`}
								>
									{label}
								</button>
							))}
						</div>

						<select
							value={filter.desa}
							onChange={(e) => ubah('desa')(e.target.value)}
							className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-900"
							aria-label="Desa"
						>
							<option value="semua">Semua desa</option>
							{rekapDesa.map((d) => (
								<option key={d.id} value={d.id}>
									{d.nama}
								</option>
							))}
						</select>

						<select
							value={filter.status}
							onChange={(e) => ubah('status')(e.target.value)}
							className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-900"
							aria-label="Status"
						>
							<option value="Aktif">Aktif</option>
							<option value="Tidak_Aktif">Tidak aktif</option>
							<option value="semua">Semua status</option>
						</select>

						{adaFilter && (
							<button
								onClick={() => setFilter(FILTER_AWAL)}
								className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
							>
								<RotateCcw className="h-3.5 w-3.5" /> Reset
							</button>
						)}
					</div>
				</div>
				<p className="mt-2 px-1 text-xs text-slate-500">
					Menampilkan <span className="font-semibold text-slate-800">{nf.format(s.total)}</span> aparatur
					{filter.desa !== 'semua' && <> di Desa {petaDesa.get(filter.desa)?.nama}</>}.
				</p>
			</div>

			<div className={`space-y-5 transition-opacity ${memuat ? 'opacity-50' : ''}`}>
				{/* Ubin angka */}
				<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
					<Ubin
						icon={UserCheck}
						label="Perangkat · BPD"
						nilai={`${nf.format(s.perangkat)} · ${nf.format(s.bpd)}`}
						keterangan={`${nf.format(s.total)} aparatur ditampilkan`}
						warna={RAMP[3]}
					/>
					<Ubin
						icon={Venus}
						label="Keterwakilan perempuan"
						nilai={`${persenDari(s.perempuan, s.total)}%`}
						keterangan={`${nf.format(s.perempuan)} dari ${nf.format(s.total)} aparatur`}
						warna={WARNA_PEREMPUAN}
					/>
					<Ubin
						icon={Cake}
						label="Rata-rata usia"
						nilai={s.rerataUsia !== null ? `${s.rerataUsia} th` : '—'}
						keterangan={
							s.lewatBatas > 0
								? `${nf.format(s.lewatBatas)} perangkat aktif berusia ${BATAS_USIA_PERANGKAT}+`
								: 'Tidak ada perangkat melewati batas usia'
						}
						warna={RAMP[4]}
						peringatan={s.lewatBatas > 0}
					/>
					<Ubin
						icon={ShieldCheck}
						label="Terverifikasi DPMD"
						nilai={`${persenDari(s.verifikasi.terverifikasi, s.total)}%`}
						keterangan={`${nf.format(s.verifikasi.terverifikasi)} terverifikasi · ${nf.format(s.verifikasi.ditolak)} ditolak`}
						warna="#059669"
					/>
				</div>

				{s.total === 0 ? (
					<Kartu>
						<Kosong pesan="Tidak ada aparatur yang cocok dengan filter ini." />
					</Kartu>
				) : (
					<>
						<div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
							{/* Komposisi */}
							<Kartu>
								<Judul icon={Users} warna={RAMP[3]} catatan="Setiap pita terbagi habis — jumlahnya selalu 100%.">
									Komposisi
								</Judul>

								<p className="text-xs font-medium text-slate-500">Jenis kelamin</p>
								<div className="mt-2">
									<PitaBertumpuk
										total={s.total}
										tinggi={16}
										segmen={[
											{ id: 'l', label: 'Laki-laki', nilai: s.laki, warna: WARNA_LAKI },
											{ id: 'p', label: 'Perempuan', nilai: s.perempuan, warna: WARNA_PEREMPUAN },
										].filter((x) => x.nilai > 0)}
									/>
								</div>
								<Legenda
									butir={[
										{ label: 'Laki-laki', nilai: s.laki, warna: WARNA_LAKI, persen: persenDari(s.laki, s.total) },
										{ label: 'Perempuan', nilai: s.perempuan, warna: WARNA_PEREMPUAN, persen: persenDari(s.perempuan, s.total) },
									]}
								/>

								<p className="mt-6 text-xs font-medium text-slate-500">Status verifikasi DPMD</p>
								<div className="mt-2">
									<PitaBertumpuk
										total={s.total}
										tinggi={16}
										segmen={[
											{ id: 'v', label: 'Terverifikasi', nilai: s.verifikasi.terverifikasi, warna: WARNA_VERIFIKASI.terverifikasi },
											{ id: 'b', label: 'Belum diverifikasi', nilai: s.verifikasi.belum, warna: WARNA_VERIFIKASI.belum },
											{ id: 'd', label: 'Ditolak', nilai: s.verifikasi.ditolak, warna: WARNA_VERIFIKASI.ditolak },
										].filter((x) => x.nilai > 0)}
									/>
								</div>
								<Legenda
									butir={[
										{ label: 'Terverifikasi', nilai: s.verifikasi.terverifikasi, warna: WARNA_VERIFIKASI.terverifikasi, persen: persenDari(s.verifikasi.terverifikasi, s.total) },
										{ label: 'Belum', nilai: s.verifikasi.belum, warna: WARNA_VERIFIKASI.belum, persen: persenDari(s.verifikasi.belum, s.total) },
										{ label: 'Ditolak', nilai: s.verifikasi.ditolak, warna: WARNA_VERIFIKASI.ditolak, persen: persenDari(s.verifikasi.ditolak, s.total) },
									]}
								/>
							</Kartu>

							{/* Usia */}
							<Kartu>
								<Judul
									icon={Hourglass}
									warna={RAMP[4]}
									catatan={`Perangkat desa diberhentikan setelah berusia ${BATAS_USIA_PERANGKAT} tahun (UU 6/2014 Pasal 53); tidak berlaku untuk kepala desa dan BPD.`}
								>
									Sebaran usia
								</Judul>
								<div className="space-y-3">
									{s.usia.map((u, i) => (
										<Batang
											key={u.label}
											label={`${u.label} tahun`}
											nilai={u.n}
											tampil={`${nf.format(u.n)} · ${persenDari(u.n, s.total)}%`}
											maks={maksUsia}
											warna={RAMP[i + 1]}
											urutan={i}
										/>
									))}
								</div>
								{s.lewatBatas > 0 && (
									<p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
										<TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
										{nf.format(s.lewatBatas)} perangkat desa berstatus aktif sudah berusia {BATAS_USIA_PERANGKAT} tahun atau lebih.
									</p>
								)}
							</Kartu>

							{/* Pendidikan */}
							<Kartu>
								<Judul
									icon={GraduationCap}
									warna={RAMP_AKSEN[3]}
									catatan={`${persenDari(s.sarjana, s.total)}% berpendidikan Diploma III ke atas.`}
								>
									Pendidikan terakhir
								</Judul>
								<div className="space-y-3">
									{s.pendidikan.map((p, i) => (
										<Batang
											key={p.label}
											label={p.label}
											nilai={p.n}
											tampil={`${nf.format(p.n)} · ${persenDari(p.n, s.total)}%`}
											maks={maksPendidikan}
											warna={TANGGA_JENJANG[p.order] ?? '#cbd5e1'}
											urutan={i}
										/>
									))}
								</div>
							</Kartu>

							{/* Administrasi */}
							<Kartu>
								<Judul
									icon={FolderCheck}
									warna={WARNA_TUNGGAL}
									catatan="Seberapa lengkap administrasi kepegawaian yang sudah diisi desa."
								>
									Kelengkapan administrasi
								</Judul>
								<div className="space-y-3">
									{s.administrasi.map((a, i) => (
										<Batang
											key={a.label}
											label={a.label}
											nilai={a.n}
											tampil={`${persenDari(a.n, s.total)}% · ${nf.format(a.n)}`}
											maks={s.total}
											warna={WARNA_TUNGGAL}
											urutan={i}
										/>
									))}
								</div>
							</Kartu>
						</div>
					</>
				)}

				{/* Rekap per desa */}
				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
					<button
						onClick={() => setRekapTerbuka((v) => !v)}
						className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 text-left sm:p-5"
					>
						<div>
							<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
								<MapIcon className="h-4 w-4 text-slate-400" /> Rekap per desa
							</h3>
							<p className="mt-0.5 text-xs text-slate-500">
								Klik satu desa untuk menyaring seluruh halaman.
								{desaTanpaKades > 0 && (
									<span className="font-medium text-rose-600">
										{' '}
										{nf.format(desaTanpaKades)} desa belum tercatat punya kepala desa aktif.
									</span>
								)}
							</p>
						</div>
						{rekapTerbuka ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
					</button>

					{rekapTerbuka && (
						<div className="overflow-x-auto">
							<table className="w-full min-w-[44rem] text-sm">
								<thead>
									<tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
										<th className="px-4 py-2.5 text-left">Desa</th>
										<th className="px-3 py-2.5 text-right">Perangkat</th>
										<th className="px-3 py-2.5 text-right">BPD</th>
										<th className="px-3 py-2.5 text-center">Kades</th>
										<th className="px-3 py-2.5 text-center">Sekdes</th>
										<th className="px-3 py-2.5 text-right">Perempuan</th>
										<th className="w-40 px-4 py-2.5 text-left">Terverifikasi</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{rekapDesa.map((d) => {
										const terpilih = filter.desa === d.id;
										const pv = persenDari(d.terverifikasi, d.total);
										return (
											<tr
												key={d.id}
												onClick={() => ubah('desa')(terpilih ? 'semua' : d.id)}
												className={`cursor-pointer transition-colors ${terpilih ? 'bg-slate-900/[0.04]' : 'hover:bg-slate-50'}`}
											>
												<td className="px-4 py-2.5">
													<span className={`font-medium ${terpilih ? 'text-slate-900' : 'text-slate-700'}`}>{d.nama}</span>
													{d.total === 0 && <span className="ml-2 text-[11px] text-slate-400">belum ada data</span>}
												</td>
												<td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{nf.format(d.perangkat)}</td>
												<td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{nf.format(d.bpd)}</td>
												<td className="px-3 py-2.5"><Centang ada={d.kades} /></td>
												<td className="px-3 py-2.5"><Centang ada={d.sekdes} /></td>
												<td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
													{d.total ? `${persenDari(d.perempuan, d.total)}%` : '—'}
												</td>
												<td className="px-4 py-2.5">
													<div className="flex items-center gap-2">
														<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
															<div className="h-full rounded-full bg-emerald-500" style={{ width: `${pv}%` }} />
														</div>
														<span className="w-9 text-right text-xs tabular-nums text-slate-500">{d.total ? `${pv}%` : '—'}</span>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</section>

				{/* Direktori */}
				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
						<div>
							<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
								<Contact className="h-4 w-4 text-slate-400" /> Direktori aparatur
							</h3>
							<p className="mt-0.5 text-xs text-slate-500">
								Diurut per desa, lalu menurut susunan jabatan. Klik satu baris untuk melihat rinciannya.
							</p>
						</div>
					</div>

					{tampil.length === 0 ? (
						<div className="p-5">
							<Kosong pesan="Tidak ada aparatur yang cocok dengan filter ini." />
						</div>
					) : (
						<>
							{/* Tabel — layar lebar */}
							<div className="hidden overflow-x-auto md:block">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
											<th className="px-4 py-2.5 text-left">Nama</th>
											<th className="px-3 py-2.5 text-left">Jabatan</th>
											<th className="px-3 py-2.5 text-left">Desa</th>
											<th className="px-3 py-2.5 text-center">L/P</th>
											<th className="px-3 py-2.5 text-right">Usia</th>
											<th className="px-3 py-2.5 text-left">Pendidikan</th>
											<th className="px-4 py-2.5 text-left">Verifikasi</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{tampil.map((a) => {
											const lewat = a.jenis === 'perangkat' && !isKepalaDesa(a) && a.status === 'Aktif' && a.usia >= BATAS_USIA_PERANGKAT;
											return (
												<tr key={a.id} onClick={() => setDipilih(a.id)} className="cursor-pointer transition-colors hover:bg-slate-50">
													<td className="px-4 py-2.5">
														<div className="flex items-center gap-3">
															<Avatar a={a} />
															<div className="min-w-0">
																<p className="truncate font-medium text-slate-900">{a.nama_lengkap}</p>
																<p className="truncate text-[11px] text-slate-400">
																	{a.nipd ? `NIPD ${a.nipd}` : 'NIPD belum diisi'}
																	{a.status !== 'Aktif' && <span className="ml-1.5 text-rose-500">· tidak aktif</span>}
																</p>
															</div>
														</div>
													</td>
													<td className="px-3 py-2.5">
														<span className="text-slate-700">{a.jabatan}</span>
														{a.jenis === 'bpd' && (
															<span className="ml-1.5 rounded bg-slate-100 px-1 py-px text-[10px] font-semibold text-slate-500">BPD</span>
														)}
													</td>
													<td className="px-3 py-2.5 text-slate-600">{a.nama_desa}</td>
													<td className="px-3 py-2.5 text-center text-slate-600">{a.jenis_kelamin === 'Perempuan' ? 'P' : 'L'}</td>
													<td className={`px-3 py-2.5 text-right tabular-nums ${lewat ? 'font-semibold text-amber-700' : 'text-slate-600'}`}>
														{a.usia ?? '—'}
													</td>
													<td className="max-w-[12rem] truncate px-3 py-2.5 text-slate-600">
														{a.pendidikan_terakhir ? jenjangKey(a.pendidikan_terakhir).label : '—'}
													</td>
													<td className="px-4 py-2.5"><LencanaVerifikasi status={a.status_verifikasi} /></td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{/* Kartu — layar sempit */}
							<ul className="divide-y divide-slate-100 md:hidden">
								{tampil.map((a) => (
									<li key={a.id}>
										<button onClick={() => setDipilih(a.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
											<Avatar a={a} ukuran="h-10 w-10" />
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium text-slate-900">{a.nama_lengkap}</p>
												<p className="truncate text-xs text-slate-500">
													{a.jabatan} · {a.nama_desa}
												</p>
											</div>
											<LencanaVerifikasi status={a.status_verifikasi} />
										</button>
									</li>
								))}
							</ul>

							{jumlahHalaman > 1 && (
								<div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
									<span>
										{nf.format((halaman - 1) * PER_HALAMAN + 1)}–{nf.format(Math.min(halaman * PER_HALAMAN, urut.length))} dari{' '}
										{nf.format(urut.length)}
									</span>
									<div className="flex items-center gap-1">
										<button
											onClick={() => setHalaman((h) => Math.max(1, h - 1))}
											disabled={halaman === 1}
											className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
											aria-label="Sebelumnya"
										>
											<ChevronLeft className="h-4 w-4" />
										</button>
										<span className="px-2 tabular-nums">
											{halaman} / {jumlahHalaman}
										</span>
										<button
											onClick={() => setHalaman((h) => Math.min(jumlahHalaman, h + 1))}
											disabled={halaman === jumlahHalaman}
											className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
											aria-label="Berikutnya"
										>
											<ChevronRight className="h-4 w-4" />
										</button>
									</div>
								</div>
							)}
						</>
					)}
				</section>
			</div>

			{dipilih && <AparaturDetailModal id={dipilih} onClose={() => setDipilih(null)} />}
		</div>
	);
};

export default KecamatanAparaturPage;
