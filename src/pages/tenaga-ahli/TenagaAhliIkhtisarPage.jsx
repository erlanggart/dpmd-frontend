// src/pages/tenaga-ahli/TenagaAhliIkhtisarPage.jsx
//
// Halaman depan akun Tenaga Ahli: dua urusan yang boleh dibacanya — pembinaan
// BUM Desa dan Kerja Sama Desa — masing-masing satu panel, lalu pintu ke halaman
// rinciannya.
//
// SUMBER ANGKA. Keduanya diambil dari endpoint yang SAMA dengan yang dipakai
// Bidang SPKED: /spked/ikhtisar dan /dpmd/kerjasama-desa/statistik. Itu seluruh
// alasan halaman ini tidak menghitung apa pun sendiri — kalau ia punya rumusnya
// sendiri, suatu hari angka di layar Tenaga Ahli akan berbeda dari angka di layar
// bidang, dan tidak ada yang bisa menebak mana yang benar.
//
// Bantuan Keuangan TIDAK ada di sini, meskipun /spked/ikhtisar mengirimkannya.
// Lingkup akun ini dua urusan, dan menampilkan panel ketiga yang halamannya tidak
// bisa dibuka hanya menghasilkan pertanyaan yang tidak ada jawabannya.
//
// Gaya panel mengikuti SpkedPage.jsx: satu warna aksen, pemisah garis rambut,
// hierarki dari tipografi. Lihat catatan panjang di kepala berkas itu sebelum
// mengubah tampilannya.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuArrowRight, LuBuilding2, LuHandshake, LuLoader } from 'react-icons/lu';
import api from '../../api';
import BarKomposisi from '../../components/bidang/BarKomposisi';

const PANEL = 'overflow-hidden rounded-2xl border border-slate-200 bg-white';
const KEPALA_PANEL =
	'flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-6 py-4';
const KICKER = 'text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400';
const KISI_GARIS = 'grid gap-px bg-slate-200';

/**
 * Ramp ORDINAL satu rona — gelap = tahap paling tuntas, terang = paling jauh
 * dari selesai. Disalin apa adanya dari SpkedPage.jsx supaya batang status badan
 * hukum di dua halaman terbaca sebagai urutan yang sama. Sudah divalidasi pada
 * latar terang (lightness monoton, jarak antar langkah >= 0.06, ujung teringan
 * tetap di atas 2:1 terhadap latar). Jangan ditukar warna kategori.
 */
const RAMP_5 = ['#104281', '#1c5cab', '#2a78d6', '#5598e7', '#86b6ef'];

const angka = (n) => Number(n || 0).toLocaleString('id-ID');

/** Satu angka dalam kisi bergaris. Tanpa ikon, tanpa kotak warna. */
const Angka = ({ label, nilai, keterangan }) => (
	<div className="bg-white px-6 py-5">
		<p className={KICKER}>{label}</p>
		<p className="mt-2.5 text-[28px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
			{nilai}
		</p>
		{keterangan && <p className="mt-2 text-[12px] leading-snug text-slate-500">{keterangan}</p>}
	</div>
);

const TautanPanel = ({ onClick, label }) => (
	<button
		onClick={onClick}
		className="group inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500 transition-colors hover:text-slate-900"
	>
		{label}
		<LuArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
	</button>
);

