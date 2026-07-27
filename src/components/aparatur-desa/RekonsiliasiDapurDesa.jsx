import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
	Archive,
	Check,
	CircleAlert,
	Loader2,
	RefreshCw,
	UserPlus,
	UserRound,
} from "lucide-react";
import {
	getRekonsiliasiDapurDesa,
	putuskanDapurDesa,
	tambahSemuaBaruDapurDesa,
} from "../../api/aparaturDesaApi";

/**
 * Panel rekonsiliasi arsip Dapur Desa.
 *
 * Arsip Dapur Desa dimuat sekali oleh DPMD lewat skrip impor. Desa yang saat itu
 * belum punya data langsung terisi, dan data yang isinya sama persis diselesaikan
 * otomatis — yang sampai ke sini hanya yang benar-benar butuh keputusan orang:
 *   - konflik : nama sama tapi ada kolom yang isinya berbeda.
 *   - baru    : orang di arsip yang belum ada di data desa.
 *
 * Kartu konflik sengaja berbentuk dua pilihan bergaya radio, bukan dua tombol aksi
 * langsung: operator harus sadar sedang memilih salah satu sumber, dan tombol simpan
 * baru hidup setelah pilihan diambil. Panel menyembunyikan dirinya sendiri kalau
 * tidak ada yang perlu ditinjau.
 */

const LABEL_KELAMIN = { L: "Laki-laki", P: "Perempuan" };

