// src/pages/bidang/PemdesPage.jsx
// Ikhtisar Bidang Pemerintahan Desa: modul yang bisa dibuka, angka pokok, dan
// jalur waktu aktivitas.
//
// Susunan bento-nya dipertahankan — modul utama (Aparatur) mendapat kartu besar
// karena memang yang paling sering dibuka. Yang berubah: potongan tampilannya
// memakai komponen bersama halaman bidang, sehingga kepala halaman, ubin angka,
// dan log aktivitas seragam dengan bidang lain.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidangPath } from '../../hooks/useBidangPath';
import { useAuth } from '../../context/AuthContext';
import { Landmark, Users, FileText, HardDrive, ClipboardList, MapPinned, Scale, ArrowUpRight, RotateCcw, Building2, Wallet, Gavel } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import DaftarPegawaiBidang from '../../components/bidang/DaftarPegawaiBidang';
import AnggaranBidangSection from '../../components/bidang/AnggaranBidangSection';
import { bidangBySlug } from '../../constants/bidang';
import { BidangHeader, StatTile, PanelMemuat, TimelineAktivitas } from '../../components/bidang/BidangUI';
import { angkaAtau, rupiahRingkas } from '../../components/bidang/bidangFormat';

const AKSEN = bidangBySlug('pemdes').accent;

const JudulSeksi = ({ kicker, judul }) => (
	<div className="mb-3">
		<p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{kicker}</p>
		<h2 className="mt-0.5 text-base font-bold tracking-tight text-slate-900">{judul}</h2>
	</div>
);

const DASAR_KARTU =
	'group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900';

const KartuModul = ({ modul, onClick }) => {
	const Icon = modul.icon;

	// Kartu besar: modul utama bidang, diberi ruang dan angka yang lebih menonjol.
	if (modul.besar) {
		return (
			<button onClick={onClick} className={`${DASAR_KARTU} p-5 sm:col-span-2`}>
				<span
					className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.14]"
					style={{ backgroundColor: modul.accent }}
				/>
				<div className="relative flex items-start gap-4">
					<span
						className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
						style={{ backgroundColor: `${modul.accent}1a`, color: modul.accent }}
					>
						<Icon className="h-6 w-6" strokeWidth={1.75} />
					</span>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Modul Utama</span>
							<ArrowUpRight className="h-3.5 w-3.5 text-slate-300 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-600" />
						</div>
						<h3 className="mt-1 text-lg font-bold leading-tight tracking-tight text-slate-900">{modul.judul}</h3>
						<p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{modul.deskripsi}</p>
					</div>
				</div>
				<div className="relative mt-5 flex items-end justify-between border-t border-dashed border-slate-200 pt-4">
					<div>
						<p className="text-[26px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
							{modul.angka.nilai}
						</p>
						<p className="mt-1 text-[11px] text-slate-500">{modul.angka.label}</p>
					</div>
					<span className="text-[11px] font-semibold text-slate-400 transition-colors group-hover:text-slate-900">
						Lihat semua
					</span>
				</div>
			</button>
		);
	}

	return (
		<button onClick={onClick} className={`${DASAR_KARTU} p-4`}>
			<div className="flex items-start justify-between">
				<span
					className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
					style={{ backgroundColor: `${modul.accent}1a`, color: modul.accent }}
				>
					<Icon className="h-5 w-5" strokeWidth={1.75} />
				</span>
				<ArrowUpRight className="h-4 w-4 text-slate-300 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-600" />
			</div>
			<h3 className="mt-3.5 text-sm font-bold leading-tight text-slate-900">{modul.judul}</h3>
			<p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-slate-500">{modul.deskripsi}</p>
			<div className="mt-3 flex items-baseline gap-1.5 border-t border-slate-100 pt-3">
				{/* Modul tanpa angka tidak diberi angka karangan — cukup keterangannya. */}
				{modul.angka.nilai && (
					<span className="text-sm font-bold tabular-nums text-slate-900">{modul.angka.nilai}</span>
				)}
				<span className="text-[10.5px] text-slate-500">{modul.angka.label}</span>
			</div>
		</button>
	);
};