const TenagaAhliIkhtisarPage = () => {
	const navigate = useNavigate();
	const [bumdes, setBumdes] = useState(null);
	const [kerjasama, setKerjasama] = useState(null);
	const [memuat, setMemuat] = useState(true);

	const ambil = useCallback(async () => {
		setMemuat(true);
		// Dua permintaan sejajar, dan kegagalan salah satu TIDAK mengosongkan
		// panel yang lain: keduanya urusan terpisah dengan sumber data terpisah,
		// jadi "kerja sama belum bisa dimuat" bukan alasan menyembunyikan angka
		// BUM Desa yang sudah di tangan.
		const [hasilBumdes, hasilKerjasama] = await Promise.allSettled([
			api.get('/spked/ikhtisar'),
			api.get('/dpmd/kerjasama-desa/statistik'),
		]);

		if (hasilBumdes.status === 'fulfilled' && hasilBumdes.value.data?.success) {
			setBumdes(hasilBumdes.value.data.data?.bumdes || null);
		} else {
			console.error('[TenagaAhliIkhtisar] gagal memuat ikhtisar BUM Desa:', hasilBumdes.reason);
		}

		if (hasilKerjasama.status === 'fulfilled' && hasilKerjasama.value.data?.success) {
			setKerjasama(hasilKerjasama.value.data.data || null);
		} else {
			console.error('[TenagaAhliIkhtisar] gagal memuat statistik kerja sama:', hasilKerjasama.reason);
		}

		if (hasilBumdes.status === 'rejected' && hasilKerjasama.status === 'rejected') {
			toast.error('Data ikhtisar gagal dimuat.');
		}
		setMemuat(false);
	}, []);

	useEffect(() => {
		ambil();
	}, [ambil]);

	const persenAktif = useMemo(() => {
		if (!bumdes?.total) return null;
		return Math.round((bumdes.aktif / bumdes.total) * 100);
	}, [bumdes]);

	// Bidang kerja sama dengan transaksi terbanyak. Dipakai sebagai satu kalimat
	// keterangan, bukan grafik kedua: sebarannya sudah digambar lengkap di halaman
	// Kerja Sama Desa, dan menggambarnya dua kali hanya memperbesar halaman ini.
	const bidangTeratas = useMemo(() => {
		if (!kerjasama?.per_bidang?.length) return null;
		return [...kerjasama.per_bidang].sort((a, b) => b.jumlah - a.jumlah)[0] || null;
	}, [kerjasama]);

	if (memuat) {
		return (
			<div className="flex items-center justify-center gap-2 py-24 text-slate-500">
				<LuLoader className="h-5 w-5 animate-spin" />
				<span className="text-sm font-medium">Memuat ikhtisar…</span>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-[1800px] space-y-5">
			<header>
				<p className={KICKER}>Tenaga Ahli</p>
				<h1 className="mt-1 text-[22px] font-bold tracking-tight text-slate-900">
					Ikhtisar Pembinaan Desa
				</h1>
				<p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
					BUM Desa dan Kerja Sama Desa se-Kabupaten Bogor. Angkanya sama dengan yang dipakai Bidang
					SPKED. Halaman ini dan seluruh halaman di bawahnya hanya menampilkan dan mengekspor data —
					tidak ada isian yang bisa diubah dari akun ini.
				</p>
			</header>

			<div className="grid gap-5 xl:grid-cols-2">
				{/* ---------- BUM Desa ---------- */}
				<section className={PANEL}>
					<div className={KEPALA_PANEL}>
						<div>
							<p className={KICKER}>BUM Desa</p>
							<h2 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">
								Status Badan Hukum
							</h2>
						</div>
						<TautanPanel onClick={() => navigate('/tenaga-ahli/bumdes')} label="Lihat data" />
					</div>

					<div className="px-6 py-5">
						{bumdes ? (
							<>
								<div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
									<div>
										<span className="text-[38px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
											{angka(bumdes.total)}
										</span>
										<span className="ml-2 text-[12.5px] text-slate-500">terdata</span>
									</div>
									<div className="text-[12.5px] text-slate-500">
										<span className="font-semibold tabular-nums text-slate-900">
											{angka(bumdes.aktif)}
										</span>{' '}
										aktif
										{persenAktif !== null && (
											<span className="text-slate-400"> · {persenAktif}%</span>
										)}
									</div>
									<div className="text-[12.5px] text-slate-500">
										<span className="font-semibold tabular-nums text-slate-900">
											{angka(bumdes.tidak_aktif)}
										</span>{' '}
										tidak aktif
									</div>
								</div>

								<div className="mt-5">
									{bumdes.badan_hukum?.length ? (
										<BarKomposisi data={bumdes.badan_hukum} warna={RAMP_5} />
									) : (
										<p className="py-6 text-center text-[12.5px] text-slate-400">
											Sebaran status badan hukum belum tersedia
										</p>
									)}
								</div>
							</>
						) : (
							<p className="py-10 text-center text-[12.5px] text-slate-400">
								Data BUM Desa belum bisa dimuat.
							</p>
						)}
					</div>
				</section>

				{/* ---------- Kerja Sama Desa ---------- */}
				<section className={PANEL}>
					<div className={KEPALA_PANEL}>
						<div>
							<p className={KICKER}>Kerja Sama Desa</p>
							<h2 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">
								Cakupan &amp; Transaksi
							</h2>
						</div>
						<TautanPanel
							onClick={() => navigate('/tenaga-ahli/kerjasama')}
							label="Lihat monitoring"
						/>
					</div>

					<div className="px-6 py-5">
						{kerjasama ? (
							<>
								<div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
									<div>
										<span className="text-[38px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
											{angka(kerjasama.total)}
										</span>
										<span className="ml-2 text-[12.5px] text-slate-500">kerja sama</span>
									</div>
									<div className="text-[12.5px] text-slate-500">
										<span className="font-semibold tabular-nums text-slate-900">
											{angka(kerjasama.desa_terlibat)}
										</span>{' '}
										desa terlibat
									</div>
								</div>

								{/* Cakupan Perdes sebagai satu batang dua bagian: "sudah" dan
								    "belum" memang dua bagian dari satu keseluruhan, jadi bentuk
								    ini benar — tidak dipaksakan untuk angka yang tidak sejenis. */}
								<div className="mt-5">
									<p className="mb-2 text-[11.5px] text-slate-500">
										Cakupan Perdes payung kerja sama
										{kerjasama.cakupan_legalitas?.persen !== null && (
											<span className="ml-1.5 font-semibold tabular-nums text-slate-900">
												{kerjasama.cakupan_legalitas.persen}%
											</span>
										)}
									</p>
									<BarKomposisi
										data={[
											{
												label: 'Sudah mengunggah Perdes',
												jumlah: kerjasama.cakupan_legalitas?.sudah || 0,
											},
											{
												label: 'Belum mengunggah Perdes',
												jumlah: kerjasama.cakupan_legalitas?.belum || 0,
											},
										]}
										warna={['#104281', '#86b6ef']}
									/>
									<p className="mt-2 text-[11.5px] text-slate-400">
										Dari {angka(kerjasama.cakupan_legalitas?.total_desa)} desa. Kelurahan tidak
										dihitung — kelurahan tidak menerbitkan Peraturan Desa.
									</p>
								</div>

								{bidangTeratas && (
									<p className="mt-4 border-t border-slate-100 pt-4 text-[12px] text-slate-500">
										Bidang terbanyak:{' '}
										<span className="font-semibold text-slate-900">{bidangTeratas.label}</span> —{' '}
										<span className="tabular-nums">{angka(bidangTeratas.jumlah)}</span> kerja sama
									</p>
								)}
							</>
						) : (
							<p className="py-10 text-center text-[12.5px] text-slate-400">
								Data kerja sama belum bisa dimuat.
							</p>
						)}
					</div>
				</section>
			</div>

			{/* Peringkat kecamatan: satu angka per baris, bukan grafik ketiga.
			    Grafik batangnya sudah ada di halaman Kerja Sama Desa. */}
			{kerjasama?.top_kecamatan?.length > 0 && (
				<section className={PANEL}>
					<div className={KEPALA_PANEL}>
						<div>
							<p className={KICKER}>Kerja Sama Desa</p>
							<h2 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">
								Kecamatan Teraktif
							</h2>
						</div>
						<p className="text-[12px] text-slate-500">Sepuluh teratas menurut jumlah kerja sama</p>
					</div>

					<div className={`${KISI_GARIS} sm:grid-cols-2 lg:grid-cols-5`}>
						{kerjasama.top_kecamatan.map((k) => (
							<Angka
								key={k.id}
								label={k.nama}
								nilai={angka(k.jumlah)}
								keterangan={`${angka(k.desa)} desa`}
							/>
						))}
					</div>
				</section>
			)}
		</div>
	);
};

export default TenagaAhliIkhtisarPage;
