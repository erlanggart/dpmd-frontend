import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Lock, LogIn, Send, ShieldCheck, XCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getFormulirPublik, kirimFormulir } from "../../api/formulirApi";
import PertanyaanIsian from "../bidang/formulir/PertanyaanIsian";
import { NILAI_LAINNYA, formatWaktu, jawabanKosong } from "../bidang/formulir/formulirUtils";

/**
 * Halaman pengisian formulir — dibuka lewat tautan /f/:token, TANPA login.
 *
 * Validasi di sini menyalin aturan yang sama dengan server. Bukan pengaman
 * (server tetap memeriksa ulang), melainkan supaya kesalahan ketik ditandai di
 * kolomnya masing-masing, bukan dibalas satu pesan setelah seluruh isian —
 * termasuk lampiran — telanjur terkirim.
 *
 * Halaman ini berdiri sendiri: tanpa layout aplikasi, tanpa menu, tanpa sesi.
 * Yang membukanya sering warga di ruang pelayanan dengan ponsel seadanya, jadi
 * tata letaknya satu kolom sempit, sasaran sentuhnya besar, dan kemajuan
 * pengisian ditempel di atas supaya formulir 25 pertanyaan tidak terasa buntu.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INSTANSI = "Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor";

const Bingkai = ({ children, bilah }) => (
	<div className="min-h-screen bg-slate-100">
		{bilah}
		<div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
	</div>
);

const Kop = () => (
	<div className="flex items-center gap-3">
		<img src="/logo-dpmd.png" alt="" className="h-9 w-9 flex-shrink-0 object-contain" />
		<div className="min-w-0 text-left">
			<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Pemerintah</p>
			<p className="truncate text-xs font-medium text-slate-500">Kabupaten Bogor</p>
		</div>
	</div>
);

const Pemberitahuan = ({ ikon: Ikon, judul, keterangan, aksi, nada = "netral" }) => (
	<Bingkai>
		<div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
			<div
				className={
					nada === "baik"
						? "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50"
						: "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100"
				}
			>
				<Ikon className={nada === "baik" ? "h-7 w-7 text-emerald-600" : "h-7 w-7 text-slate-500"} />
			</div>
			<h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{judul}</h1>
			{keterangan && (
				<p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-slate-500">{keterangan}</p>
			)}
			{aksi}
			<div className="mt-10 flex justify-center border-t border-slate-100 pt-6">
				<Kop />
			</div>
		</div>
	</Bingkai>
);

/** Rangka semu selagi formulir dimuat — lebih tenang daripada layar kosong. */
const Rangka = () => (
	<Bingkai>
		<div className="space-y-3 sm:space-y-4">
			<div className="h-40 animate-pulse rounded-2xl bg-white" />
			<div className="h-32 animate-pulse rounded-2xl bg-white" />
			<div className="h-32 animate-pulse rounded-2xl bg-white" />
		</div>
	</Bingkai>
);