const PemdesPage = () => {
	const navigate = useNavigate();
	const { getPath } = useBidangPath();
	const { user } = useAuth();
	const isBendahara = user?.role === 'bendahara' || user?.role === 'superadmin';
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);
	const [activityLogs, setActivityLogs] = useState([]);
	const [activityLoading, setActivityLoading] = useState(false);

	const fetchActivityLogs = useCallback(async () => {
		try {
			setActivityLoading(true);
			const res = await api.get('/bidang/6/activity-logs');
			if (res.data.success) setActivityLogs(res.data.data || []);
		} catch {
			toast.error('Gagal memuat log aktivitas');
		} finally {
			setActivityLoading(false);
		}
	}, []);

	const fetchDashboard = useCallback(async () => {
		try {
			setLoading(true);
			const res = await api.get('/bidang/6/dashboard');
			if (res.data.success) setData(res.data.data);
		} catch {
			toast.error('Gagal memuat data bidang');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchDashboard();
		fetchActivityLogs();
	}, [fetchDashboard, fetchActivityLogs]);

	// Referensi stabil — dipakai sebagai dependensi useMemo di bawah, jadi tidak
	// boleh jadi objek baru tiap render.
	const stats = useMemo(() => data?.stats || {}, [data]);

	const modul = useMemo(
		() => [
			{
				id: 'perangkat-desa',
				besar: true,
				accent: AKSEN,
				judul: 'Perangkat Desa',
				deskripsi: 'Kelola data perangkat desa seluruh kecamatan se-Kabupaten Bogor.',
				icon: Users,
				route: getPath('/pemdes/perangkat-desa'),
				angka: { nilai: angkaAtau(stats.total_perangkat), label: 'perangkat terdaftar' },
			},
			{
				id: 'bpd',
				accent: '#4a3aa7',
				judul: 'BPD',
				deskripsi: 'Data Badan Permusyawaratan Desa se-Kabupaten Bogor',
				icon: Users,
				route: getPath('/pemdes/bpd'),
				angka: { nilai: angkaAtau(stats.total_bpd), label: 'anggota terdaftar' },
			},
			{
				id: 'profil-desa',
				accent: '#1baf7a',
				judul: 'Profil Desa',
				deskripsi: 'Dashboard data dan profil seluruh desa',
				icon: MapPinned,
				route: getPath('/pemdes/profil-desa'),
				angka: { nilai: angkaAtau(stats.total_desa), label: 'desa' },
			},
			{
				id: 'produk-hukum',
				accent: '#eda100',
				judul: 'Produk Hukum Desa',
				deskripsi: 'Perdes, Perkades, dan Keputusan Kepala Desa',
				icon: Scale,
				route: getPath('/pemdes/produk-hukum'),
				angka: { nilai: angkaAtau(stats.total_produk_hukum), label: 'dokumen' },
			},
			{
				id: 'produk-hukum-kabupaten',
				accent: '#475569',
				judul: 'Produk Hukum Kabupaten',
				deskripsi: 'Perda, Perbup, SK, dan Surat Edaran yang dipegang bidang ini',
				icon: Gavel,
				route: getPath('/bidang/pemdes/produk-hukum-kabupaten'),
				angka: { nilai: null, label: 'unggah & kelola' },
			},
			{
				id: 'drive',
				accent: '#475569',
				judul: 'Drive Bidang',
				deskripsi: 'Penyimpanan berkas internal bidang, bisa dibagikan ke bidang lain',
				icon: HardDrive,
				route: getPath('/pemdes/drive'),
				// Kuota baru diketahui setelah Drive-nya dibuka, jadi tidak ada angka
				// yang bisa ditampilkan di kartu.
				angka: { nilai: null, label: 'berkas & folder' },
			},
			{
				id: 'formulir',
				accent: '#475569',
				judul: 'Formulir',
				deskripsi: 'Susun formulir sendiri, bagikan tautannya, rekap jawabannya',
				icon: ClipboardList,
				route: getPath('/pemdes/formulir'),
				angka: { nilai: null, label: 'survei & pendataan' },
			},
			{
				id: 'musdesus',
				accent: '#2a78d6',
				judul: 'Musyawarah Desa Khusus',
				deskripsi: 'Data, laporan, dan monitoring Musdes Khusus per desa',
				icon: FileText,
				route: '/core-dashboard/musdesus',
				// Dashboard bidang tidak mengirim hitungan musdesus, jadi tidak ada
				// angka yang bisa ditampilkan — dan tidak dibuat-buat.
				angka: { nilai: null, label: 'monitoring per desa' },
			},
		],
		[getPath, stats]
	);

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<PanelMemuat pesan="Memuat data bidang…" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
				<BidangHeader
					slug="pemdes"
					icon={Landmark}
					deskripsi="Aparatur desa, profil desa, produk hukum, dan Musyawarah Desa Khusus seluruh wilayah."
				>
					<button
						onClick={() => {
							fetchDashboard();
							fetchActivityLogs();
						}}
						className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
					>
						<RotateCcw className="h-4 w-4" />
						Sinkronkan
					</button>
				</BidangHeader>

				{/* Angka pokok. Keterangan di bawah angka sengaja abu-abu, bukan hijau:
				    isinya penjelasan cakupan, bukan pertumbuhan. */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatTile
						icon={Building2}
						label="Total Desa"
						value={angkaAtau(stats.total_desa)}
						caption="se-Kabupaten Bogor"
						accent={AKSEN}
					/>
					<StatTile
						icon={Users}
						label="Perangkat Desa"
						value={angkaAtau(stats.total_perangkat)}
						caption="kepala desa & staf"
						accent="#2a78d6"
					/>
					<StatTile
						icon={Scale}
						label="Produk Hukum"
						value={angkaAtau(stats.total_produk_hukum)}
						caption={
							stats.produk_hukum_berlaku !== undefined
								? `${angkaAtau(stats.produk_hukum_berlaku)} masih berlaku`
								: 'Perdes · Perkades · SK'
						}
						accent="#eda100"
					/>
					<StatTile
						icon={Wallet}
						label="Pagu 2026"
						value={rupiahRingkas(stats.pagu)}
						caption="Program Pemdes"
						accent="#1baf7a"
					/>
				</div>

				{/* Akses cepat memakai daftar modul yang sama dengan bento di bawah,
				    jadi keduanya mustahil berbeda isi saat menu bertambah. */}
				<div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
					{modul.map((item) => {
						const Icon = item.icon;
						return (
							<button
								key={`pintas-${item.id}`}
								onClick={() => navigate(item.route)}
								title={item.judul}
								className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
							>
								<span
									className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
									style={{ backgroundColor: `${item.accent}1a`, color: item.accent }}
								>
									<Icon className="h-5 w-5" strokeWidth={1.75} />
								</span>
								<span className="line-clamp-2 px-1 text-center text-[11px] font-medium leading-tight text-slate-700">
									{item.judul}
								</span>
							</button>
						);
					})}
				</div>

				<div className="flex flex-col gap-6 lg:flex-row">
					{/* Kolom utama */}
					<div className="min-w-0 flex-1 space-y-7">
						<section>
							<JudulSeksi kicker="Modul Bidang" judul="Akses & Kelola" />
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{modul.map((item) => (
									<KartuModul key={item.id} modul={item} onClick={() => navigate(item.route)} />
								))}
							</div>
						</section>

						{/* Anggaran — hanya tampil untuk Bendahara */}
						{isBendahara && (
							<section>
								<JudulSeksi kicker="Anggaran 2026" judul="Program Kegiatan & Pagu" />
								<AnggaranBidangSection bidangId={6} />
							</section>
						)}
					</div>

					{/* Kolom samping */}
					<aside className="w-full shrink-0 space-y-4 lg:w-[340px]">
						<DaftarPegawaiBidang bidangId={6} bidangName="Bidang Pemdes" />
						<TimelineAktivitas logs={activityLogs} loading={activityLoading} onRefresh={fetchActivityLogs} />
					</aside>
				</div>
			</div>
		</div>
	);
};

export default PemdesPage;