const tanggal = (nilai) => {
	if (!nilai) return "—";
	const d = new Date(nilai);
	return Number.isNaN(d.getTime())
		? "—"
		: d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

const isi = (nilai) => {
	const t = String(nilai ?? "").trim();
	return t && t !== "-" ? t : "—";
};

// Kolom yang dibandingkan, urut seperti yang dilihat operator desa. `kolom` harus
// sama persis dengan nama kolom yang dikirim backend di `kolom_beda`.
const BARIS_KONFLIK = [
	{ kolom: "nama", label: "Nama", desa: (d) => d?.nama_lengkap, arsip: (k) => k.nama },
	{ kolom: "jabatan", label: "Jabatan", desa: (d) => d?.jabatan, arsip: (k) => k.jabatan },
	{
		kolom: "jenis_kelamin",
		label: "Jenis kelamin",
		desa: (d) => d?.jenis_kelamin?.replace("_", "-"),
		arsip: (k) => LABEL_KELAMIN[k.jenis_kelamin] || k.jenis_kelamin,
	},
	{
		kolom: "pendidikan",
		label: "Pendidikan",
		desa: (d) => d?.pendidikan_terakhir,
		arsip: (k) => k.pendidikan,
	},
	{ kolom: "agama", label: "Agama", desa: (d) => d?.agama, arsip: (k) => k.agama },
	{
		kolom: "nomor_sk",
		label: "Nomor SK",
		desa: (d) => d?.nomor_sk_pengangkatan,
		arsip: (k) => k.no_sk_pertama || k.no_sk,
	},
	{
		kolom: "tanggal_pengangkatan",
		label: "Tgl pengangkatan",
		desa: (d) => tanggal(d?.tanggal_pengangkatan),
		arsip: (k) => tanggal(k.tgl_sk_pertama || k.tgl_sk),
	},
];

// Tinggi baris disamakan supaya nilai di kedua kartu tetap sejajar walau kartunya terpisah.
const TINGGI_BARIS = "min-h-[2.75rem]";
// Header kartu dan header kolom label dikunci setinggi ini; kalau berbeda, seluruh
// baris nilai bergeser dan tidak lagi sejajar dengan labelnya di sisi kiri.
const TINGGI_HEADER = "h-14";

// Kelas ditulis utuh, TIDAK dirakit dari potongan string: Tailwind memindai kode
// sebagai teks, jadi kelas hasil template literal seperti `bg-${warna}-50` tidak
// pernah ikut ter-generate dan warnanya hilang diam-diam saat build produksi.
const AKSEN = {
	desa: {
		kartu: "border-slate-900 ring-2 ring-slate-900/20",
		header: "border-slate-200 bg-slate-100",
		radio: "border-slate-900 bg-slate-900",
	},
	dapur: {
		kartu: "border-emerald-600 ring-2 ring-emerald-500/25",
		header: "border-emerald-200 bg-emerald-50",
		radio: "border-emerald-600 bg-emerald-600",
	},
};

/**
 * Satu kartu sumber data yang bisa dipilih. Seluruh kartu jadi area klik dengan
 * peran radio, jadi maksudnya "pilih salah satu" terbaca tanpa perlu instruksi panjang.
 */
const KartuSumber = ({ judul, keterangan, nilai, kolomBeda, dipilih, onPilih, aksen, nonaktif }) => {
	const gaya = dipilih
		? `${aksen.kartu} bg-white`
		: "border-slate-200 bg-white hover:border-slate-300";

	return (
		<button
			type="button"
			role="radio"
			aria-checked={dipilih}
			disabled={nonaktif}
			onClick={onPilih}
			className={`group flex flex-1 flex-col overflow-hidden rounded-xl border text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${gaya} ${
				dipilih ? "shadow-md" : "shadow-sm"
			}`}
		>
			<div
				className={`flex ${TINGGI_HEADER} items-center gap-2.5 border-b px-3.5 transition-colors ${
					dipilih ? aksen.header : "border-slate-100 bg-slate-50/70 group-hover:bg-slate-100/70"
				}`}
			>
				<span
					className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
						dipilih ? aksen.radio : "border-slate-300 bg-white"
					}`}
				>
					{dipilih && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
				</span>
				<span className="min-w-0">
					<span className="block truncate text-sm font-semibold text-slate-900">{judul}</span>
					<span className="block truncate text-xs text-slate-500">{keterangan}</span>
				</span>
			</div>

			<div className="divide-y divide-slate-100">
				{BARIS_KONFLIK.map(({ kolom, label }) => {
					const beda = kolomBeda.has(kolom);
					return (
						<div
							key={kolom}
							className={`flex flex-col justify-center px-3.5 py-2 ${TINGGI_BARIS} ${
								beda ? "bg-amber-50/70" : ""
							}`}
						>
							{/* Label ikut di dalam kartu hanya di layar kecil, karena di sana
							    kolom label terpisah disembunyikan dan kartu ditumpuk. */}
							<span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:hidden">
								{label}
							</span>
							<span
								className={`truncate text-sm ${
									beda ? "font-semibold text-amber-900" : "text-slate-700"
								}`}
								title={isi(nilai(kolom))}
							>
								{isi(nilai(kolom))}
							</span>
						</div>
					);
				})}
			</div>
		</button>
	);
};

const KartuKonflik = ({ data, sedangProses, onSimpan }) => {
	const [pilihan, setPilihan] = useState(null);
	const kolomBeda = new Set(data.kolom_beda || []);
	const jumlahBeda = kolomBeda.size;

	return (
		<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
				<div className="flex min-w-0 items-center gap-2.5">
					<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
						<UserRound className="h-5 w-5" />
					</span>
					<div className="min-w-0">
						<p className="truncate font-semibold text-slate-900">{data.nama}</p>
						<p className="text-xs text-slate-500">{isi(data.jabatan)}</p>
					</div>
				</div>
				<span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
					<CircleAlert className="h-3.5 w-3.5" />
					{jumlahBeda} kolom berbeda
				</span>
			</div>

			<div className="px-4 py-4">
				<div className="flex gap-3">
					{/* Kolom label hanya muncul di layar lebar; di layar kecil label ikut di kartu. */}
					<div className="hidden w-36 flex-shrink-0 flex-col sm:flex">
						<div className={`flex ${TINGGI_HEADER} items-end px-1 pb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400`}>
							Kolom
						</div>
						<div className="divide-y divide-transparent">
							{BARIS_KONFLIK.map(({ kolom, label }) => (
								<div
									key={kolom}
									className={`flex items-center px-1 py-2 text-sm ${TINGGI_BARIS} ${
										kolomBeda.has(kolom) ? "font-semibold text-amber-800" : "text-slate-500"
									}`}
								>
									{label}
								</div>
							))}
						</div>
					</div>

					<div
						role="radiogroup"
						aria-label={`Pilih sumber data untuk ${data.nama}`}
						className="flex flex-1 flex-col gap-3 sm:flex-row"
					>
						<KartuSumber
							judul="Data desa"
							keterangan="Isian Anda saat ini"
							aksen={AKSEN.desa}
							nilai={(kolom) => BARIS_KONFLIK.find((b) => b.kolom === kolom).desa(data.data_desa)}
							kolomBeda={kolomBeda}
							dipilih={pilihan === "desa"}
							onPilih={() => setPilihan("desa")}
							nonaktif={sedangProses}
						/>
						<KartuSumber
							judul="Arsip Dapur Desa"
							keterangan="Data lama dari DPMD"
							aksen={AKSEN.dapur}
							nilai={(kolom) => BARIS_KONFLIK.find((b) => b.kolom === kolom).arsip(data)}
							kolomBeda={kolomBeda}
							dipilih={pilihan === "dapur"}
							onPilih={() => setPilihan("dapur")}
							nonaktif={sedangProses}
						/>
					</div>
				</div>

				<div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
					<p
						className={`text-sm transition-colors ${
							pilihan ? "text-slate-500" : "font-medium text-amber-700"
						}`}
					>
						{pilihan
							? pilihan === "desa"
								? "Data desa akan dipertahankan."
								: "Data akan diganti dengan isi arsip Dapur Desa."
							: "Ketuk salah satu kartu di atas untuk memilih."}
					</p>
					<button
						type="button"
						disabled={!pilihan || sedangProses}
						onClick={() => onSimpan(pilihan)}
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
					>
						{sedangProses ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Check className="h-4 w-4" />
						)}
						Simpan pilihan
					</button>
				</div>
			</div>
		</div>
	);
};

const RekonsiliasiDapurDesa = ({ onSelesai }) => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [prosesId, setProsesId] = useState(null);
	const [prosesSemua, setProsesSemua] = useState(false);

	const muat = useCallback(async () => {
		try {
			setLoading(true);
			const res = await getRekonsiliasiDapurDesa();
			setData(res.data?.data || null);
		} catch (error) {
			// Panel ini pelengkap; kegagalannya tidak boleh menutup halaman aparatur.
			console.error("Gagal memuat rekonsiliasi Dapur Desa:", error);
			setData(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		muat();
	}, [muat]);

	const putuskan = async (baris, keputusan) => {
		setProsesId(baris.dapur_id);
		try {
			const res = await putuskanDapurDesa(baris.dapur_id, keputusan);
			await muat();
			onSelesai?.();
			Swal.fire({
				icon: "success",
				title: "Tersimpan",
				text: res.data?.message,
				timer: 1800,
				showConfirmButton: false,
			});
		} catch (error) {
			Swal.fire(
				"Gagal",
				error.response?.data?.message || "Tidak bisa menetapkan data. Coba lagi.",
				"error"
			);
		} finally {
			setProsesId(null);
		}
	};

	const tambahSemua = async () => {
		const jumlah = data?.baru?.length || 0;
		const konfirm = await Swal.fire({
			title: `Tambahkan ${jumlah} data?`,
			text: "Semua orang di arsip Dapur Desa yang belum ada di data desa akan ditambahkan. Data yang sudah Anda isi tidak tersentuh.",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Ya, tambahkan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0f172a",
		});
		if (!konfirm.isConfirmed) return;

		setProsesSemua(true);
		try {
			const res = await tambahSemuaBaruDapurDesa();
			await muat();
			onSelesai?.();
			Swal.fire("Selesai", res.data?.message, "success");
		} catch (error) {
			Swal.fire(
				"Gagal",
				error.response?.data?.message || "Tidak bisa menambahkan data dari arsip.",
				"error"
			);
		} finally {
			setProsesSemua(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-500 shadow-sm">
				<Loader2 className="h-4 w-4 animate-spin" /> Memeriksa arsip Dapur Desa…
			</div>
		);
	}

	const konflik = data?.konflik || [];
	const baru = data?.baru || [];
	if (konflik.length === 0 && baru.length === 0) return null;

	const selesai = (data?.ringkasan?.selesai || 0) + (data?.ringkasan?.ditolak || 0);
	const total = selesai + konflik.length;
	const persen = total > 0 ? Math.round((selesai / total) * 100) : 0;

	return (
		<section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm">
			<header className="border-b border-slate-200 bg-white px-5 py-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex items-start gap-3">
						<span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
							<Archive className="h-5 w-5" />
						</span>
						<div>
							<h3 className="font-semibold text-slate-900">Arsip Dapur Desa perlu ditinjau</h3>
							<p className="mt-0.5 text-sm text-slate-500">
								{konflik.length > 0 && (
									<>
										<strong className="font-semibold text-slate-700">{konflik.length}</strong> data
										perlu Anda pilih
									</>
								)}
								{konflik.length > 0 && baru.length > 0 && " · "}
								{baru.length > 0 && (
									<>
										<strong className="font-semibold text-slate-700">{baru.length}</strong> orang
										belum ada di data desa
									</>
								)}
							</p>
						</div>
					</div>
					<button
						onClick={muat}
						className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
					>
						<RefreshCw className="h-3.5 w-3.5" /> Muat ulang
					</button>
				</div>

				{total > 0 && selesai > 0 && (
					<div className="mt-4">
						<div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
							<span>
								{selesai} dari {total} sudah diputuskan
							</span>
							<span className="font-semibold text-slate-700">{persen}%</span>
						</div>
						<div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
							<div
								className="h-full rounded-full bg-emerald-500 transition-all duration-500"
								style={{ width: `${persen}%` }}
							/>
						</div>
					</div>
				)}
			</header>

			{konflik.length > 0 && (
				<div className="space-y-3 px-5 py-5">
					<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
						<p className="text-sm leading-6 text-amber-900">
							Nama berikut ada di dua sumber dengan isi yang berbeda.{" "}
							<strong>Pilih salah satu kartu</strong>, lalu tekan <em>Simpan pilihan</em>. Kolom yang
							berbeda ditandai kuning. Tempat &amp; tanggal lahir tidak ada di arsip, jadi isian Anda
							untuk dua kolom itu selalu dipertahankan.
						</p>
					</div>

					{konflik.map((k) => (
						<KartuKonflik
							key={k.dapur_id}
							data={k}
							sedangProses={prosesId === k.dapur_id}
							onSimpan={(keputusan) => putuskan(k, keputusan)}
						/>
					))}
				</div>
			)}

			{baru.length > 0 && (
				<div className="border-t border-slate-200 bg-white px-5 py-5">
					<div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h4 className="font-semibold text-slate-900">Belum ada di data desa</h4>
							<p className="text-sm text-slate-500">
								<strong className="font-semibold text-slate-700">{baru.length} orang</strong> ada di
								arsip Dapur Desa tetapi belum Anda input.
							</p>
						</div>
						<button
							disabled={prosesSemua}
							onClick={tambahSemua}
							className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
						>
							{prosesSemua ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<UserPlus className="h-4 w-4" />
							)}
							Tambahkan semua
						</button>
					</div>

					<div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
						{baru.map((b) => (
							<div
								key={b.dapur_id}
								className="flex flex-col gap-2 px-3.5 py-2.5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0">
									<p className="truncate font-medium text-slate-800">{b.nama}</p>
									<p className="truncate text-xs text-slate-500">
										{isi(b.jabatan)} · {isi(b.pendidikan)}
									</p>
								</div>
								<div className="flex flex-shrink-0 gap-2">
									<button
										disabled={prosesId === b.dapur_id}
										onClick={() => putuskan(b, "desa")}
										className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
									>
										Abaikan
									</button>
									<button
										disabled={prosesId === b.dapur_id}
										onClick={() => putuskan(b, "dapur")}
										className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
									>
										{prosesId === b.dapur_id ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<UserPlus className="h-3.5 w-3.5" />
										)}
										Tambahkan
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</section>
	);
};

export default RekonsiliasiDapurDesa;