const IsiFormulirPage = () => {
	const { token } = useParams();
	const navigate = useNavigate();

	const [memuat, setMemuat] = useState(true);
	const [data, setData] = useState(null);
	const [galatMuat, setGalatMuat] = useState(null);
	const [jawaban, setJawaban] = useState({});
	const [berkas, setBerkas] = useState({});
	const [namaResponden, setNamaResponden] = useState("");
	const [galat, setGalat] = useState({});
	const [mengirim, setMengirim] = useState(false);
	const [terkirim, setTerkirim] = useState(null);

	const wadah = useRef(null);

	const muat = useCallback(async () => {
		setMemuat(true);
		setGalatMuat(null);
		try {
			const r = await getFormulirPublik(token);
			const d = r.data.data;
			setData(d);
			if (d.pertanyaan) {
				setJawaban(
					Object.fromEntries(
						d.pertanyaan.filter((p) => p.tipe !== "bagian").map((p) => [p.id, jawabanKosong(p.tipe)])
					)
				);
			}
			setBerkas({});
			setGalat({});
		} catch (e) {
			setGalatMuat(e.response?.data?.message || "Formulir tidak dapat dibuka.");
		} finally {
			setMemuat(false);
		}
	}, [token]);

	useEffect(() => {
		muat();
	}, [muat]);

	// Judul tab ikut nama formulir: tautan ini sering dibuka bersama belasan tab
	// lain, dan "Vite App" tidak membantu siapa pun menemukannya kembali.
	useEffect(() => {
		if (data?.judul) document.title = `${data.judul} — Formulir DPMD`;
	}, [data?.judul]);

	const ubahJawaban = (id, nilai) => {
		setJawaban((j) => ({ ...j, [id]: nilai }));
		setGalat((g) => {
			if (!g[id]) return g;
			const { [id]: _dibuang, ...sisa } = g;
			return sisa;
		});
	};

	/** Bersihkan penanda "Lainnya" yang dicentang tapi teksnya kosong. */
	const rapikanNilai = (p, nilai) => {
		if (p.tipe === "kotak_centang") {
			return (Array.isArray(nilai) ? nilai : []).filter((v) => v && v !== NILAI_LAINNYA);
		}
		return nilai;
	};

	// Kemajuan pengisian. Dihitung dari semua pertanyaan, bukan yang wajib saja —
	// bilah yang penuh padahal masih banyak kolom kosong justru menyesatkan.
	const kemajuan = useMemo(() => {
		const daftar = (data?.pertanyaan || []).filter((p) => p.tipe !== "bagian");
		const terisi = daftar.filter((p) => {
			if (p.tipe === "unggah_berkas") return (berkas[p.id] || []).length > 0;
			const nilai = jawaban[p.id];
			return Array.isArray(nilai) ? nilai.length > 0 : Boolean(String(nilai ?? "").trim());
		}).length;
		return { total: daftar.length, terisi, persen: daftar.length ? (terisi / daftar.length) * 100 : 0 };
	}, [data, jawaban, berkas]);

	const periksa = () => {
		const temuan = {};
		for (const p of data.pertanyaan) {
			if (p.tipe === "bagian") continue;
			const set = p.pengaturan || {};
			const nilai = rapikanNilai(p, jawaban[p.id]);
			const lampiran = berkas[p.id] || [];

			if (p.tipe === "unggah_berkas") {
				if (p.wajib && !lampiran.length) temuan[p.id] = "Berkas wajib dilampirkan.";
				continue;
			}

			const kosong = Array.isArray(nilai) ? nilai.length === 0 : !String(nilai ?? "").trim();
			if (kosong) {
				if (p.wajib) temuan[p.id] = "Pertanyaan ini wajib diisi.";
				continue;
			}

			if (p.tipe === "kotak_centang") {
				if (set.min_pilih && nilai.length < set.min_pilih) {
					temuan[p.id] = `Pilih minimal ${set.min_pilih} jawaban.`;
				} else if (set.maks_pilih && nilai.length > set.maks_pilih) {
					temuan[p.id] = `Pilih maksimal ${set.maks_pilih} jawaban.`;
				}
				continue;
			}

			const teks = String(nilai).trim();
			if (set.validasi === "email" && !EMAIL_RE.test(teks)) {
				temuan[p.id] = "Masukkan alamat email yang benar.";
			} else if (set.validasi === "angka" && !Number.isFinite(Number(teks))) {
				temuan[p.id] = "Masukkan angka.";
			} else if (set.validasi === "url" && !/^https?:\/\/\S+$/i.test(teks)) {
				temuan[p.id] = "Masukkan tautan yang diawali http:// atau https://";
			}
		}
		return temuan;
	};

	const keGalatPertama = (temuan) => {
		const pertamaId = data.pertanyaan.find((p) => temuan[p.id])?.id;
		wadah.current
			?.querySelector(`[data-pertanyaan="${pertamaId}"]`)
			?.scrollIntoView({ behavior: "smooth", block: "center" });
	};

	const kirim = async () => {
		const temuan = periksa();
		setGalat(temuan);
		if (Object.keys(temuan).length) {
			// Gulir ke kesalahan pertama: pada formulir panjang, pesan di bawah layar
			// terbaca sebagai "tombol kirim tidak berfungsi".
			keGalatPertama(temuan);
			return;
		}

		setMengirim(true);
		try {
			const muatan = {};
			for (const p of data.pertanyaan) {
				if (p.tipe === "bagian" || p.tipe === "unggah_berkas") continue;
				const nilai = rapikanNilai(p, jawaban[p.id]);
				const kosong = Array.isArray(nilai) ? nilai.length === 0 : !String(nilai ?? "").trim();
				if (!kosong) muatan[p.id] = nilai;
			}

			const r = await kirimFormulir(token, muatan, berkas, namaResponden);
			setTerkirim(r.data.data);
			window.scrollTo({ top: 0, behavior: "smooth" });
		} catch (e) {
			const pesan = e.response?.data?.message || "Gagal mengirim jawaban. Coba lagi.";
			setGalat({ _umum: pesan });
			// Formulir yang ditutup atau kuotanya penuh di tengah pengisian perlu
			// dimuat ulang supaya layarnya menjelaskan keadaan sebenarnya.
			if ([409, 401].includes(e.response?.status)) muat();
		} finally {
			setMengirim(false);
		}
	};

	// ---------- Keadaan khusus ----------
	if (memuat) return <Rangka />;

	if (galatMuat) {
		return <Pemberitahuan ikon={XCircle} judul="Formulir tidak ditemukan" keterangan={galatMuat} />;
	}

	if (terkirim) {
		return (
			<Pemberitahuan
				ikon={CheckCircle2}
				nada="baik"
				judul={data.judul}
				keterangan={terkirim.pesan_konfirmasi || "Terima kasih, jawaban Anda sudah kami terima."}
				aksi={
					<>
						<p className="mt-4 text-xs text-slate-400">Terkirim {formatWaktu(terkirim.dikirim_pada)}</p>
						<button
							onClick={() => {
								setTerkirim(null);
								muat();
							}}
							className="mt-6 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
						>
							Kirim jawaban lain
						</button>
					</>
				}
			/>
		);
	}

	if (data.perlu_masuk) {
		return (
			<Pemberitahuan
				ikon={Lock}
				judul={data.judul}
				keterangan={data.alasan}
				aksi={
					<button
						onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/f/${token}`)}`)}
						className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
					>
						<LogIn className="h-4 w-4" />
						Masuk untuk mengisi
					</button>
				}
			/>
		);
	}

	if (data.sudah_mengisi) {
		return (
			<Pemberitahuan
				ikon={CheckCircle2}
				nada="baik"
				judul={data.judul}
				keterangan={`${data.alasan} Dikirim ${formatWaktu(data.dikirim_pada)}.`}
			/>
		);
	}

	if (data.tertutup) {
		return <Pemberitahuan ikon={Lock} judul={data.judul} keterangan={data.alasan} />;
	}

	// ---------- Formulir ----------
	const adaWajib = data.pertanyaan.some((p) => p.wajib);
	const jumlahGalat = Object.keys(galat).filter((k) => k !== "_umum").length;

	// Penomoran melewati pemisah bagian: yang dilihat responden adalah "pertanyaan
	// ke sekian", bukan "baris ke sekian".
	let urut = 0;

	const bilah = (
		<div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
			<div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5 sm:px-6">
				<img src="/logo-dpmd.png" alt="" className="h-7 w-7 flex-shrink-0 object-contain" />
				<p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{data.judul}</p>
				<span className="flex-shrink-0 text-xs font-medium tabular-nums text-slate-500">
					{kemajuan.terisi}/{kemajuan.total}
				</span>
			</div>
			<div className="h-1 w-full bg-slate-100">
				<div
					className="h-full bg-slate-900 transition-all duration-300"
					style={{ width: `${kemajuan.persen}%` }}
					role="progressbar"
					aria-valuenow={Math.round(kemajuan.persen)}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label="Kemajuan pengisian"
				/>
			</div>
		</div>
	);

	return (
		<Bingkai bilah={bilah}>
			<div ref={wadah} className="space-y-3 sm:space-y-4">
				{/* ---------- Kepala formulir ---------- */}
				<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="h-1.5 w-full bg-slate-900" />
					<div className="px-5 py-6 sm:px-7 sm:py-8">
						<Kop />
						<h1 className="mt-5 text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl">
							{data.judul}
						</h1>
						<p className="mt-1.5 text-sm font-medium text-slate-500">{INSTANSI}</p>
						{data.deskripsi && (
							<p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">{data.deskripsi}</p>
						)}
						<div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
							<span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
								{kemajuan.total} pertanyaan
							</span>
							{adaWajib && (
								<span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
									* Wajib diisi
								</span>
							)}
							{data.responden && (
								<span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
									Sebagai {data.responden.nama}
									{data.kumpulkan_email && data.responden.email ? ` · ${data.responden.email}` : ""}
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Nama pengisi hanya ditanyakan bila formulirnya terbuka untuk umum;
				    kalau wajib login, namanya sudah pasti dari akun. */}
				{!data.butuh_login && (
					<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
						<div className="border-l-4 border-transparent px-5 py-5 sm:px-7 sm:py-6">
							<p className="text-[15px] font-semibold leading-6 text-slate-900">Nama Anda</p>
							<p className="mt-1 text-sm leading-6 text-slate-500">
								Opsional, untuk memudahkan kami menindaklanjuti.
							</p>
							<input
								value={namaResponden}
								onChange={(e) => setNamaResponden(e.target.value)}
								placeholder="Nama"
								className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-6 text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
							/>
						</div>
					</div>
				)}

				{data.pertanyaan.map((p) => {
					if (p.tipe !== "bagian") urut += 1;
					return (
						<div
							key={p.id}
							data-pertanyaan={p.id}
							className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
						>
							<PertanyaanIsian
								pertanyaan={p}
								nomor={p.tipe === "bagian" ? undefined : urut}
								nilai={jawaban[p.id] ?? jawabanKosong(p.tipe)}
								onUbah={(v) => ubahJawaban(p.id, v)}
								berkas={berkas[p.id] || []}
								onBerkas={(daftar) => {
									setBerkas((b) => ({ ...b, [p.id]: daftar }));
									setGalat((g) => {
										if (!g[p.id]) return g;
										const { [p.id]: _dibuang, ...sisa } = g;
										return sisa;
									});
								}}
								galat={galat[p.id]}
							/>
						</div>
					);
				})}

				{/* ---------- Kesalahan ---------- */}
				{jumlahGalat > 0 && (
					<button
						onClick={() => keGalatPertama(galat)}
						className="flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-left transition-colors hover:bg-rose-100"
					>
						<AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
						<span className="min-w-0 flex-1 text-sm font-medium text-rose-700">
							{jumlahGalat} pertanyaan masih perlu diperbaiki.
						</span>
						<span className="flex-shrink-0 text-xs font-semibold text-rose-700 underline">Lihat</span>
					</button>
				)}

				{galat._umum && (
					<div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
						<AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
						<p className="text-sm font-medium text-rose-700">{galat._umum}</p>
					</div>
				)}

				{/* ---------- Kirim ---------- */}
				<div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="text-[15px] font-semibold text-slate-900">Kirim jawaban</p>
							<p className="mt-0.5 text-sm text-slate-500">
								{kemajuan.terisi} dari {kemajuan.total} pertanyaan sudah terisi.
							</p>
						</div>
						<button
							onClick={kirim}
							disabled={mengirim}
							className="inline-flex w-full flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300 sm:w-auto"
						>
							{mengirim ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
							{mengirim ? "Mengirim…" : "Kirim"}
						</button>
					</div>
				</div>

				{/* ---------- Kaki ---------- */}
				<div className="flex flex-col items-center gap-2 pb-10 pt-4 text-center">
					<p className="flex items-center gap-1.5 text-xs text-slate-400">
						<ShieldCheck className="h-3.5 w-3.5" />
						Jangan pernah mengirimkan kata sandi melalui formulir ini.
					</p>
					<p className="text-xs text-slate-400">{INSTANSI}</p>
				</div>
			</div>
		</Bingkai>
	);
};

export default IsiFormulirPage;
